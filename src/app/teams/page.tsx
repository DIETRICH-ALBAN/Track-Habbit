"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Crown, Shield, User, Trash2, ArrowLeft, Loader2, Copy, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import NotificationPanel from "@/components/NotificationPanel";
import TeamForm from "@/components/TeamForm";
import { Team, Membership, MemberRole } from "@/types/team";

export default function TeamsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);

    const supabase = createClient();

    const fetchInvite = useCallback(async (teamId: string) => {
        const { data } = await supabase
            .from('team_invites')
            .select('code')
            .eq('team_id', teamId)
            .single();

        if (data) setInviteCode(data.code);
        else setInviteCode(null);
    }, [supabase]);

    const generateInvite = async () => {
        if (!selectedTeam) return;
        setInviteLoading(true);

        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        const { error } = await supabase
            .from('team_invites')
            .insert([{ team_id: selectedTeam.id, code }]);

        if (!error) {
            setInviteCode(code);
        }
        setInviteLoading(false);
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/join/${inviteCode}`;
        navigator.clipboard.writeText(link);
        alert("Lien copié dans le presse-papier !");
    };

    const fetchTeams = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

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
            setTeamMembers(data);
        }
    }, [supabase]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamMembers(selectedTeam.id);
            fetchInvite(selectedTeam.id);
        }
    }, [selectedTeam, fetchTeamMembers, fetchInvite]);

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
            case 'owner': return <Crown className="w-4 h-4 text-amber-400" />;
            case 'admin': return <Shield className="w-4 h-4 text-blue-400" />;
            default: return <User className="w-4 h-4 text-[var(--text-muted)]" />;
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
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--accent-purple)] animate-spin" />
            </div>
        );
    }

    const userRole = selectedTeam ? getUserRole(selectedTeam.id) : null;
    const isOwner = userRole === 'owner';

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

            <main className="flex-1 p-6 md:p-12 md:pl-[260px] overflow-y-auto min-h-screen">
                {showTeamForm && (
                    <TeamForm
                        onClose={() => setShowTeamForm(false)}
                        onSuccess={fetchTeams}
                    />
                )}

                <div className="max-w-5xl mx-auto space-y-8 animate-slide-up">
                    {selectedTeam ? (
                        <>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-4 transition-colors group"
                            >
                                <div className="icon-box icon-box-sm group-hover:bg-white/10">
                                    <ArrowLeft size={16} />
                                </div>
                                <span className="text-sm font-medium">Retour aux équipes</span>
                            </button>

                            <header className="mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl">
                                        <Users className="w-10 h-10 text-[var(--accent-purple)]" />
                                    </div>
                                    <div>
                                        <h1 className="heading-display text-4xl mb-1">{selectedTeam.name}</h1>
                                        <p className="text-[var(--text-muted)] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            {teamMembers.length} membre{teamMembers.length > 1 ? 's' : ''} actif{teamMembers.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </header>

                            {/* Invite Section */}
                            {(isOwner || userRole === 'admin') && (
                                <section className="card p-8 mb-8 relative overflow-hidden">
                                    {/* Background decoration */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-purple)]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                                    <h2 className="heading-serif text-xl mb-6 flex items-center gap-3">
                                        <Plus className="w-5 h-5 text-[var(--accent-purple)]" />
                                        Inviter des membres
                                    </h2>

                                    {!inviteCode ? (
                                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-elevated)]/30 hover:bg-[var(--bg-elevated)]/50 transition-colors">
                                            <Users className="w-12 h-12 text-[var(--text-muted)] mb-4" opacity={0.5} />
                                            <p className="text-[var(--text-muted)] mb-6 text-center max-w-md">Générez un lien unique pour inviter vos collègues à rejoindre cet espace de travail.</p>
                                            <button
                                                onClick={generateInvite}
                                                disabled={inviteLoading}
                                                className="btn-primary"
                                            >
                                                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                <span>Générer le lien d&apos;invitation</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row gap-3">
                                                <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] flex items-center overflow-hidden font-mono">
                                                    <span className="truncate w-full">{window.location.origin}/join/{inviteCode}</span>
                                                </div>
                                                <button
                                                    onClick={copyInviteLink}
                                                    className="btn-primary"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    <span>Copier</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm("Voulez-vous réinitialiser le lien ? L'ancien ne fonctionnera plus.")) {
                                                            supabase.from('team_invites').delete().eq('team_id', selectedTeam.id).then(() => setInviteCode(null));
                                                        }
                                                    }}
                                                    className="btn-secondary text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-rose-500/20"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-2">
                                                <Shield className="w-3 h-3" />
                                                Seules les personnes disposant de ce lien pourront rejoindre l&apos;équipe.
                                            </p>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Members List */}
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="accent-line" />
                                    <h2 className="section-label mb-0">Membres de l'équipe</h2>
                                </div>

                                <div className="grid gap-4">
                                    <AnimatePresence>
                                        {teamMembers.map((member) => (
                                            <motion.div
                                                key={member.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="card p-4 flex items-center gap-4 group hover:border-[var(--accent-purple)]/30 transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                                                    {getRoleIcon(member.role)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-[var(--text-primary)]">
                                                            {member.user_id === currentUserId ? "Vous" : `Membre ${member.user_id.slice(0, 8)}...`}
                                                        </p>
                                                        {member.user_id === currentUserId && <span className="badge">Moi</span>}
                                                    </div>
                                                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${member.role === 'owner' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                                                        {getRoleLabel(member.role)}
                                                    </p>
                                                </div>

                                                {isOwner && member.user_id !== currentUserId && (
                                                    <button
                                                        onClick={() => removeMember(member.id)}
                                                        className="icon-box icon-box-sm text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Retirer le membre"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </section>

                            {/* Delete Team */}
                            {isOwner && (
                                <section className="mt-12 pt-8 border-t border-[var(--border-subtle)] flex justify-end">
                                    <button
                                        onClick={() => {
                                            if (confirm("Êtes-vous sûr de vouloir supprimer cette équipe ? Cette action est irréversible.")) {
                                                deleteTeam(selectedTeam.id);
                                            }
                                        }}
                                        className="btn-secondary text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border-rose-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Supprimer cette équipe</span>
                                    </button>
                                </section>
                            )}
                        </>
                    ) : (
                        <>
                            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                <div>
                                    <h1 className="heading-display text-4xl mb-2">Vos <span className="heading-serif">Équipes</span></h1>
                                    <p className="text-[var(--text-muted)] max-w-lg">Gérez vos espaces de collaboration, invitez des membres et suivez l&apos;avancement des projets collectifs.</p>
                                </div>
                                <button
                                    onClick={() => setShowTeamForm(true)}
                                    className="btn-primary"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Nouvelle Équipe</span>
                                </button>
                            </header>

                            {teams.length === 0 ? (
                                <div className="card p-20 text-center flex flex-col items-center">
                                    <div className="w-24 h-24 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-subtle)]">
                                        <Users className="w-10 h-10 text-[var(--accent-purple)]" opacity={0.5} />
                                    </div>
                                    <h3 className="heading-display text-2xl mb-3">Aucune équipe active</h3>
                                    <p className="text-[var(--text-muted)] mb-8 max-w-md">Créez votre première équipe pour commencer à collaborer sur des tâches et partager des documents.</p>
                                    <button
                                        onClick={() => setShowTeamForm(true)}
                                        className="btn-primary"
                                    >
                                        Créer une équipe
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <AnimatePresence>
                                        {teams.map((team, index) => (
                                            <motion.div
                                                key={team.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                onClick={() => setSelectedTeam(team)}
                                                className="card p-6 flex flex-col gap-6 cursor-pointer group hover:border-[var(--accent-purple)]/50 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.15)] transition-all min-h-[180px] relative overflow-hidden"
                                            >
                                                {/* Gradient Hover Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                <div className="flex justify-between items-start relative z-10">
                                                    <div className="w-12 h-12 bg-[var(--bg-elevated)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)] group-hover:border-[var(--accent-purple)]/30 group-hover:text-[var(--accent-purple)] transition-colors">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                    <span className="badge bg-[var(--bg-primary)] border-[var(--border-subtle)]">
                                                        {getRoleLabel(getUserRole(team.id) || 'member')}
                                                    </span>
                                                </div>

                                                <div className="relative z-10 mt-auto">
                                                    <h3 className="text-xl font-bold font-display group-hover:text-[var(--accent-purple-light)] transition-colors">{team.name}</h3>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs text-[var(--text-muted)]">Cliquez pour gérer</p>
                                                        <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] flex items-center justify-center -mr-2 shadow-sm border border-[var(--border-subtle)]">
                                                            <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--text-muted)] group-hover:text-[var(--accent-purple)] transition-colors" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
