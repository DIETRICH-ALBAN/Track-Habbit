"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CheckCircle2, LogOut, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8 flex items-center justify-center">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-[var(--accent-purple)]/5 blur-[120px] pointer-events-none" />

            <div className="max-w-4xl w-full relative z-10">
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                            <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="heading-display text-2xl">Track Habbit AI</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-secondary text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Déconnexion</span>
                    </button>
                </header>

                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-12 text-center"
                >
                    <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-8 border border-[var(--border-subtle)] shadow-xl">
                        <Sparkles className="w-10 h-10 text-[var(--accent-purple)]" />
                    </div>

                    <h2 className="heading-display text-4xl mb-6">Bienvenue, <span className="heading-serif text-[var(--accent-purple-light)]">{user?.email}</span> !</h2>
                    <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
                        Votre espace personnel est prêt. Nous avons configuré l&apos;environnement pour une productivité maximale. L&apos;assistant IA est en ligne et prêt à vous aider.
                    </p>

                    <div className="mt-12 flex justify-center gap-4">
                        <a href="/" className="btn-primary px-8 py-3 text-lg">
                            Accéder au Dashboard
                        </a>
                    </div>
                </motion.main>

                <p className="text-center text-[var(--text-muted)] text-sm mt-8 opacity-50">
                    Propulsé par Gemini 2.0 & Next.js
                </p>
            </div>
        </div>
    );
}
