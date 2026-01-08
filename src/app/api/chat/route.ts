import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, un assistant intelligent pour la gestion de tâches et la productivité.

Tu aides les utilisateurs à :
- Organiser leurs tâches quotidiennes
- Créer de nouvelles tâches à partir de leurs demandes
- Prioriser leur travail
- Répondre à leurs questions sur la productivité

Règles importantes :
1. Réponds toujours en français
2. Sois concis et utile
3. Si l'utilisateur demande de créer une tâche, réponds avec un JSON dans ce format exact :
   {"action": "create_task", "title": "Titre de la tâche", "priority": "low|medium|high", "description": "Description optionnelle"}
4. Si l'utilisateur pose une question générale, réponds normalement sans JSON
5. Sois encourageant et positif

Contexte utilisateur fourni : tu recevras la liste des tâches actuelles de l'utilisateur pour mieux l'aider.`;

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { message } = await request.json();

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Message requis' }, { status: 400 });
        }

        // Récupérer les tâches de l'utilisateur pour le contexte
        const { data: tasks } = await supabase
            .from('tasks')
            .select('title, status, priority, due_date')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const tasksContext = tasks && tasks.length > 0
            ? `\n\nTâches actuelles de l'utilisateur:\n${tasks.map(t => `- ${t.title} (${t.status}, priorité: ${t.priority})`).join('\n')}`
            : '\n\nL\'utilisateur n\'a pas encore de tâches.';

        // Récupérer l'historique de chat récent
        const { data: chatHistory } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(6);

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT + tasksContext },
            ...(chatHistory?.reverse().map(h => ({
                role: h.role as 'user' | 'assistant',
                content: h.content
            })) || []),
            { role: 'user', content: message }
        ];

        // Appel à OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            max_tokens: 500,
            temperature: 0.7,
        });

        const assistantMessage = completion.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

        // Sauvegarder les messages dans l'historique
        await supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: message },
            { user_id: user.id, role: 'assistant', content: assistantMessage }
        ]);

        // Vérifier si l'IA veut créer une tâche
        let taskCreated = null;
        try {
            const jsonMatch = assistantMessage.match(/\{[\s\S]*"action"\s*:\s*"create_task"[\s\S]*\}/);
            if (jsonMatch) {
                const taskData = JSON.parse(jsonMatch[0]);
                if (taskData.action === 'create_task' && taskData.title) {
                    const { data: newTask, error: taskError } = await supabase
                        .from('tasks')
                        .insert([{
                            user_id: user.id,
                            title: taskData.title,
                            description: taskData.description || null,
                            priority: taskData.priority || 'medium',
                            status: 'todo'
                        }])
                        .select()
                        .single();

                    if (!taskError && newTask) {
                        taskCreated = newTask;
                    }
                }
            }
        } catch (e) {
            // Pas de JSON valide, c'est OK - c'était juste une réponse normale
        }

        return NextResponse.json({
            message: assistantMessage,
            taskCreated
        });

    } catch (error: any) {
        console.error('Erreur API Chat:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}
