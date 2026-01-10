"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, CheckCircle2, Sparkles, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface ActionPerformed {
    type: 'task_created' | 'task_updated' | 'task_deleted';
    task?: any;
    id?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    taskCreated?: any;
    actions?: ActionPerformed[];
}

interface AIChatProps {
    onTaskCreated?: () => void;
}

export default function AIChat({ onTaskCreated }: AIChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Charger l'historique au montage
    useEffect(() => {
        const loadHistory = async () => {
            const { data } = await supabase
                .from('chat_history')
                .select('id, role, content, created_at')
                .order('created_at', { ascending: true })
                .limit(20);

            if (data) {
                setMessages(data.map(m => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content
                })));
            }
            setHistoryLoaded(true);
        };
        loadHistory();
    }, [supabase]);

    // Scroll automatique vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage.content })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
                taskCreated: data.taskCreated,
                actions: data.actions || []
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Notifier le parent si une action a été effectuée
            if (data.actions && data.actions.length > 0 && onTaskCreated) {
                onTaskCreated();
            }

        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `Désolé, j'ai rencontré une erreur : ${error.message}. Veuillez vérifier votre connexion ou vous reconnecter.`
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    // Nettoyer le contenu pour enlever tous les blocs JSON d'action
    const cleanContent = (content: string) => {
        return content.replace(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g, '').trim();
    };

    // Afficher les indicateurs d'action
    const renderActionIndicators = (actions?: ActionPerformed[]) => {
        if (!actions || actions.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {actions.map((action, i) => {
                    switch (action.type) {
                        case 'task_created':
                            return (
                                <div key={i} className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Tâche créée</span>
                                </div>
                            );
                        case 'task_updated':
                            return (
                                <div key={i} className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                                    <Pencil className="w-3 h-3" />
                                    <span>Tâche modifiée</span>
                                </div>
                            );
                        case 'task_deleted':
                            return (
                                <div key={i} className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                                    <Trash2 className="w-3 h-3" />
                                    <span>Tâche supprimée</span>
                                </div>
                            );
                        default:
                            return null;
                    }
                })}
            </div>
        );
    };

    return (
        <aside className="w-full md:w-96 border-l border-white/10 glass-morphism flex flex-col p-6 m-4 rounded-[32px]">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-blue-400 rounded-full animate-pulse blur-[2px] opacity-50 absolute inset-0" />
                    <div className="w-12 h-12 bg-gradient-to-tr from-primary to-blue-400 rounded-full relative z-10 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full z-20" />
                </div>
                <div>
                    <h2 className="font-bold text-lg font-outfit">Track Habbit AI</h2>
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Gemini 2.0 • En ligne</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 bg-white/[0.03] rounded-[24px] p-4 mb-4 overflow-y-auto border border-white/5 space-y-4">
                {messages.length === 0 && historyLoaded && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="w-8 h-8 text-primary/50" />
                        </div>
                        <p className="text-white/30 text-sm">
                            Bonjour ! Posez-moi une question ou demandez-moi de créer une tâche.
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-primary text-white"
                                : "bg-white/5 text-white/80 border border-white/10"
                                }`}
                        >
                            {cleanContent(msg.content)}

                            {/* Afficher les actions effectuées */}
                            {renderActionIndicators(msg.actions)}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                <input
                    type="text"
                    placeholder="Créer une tâche, poser une question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-sm placeholder:text-white/20"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="bg-primary p-3 rounded-xl hover:bg-blue-600 transition-all text-white shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>

            <p className="text-[10px] text-white/20 text-center mt-3">
                Essayez : "Crée une tâche pour finir le rapport demain"
            </p>
        </aside>
    );
}
