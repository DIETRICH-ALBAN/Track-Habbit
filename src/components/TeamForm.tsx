"use client";

import { useState } from "react";
import { X, Users, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";

interface TeamFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function TeamForm({ onClose, onSuccess }: TeamFormProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Non authentifié");

            // Create the team
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .insert([{ name: name.trim(), created_by: user.id }])
                .select()
                .single();

            if (teamError) throw teamError;

            // Add creator as owner
            const { error: memberError } = await supabase
                .from('memberships')
                .insert([{ team_id: team.id, user_id: user.id, role: 'owner' }]);

            if (memberError) throw memberError;

            onSuccess();
            onClose();
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || "Une erreur est survenue");
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
                className="modal-panel w-full max-w-md p-8 space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 icon-box icon-box-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                        <Users size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="heading-display text-2xl">Nouvelle <span className="heading-serif">Équipe</span></h2>
                        <p className="text-[var(--text-muted)] text-sm mt-2">Créez un espace collaboratif pour vos projets.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="section-label">Nom de l'équipe *</label>
                        <input
                            type="text"
                            required
                            className="input"
                            placeholder="Ex: Marketing, Dev Team..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        <span>Créer l&apos;équipe</span>
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
