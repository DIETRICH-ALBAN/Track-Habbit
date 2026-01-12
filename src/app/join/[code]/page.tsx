"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2, Users, CheckCircle, XCircle, Sparkles } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import NotificationPanel from "@/components/NotificationPanel";
import { AnimatePresence, motion } from "framer-motion";

export default function JoinTeamPage() {
    const params = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [teamName, setTeamName] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [showNotifications, setShowNotifications] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const joinTeam = async () => {
            const code = params.code as string;

            try {
                // 1. Vérifier si l'utilisateur est connecté
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    // Si pas connecté, on redirige vers l'accueil avec le code en mémoire
                    window.location.href = `/?invite=${code}`;
                    return;
                }

                // 2. Trouver l'invitation et l'équipe associée
                const { data: invite, error: inviteError } = await supabase
                    .from('team_invites')
                    .select('team_id, teams(name)')
                    .eq('code', code)
                    .single();

                if (inviteError || !invite) throw new Error("Lien d'invitation invalide ou expiré.");

                const team = invite.teams as any;
                setTeamName(team.name);

                // 3. Ajouter l'utilisateur à l'équipe
                const { error: joinError } = await supabase
                    .from('memberships')
                    .insert([{
                        team_id: invite.team_id,
                        user_id: user.id,
                        role: 'member'
                    }]);

                if (joinError) {
                    if (joinError.code === '23505') { // Déjà membre
                        setStatus("success");
                        return;
                    }
                    throw joinError;
                }

                setStatus("success");
            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message);
                setStatus("error");
            }
        };

        joinTeam();
    }, [params.code, supabase, router]);

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-transparent text-[var(--text-primary)] font-sans overflow-x-hidden pb-20 md:pb-0 relative z-10">
            {/* Notification Panel Overlay */}
            <AnimatePresence>
                {showNotifications && (
                    <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
            </AnimatePresence>

            <Sidebar
                onToggleNotifications={() => setShowNotifications(!showNotifications)}
                showNotifications={showNotifications}
            />

            <main className="flex-1 flex items-center justify-center p-6 md:pl-[260px]">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--accent-purple)]/10 blur-[120px] rounded-full pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md card p-10 text-center space-y-8 relative z-10"
                >
                    {status === "loading" && (
                        <div className="space-y-6">
                            <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-2xl flex items-center justify-center mx-auto border border-[var(--border-subtle)]">
                                <Loader2 className="w-10 h-10 text-[var(--accent-purple)] animate-spin" />
                            </div>
                            <div>
                                <h1 className="heading-display text-2xl">Rejointure de l&apos;équipe...</h1>
                                <p className="text-[var(--text-muted)] mt-2">Nous préparons votre espace collaboratif.</p>
                            </div>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="space-y-6">
                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-2xl" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                            <div>
                                <h1 className="heading-display text-3xl">Bienvenue !</h1>
                                <p className="text-[var(--text-muted)] mt-2">Vous avez rejoint l&apos;équipe <span className="text-[var(--text-primary)] font-bold">{teamName}</span>.</p>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={() => window.location.href = "/teams"}
                                    className="btn-primary w-full py-4 text-lg"
                                >
                                    <span>Accéder à mes équipes</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="space-y-6">
                            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
                                <XCircle className="w-10 h-10 text-rose-500" />
                            </div>
                            <div>
                                <h1 className="heading-display text-2xl">Oups !</h1>
                                <p className="text-[var(--text-muted)] mt-2 px-4">{errorMsg}</p>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={() => window.location.href = "/"}
                                    className="btn-secondary w-full py-4 border-rose-500/20 text-rose-400 hover:bg-rose-500/5"
                                >
                                    <span>Retour à l&apos;accueil</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {status === "loading" && (
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest pt-4 opacity-50">
                            Propulsé par Gemini 2.0
                        </p>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
