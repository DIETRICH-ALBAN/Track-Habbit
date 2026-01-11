"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, MessageSquare, FileText, Calendar, CheckCircle2, Circle, Clock,
  LogOut, Trash2, MoreVertical, Users, X, Bell, User, Cpu, Activity,
  Filter, CheckCircle, Radio
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
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import { Team } from "@/types/team";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [aiInitialMessage, setAiInitialMessage] = useState<string | null>(null);
  const [isAIVisualMode, setIsAIVisualMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const supabase = createClient();

  // Update time for display
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('chat') === 'true') { setShowAIChat(true); window.history.replaceState({}, '', pathname); }
    else if (params.get('import') === 'true') { setShowDocImport(true); window.history.replaceState({}, '', pathname); }
  }, [pathname]);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020203] text-white font-sans overflow-x-hidden selection:bg-primary selection:text-white">
      {/* Overlays */}
      <AnimatePresence>
        {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={fetchTasks} />}
        {showDocImport && (
          <DocumentImport
            onClose={() => setShowDocImport(false)}
            onTextExtracted={(text, filename) => {
              setShowAIChat(true);
              setAiInitialMessage(`Analyse ce document (${filename}) et suggère-moi les tâches à créer :\n\n${text.slice(0, 2000)}`);
            }}
          />
        )}
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>

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

      <main className="flex-1 overflow-y-auto relative pb-32 md:pb-12 px-6 md:px-12 pt-8">

        {/* Top Header Bar */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em] font-outfit">
              {format(currentTime, "MMM dd // HH:mm", { locale: fr })}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group cursor-pointer hover:border-primary transition-colors">
            <User className="w-5 h-5 text-white/40 group-hover:text-white" />
          </div>
        </header>

        {showCalendar ? (
          <CalendarView tasks={tasks} onClose={() => setShowCalendar(false)} onTaskClick={() => { }} />
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col items-center">

            <h1 className="hero-title text-6xl md:text-8xl mb-12 self-start">
              Ma<br />Journée
            </h1>

            {/* AI Visual Assistant Activation Area */}
            <div className="relative w-72 h-72 flex items-center justify-center mb-16">
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-primary/20"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute inset-4 rounded-full border border-dashed border-primary/10"
              />

              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className={`w-36 h-36 rounded-full flex items-center justify-center bg-[#020203] border border-white/10 relative overflow-hidden group cursor-pointer ${isAIVisualMode ? 'pulse-ring border-primary' : ''}`}
                  onClick={() => setIsAIVisualMode(!isAIVisualMode)}>
                  <Cpu className={`w-12 h-12 transition-all duration-500 ${isAIVisualMode ? 'text-primary scale-125' : 'text-white/20 group-hover:text-primary/50'}`} />
                  {isAIVisualMode && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="absolute bottom-6 left-header right-0 text-center"
                    >
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse">Syncing...</span>
                    </motion.div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Trigger AI</span>
              </div>
            </div>

            {/* Efficiency Card */}
            <section className="w-full glass-morphism p-8 mb-12 flex items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-full opacity-10">
                <div className="flex items-end h-full gap-1 p-4">
                  {[40, 70, 50, 90, 60, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Efficiency</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-outfit">{efficiency}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${efficiency}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_#3b82f6]"
                  />
                </div>
              </div>
            </section>

            {/* Navigation Tabs */}
            <nav className="w-full flex gap-8 mb-8 overflow-x-auto no-scrollbar pb-2">
              {['Tout', 'Projet Alpha', 'Famille', 'Perso', 'Teams'].map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setSelectedTeamId(cat === 'Tout' ? null : cat === 'Perso' ? 'personal' : teams.find(t => t.name === cat)?.id || null)}
                  className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${i === 0 ? 'text-primary border-b-2 border-primary pb-2' : 'text-white/30 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </nav>

            {/* Task Summary */}
            <section className="w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="hero-title text-xl">Sommaire des tâches</h2>
                <Filter className="w-4 h-4 text-white/20 cursor-pointer hover:text-white" />
              </div>

              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {todoTasks.map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group glass-morphism p-5 flex items-center gap-6 hover:border-primary/30 transition-all border-white/5 bg-white/2"
                    >
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-[#020203] text-primary group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{task.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-white/30">
                          <Clock className="w-3 h-3" />
                          <span>{task.due_date ? format(parseISO(task.due_date), "HH:mm") : '--:--'} — 11:30</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center hover:border-primary/50 transition-colors"
                      >
                        <div className={`w-4 h-4 rounded-full transition-all ${task.status === 'done' ? 'bg-primary' : 'bg-transparent'}`} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </div>
        )}

        <AnimatePresence>
          {(showAIChat || isAIVisualMode) && (
            <div className="fixed inset-0 z-[110] bg-[#020203]/90 backdrop-blur-3xl flex flex-col p-6">
              <div className="flex justify-between items-center mb-8">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Neural Link Active</span>
                <button onClick={() => { setShowAIChat(false); setIsAIVisualMode(false); }} className="p-3 bg-white/5 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {isAIVisualMode ? (
                <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} />
              ) : (
                <AIChat initialMessage={aiInitialMessage ?? undefined} />
              )}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
