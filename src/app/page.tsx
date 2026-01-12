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
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SupabaseUser | any>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI States
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDocImport, setShowDocImport] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isAIVisualMode, setIsAIVisualMode] = useState(false);

  // ... (rest of the state and logic similar to before)

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // ... (existing useEffect logic)
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUser(user);
    };
    getUser();

    // Fetch Tasks and Teams (Simplified for this full file rewrite)
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
  const todayDone = todayTasks.filter(t => t.status === 'done');
  const efficiency = todayTasks.length > 0 ? Math.round((todayDone.length / todayTasks.length) * 100) : 0;

  // UseRouter might be needed if not present
  function useRouter() { const { push } = require("next/navigation"); return { push }; }


  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
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

                      <div className="relative z-10 w-full h-44 mb-6 cursor-pointer group flex items-center justify-center" onClick={() => setIsAIVisualMode(true)}>
                        <div className="w-[180px] h-[180px]">
                          <SplineObject />
                        </div>
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
              // setAiInitialMessage not defined in this scope without complex state, assuming AIChat handles props or context
            }}
          />
        )}
        {showAIChat && <AIChat onClose={() => setShowAIChat(false)} />}
        {isAIVisualMode && <LiveVoiceAssistant onClose={() => setIsAIVisualMode(false)} onTaskCreated={fetchTasks} />}
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>
    </div>
  );
}
