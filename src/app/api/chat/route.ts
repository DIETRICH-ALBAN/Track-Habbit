import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `Tu es Track Habbit AI, un assistant intelligent pour la gestion de tâches et la productivité.

Tu aides les utilisateurs à :
- Organiser leurs tâches quotidiennes
- Créer de nouvelles tâches à partir de leurs demandes
- Prioriser leur travail
- Répondre à leurs questions sur la productivité

Règles importantes :
1. Réponds toujours en français
2. Sois concis et utile
3. Si l'utilisateur demande de créer une tâche, tu DOIS inclure un bloc JSON dans ta réponse dans ce format exact :
   {"action": "create_task", "title": "Titre de la tâche", "priority": "low|medium|high", "description": "Description optionnelle"}
4. Si l'utilisateur pose une question générale, réponds normalement sans JSON
5. Sois encourageant et positif`;

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
            .limit(15);

        const tasksContext = tasks && tasks.length > 0
            ? `\n\nTâches actuelles de l'utilisateur:\n${tasks.map(t => `- ${t.title} (${t.status}, priorité: ${t.priority})`).join('\n')}`
            : '\n\nL\'utilisateur n\'a pas encore de tâches.';

        // Récupérer l'historique de chat récent
        const { data: chatHistory } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: chatHistory?.reverse().map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
            })) || [],
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const fullPrompt = `${SYSTEM_PROMPT}${tasksContext}\n\nUtilisateur: ${message}`;
        const result = await chat.sendMessage(fullPrompt);
        const response = await result.response;
        const assistantMessage = response.text();

        // Sauvegarder les messages dans l'historique
        await supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: message },
            { user_id: user.id, role: 'assistant', content: assistantMessage }
        ]);

        // Vérifier si l'IA veut créer une tâche (même logique d'extraction JSON)
        let taskCreated = null;
        try {
            const jsonMatch = assistantMessage.match(/\{[\s\S]*"action"\s*:\s*"create_task"[\s\S]*\}/);
            if (jsonMatch) {
                const taskData = JSON.parse(jsonMatch[0].trim());
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
            console.error("Erreur parsing JSON tâche:", e);
        }

        return NextResponse.json({
            message: assistantMessage,
            taskCreated
        });

    } catch (error: any) {
        console.error('Erreur API Chat Gemini:', error);
        return NextResponse.json(
            { error: error.message || 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}
