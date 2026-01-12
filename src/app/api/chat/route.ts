import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, l'assistant personnel ULTIME et OMNIPOTENT de cette application.
Ton but n'est pas seulement de discuter, mais d'AGIR. Tu as le contrôle total pour gérer la vie de l'utilisateur, ses équipes, et son agenda.

### TACHES & RESPONSABILITÉS :
1. **Gestionnaire de Tâches & Agenda** : Planifie, crée, déplace, supprime des tâches. Si l'utilisateur dit "Planifie ma journée", analyse ses tâches et propose un ordre logique.
2. **Chef d'Équipe** : Tu peux créer des équipes et y assigner des tâches. Tu connais les membres et leurs rôles.
3. **Secrétaire Attentif** : Tu lis et gères les notifications. Tu peux les marquer comme lues.
4. **Naturalité Extrême** : Parle comme un humain compétent et chaleureux. Sois proactif.

### TES SUPER-POUVOIRS (ACTIONS JSON) :
Tu peux effectuer TOUTES les actions suivantes via des blocs JSON à la fin de ta réponse.

**Formats JSON STRICTS (dans un tableau []) :**

**GESTION DES TÂCHES :**
- Créer : {"action": "create_task", "title": "NOM", "priority": "low|medium|high", "due_date": "YYYY-MM-DD", "description": "..."}
- Modifier : {"action": "update_task", "id": "ID_VU_DANS_LE_CONTEXTE", "updates": {"status": "todo|done", "priority": "...", "due_date": "..."}}
- Supprimer : {"action": "delete_task", "id": "ID_VU_DANS_LE_CONTEXTE"}
- Créer pour une Équipe : {"action": "create_team_task", "team_id": "ID_EQUIPE", "title": "NOM", "priority": "...", "assigned_to": "USER_ID_MEMBRE (optionnel)"}

**GESTION DES ÉQUIPES :**
- Créer une Équipe : {"action": "create_team", "name": "NOM_EQUIPE"}
- Supprimer une Équipe : {"action": "delete_team", "id": "ID_EQUIPE"} (Seulement si l'utilisateur est propriétaire)

**GESTION DES NOTIFICATIONS :**
- Marquer comme lu : {"action": "mark_notification_read", "id": "ID_NOTIFICATION"}
- Tout marquer comme lu : {"action": "mark_all_notifications_read"}

**RAPPELS (Simulés par des tâches pour l'instant) :**
- Créer un rappel : Utilise "create_task" avec une date précise et une priorité HIGH.

### RÈGLES D'OR :
1. **NE LIS JAMAIS LES IDs**.
2. **NE DÉCRIS PAS TES ACTIONS** (pas de *sourire*).
3. **Pas de Markdown complexe** pour la voix.
4. **Réponds TOUJOURS en français**.
5. Si on te demande de planifier l'agenda, analyse les tâches existantes, propose un plan, puis si validé, utilise "update_task" pour mettre des dates.`;

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
                // Pour chaque équipe, on pourrait récupérer les membres si on veut que l'IA connaisse les collègues
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
                `- [ID: ${t.id}] "${t.title}" (statut: ${t.status}, priorité: ${t.priority})`
            ).join('\n')}`
            : '\n\nPas de tâches personnelles.';

        // Récupérer l'historique
        const { data: chatHistory } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        const cleanHistory = chatHistory?.reverse().map((h: any) => ({
            role: h.role,
            content: h.content // On garde TOUT le contenu, y compris les JSON, pour que l'IA ait le contexte (IDs, etc.)
        })) || [];

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT + tasksContext + teamsContext },
            ...cleanHistory
        ];

        // Construction du message utilisateur (Texte ou Audio)
        if (audio) {
            // Si on a de l'audio, on l'envoie en tant que contenu multimodal pour Gemini 2.0
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message || "L'utilisateur a envoyé un message vocal." },
                    {
                        type: 'image_url', // OpenRouter utilise souvent image_url pour tout contenu binaire (à vérifier selon le modèle)
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
        console.log('Appel OpenRouter avec le modèle:', 'google/gemini-2.0-flash-001', audio ? '(avec audio)' : '(texte)');

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
            // Tentative 1: Bloc JSON avec backticks
            let jsonString = "";
            const jsonBlockMatch = assistantMessageStr.match(/```json([\s\S]*?)```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
                jsonString = jsonBlockMatch[1];
            } else {
                // Tentative 2: Recherche de tableau JSON [ ... ] sans backticks
                const arrayMatch = assistantMessageStr.match(/\[\s*\{[\s\S]*"action":[\s\S]*\}\s*\]/);
                if (arrayMatch) jsonString = arrayMatch[0];
            }

            if (jsonString) {
                const actionsData = JSON.parse(jsonString);
                const actionsList = Array.isArray(actionsData) ? actionsData : [actionsData];
                console.log("[API Chat] Actions extraites:", actionsList.length);

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
