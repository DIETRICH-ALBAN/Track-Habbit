"use client";

import { useState } from "react";
import { X, Users, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

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
        } catch (err: any) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md glass-morphism p-8 space-y-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-outfit font-bold gradient-text">Nouvelle Équipe</h2>
                    <p className="text-white/40 text-sm">Créez une équipe pour collaborer avec d&apos;autres.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Nom de l&apos;équipe *</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="Ex: Marketing, Dev Team..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Users className="w-5 h-5" />}
                        <span>Créer l&apos;équipe</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
