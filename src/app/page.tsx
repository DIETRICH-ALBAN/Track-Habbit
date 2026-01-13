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

  const renderContent = () => {
    switch (activeTab) {
      case "home":
      case "dashboard":
        return (
          <>
            {/* STATS ROW */}
            <section>
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
            <section>
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
                    className="group flex items-center gap-4 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer transition-all hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--bg-card-hover)]"
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
                  <div className="py-16 text-center rounded-[var(--radius-lg)] bg-[var(--bg-card)]/50 border border-dashed border-[var(--border-subtle)]">
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
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-white font-sans overflow-hidden">

      {/* PC Menu (Desktop Sidebar - Reference Image Style) */}
      <DesktopSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="relative z-10 flex-1 flex flex-col h-screen overflow-y-auto pb-28 md:pb-0 scroll-smooth">

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-lg border-b border-[var(--border-subtle)] px-5 md:px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-[var(--accent-tan)] uppercase">
              {format(currentTime, "EEEE d MMMM", { locale: fr })}
            </p>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-0.5">
              {activeTab === 'home' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIActive(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              <Sparkles size={16} />
              Assistant IA
            </button>
            <div className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center">
              <User size={18} className="text-white/70" />
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 px-4 md:px-8 py-6 space-y-8 max-w-6xl mx-auto w-full">
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
      </AnimatePresence>
    </div>
  );
}
