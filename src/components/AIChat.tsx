"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, CheckCircle2, Sparkles, Pencil, Trash2, X } from "lucide-react";
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
    initialMessage?: string;
    onMessageProcessed?: () => void;
    onClose?: () => void;
}

export default function AIChat({ onTaskCreated, initialMessage, onMessageProcessed, onClose }: AIChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (initialMessage && !loading && historyLoaded) {
            handleSendMessage(initialMessage);
            if (onMessageProcessed) onMessageProcessed();
        }
    }, [initialMessage, loading, historyLoaded, onMessageProcessed]);

    const handleSendMessage = async (text: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        if (input === text) setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage.content }),
                credentials: 'include'
            });

            if (response.status === 401) {
                setLoading(false);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: "Votre session a expiré. Veuillez recharger la page pour vous reconnecter."
                }]);
                return;
            }

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

            if (data.actions && data.actions.length > 0 && onTaskCreated) {
                onTaskCreated();
            }

        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `Désolé, j'ai rencontré une erreur : ${error.message}.`
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        handleSendMessage(input);
        setInput("");
    };

    const cleanContent = (content: string) => {
        return content.replace(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g, '').trim();
    };

    const renderActionIndicators = (actions?: ActionPerformed[]) => {
        if (!actions || actions.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-3">
                {actions.map((action, i) => {
                    switch (action.type) {
                        case 'task_created':
                            return (
                                <div key={i} className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Tâche créée</span>
                                </div>
                            );
                        case 'task_updated':
                            return (
                                <div key={i} className="flex items-center gap-1.5 text-xs bg-[var(--accent-purple)]/10 text-[var(--accent-purple-light)] px-2.5 py-1 rounded-full border border-[var(--accent-purple)]/20">
                                    <Pencil className="w-3 h-3" />
                                    <span>Tâche modifiée</span>
                                </div>
                            );
                        case 'task_deleted':
                            return (
                                <div key={i} className="flex items-center gap-1.5 text-xs bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
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
        <aside className="w-full max-w-2xl mx-auto flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[var(--bg-primary)] rounded-full" />
                    </div>
                    <div>
                        <h2 className="heading-display text-xl">Track Habbit AI</h2>
                        <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Gemini 2.0 • En ligne
                        </p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
                    >
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 card p-6 mb-4 overflow-y-auto space-y-4">
                {messages.length === 0 && historyLoaded && (
                    <div className="text-center py-12">
                        <div className="icon-box w-16 h-16 mx-auto mb-4">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <p className="text-[var(--text-muted)] text-sm">
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
                                ? "text-white rounded-br-md"
                                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-bl-md"
                                }`}
                            style={msg.role === "user" ? { background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' } : {}}
                        >
                            {cleanContent(msg.content)}
                            {renderActionIndicators(msg.actions)}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent-purple)]" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="card p-2 flex gap-2">
                <input
                    type="text"
                    placeholder="Créer une tâche, poser une question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="btn-primary px-4 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>

            <p className="text-[11px] text-[var(--text-muted)] text-center mt-4">
                Essayez : "Crée une tâche pour finir le rapport demain"
            </p>
        </aside>
    );
}
