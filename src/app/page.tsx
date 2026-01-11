"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, Clock, X, Bell, User, Cpu, Activity,
  Filter, Sparkles, LayoutGrid, ListChecks, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import TaskForm from "@/components/TaskForm";
import AIChat from "@/components/AIChat";
import LiveVoiceAssistant from "@/components/LiveVoiceAssistant";
import DocumentImport from "@/components/DocumentImport";
import CalendarView from "@/components/CalendarView";
import NotificationPanel from "@/components/NotificationPanel";
import Sidebar from "@/components/Sidebar";
import { NeuralSphere } from "@/components/NeuralSphere";
import { Task, TaskStatus } from "@/types/task";
import { Team } from "@/types/team";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { TaskCard } from "@/components/ui/TaskCard";

export default function Home() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDocImport, setShowDocImport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [aiInitialMessage, setAiInitialMessage] = useState<string | null>(null);
  const [isAIVisualMode, setIsAIVisualMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const supabase = createClient();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTeams = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: membershipData } = await supabase
      .from('memberships')
      .select('team:teams(*)')
      .eq('user_id', user.id);
    if (membershipData) {
      setTeams(membershipData.map((m: any) => m.team).filter(Boolean));
    }
  }, [supabase]);

  const fetchTasks = useCallback(async () => {
    let query = supabase.from('tasks').select('*, team:teams(name)').order('created_at', { ascending: false });
    if (selectedTeamId === 'personal') query = query.is('team_id', null);
    else if (selectedTeamId) query = query.eq('team_id', selectedTeamId);
    const { data, error } = await query;
    if (!error && data) setTasks(data);
  }, [supabase, selectedTeamId]);

  useEffect(() => {
    setMounted(true);
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) { fetchTeams(); fetchTasks(); }
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { fetchTeams(); fetchTasks(); }
    });
    return () => subscription.unsubscribe();
  }, [fetchTasks, fetchTeams, supabase.auth]);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id);
    if (!error) setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  if (!mounted || loading) return null;
  if (!user) return <AuthModal onSuccess={() => { }} />;

  const todoTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
  const todayDone = todayTasks.filter(t => t.status === 'done');
  const efficiency = todayTasks.length > 0 ? Math.round((todayDone.length / todayTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-primary/30">

      {/* Background Ambience */}
      <div className="film-grain" />
      <div className="vignette" />

      {/* Main Layout Container */}
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">

        <Sidebar
          onToggleCalendar={() => setShowCalendar(!showCalendar)}
          showCalendar={showCalendar}
          onToggleAIChat={() => setShowAIChat(!showAIChat)}
          showAIChat={showAIChat}
          onToggleDocImport={() => setShowDocImport(true)}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
          showNotifications={showNotifications}
          onActivateAI={() => setIsAIVisualMode(!isAIVisualMode)}
        />

        {/* Content Area - Self adjusting margin via dynamic class in future, currently simple flex-1 */}
        <main className="flex-1 flex flex-col md:pl-[260px] transition-all duration-300 overflow-hidden relative">

          {/* Top Header - Glass Navbar */}
          <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-[#030303]/40 backdrop-blur-xl z-30 shrink-0">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight">Bonjour, {user.email?.split('@')[0]}</h1>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                {format(currentTime, "EEEE dd MMMM", { locale: fr })}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-black tracking-widest uppercase text-primary">System Pulse</span>
                <span className="text-xs font-mono text-white/20">Active // 2.4s latency</span>
              </div>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full glass-panel flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all"
              >
                <Bell size={18} className="text-white/60" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-[#030303]" />
              </button>
              <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center overflow-hidden border-primary/20">
                <User size={20} className="text-primary" />
              </div>
            </div>
          </header>

          {/* Dash Scroll Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar pt-8 px-8 pb-32 md:pb-8">

            {showCalendar ? (
              <div className="animate-enter h-full">
                <CalendarView tasks={tasks} onClose={() => setShowCalendar(false)} onTaskClick={() => { }} />
              </div>
            ) : (
              <div className="max-w-7xl mx-auto flex flex-col gap-12 animate-enter">

                {/* Section 1: Top Metrics (Juju Style) */}
                <div>
                  <div className="section-label">Statistiques Clés</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard label="Tâches Total" value={tasks.length} icon={ListChecks} color="text-primary" delay={0} />
                    <StatCard label="En cours" value={todoTasks.length} icon={Activity} color="text-secondary" delay={0.1} />
                    <StatCard label="Efficacité" value={`${efficiency}%`} icon={Sparkles} color="text-accent" delay={0.2} />
                    <StatCard label="Équipes" value={teams.length} icon={Users} color="text-white" delay={0.3} />
                  </div>
                </div>

                {/* Section 2: Tasks & IA Visualization */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">

                  {/* Main Task Feed (Clarity Juju) */}
                  <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="flex justify-between items-end">
                      <div className="section-label">Aujourd&apos;hui</div>
                      <button onClick={() => setShowTaskForm(true)} className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors">
                        <Plus size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ajouter</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {todoTasks.length > 0 ? todoTasks.slice(0, 5).map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            onClick={() => toggleTaskStatus(task)}
                          />
                        )) : (
                          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                            <Sparkles size={40} className="mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-center">Toutes vos tâches sont terminées.</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* AI Neural Side Hub (Xora Ambience) */}
                  <div className="flex flex-col gap-6">
                    <div className="section-label">Interface IA</div>
                    <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center text-center flex-1 relative overflow-hidden h-[400px]">
                      {/* BG Glow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 blur-[80px] rounded-full" />

                      <div className="relative z-10 w-full h-48 mb-6" onClick={() => setIsAIVisualMode(true)}>
                        <NeuralSphere active={isAIVisualMode} />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 scale-75 opacity-40">
                          <span className="text-[9px] font-black uppercase tracking-[0.5em] animate-pulse">Neural Sync</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold tracking-tight mb-2">Prête à vous aider.</h3>
                      <p className="text-xs text-white/30 leading-relaxed mb-6 px-4">
                        Demandez-moi d&apos;organiser votre journée ou d&apos;analyser vos documents.
                      </p>

                      <button
                        onClick={() => setIsAIVisualMode(true)}
                        className="w-full py-4 glass-panel rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:text-white transition-all"
                      >
                        Activer l&apos;assistant
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={fetchTasks} />}
        {showDocImport && (
          <DocumentImport
            onClose={() => setShowDocImport(false)}
            onTextExtracted={(text, filename) => {
              setShowAIChat(true);
              setAiInitialMessage(`Analyse le document "${filename}" et suggère les tâches clés.`);
            }}
          />
        )}
        {(showAIChat || isAIVisualMode) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#030303]/90 backdrop-blur-3xl flex flex-col p-6 md:p-12"
          >
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary">Neural Link Established</span>
              </div>
              <button onClick={() => { setShowAIChat(false); setIsAIVisualMode(false); }} className="w-12 h-12 glass-panel rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <X />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center">
              {isAIVisualMode ? <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} /> : <AIChat initialMessage={aiInitialMessage ?? undefined} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
