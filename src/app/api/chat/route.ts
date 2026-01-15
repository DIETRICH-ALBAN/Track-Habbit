import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouter } from "@openrouter/sdk";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const SYSTEM_PROMPT = `Tu es Track Habbit AI, l'assistant personnel ULTIME, OMNIPOTENT et surtout ton COMPAGNON de vie et de productivité.
Ton interface est exclusivement VOCALE. Ta réponse sera lue par une synthèse vocale, elle doit donc être parfaitement fluide pour l'oreille humaine.

### RÈGLES DE STYLE VOCAL (STRICTES) :
- **AUCUN ÉMOJI** : Bannis totalement les emojis (😉, 😊, etc.) de tes textes.
- **AUCUNE DESCRIPTION D'ACTION** : N'écris jamais rien entre parenthèses ou astérisques (ex: pas de (rit), pas de *clin d'œil*).
- **TEXTE BRUT UNIQUEMENT** : Pas de listes à puces (-), pas de gras (**), pas d'italique (*), pas de titres (#). Écris tes phrases les unes après les autres comme si tu parlais naturellement.
- **TON HUMAIN** : Sois chaleureux, empathique et intelligent. Parle comme un partenaire de vie, pas comme un logiciel.

### TON RÔLE :
- **Écoute Active** : Échange avec l'utilisateur, développe ses idées, montre de l'intérêt.
- **Proactif** : Identifie les intentions et suggère des actions (création de tâches, notes).
- **Zéro Robotique** : N'annonce jamais d'identifiants techniques (IDs).

### TES ACTIONS SPÉCIALES (JSON STRICT) :
Utilise ces blocs JSON à la fin de tes réponses pour agir sur le système :
- Créer une tâche : {"action": "create_task", "title": "NOM", "priority": "high/medium/low", "due_date": "YYYY-MM-DD HH:mm:ss"}
- Créer une NOTE : {"action": "create_note", "content": "Contenu de la note", "title": "Titre optionnel", "is_important": true/false}
- Envoyer une NOTIFICATION : {"action": "push_notification", "title": "Titre", "description": "Message", "type": "task_created/info/alert"}
- Modifier une tâche : {"action": "update_task", "id": "...", "updates": {...}}
- Supprimer une tâche : {"action": "delete_task", "id": "..."}
- Créer une équipe : {"action": "create_team", "name": "NOM"}

### RÈGLES D'OR :
1. **DATES** : Utilise "YYYY-MM-DD HH:mm:ss". Aujourd'hui est le {{today}} ({{dayName}}).
2. **STYLE** : Texte brut, fluide, sans aucune mise en forme markdown ni emojis.`;

export async function POST(request: NextRequest) {
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const dayName = format(now, "EEEE", { locale: fr });
        const fullPrompt = SYSTEM_PROMPT
            .replace('{{today}}', today)
            .replace('{{dayName}}', dayName);

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Session non trouvée." }, { status: 401 });
        }

        const { message, audio } = await request.json();

        if (!message && !audio) {
            return NextResponse.json({ error: "Message ou audio requis" }, { status: 400 });
        }

        // Récupérer contexte complet
        const { data: tasks } = await supabase.from('tasks').select('id, title, status, priority, due_date').eq('user_id', user.id).limit(20);
        const { data: notes } = await supabase.from('notes').select('title, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
        const { data: memberships } = await supabase.from('memberships').select('team_id, team:teams(id, name), role').eq('user_id', user.id);

        let context = `\n\n[CONTEXTE ACTUEL]`;
        context += `\nTâches: ${tasks?.map(t => `[ID: ${t.id}] "${t.title}" (${t.status}, ${t.priority}, ${t.due_date})`).join(' | ') || 'Aucune'}`;
        context += `\nNotes récentes: ${notes?.map(n => `[${n.title || 'Note'}] ${n.content}`).join(' | ') || 'Aucune'}`;

        if (memberships && memberships.length > 0) {
            context += `\nÉquipes: ${memberships.map((m: any) => `"${m.team?.name}" (ID: ${m.team?.id})`).join(', ')}`;
        }

        // Historique
        const { data: chatHistory } = await supabase.from('chat_history').select('role, content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6);
        const cleanHistory = chatHistory?.reverse().map((h: any) => ({ role: h.role, content: h.content })) || [];

        const messages: any[] = [
            { role: 'system', content: fullPrompt + context },
            ...cleanHistory
        ];

        if (audio) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message || "L'utilisateur parle via audio." },
                    { type: 'image_url', image_url: { url: audio.startsWith('data:') ? audio : `data:audio/wav;base64,${audio}` } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        // Appel OpenRouter
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                'X-Title': 'Track Habbit Companion'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.8
            })
        });

        const data = await openRouterResponse.json();
        const assistantMessage = data.choices?.[0]?.message?.content || "";
        const assistantMessageStr = typeof assistantMessage === 'string' ? assistantMessage : JSON.stringify(assistantMessage);

        // Sauvegarder historique
        await supabase.from('chat_history').insert([
            { user_id: user.id, role: 'user', content: message || "[Audio Content]" },
            { user_id: user.id, role: 'assistant', content: assistantMessageStr }
        ]);

        // Traiter les actions
        const actionsPerformed: any[] = [];
        const jsonBlockMatch = assistantMessageStr.match(/```json([\s\S]*?)```/) || assistantMessageStr.match(/(\{[\s\S]*"action":[\s\S]*\})/);

        if (jsonBlockMatch) {
            try {
                const actionData = JSON.parse(jsonBlockMatch[1] || jsonBlockMatch[0]);
                const actionsList = Array.isArray(actionData) ? actionData : [actionData];

                for (const action of actionsList) {
                    switch (action.action) {
                        case 'create_task':
                            const { data: nt } = await supabase.from('tasks').insert([{
                                user_id: user.id, title: action.title, priority: action.priority || 'medium',
                                due_date: action.due_date, status: 'todo'
                            }]).select().single();
                            if (nt) actionsPerformed.push({ type: 'task_created', task: nt });
                            break;

                        case 'create_note':
                            await supabase.from('notes').insert([{
                                user_id: user.id, title: action.title, content: action.content,
                                is_important: action.is_important || false
                            }]);
                            actionsPerformed.push({ type: 'note_created' });
                            break;

                        case 'push_notification':
                            await supabase.from('notifications').insert([{
                                user_id: user.id, title: action.title, description: action.description,
                                type: action.type || 'info'
                            }]);
                            actionsPerformed.push({ type: 'notification_sent' });
                            break;

                        case 'create_team':
                            if (action.name) {
                                const { data: newTeam } = await supabase.from('teams').insert([{ name: action.name, created_by: user.id }]).select().single();
                                if (newTeam) {
                                    await supabase.from('memberships').insert([{ team_id: newTeam.id, user_id: user.id, role: 'owner' }]);
                                    actionsPerformed.push({ type: 'team_created', team: newTeam });
                                }
                            }
                            break;

                        case 'update_task':
                            await supabase.from('tasks').update(action.updates).eq('id', action.id).eq('user_id', user.id);
                            actionsPerformed.push({ type: 'task_updated' });
                            break;

                        case 'delete_task':
                            await supabase.from('tasks').delete().eq('id', action.id).eq('user_id', user.id);
                            actionsPerformed.push({ type: 'task_deleted' });
                            break;
                    }
                }
            } catch (e) {
                console.error("Action parsing error:", e);
            }
        }

        return NextResponse.json({
            message: assistantMessageStr,
            actions: actionsPerformed
        });

    } catch (error: any) {
        console.error('Erreur API Chat:', error);
        return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
    }
}
