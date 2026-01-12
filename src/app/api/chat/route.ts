import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, l'assistant personnel ULTIME et OMNIPOTENT. Ton interface est principalement vocale, donc ta façon de parler doit être NATURELLE, FLUIDE et HUMAINE.

### TA PERSONNALITÉ :
- **Humain et Proactif** : Ne sois pas un simple automate. Si l'utilisateur semble débordé, propose de réorganiser. Si on te pose une question, réponds avec intelligence et clarté.
- **Expert en Organisation** : Tu n'es pas juste un chatbot, tu es un coach qui aide à comprendre et à agir. Explique les concepts si nécessaire.
- **Zéro Robotique** : N'annonce JAMAIS d'identifiants techniques (IDs, UUIDs) dans tes phrases. Ne dis jamais "La tâche avec l'ID 123...". Utilise les titres.
- **Pas de Meta-langage** : Ne décris pas tes gestes ou emojis (ex: ne dis pas "Sourire", "Clin d'oeil"). Parle normalement.

### TACHES & RESPONSABILITÉS :
1. **Gestion Totale** : Crée, modifie, supprime des tâches ou des équipes. Planifie l'agenda.
2. **Contexte Dynamique** : Tu connais les membres des équipes et l'état des tâches.
3. **Format Vocal** : Tes phrases doivent être courtes et percutantes.

### TES ACTIONS (JSON STRICT) :
Utilise ces blocs JSON à la fin de tes réponses :
- Créer : {"action": "create_task", "title": "NOM", "priority": "...", "due_date": "YYYY-MM-DD HH:mm:ss"}
- Modifier : {"action": "update_task", "id": "...", "updates": {...}}
- Supprimer : {"action": "delete_task", "id": "..."}
- Supprimer tout : {"action": "delete_all_tasks"}

### RÈGLES D'OR :
1. **DATES** : Utilise "YYYY-MM-DD HH:mm:ss". Aujourd'hui est le {{today}}.
2. **STYLE** : Sois élégant, efficace et rassurant. Ne lis jamais de code ou de JSON à l'oral.`;

export async function POST(request: NextRequest) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const fullPrompt = SYSTEM_PROMPT.replace('{{today}}', today);

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json({ error: "Clé API manquante dans Vercel" }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Session non trouvée. Veuillez recharger." }, { status: 401 });
        }

        if (!user) {
            return NextResponse.json({ error: 'Utilisateur non identifié.' }, { status: 401 });
        }

        const { message, audio } = await request.json();

        if ((!message || typeof message !== 'string') && !audio) {
            return NextResponse.json({ error: 'Message ou audio requis' }, { status: 400 });
        }

        // Récupérer les tâches de l'utilisateur
        const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, status, priority, due_date')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        // Récupérer les équipes de l'utilisateur et leurs membres
        const { data: memberships } = await supabase
            .from('memberships')
            .select('team_id, team:teams(id, name), role')
            .eq('user_id', user.id);

        let teamsContext = "";
        if (memberships && memberships.length > 0) {
            teamsContext = "\n\nÉquipes disponibles :\n";
            for (const m of memberships) {
                const { data: members } = await supabase
                    .from('memberships')
                    .select('user_id, role')
                    .eq('team_id', m.team_id);

                const teamData = Array.isArray(m.team) ? m.team[0] : m.team;
                const teamName = teamData?.name || "Sans nom";
                const teamId = teamData?.id || m.team_id;

                const membersList = (members as any[])?.map(mem => `- Membre (${mem.role}) ID: ${mem.user_id}`).join(', ') || "Aucun autre membre";
                teamsContext += `- Équipe "${teamName}" (ID: ${teamId}). Membres: ${membersList}\n`;
            }
        } else {
            teamsContext = "\n\nL'utilisateur n'est dans aucune équipe.";
        }

        const tasksContext = tasks && tasks.length > 0
            ? `\n\nTâches personnelles actuelles:\n${(tasks as any[]).map(t =>
                `- [ID: ${t.id}] "${t.title}" (statut: ${t.status}, priorité: ${t.priority}, date: ${t.due_date})`
            ).join('\n')}`
            : '\n\nPas de tâches personnelles.';

        // ... (remaining history code)
        const { data: chatHistory } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const cleanHistory = chatHistory?.reverse().map((h: any) => ({
            role: h.role,
            content: h.content
        })) || [];

        const messages = [
            { role: 'system', content: fullPrompt + tasksContext + teamsContext },
            ...cleanHistory
        ];

        // Construction du message utilisateur (Texte ou Audio)
        if (audio) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message || "L'utilisateur parle." },
                    {
                        type: 'image_url',
                        image_url: {
                            url: audio.startsWith('data:') ? audio : `data:audio/wav;base64,${audio}`
                        }
                    }
                ] as any
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        // Appel à OpenRouter
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

        // Sauvegarder dans l'historique
        await supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: message || (audio ? "[Audio Message]" : "") },
            { user_id: user.id, role: 'assistant', content: assistantMessageStr }
        ]);

        // Traiter les actions via extraction du bloc JSON
        const actionsPerformed: any[] = [];
        try {
            let jsonString = "";
            const jsonBlockMatch = assistantMessageStr.match(/```json([\s\S]*?)```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
                jsonString = jsonBlockMatch[1];
            } else {
                const arrayMatch = assistantMessageStr.match(/\[\s*\{[\s\S]*"action":[\s\S]*\}\s*\]/);
                if (arrayMatch) jsonString = arrayMatch[0];
            }

            if (jsonString) {
                const actionsData = JSON.parse(jsonString);
                const actionsList = Array.isArray(actionsData) ? actionsData : [actionsData];

                for (const actionData of actionsList) {
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
                                if (!error && newTask) actionsPerformed.push({ type: 'task_created', task: newTask });
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
                                if (!error && updatedTask) actionsPerformed.push({ type: 'task_updated', task: updatedTask });
                            }
                            break;

                        case 'delete_task':
                            if (actionData.id) {
                                const { error } = await supabase.from('tasks').delete().eq('id', actionData.id).eq('user_id', user.id);
                                if (!error) actionsPerformed.push({ type: 'task_deleted', id: actionData.id });
                            }
                            break;

                        case 'delete_all_tasks':
                            const { error: delError } = await supabase.from('tasks').delete().eq('user_id', user.id);
                            if (!delError) actionsPerformed.push({ type: 'all_tasks_deleted' });
                            break;

                        case 'create_team_task':
                            if (actionData.title && actionData.team_id) {
                                const { data: newTeamTask, error } = await supabase
                                    .from('tasks')
                                    .insert([{
                                        user_id: user.id, // Créateur
                                        team_id: actionData.team_id, // Assigné à l'équipe
                                        title: actionData.title,
                                        description: actionData.description || null,
                                        priority: actionData.priority || 'medium',
                                        due_date: actionData.due_date || null,
                                        status: 'todo'
                                    }])
                                    .select()
                                    .single();

                                if (!error && newTeamTask) {
                                    actionsPerformed.push({ type: 'task_created', task: newTeamTask });
                                }
                            }
                            break;

                        case 'create_team':
                            if (actionData.name) {
                                // 1. Créer l'équipe
                                const { data: newTeam, error: teamError } = await supabase
                                    .from('teams')
                                    .insert([{ name: actionData.name, created_by: user.id }])
                                    .select()
                                    .single();

                                if (!teamError && newTeam) {
                                    // 2. Ajouter le créateur comme propriétaire
                                    await supabase
                                        .from('memberships')
                                        .insert([{ team_id: newTeam.id, user_id: user.id, role: 'owner' }]);

                                    actionsPerformed.push({ type: 'team_created', team: newTeam });
                                }
                            }
                            break;

                        case 'delete_team':
                            if (actionData.id) {
                                const { error } = await supabase
                                    .from('teams')
                                    .delete()
                                    .eq('id', actionData.id)
                                    .eq('created_by', user.id); // Sécurité simple

                                if (!error) {
                                    actionsPerformed.push({ type: 'team_deleted', id: actionData.id });
                                }
                            }
                            break;

                        case 'mark_notification_read':
                            if (actionData.id) {
                                // Note: La table notifications n'existe pas encore dans ce contexte, 
                                // mais c'est prévu pour la phase 6. On met le squelette.
                                /* 
                                const { error } = await supabase
                                    .from('notifications')
                                    .update({ read: true })
                                    .eq('id', actionData.id)
                                    .eq('user_id', user.id);
                                */
                                actionsPerformed.push({ type: 'notification_read', id: actionData.id });
                            }
                            break;

                        case 'mark_all_notifications_read':
                            /*
                            await supabase
                                .from('notifications')
                                .update({ read: true })
                                .eq('user_id', user.id);
                            */
                            actionsPerformed.push({ type: 'all_notifications_read' });
                            break;
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
