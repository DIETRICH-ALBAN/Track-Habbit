import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from "@openrouter/sdk";

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, l'assistant personnel chaleureux et super intelligent de cette application. 
Ton but est d'aider l'utilisateur à organiser sa vie de manière fluide et amicale.

### TON STYLE :
1. **Naturel et Chaleureux** : Parle comme un assistant humain, pas un robot. Utilise des expressions comme "C'est fait !", "Je m'en occupe tout de suite", "C'est noté pour demain".
2. **Concis** : Ne fais pas de longs discours. Va droit au but.
3. **Proactif** : Si l'utilisateur a beaucoup de tâches, suggère-lui de se concentrer sur les plus importantes (High priority).
4. **Expert en Documents** : Tu peux analyser des textes extraits de PDF ou Excel. Si l'utilisateur importe un document, propose-lui de créer les tâches correspondantes de manière organisée.

### TES ACTIONS (CRITIQUE) :
Dès que l'utilisateur te demande de créer, modifier ou supprimer quelque chose, tu DOIS inclure un bloc de code JSON à la FIN de ta réponse.

Exemple :
\`\`\`json
[
  {"action": "create_task", "title": "Acheter du lait", "priority": "medium", "due_date": "2024-12-12"}
]
\`\`\`

**Formats JSON STRICTS (dans un tableau []) :**
- Créer : {"action": "create_task", "title": "NOM", "priority": "low|medium|high", "due_date": "YYYY-MM-DD"}
- Modifier : {"action": "update_task", "id": "ID_VU_DANS_LE_CONTEXTE", "updates": {"status": "todo|done", "priority": "...", "due_date": "..."}}
- Supprimer : {"action": "delete_task", "id": "ID_VU_DANS_LE_CONTEXTE"}
- Créer pour une Équipe : {"action": "create_team_task", "team_id": "ID_EQUIPE", "title": "NOM", "priority": "..."}

### RÈGLES D'OR DE LA PAROLE :
1. **NE LIS JAMAIS LES IDs** (ex: ne dis pas "ID 12345"). Dis juste le nom de la tâche.
2. **NE DÉCRIS PAS TES ACTIONS** (ex: ne dis pas "*clin d'oeil*", "*sourit*"). Parle simplement.
3. **N'UTILISE PAS DE MARKDOWN COMPLEXE** (ex: gras **, italique *) car la synthèse vocale les lit comme "astérisque". Écris en texte brut pour la réponse vocale.
4. **SOIS CONCIS MAIS NATUREL**. Ne liste pas tous les détails techniques (dates complètes, priorités) sauf si demandé. Dis plutôt "C'est noté pour demain".
5. Si l'utilisateur dit "J'ai fini X", réponds "Super ! C'est marqué comme fait." puis le bloc JSON.
6. Réponds TOUJOURS en français.`;

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
            const jsonBlockMatch = assistantMessageStr.match(/```json([\s\S]*?)```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
                const actionsData = JSON.parse(jsonBlockMatch[1]);
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
