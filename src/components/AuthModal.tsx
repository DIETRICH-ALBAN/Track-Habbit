"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { LogIn, UserPlus, Loader2, Chrome } from "lucide-react";

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md glass-morphism p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-outfit font-bold gradient-text">
                        {mode === "login" ? "Bon retour !" : "Créer un compte"}
                    </h2>
                    <p className="text-white/40 text-sm">
                        {mode === "login" ? "Connectez-vous pour gérer vos tâches." : "Rejoignez-nous pour optimiser votre quotidien."}
                    </p>
                </div>

                {/* Google Login Button */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                    {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Continuer avec Google</span>
                        </>
                    )}
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30 uppercase tracking-widest">ou</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-white/30 ml-1">Mot de passe</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        <span>{mode === "login" ? "Se connecter" : "S'inscrire"}</span>
                    </button>
                </form>

                <div className="text-center pt-4">
                    <button
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-4"
                    >
                        {mode === "login" ? "Besoin d'un compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
                    </button>
                </div>
            </div>
        </div>
    );
}
