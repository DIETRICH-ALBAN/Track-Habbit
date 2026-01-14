"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Clock, Users, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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
        const fetchNotifications = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data as Notification[]);
            }
            setLoading(false);
        };

        fetchNotifications();

        // Real-time subscription for notifications
        const channel = supabase
            .channel('notifications-live')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${(supabase.auth.getUser() as any).data?.user?.id}`
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev]);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications'
            }, (payload) => {
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const markAsRead = async (id: string) => {
        // Update UI immediately
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        // Update DB
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id);
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'task_created':
                return { bg: 'bg-[var(--accent-purple)]/10', text: 'text-[var(--accent-purple-light)]' };
            case 'task_completed':
                return { bg: 'bg-emerald-500/10', text: 'text-emerald-400' };
            case 'team_update':
                return { bg: 'bg-[var(--accent-teal)]/10', text: 'text-[var(--accent-teal-light)]' };
            default:
                return { bg: 'bg-white/5', text: 'text-white/60' };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-y-0 right-0 w-full md:w-[420px] bg-[var(--bg-card)] border-l border-[var(--border-subtle)] z-[110] flex flex-col"
        >
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="icon-box">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="heading-display text-lg">Notifications</h2>
                        <p className="text-xs text-[var(--text-muted)]">{notifications.filter(n => !n.read).length} non lues</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="icon-box icon-box-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((n) => {
                        const styles = getTypeStyles(n.type);
                        return (
                            <div
                                key={n.id}
                                onClick={() => markAsRead(n.id)}
                                className={`p-4 rounded-[20px] transition-all border border-white/5 cursor-pointer backdrop-blur-md ${!n.read ? 'border-[var(--accent-cyan)]/30' : ''}`}
                                style={{ background: 'var(--bg-glass-gradient)' }}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-xl ${styles.bg} ${styles.text}`}>
                                        {n.type === 'task_created' ? <Clock size={16} /> :
                                            n.type === 'task_completed' ? <CheckCircle2 size={16} /> :
                                                <Users size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`text-sm font-bold ${n.read ? 'text-[var(--text-secondary)]' : 'text-white'}`}>
                                            {n.title}
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                                            {n.description}
                                        </p>
                                        <span className="text-[10px] text-[var(--accent-tan)] mt-2 block uppercase tracking-wider font-bold">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>
                                    {!n.read && (
                                        <div className="w-2 h-2 bg-[var(--accent-cyan)] rounded-full mt-1.5 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16">
                        <div className="icon-box w-16 h-16 mx-auto mb-4">
                            <Bell size={24} />
                        </div>
                        <p className="text-[var(--text-muted)] text-sm">Aucune notification pour le moment.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="p-4 border-t border-[var(--border-subtle)]">
                    <button
                        onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                        className="btn-secondary w-full"
                    >
                        Tout marquer comme lu
                    </button>
                </div>
            )}
        </motion.div>
    );
}
