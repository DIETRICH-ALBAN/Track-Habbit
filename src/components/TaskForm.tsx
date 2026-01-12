"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2, Users, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CreateTaskInput, TaskPriority } from "@/types/task";
import { Team } from "@/types/team";
import { motion } from "framer-motion";

interface TaskFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function TaskForm({ onClose, onSuccess }: TaskFormProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [dueDate, setDueDate] = useState("");
    const [teamId, setTeamId] = useState<string>("");
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        const fetchTeams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: membershipData } = await supabase
                .from('memberships')
                .select('team:teams(*)')
                .eq('user_id', user.id);

            if (membershipData) {
                const userTeams = membershipData.map((m: any) => m.team).filter(Boolean);
                setTeams(userTeams);
            }
        };
        fetchTeams();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const taskData: any = {
                title: title.trim(),
                description: description.trim() || null,
                priority,
                due_date: dueDate || null,
                user_id: user.id,
                status: 'todo',
                team_id: teamId || null
            };

            const { error: insertError } = await supabase
                .from('tasks')
                .insert([taskData]);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center glass-overlay p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="modal-panel w-full max-w-lg p-8 space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 icon-box icon-box-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                        <Sparkles size={24} className="text-white" />
                    </div>
                    <h2 className="heading-display text-2xl">Nouvelle <span className="heading-serif">Tâche</span></h2>
                    <p className="text-[var(--text-muted)] text-sm">Ajoutez une nouvelle tâche à votre liste.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="section-label">Titre *</label>
                        <input
                            type="text"
                            required
                            className="input"
                            placeholder="Ex: Finaliser le rapport..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="section-label">Description</label>
                        <textarea
                            className="input resize-none h-24"
                            placeholder="Détails supplémentaires..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Priority & Due Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="section-label">Priorité</label>
                            <select
                                className="input appearance-none cursor-pointer"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            >
                                <option value="low" className="bg-[var(--bg-card)]">🟢 Basse</option>
                                <option value="medium" className="bg-[var(--bg-card)]">🟡 Moyenne</option>
                                <option value="high" className="bg-[var(--bg-card)]">🔴 Haute</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="section-label">Échéance</label>
                            <input
                                type="date"
                                className="input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Team Assignment */}
                    {teams.length > 0 && (
                        <div className="space-y-2">
                            <label className="section-label">Assigner à une équipe</label>
                            <div className="relative">
                                <select
                                    className="input appearance-none cursor-pointer pl-10"
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                >
                                    <option value="" className="bg-[var(--bg-card)]">Personnel (Aucune équipe)</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id} className="bg-[var(--bg-card)]">
                                            👥 {team.name}
                                        </option>
                                    ))}
                                </select>
                                <Users className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        <span>Créer la tâche</span>
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
