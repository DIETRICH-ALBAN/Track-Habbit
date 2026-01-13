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

  const todoTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date).getDate() === new Date().getDate());

  // --- MOBILE TAB BAR COMPONENT ---
  const FloatingTabBar = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="flex items-center justify-between bg-[var(--glass-heavy)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-[32px] px-6 py-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]">
        <button onClick={() => setActiveTab('home')} className={`p-2 transition-all ${activeTab === 'home' ? 'text-[var(--accent-cyan)]' : 'text-white/40'}`}>
          <LayoutGrid size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        </button>

        <button onClick={() => setActiveTab('calendar')} className={`p-2 transition-all ${activeTab === 'calendar' ? 'text-[var(--accent-cyan)]' : 'text-white/40'}`}>
          <Clock size={24} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} />
        </button>

        {/* CENTRAL AI FAB */}
        <button
          onClick={() => setIsAIActive(true)}
          className="w-16 h-16 -mt-8 bg-[var(--accent-purple)] rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(112,0,255,0.5)] border-[4px] border-[var(--bg-primary)] active:scale-95 transition-all"
        >
          <Sparkles size={28} />
        </button>

        <button onClick={() => setActiveTab('stats')} className={`p-2 transition-all ${activeTab === 'stats' ? 'text-[var(--accent-cyan)]' : 'text-white/40'}`}>
          <Activity size={24} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
        </button>

        <button onClick={() => setShowTaskForm(true)} className={`p-2 transition-all ${activeTab === 'profile' ? 'text-[var(--accent-cyan)]' : 'text-white/40'}`}>
          <Plus size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-white font-sans selection:bg-[var(--accent-cyan)]/30">

      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-[var(--accent-purple)]/10 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pb-32 md:pb-0">

        {/* HEADER (Glass Sticky) */}
        <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-white/[0.03] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[var(--accent-cyan)] uppercase mb-1">
              {format(currentTime, "EEEE d MMMM", { locale: fr })}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bonjour, <span className="text-white/60">{user.email?.split('@')[0]}</span>
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User size={20} className="text-white/80" />
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 px-4 pt-8 space-y-12 max-w-4xl mx-auto w-full">

          {/* STATS ROW (Horizontal Scroll on Mobile) */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
            <div className="min-w-[280px] snap-center">
              <StatCard label="Tâches" value={todoTasks.length} icon={ListChecks} trend="neutral" />
            </div>
            <div className="min-w-[280px] snap-center">
              <StatCard label="Aujourd'hui" value={todayTasks.length} icon={Clock} trend="up" trendValue="+20%" />
            </div>
          </div>

          {/* SECTIONS */}
          <div className="space-y-6">
            <div className="flex items-end justify-between px-2">
              <h2 className="text-xl font-medium tracking-tight">Vos Tâches</h2>
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Vue Détaillée</span>
            </div>

            {/* TASK LIST (New Look) */}
            <div className="space-y-4">
              {todoTasks.length > 0 ? todoTasks.slice(0, 5).map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleTaskStatus(task)}
                  className="group flex items-center gap-4 p-5 rounded-[24px] bg-white/[0.02] border border-white/[0.05] active:scale-98 transition-all hover:bg-white/[0.05]"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)]' : 'border-white/20'}`}>
                    {task.status === 'done' && <CheckCircle2 size={12} className="text-[#0B101B]" />}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium text-lg leading-tight ${task.status === 'done' ? 'line-through text-white/30' : 'text-white'}`}>{task.title}</h3>
                    {task.due_date && <p className="text-xs text-[var(--accent-cyan)] mt-1">{format(new Date(task.due_date), "dd MMM HH:mm", { locale: fr })}</p>}
                  </div>
                </motion.div>
              )) : (
                <div className="py-12 text-center text-white/30 italic">
                  Aucune tâche en cours. Le calme absolu.
                </div>
              )}
            </div>
          </div>

        </main>

        {/* Floating AI & Navigation (Mobile First) */}
        <FloatingTabBar />

      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {isAIActive && <LiveVoiceAssistant onClose={() => setIsAIActive(false)} onTaskCreated={fetchTasks} />}
        {showTaskForm && <TaskForm onClose={() => setShowTaskForm(false)} onSuccess={fetchTasks} />}
      </AnimatePresence>
    </div>
  );
}
