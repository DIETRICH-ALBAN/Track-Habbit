"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus, Clock, X, Bell, User, Cpu, Activity,
  Filter, Sparkles
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
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Task, TaskStatus } from "@/types/task";
import { Team } from "@/types/team";
import { format, isToday, parseISO } from "date-fns";
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

      <main className="flex-1 relative overflow-hidden">

        <HeroGeometric
          badge="Neural Task Tracker"
          title1="Track Habbit AI"
          title2="Productivité Augmentée"
        >
          <div className="flex flex-col items-center gap-8 mt-12 mb-20 relative px-4">
            {/* Neural Sphere - Now smaller and integrated */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 cursor-pointer group" onClick={() => setIsAIVisualMode(!isAIVisualMode)}>
              <NeuralSphere active={isAIVisualMode} />
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="absolute inset-[-10px] border border-primary/20 rounded-full border-dashed" />
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Sync Neural Link</span>
              </div>
            </div>

            <p className="text-white/40 max-w-lg text-xs md:text-sm font-light tracking-wide leading-relaxed mx-auto">
              Optimisez votre quotidien avec une IA capable de planifier, déléguer et analyser vos performances en temps réel.
            </p>
          </div>
        </HeroGeometric>

        {/* Dashboard Panels - Integrated overlay style */}
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col md:flex-row justify-end items-end p-6 md:p-12 gap-8">

          {/* Efficiency Mini Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-morphism pointer-events-auto p-6 md:p-8 w-full md:w-72 bg-white/[0.02]"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Efficiency</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div className="text-4xl font-black font-outfit italic">{efficiency}%</div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
              <motion.div animate={{ width: `${efficiency}%` }} className="h-full bg-primary shadow-[0_0_10px_#3b82f6]" />
            </div>
          </motion.div>

          {/* Task Summary Panel */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-morphism pointer-events-auto w-full md:w-[480px] h-[400px] flex flex-col p-8 bg-white/[0.02]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="hero-title text-xl lowercase italic">flux de tâches</h2>
              <div className="flex gap-4">
                <button onClick={() => setShowTaskForm(true)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-primary transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
              <AnimatePresence mode="popLayout">
                {todoTasks.length > 0 ? todoTasks.slice(0, 5).map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex items-center gap-4 cursor-pointer"
                    onClick={() => toggleTaskStatus(task)}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-bold tracking-tight">{task.title}</p>
                      <span className="text-[10px] uppercase tracking-widest text-white/20 font-black">{task.due_date ? format(parseISO(task.due_date), "HH:mm") : 'Aujourd\'hui'}</span>
                    </div>
                  </motion.div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                    <Sparkles className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Zone de Calme</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Neural Overlay (Active AI) */}
        <AnimatePresence>
          {(showAIChat || isAIVisualMode) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-[#020203]/95 backdrop-blur-3xl flex flex-col p-6 md:p-12"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Neural Link Protocol Active</span>
                </div>
                <button onClick={() => { setShowAIChat(false); setIsAIVisualMode(false); }} className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center overflow-hidden">
                {isAIVisualMode ? (
                  <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} />
                ) : (
                  <AIChat initialMessage={aiInitialMessage ?? undefined} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showCalendar && (
          <div className="fixed inset-0 z-[150] bg-[#020203] flex flex-col p-6 md:p-12">
            <button onClick={() => setShowCalendar(false)} className="absolute top-8 right-8 p-4 text-white/40 hover:text-white transition-all"><X className="w-8 h-8" /></button>
            <div className="flex-1 pt-20">
              <CalendarView tasks={tasks} onClose={() => setShowCalendar(false)} onTaskClick={() => { }} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
