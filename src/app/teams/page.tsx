"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, UserPlus, Crown, Shield, User, Trash2, ArrowLeft, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import TeamForm from "@/components/TeamForm";
import { Team, Membership, MemberRole } from "@/types/team";

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const supabase = createClient();

    const fetchTeams = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Get all memberships for current user
        const { data: membershipData } = await supabase
            .from('memberships')
            .select('*, team:teams(*)')
            .eq('user_id', user.id);

        if (membershipData) {
            setMemberships(membershipData);
            const userTeams = membershipData.map(m => m.team).filter(Boolean);
            setTeams(userTeams);
        }
        setLoading(false);
    }, [supabase]);

    const fetchTeamMembers = useCallback(async (teamId: string) => {
        const { data } = await supabase
            .from('memberships')
            .select('*')
            .eq('team_id', teamId);

        if (data) {
            // Get user emails from auth (we'll use user_id for now)
            setTeamMembers(data);
        }
    }, [supabase]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamMembers(selectedTeam.id);
        }
    }, [selectedTeam, fetchTeamMembers]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !selectedTeam) return;

        setInviteLoading(true);
        setInviteError(null);

        try {
            // For now, we'll create a membership with email lookup
            // In production, you'd send an invite email
            const { data: users } = await supabase
                .from('auth.users')
                .select('id')
                .eq('email', inviteEmail.trim())
                .single();

            // Since we can't query auth.users directly, we'll just show instructions
            setInviteError("Pour inviter quelqu'un, partagez le nom de l'équipe. L'utilisateur devra vous communiquer son ID pour être ajouté.");

        } catch (err: any) {
            setInviteError(err.message || "Une erreur est survenue");
        } finally {
            setInviteLoading(false);
        }
    };

    const removeMember = async (membershipId: string) => {
        const { error } = await supabase
            .from('memberships')
            .delete()
            .eq('id', membershipId);

        if (!error && selectedTeam) {
            fetchTeamMembers(selectedTeam.id);
        }
    };

    const deleteTeam = async (teamId: string) => {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);

        if (!error) {
            setSelectedTeam(null);
            fetchTeams();
        }
    };

    const getRoleIcon = (role: MemberRole) => {
        switch (role) {
            case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
            case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
            default: return <User className="w-4 h-4 text-white/40" />;
        }
    };

    const getRoleLabel = (role: MemberRole) => {
        switch (role) {
            case 'owner': return 'Propriétaire';
            case 'admin': return 'Admin';
            default: return 'Membre';
        }
    };

    const getUserRole = (teamId: string): MemberRole | null => {
        const membership = memberships.find(m => m.team_id === teamId);
        return membership?.role || null;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    // Team Detail View
    if (selectedTeam) {
        const userRole = getUserRole(selectedTeam.id);
        const isOwner = userRole === 'owner';

        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => setSelectedTeam(null)}
                        className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Retour aux équipes</span>
                    </button>

                    <header className="mb-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center">
                                <Users className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold font-outfit">{selectedTeam.name}</h1>
                                <p className="text-white/40 text-sm">{teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </header>

                    {/* Invite Section */}
                    {(isOwner || userRole === 'admin') && (
                        <section className="glass-morphism p-6 mb-8">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-primary" />
                                Inviter un membre
                            </h2>
                            <form onSubmit={handleInvite} className="flex gap-3">
                                <input
                                    type="email"
                                    placeholder="Email du membre..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="bg-primary hover:bg-blue-600 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {inviteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Inviter"}
                                </button>
                            </form>
                            {inviteError && (
                                <p className="text-yellow-500 text-sm mt-3 bg-yellow-500/10 p-3 rounded-lg">{inviteError}</p>
                            )}
                        </section>
                    )}

                    {/* Members List */}
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Membres</h2>
                        <div className="space-y-3">
                            <AnimatePresence>
                                {teamMembers.map((member) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className="glass-morphism p-4 flex items-center gap-4 group"
                                    >
                                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                            {getRoleIcon(member.role)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{member.user_id === currentUserId ? "Vous" : `Membre ${member.user_id.slice(0, 8)}...`}</p>
                                            <p className="text-xs text-white/40">{getRoleLabel(member.role)}</p>
                                        </div>
                                        {isOwner && member.user_id !== currentUserId && (
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* Delete Team */}
                    {isOwner && (
                        <section className="mt-12 pt-8 border-t border-white/10">
                            <button
                                onClick={() => {
                                    if (confirm("Êtes-vous sûr de vouloir supprimer cette équipe ?")) {
                                        deleteTeam(selectedTeam.id);
                                    }
                                }}
                                className="text-red-500 text-sm hover:underline"
                            >
                                Supprimer cette équipe
                            </button>
                        </section>
                    )}
                </div>
            </div>
        );
    }

    // Teams List View
    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
            {showTeamForm && (
                <TeamForm
                    onClose={() => setShowTeamForm(false)}
                    onSuccess={fetchTeams}
                />
            )}

            <div className="max-w-4xl mx-auto">
                <header className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold font-outfit gradient-text mb-2">Équipes</h1>
                        <p className="text-white/40">Gérez vos équipes et collaborez avec d'autres.</p>
                    </div>
                    <button
                        onClick={() => setShowTeamForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-blue-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" strokeWidth={3} />
                        <span>Nouvelle Équipe</span>
                    </button>
                </header>

                {teams.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Aucune équipe</h3>
                        <p className="text-white/40 mb-6">Créez votre première équipe pour collaborer !</p>
                        <button
                            onClick={() => setShowTeamForm(true)}
                            className="bg-primary hover:bg-blue-600 px-6 py-3 rounded-2xl font-bold transition-all"
                        >
                            Créer une équipe
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence>
                            {teams.map((team) => (
                                <motion.div
                                    key={team.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => setSelectedTeam(team)}
                                    className="glass-morphism p-6 flex items-center gap-6 group hover:border-primary/30 transition-all cursor-pointer"
                                >
                                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
                                        <Users className="w-7 h-7 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{team.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getRoleIcon(getUserRole(team.id) || 'member')}
                                            <span className="text-xs text-white/40">{getRoleLabel(getUserRole(team.id) || 'member')}</span>
                                        </div>
                                    </div>
                                    <div className="text-white/40 text-sm">
                                        Cliquez pour gérer →
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
