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
    <div className="min-h-screen bg-transparent relative z-10">
      {/* Main Layout Container */}
      <div className="flex flex-col md:flex-row min-h-screen">

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

        {/* Content Area */}
        <main className="flex-1 flex flex-col md:pl-[260px] transition-all duration-300 overflow-hidden">

          {/* Header */}
          <header className="header h-20 flex items-center justify-between px-8 shrink-0 relative z-30">
            <div>
              <h1 className="heading-display text-2xl">Bonjour, <span className="heading-serif">{user.email?.split('@')[0]}</span></h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {format(currentTime, "EEEE dd MMMM yyyy", { locale: fr })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="icon-box icon-box-sm relative"
              >
                <Bell size={18} />
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--accent-purple)] rounded-full" />
              </button>
              <div className="icon-box icon-box-sm cursor-pointer hover:border-[var(--accent-purple)]/50 transition-colors">
                <User size={18} />
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-32 md:pb-8">

            {showCalendar ? (
              <div className="animate-fade-in h-full">
                <CalendarView tasks={tasks} onClose={() => setShowCalendar(false)} onTaskClick={() => { }} />
              </div>
            ) : (
              <div className="max-w-7xl mx-auto space-y-12 animate-slide-up">

                {/* Stats Section */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="accent-line" />
                    <h2 className="section-label mb-0">Statistiques</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard label="Total des tâches" value={tasks.length} icon={ListChecks} trend="up" trendValue="+12%" delay={0} />
                    <StatCard label="En cours" value={todoTasks.length} icon={Activity} delay={0.1} />
                    <StatCard label="Efficacité" value={`${efficiency}%`} icon={Sparkles} trend="up" trendValue="+5%" delay={0.2} />
                    <StatCard label="Équipes" value={teams.length} icon={Users} delay={0.3} />
                  </div>
                </section>

                {/* Tasks & AI Section */}
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                  {/* Task Feed */}
                  <div className="xl:col-span-2 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="accent-line" />
                        <h2 className="section-label mb-0">Tâches du jour</h2>
                      </div>
                      <button
                        onClick={() => setShowTaskForm(true)}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        <Plus size={16} />
                        Nouvelle tâche
                      </button>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {todoTasks.length > 0 ? todoTasks.slice(0, 6).map((task, index) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            onClick={() => toggleTaskStatus(task)}
                          />
                        )) : (
                          <div className="card p-12 flex flex-col items-center justify-center text-center">
                            <Sparkles size={40} className="text-[var(--accent-purple)] mb-4" />
                            <p className="text-[var(--text-muted)] text-sm">Toutes vos tâches sont terminées.</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* AI Assistant Hub */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="accent-line" />
                      <h2 className="section-label mb-0">Assistant IA</h2>
                    </div>

                    <div className="card-featured p-8 flex flex-col items-center text-center h-[420px]">
                      {/* Glow Effect */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--accent-purple)]/20 blur-[80px] rounded-full" />

                      <div
                        className="relative z-10 w-full h-44 mb-6 cursor-pointer group"
                        onClick={() => setIsAIVisualMode(true)}
                      >
                        <NeuralSphere active={isAIVisualMode} />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                          <span className="badge">AI Online</span>
                        </div>
                      </div>

                      <div className="relative z-10 mt-auto">
                        <h3 className="text-xl font-semibold mb-2">Your <span className="heading-serif">AI-Powered</span></h3>
                        <h3 className="heading-display text-xl mb-4">Design Assistant</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                          Interagissez par la voix ou par chat pour organiser vos tâches.
                        </p>

                        <button
                          onClick={() => setIsAIVisualMode(true)}
                          className="btn-primary w-full"
                        >
                          <Sparkles size={16} />
                          Lancer l&apos;Assistant
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[var(--bg-primary)]/95 backdrop-blur-xl flex flex-col p-6 md:p-12"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-purple)] animate-pulse" />
                <span className="badge">Neural Link Established</span>
              </div>
              <button
                onClick={() => { setShowAIChat(false); setIsAIVisualMode(false); }}
                className="icon-box icon-box-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full">
              {isAIVisualMode ? <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} /> : <AIChat initialMessage={aiInitialMessage ?? undefined} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
