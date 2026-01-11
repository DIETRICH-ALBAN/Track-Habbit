"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
    id: string;
    title: string;
    description: string;
    type: 'task_created' | 'task_completed' | 'team_update';
    created_at: string;
    read: boolean;
}

interface NotificationPanelProps {
    onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Here we could fetch real notifications from a table
        // For now, let's simulate by listening to Realtime task changes or showing a mock
        const fetchNotifications = async () => {
            // Simulated notifications for demo purposes
            // In a real app, you'd have a 'notifications' table
            setNotifications([
                {
                    id: '1',
                    title: 'Nouvelle tâche d\'équipe',
                    description: 'Un nouveau projet a été ajouté à l\'équipe Marketing.',
                    type: 'task_created',
                    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                    read: false
                },
                {
                    id: '2',
                    title: 'Tâche terminée',
                    description: 'La tâche "Rapport Hebdomadaire" a été marquée comme terminée.',
                    type: 'task_completed',
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                    read: true
                }
            ]);
            setLoading(false);
        };

        fetchNotifications();

        // Optional: Real-time listener for task changes
        const channel = supabase
            .channel('task-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
                const newTask = payload.new;
                const notification: Notification = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'Tâche ajoutée',
                    description: `Une nouvelle tâche "${newTask.title}" a été créée.`,
                    type: 'task_created',
                    created_at: new Date().toISOString(),
                    read: false
                };
                setNotifications(prev => [notification, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-black/90 backdrop-blur-2xl border-l border-white/10 z-[110] shadow-2xl flex flex-col"
        >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold font-outfit">Notifications</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-white/40" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${n.read ? 'bg-white/[0.02] border-white/5' : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-xl ${n.type === 'task_created' ? 'bg-blue-500/10 text-blue-500' :
                                        n.type === 'task_completed' ? 'bg-green-500/10 text-green-500' :
                                            'bg-purple-500/10 text-purple-500'
                                    }`}>
                                    {n.type === 'task_created' ? <Clock className="w-4 h-4" /> :
                                        n.type === 'task_completed' ? <CheckCircle2 className="w-4 h-4" /> :
                                            <Users className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-bold ${n.read ? 'text-white/60' : 'text-white'}`}>
                                        {n.title}
                                    </h3>
                                    <p className="text-xs text-white/40 mt-1 line-clamp-2 leading-relaxed">
                                        {n.description}
                                    </p>
                                    <span className="text-[10px] text-white/20 mt-2 block font-medium uppercase tracking-wider">
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                                    </span>
                                </div>
                                {!n.read && (
                                    <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/40 text-sm font-medium">Aucune notification pour le moment.</p>
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold text-white/60"
                    >
                        Tout marquer comme lu
                    </button>
                </div>
            )}
        </motion.div>
    );
}
