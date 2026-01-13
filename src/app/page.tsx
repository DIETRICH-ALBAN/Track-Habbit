"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, Clock, X, Bell, User, Cpu, Activity,
  Filter, Sparkles, LayoutGrid, ListChecks, Users, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import TaskForm from "@/components/TaskForm";
import TeamForm from "@/components/TeamForm";
import AIChat from "@/components/AIChat";
import LiveVoiceAssistant from "@/components/LiveVoiceAssistant";
import DocumentImport from "@/components/DocumentImport";
import CalendarView from "@/components/CalendarView";
import NotificationPanel from "@/components/NotificationPanel";
import Sidebar from "@/components/Sidebar";
import { StatCard } from "@/components/ui/StatCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { Task } from "@/types/task";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { NeuralSphere } from "@/components/NeuralSphere"; // Kept for imports but unused
import SplineObject from "@/components/SplineObject";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileTabBar } from "@/components/MobileTabBar";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [user, setUser] = useState<SupabaseUser | any>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI States
  const [activeTab, setActiveTab] = useState("home");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isAIActive, setIsAIActive] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUser(user);
    };
    getUser();
    fetchTasks();
    fetchTeams();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*, team:teams(*)').order('due_date', { ascending: true });
    if (data) setTasks(data);
  }

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('*');
    if (data) setTeams(data);
  }

  async function toggleTaskStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    fetchTasks();
  }

  // Calculate stats
  const todoTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).getDate() === new Date().getDate());
  const doneTasks = tasks.filter(t => t.status === 'done');
  const efficiency = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const [showTeamForm, setShowTeamForm] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case "home":
      case "dashboard":
        return (
          <>
            {/* STATS ROW */}
            <section className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Statistiques</h2>
                <button onClick={() => setShowTaskForm(true)} className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--accent-cyan)] hover:underline">
                  <Plus size={14} />
                  Nouvelle tâche
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Tâches" value={tasks.length} icon={ListChecks} delay={0} />
                <StatCard label="En Cours" value={todoTasks.length} icon={Activity} trend="neutral" delay={0.05} />
                <StatCard label="Aujourd'hui" value={todayTasks.length} icon={Clock} trend="up" trendValue={`+${todayTasks.length}`} delay={0.1} />
                <StatCard label="Efficacité" value={`${efficiency}%`} icon={Sparkles} trend={efficiency > 50 ? "up" : "down"} trendValue={efficiency > 50 ? "Bon" : "À améliorer"} delay={0.15} />
              </div>
            </section>

            {/* TASKS SECTION */}
            <section className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">Vos Tâches</h2>
                <span className="text-xs text-[var(--text-tertiary)]">{todoTasks.length} restantes</span>
              </div>

              <div className="space-y-3">
                {todoTasks.length > 0 ? todoTasks.slice(0, 7).map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toggleTaskStatus(task)}
                    className="group flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-white/5 cursor-pointer transition-all hover:border-[var(--accent-cyan)]/40 backdrop-blur-md"
                    style={{ background: 'var(--bg-glass-gradient)' }}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${task.status === 'done' ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)]' : 'border-[var(--accent-steel)]'}`}>
                      {task.status === 'done' && <CheckCircle2 size={10} className="text-[var(--bg-primary)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-base leading-snug truncate ${task.status === 'done' ? 'line-through text-white/30' : 'text-white'}`}>{task.title}</h3>
                      {task.due_date && (
                        <p className="text-[11px] text-[var(--accent-blue)] mt-0.5">
                          {format(new Date(task.due_date), "dd MMM • HH:mm", { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${task.priority === 'high' ? 'bg-rose-500/15 text-rose-400' :
                      task.priority === 'medium' ? 'bg-[var(--accent-tan)]/15 text-[var(--accent-tan)]' :
                        'bg-white/5 text-white/30'
                      }`}>
                      {task.priority || 'normal'}
                    </div>
                  </motion.div>
                )) : (
                  <div
                    className="py-16 text-center rounded-[var(--radius-lg)] backdrop-blur-sm border border-dashed border-white/10"
                    style={{ background: 'var(--bg-glass-gradient)' }}
                  >
                    <Sparkles size={32} className="text-[var(--accent-cyan)]/50 mx-auto mb-3" />
                    <p className="text-[var(--text-tertiary)] text-sm">Aucune tâche en cours.</p>
                    <button onClick={() => setShowTaskForm(true)} className="mt-4 text-sm font-medium text-[var(--accent-cyan)] hover:underline">
                      Créer votre première tâche
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        );
      case "calendar":
        return (
          <div className="h-[calc(100vh-200px)]">
            <CalendarView tasks={tasks} onTaskClick={(task) => toggleTaskStatus(task)} />
          </div>
        );
      case "chat":
        return (
          <div className="h-[calc(100vh-200px)] flex flex-col">
            <AIChat onTaskCreated={fetchTasks} />
          </div>
        );
      case "teams":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Mes Équipes</h2>
              <button
                onClick={() => setShowTeamForm(true)}
                className="btn-primary"
              >
                <Plus size={18} />
                Nouvelle Équipe
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.length > 0 ? teams.map((team, i) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="card p-6 border-[var(--border-subtle)] hover:border-[var(--accent-purple)]/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-purple)]/10 flex items-center justify-center text-[var(--accent-purple)] group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                      {tasks.filter(t => t.team_id === team.id).length} Tâches
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{team.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">Propriétaire: {team.created_by === user.id ? 'Vous' : 'Autre'}</p>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 text-center card bg-white/5 border-dashed">
                  <p className="text-[var(--text-muted)]">Vous n'avez pas encore d'équipe.</p>
                </div>
              )}
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="max-w-2xl mx-auto py-10">
            <NotificationPanel onClose={() => setActiveTab('home')} />
          </div>
        );
      case "stats":
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold mb-6">Analyses de Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6">Répartition par Priorité</h3>
                <div className="space-y-4">
                  {['high', 'medium', 'low'].map(p => {
                    const count = tasks.filter(t => t.priority === p).length;
                    const percent = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                    return (
                      <div key={p} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="capitalize">{p === 'high' ? 'Haute' : p === 'medium' ? 'Moyenne' : 'Basse'}</span>
                          <span>{count} tâches ({Math.round(percent)}%)</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-[var(--accent-tan)]' : 'bg-emerald-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card p-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * efficiency) / 100}
                      className="text-[var(--accent-cyan)] transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold">{efficiency}%</span>
                </div>
                <p className="mt-4 text-sm font-medium text-white/60">Efficacité Globale</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)]/30 rounded-[var(--radius-xl)] border border-dashed border-[var(--border-subtle)]">
            <Cpu size={48} className="text-[var(--accent-cyan)] opacity-20 mb-4" />
            <h3 className="text-xl font-medium text-white/40">Section "{activeTab}"</h3>
            <p className="text-sm text-white/20 mt-2">Cette fonctionnalité est en cours de développement.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden relative">

      {/* Background Spline Scene */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <SplineObject />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0A0A0A_100%)]" />
      </div>

      {/* PC Menu (Desktop Sidebar - Wrobs Style) */}
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="relative z-10 flex-1 flex flex-col h-screen overflow-y-auto bg-[#141414]/80 backdrop-blur-[2px] md:rounded-l-[32px] md:my-2 md:mr-2 border-l border-white/5 scroll-smooth">

        {/* HEADER - Mobile Only */}
        <header className="md:hidden sticky top-0 z-40 bg-[#141414]/90 backdrop-blur-lg border-b border-white/5 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--accent-tan)] uppercase">
              {format(currentTime, "EEEE d MMMM", { locale: fr })}
            </p>
            <h1 className="text-xl font-semibold tracking-tight mt-0.5">
              {activeTab === 'home' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIActive(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              <Sparkles size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <User size={18} className="text-white/70" />
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 px-4 md:px-10 py-6 md:py-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Dashboard Title - Desktop Only */}
          <div className="hidden md:block mb-10">
            <p className="text-xs font-bold tracking-[0.2em] text-white/30 uppercase mb-2">
              {format(currentTime, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              {activeTab === 'home' ? 'Overview' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>

          {renderContent()}
        </main>

        {/* Floating Navigation (Mobile Only) */}
        <MobileTabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setIsAIActive={setIsAIActive}
          setShowTaskForm={setShowTaskForm}
        />

      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {isAIActive && <LiveVoiceAssistant onClose={() => setIsAIActive(false)} onTaskCreated={fetchTasks} />}
        {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={fetchTasks} />}
        {showTeamForm && <TeamForm onClose={() => setShowTeamForm(false)} onSuccess={fetchTeams} />}
      </AnimatePresence>
    </div>
  );
}
