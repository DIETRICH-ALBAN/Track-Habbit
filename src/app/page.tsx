"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, MessageSquare, FileText, Calendar, CheckCircle2, Circle, Clock,
  LogOut, Trash2, MoreVertical, Users, X, Bell, User, Cpu, Activity,
  Filter, CheckCircle, Radio, Sparkles
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
    <div className="h-screen flex flex-col md:flex-row bg-[#020203] text-white font-sans overflow-hidden selection:bg-primary selection:text-white">
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
        {showNotifications && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotifications(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg">
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            </div>
          </div>
        )}
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

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* Desktop Left: Cinematic Hero Section */}
        <section className="hidden md:flex flex-1 flex-col justify-center px-16 relative border-r border-white/5">
          <div className="absolute top-12 left-16 flex flex-col">
            <span className="text-primary text-xs font-black uppercase tracking-[0.5em] font-outfit mb-1">Neural Connection Established</span>
            <span className="text-white/20 text-[10px] font-mono">{format(currentTime, "HH:mm:ss", { locale: fr })}</span>
          </div>

          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="hero-title text-[clamp(4rem,10vw,8rem)] leading-[0.85] mb-8"
            >
              Ma<br />Journée
            </motion.h1>
            <p className="text-white/40 max-w-sm text-sm font-medium tracking-wide leading-relaxed">
              Optimisez votre productivité avec l&apos;intelligence artificielle. <br />
              Chaque tâche est un pas vers l&apos;excellence.
            </p>
          </div>

          {/* Background Particles Decoration */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 left-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px]" />
          </div>
        </section>

        {/* Center: The Neural Sphere (Mobile Hero / Desktop Middle) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] md:translate-y-[-50%] w-[320px] h-[320px] md:w-[450px] md:h-[450px] z-20">
          <div className="w-full h-full relative group cursor-pointer" onClick={() => setIsAIVisualMode(!isAIVisualMode)}>
            <NeuralSphere active={isAIVisualMode} />

            {/* Orbital Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
              className="absolute inset-[-20px] rounded-full border border-primary/10 border-dashed"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
              className="absolute inset-[-40px] rounded-full border border-white/5"
            />

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                    className="w-1 h-1 rounded-full bg-primary"
                  />
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.6em] text-white/30">Trigger Sync</span>
            </div>
          </div>
        </div>

        {/* Right Section / Scrollable Area */}
        <section className="flex-1 overflow-y-auto no-scrollbar pt-20 md:pt-12 px-6 md:px-12 relative z-10 bg-[#020203]/40 backdrop-blur-sm">

          {/* Mobile Only Header */}
          <header className="flex md:hidden justify-between items-center mb-12">
            <h1 className="hero-title text-4xl">Ma Journée</h1>
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
              <User className="w-5 h-5 text-white/40" />
            </div>
          </header>

          <div className="max-w-2xl mx-auto md:ml-0 md:max-w-none pt-24 md:pt-0">
            {showCalendar ? (
              <CalendarView tasks={tasks} onClose={() => setShowCalendar(false)} onTaskClick={() => { }} />
            ) : (
              <div className="flex flex-col gap-12">

                {/* Efficiency Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <section className="glass-morphism p-8 flex items-center gap-8 relative overflow-hidden group hover:border-primary/20 transition-all">
                    <div className="flex-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Efficiency Today</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black font-outfit uppercase italic">{efficiency}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full mt-6 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${efficiency}%` }}
                          className="h-full bg-primary shadow-[0_0_15px_#3b82f6]"
                        />
                      </div>
                    </div>
                    <Activity className="w-12 h-12 text-primary/20 group-hover:text-primary/40 transition-colors" />
                  </section>
                </div>

                {/* Filter Tabs */}
                <nav className="flex gap-8 overflow-x-auto no-scrollbar pb-2 border-b border-white/5">
                  {['Tout', 'Projet Alpha', 'Perso', 'Teams'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedTeamId(cat === 'Tout' ? null : cat === 'Perso' ? 'personal' : teams.find(t => t.name === cat)?.id || null)}
                      className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all pb-4 relative ${((cat === 'Tout' && !selectedTeamId) || (cat === 'Perso' && selectedTeamId === 'personal') || (teams.find(t => t.name === cat)?.id === selectedTeamId)) ? 'text-primary' : 'text-white/30 hover:text-white'}`}
                    >
                      {cat}
                      {((cat === 'Tout' && !selectedTeamId) || (cat === 'Perso' && selectedTeamId === 'personal') || (teams.find(t => t.name === cat)?.id === selectedTeamId)) && (
                        <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                      )}
                    </button>
                  ))}
                </nav>

                {/* Task List */}
                <section className="pb-32 md:pb-12">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="hero-title text-2xl lowercase italic tracking-tight">Sommaire des tâches</h2>
                    <div className="flex gap-4">
                      <button onClick={() => setShowTaskForm(true)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary transition-all group">
                        <Plus className="w-4 h-4 text-white/40 group-hover:text-white" />
                      </button>
                      <Filter className="w-5 h-5 text-white/10 hover:text-white cursor-pointer transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {todoTasks.length > 0 ? todoTasks.map((task) => (
                        <motion.div
                          layout
                          key={task.id}
                          initial={{ opacity: 0, scale: 0.98, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="group glass-morphism p-6 flex items-center gap-6 hover:border-primary/20 transition-all cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-[#020203] text-primary transition-all group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <Activity className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base tracking-tight mb-1 group-hover:text-primary transition-colors truncate">{task.title}</h3>
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-white/20">
                              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {task.due_date ? format(parseISO(task.due_date), "HH:mm") : '--:--'}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span className={task.priority === 'high' ? 'text-red-500/50' : 'text-white/20'}>{task.priority}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
                            className="w-12 h-12 rounded-full border border-white/5 bg-white/2 flex items-center justify-center hover:border-primary/30 transition-all overflow-hidden relative"
                          >
                            {task.status === 'done' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-primary" /></motion.div>}
                            <div className="w-3 h-3 rounded-full border-2 border-primary/20" />
                          </button>
                        </motion.div>
                      )) : (
                        <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                          <Sparkles className="w-12 h-12" />
                          <span className="text-xs font-black uppercase tracking-widest">Tout est terminé</span>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              </div>
            )}
          </div>
        </section>

        {/* Neural Overlay (Active AI) */}
        <AnimatePresence>
          {(showAIChat || isAIVisualMode) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-[#020203]/95 backdrop-blur-3xl flex flex-col p-6 md:p-12"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_#3b82f6]" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Neural Link Status: Syncing</span>
                </div>
                <button onClick={() => { setShowAIChat(false); setIsAIVisualMode(false); }} className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center">
                {isAIVisualMode ? (
                  <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} />
                ) : (
                  <AIChat initialMessage={aiInitialMessage ?? undefined} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
