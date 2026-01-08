"use client";

import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { CreateTaskInput, TaskPriority } from "@/types/task";

interface TaskFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function TaskForm({ onClose, onSuccess }: TaskFormProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("medium");
    const [dueDate, setDueDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            const taskData: CreateTaskInput & { user_id: string; status: string } = {
                title: title.trim(),
                description: description.trim() || null,
                priority,
                due_date: dueDate || null,
                user_id: user.id,
                status: 'todo'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg glass-morphism p-8 space-y-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-outfit font-bold gradient-text">Nouvelle Tâche</h2>
                    <p className="text-white/40 text-sm">Ajoutez une nouvelle tâche à votre liste.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Titre *</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="Ex: Finaliser le rapport..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Description</label>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all resize-none h-24"
                            placeholder="Détails supplémentaires..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Priorité</label>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            >
                                <option value="low" className="bg-[#0a0a0a]">🟢 Basse</option>
                                <option value="medium" className="bg-[#0a0a0a]">🟡 Moyenne</option>
                                <option value="high" className="bg-[#0a0a0a]">🔴 Haute</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Échéance</label>
                            <input
                                type="date"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        <span>Créer la tâche</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
