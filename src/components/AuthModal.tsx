"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { LogIn, UserPlus, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralSphere } from "@/components/NeuralSphere";

export default function AuthModal({ onSuccess }: { onSuccess: () => void }) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "login") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    }
                });
                if (error) throw error;
                alert("Vérifiez vos emails pour confirmer votre inscription !");
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setGoogleLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent overflow-hidden">
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <NeuralSphere active={true} />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 z-1 bg-gradient-to-b from-[var(--bg-primary)]/80 via-transparent to-[var(--bg-primary)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-square bg-[var(--accent-purple)]/5 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                className="modal-panel w-full max-w-md p-10 space-y-8 relative z-10 mx-4"
            >
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ rotate: -10, scale: 0.9 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-2xl"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}
                    >
                        <Sparkles size={32} className="text-white" />
                    </motion.div>
                    <div>
                        <h2 className="heading-display text-3xl mb-2">
                            {mode === "login" ? "Track Habbit" : "Nouveau Compte"}
                        </h2>
                        <p className="text-[var(--text-muted)] text-sm px-4">
                            {mode === "login"
                                ? "Authentifiez-vous pour accéder à votre espace IA."
                                : "Commencez votre voyage vers une productivité augmentée."}
                        </p>
                    </div>
                </div>

                {/* Main Auth Section */}
                <div className="space-y-6">
                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        className="btn-secondary w-full py-4 text-sm font-semibold tracking-wide disabled:opacity-50 group"
                    >
                        {googleLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continuer avec Google</span>
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold">Ou via email</span>
                        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="section-label ml-1">Adresse Email</label>
                            <input
                                type="email"
                                required
                                className="input h-12"
                                placeholder="nom@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="section-label ml-1">Mot de passe</label>
                            <input
                                type="password"
                                required
                                className="input h-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full h-14 text-base disabled:opacity-50 shadow-xl"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                            <span>{mode === "login" ? "Se connecter" : "Créer mon compte"}</span>
                        </button>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="text-center space-y-6">
                    <button
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-purple-light)] transition-colors font-medium underline underline-offset-4 decoration-[var(--border-subtle)]"
                    >
                        {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà membre ? Se connecter"}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--text-muted)] uppercase tracking-widest opacity-40">
                        <ShieldCheck size={12} />
                        Système d&apos;authentification sécurisé
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
