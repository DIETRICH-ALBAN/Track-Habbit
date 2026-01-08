"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2, Users, CheckCircle, XCircle } from "lucide-react";

export default function JoinTeamPage() {
    const params = useParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [teamName, setTeamName] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

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
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md glass-morphism p-8 text-center space-y-6">
                {status === "loading" && (
                    <>
                        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <h1 className="text-2xl font-bold">Rejointure de l'équipe...</h1>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold font-outfit">Félicitations !</h1>
                        <p className="text-white/60">Vous avez rejoint l'équipe <span className="text-white font-bold">{teamName}</span>.</p>
                        <button
                            onClick={() => window.location.href = "/teams"}
                            className="w-full bg-primary hover:bg-blue-600 py-4 rounded-xl font-bold transition-all shadow-lg"
                        >
                            Accéder à mes équipes
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <XCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold font-outfit">Oups !</h1>
                        <p className="text-white/60">{errorMsg}</p>
                        <button
                            onClick={() => window.location.href = "/"}
                            className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-xl font-bold transition-all border border-white/10"
                        >
                            Retour à l'accueil
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
