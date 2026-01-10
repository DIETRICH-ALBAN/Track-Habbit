import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, le centre de commande intelligent de l'application. 
Tu as un accès complet pour gérer les tâches, le calendrier et les rappels de l'utilisateur.

Tes capacités incluent :
1. CRÉER des tâches ou des rappels.
2. MODIFIER des tâches existantes (changer le statut, la priorité, la date d'échéance/calendrier).
3. SUPPRIMER des tâches.
4. ANALYSER l'emploi du temps et suggérer des organisations.
5. ÉCOUTER : Tu es capable d'analyser les messages vocaux (audio) que l'utilisateur t'envoie. Quand tu reçois de l'audio, traite-le exactement comme du texte.

Format de réponse pour les actions :
Si tu dois effectuer une action, inclus un bloc JSON dans ta réponse. Tu peux en inclure plusieurs si nécessaire.

Formats JSON supportés :
- Création : {"action": "create_task", "title": "...", "priority": "low|medium|high", "description": "...", "due_date": "YYYY-MM-DD"}
- Modification : {"action": "update_task", "id": "UUID_DE_LA_TACHE", "updates": {"status": "todo|in_progress|done", "priority": "...", "due_date": "..."}}
- Suppression : {"action": "delete_task", "id": "UUID_DE_LA_TACHE"}

Règles :
1. Réponds toujours en français.
2. Sois proactif : si l'utilisateur dit "J'ai fini mon rapport", propose de passer la tâche en 'done'.
3. Pour le calendrier, utilise le champ "due_date".
4. Si l'utilisateur demande de voir ses tâches, elles te sont fournies dans le contexte ci-dessous.
5. Sois concis et efficace.`;

export async function POST(request: NextRequest) {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json({ error: "Clé API manquante dans Vercel" }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Session non trouvée. Veuillez recharger." }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json(
                { error: 'Utilisateur non identifié.' },
                { status: 401 }
            );
        }

        const { message, audio } = await request.json();

        if ((!message || typeof message !== 'string') && !audio) {
            return NextResponse.json({ error: 'Message ou audio requis' }, { status: 400 });
        }

        // Récupérer les tâches de l'utilisateur pour le contexte (avec ID pour modification/suppression)
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, status, priority, due_date')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        const tasksContext = tasks && tasks.length > 0
            ? `\n\nTâches actuelles de l'utilisateur:\n${(tasks as any[]).map(t =>
                `- [ID: ${t.id}] "${t.title}" (statut: ${t.status}, priorité: ${t.priority}${t.due_date ? `, échéance: ${t.due_date}` : ''})`
            ).join('\n')}`
            : '\n\nL\'utilisateur n\'a pas encore de tâches.';

        // Récupérer l'historique de chat récent et nettoyer le JSON
        const { data: chatHistory } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const cleanHistory = chatHistory?.reverse().map((h: any) => ({
            role: h.role,
            content: typeof h.content === 'string'
                ? h.content.replace(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g, '').trim()
                : h.content
        })) || [];

        const messages = [
            {
                role: 'system',
                content: SYSTEM_PROMPT + tasksContext
            },
            ...cleanHistory,
            // On envoie simplement le message textuel (qu'il vienne du clavier ou du STT)
            { role: 'user', content: message }
        ];

        // Appel à OpenRouter via fetch direct
        console.log('Appel OpenRouter avec le modèle:', 'google/gemini-2.0-flash-001', audio ? `(audio size: ${audio.length})` : '(texte seul)');

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'Track Habbit AI'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!openRouterResponse.ok) {
            const errorData = await openRouterResponse.json();
            throw new Error(errorData.error?.message || `Erreur OpenRouter: ${openRouterResponse.status}`);
        }

        const data = await openRouterResponse.json();
        const assistantMessage = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";
        const assistantMessageStr = typeof assistantMessage === 'string' ? assistantMessage : JSON.stringify(assistantMessage);

        // Sauvegarder les messages dans l'historique
        await supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: message || (audio ? "[Audio Message]" : "") },
            { user_id: user.id, role: 'assistant', content: assistantMessageStr }
        ]);

        // Traiter toutes les actions demandées par l'IA
        const actionsPerformed: any[] = [];
        try {
            // Trouver tous les blocs JSON d'action dans la réponse
            const jsonMatches = assistantMessageStr.match(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g);

            if (jsonMatches) {
                for (const jsonStr of jsonMatches) {
                    try {
                        const actionData = JSON.parse(jsonStr);

                        switch (actionData.action) {
                            case 'create_task':
                                if (actionData.title) {
                                    const { data: newTask, error } = await supabase
                                        .from('tasks')
                                        .insert([{
                                            user_id: user.id,
                                            title: actionData.title,
                                            description: actionData.description || null,
                                            priority: actionData.priority || 'medium',
                                            due_date: actionData.due_date || null,
                                            status: 'todo'
                                        }])
                                        .select()
                                        .single();

                                    if (!error && newTask) {
                                        actionsPerformed.push({ type: 'task_created', task: newTask });
                                    }
                                }
                                break;

                            case 'update_task':
                                if (actionData.id && actionData.updates) {
                                    const { data: updatedTask, error } = await supabase
                                        .from('tasks')
                                        .update(actionData.updates)
                                        .eq('id', actionData.id)
                                        .eq('user_id', user.id)
                                        .select()
                                        .single();

                                    if (!error && updatedTask) {
                                        actionsPerformed.push({ type: 'task_updated', task: updatedTask });
                                    }
                                }
                                break;

                            case 'delete_task':
                                if (actionData.id) {
                                    const { error } = await supabase
                                        .from('tasks')
                                        .delete()
                                        .eq('id', actionData.id)
                                        .eq('user_id', user.id);

                                    if (!error) {
                                        actionsPerformed.push({ type: 'task_deleted', id: actionData.id });
                                    }
                                }
                                break;
                        }
                    } catch (parseError) {
                        console.error("Erreur parsing action JSON:", parseError);
                    }
                }
            }
        } catch (e) {
            console.error("Erreur traitement actions:", e);
        }

        return NextResponse.json({
            message: assistantMessageStr,
            actions: actionsPerformed,
            taskCreated: actionsPerformed.find(a => a.type === 'task_created')?.task || null
        });

    } catch (error: any) {
        console.error('Erreur API Chat OpenRouter:', error);

        // Handle 429 specifically if possible
        if (error.status === 429) {
            return NextResponse.json(
                { error: 'Trop de requêtes. Veuillez patienter un instant ou vérifier votre solde OpenRouter.' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Erreur interne du serveur' },
            { status: 500 }
        );
    }
}
