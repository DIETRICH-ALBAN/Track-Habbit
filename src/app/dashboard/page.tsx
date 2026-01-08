"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { CheckCircle2, LogOut } from "lucide-react";

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
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold font-outfit">Track Habbit</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Déconnexion</span>
                    </button>
                </header>

                <main className="glass-morphism p-8">
                    <h2 className="text-3xl font-bold mb-4">Bienvenue, {user?.email} !</h2>
                    <p className="text-white/60">
                        Votre espace personnel est prêt. Nous allons maintenant configurer vos tâches et votre agent IA.
                    </p>
                </main>
            </div>
        </div>
    );
}
