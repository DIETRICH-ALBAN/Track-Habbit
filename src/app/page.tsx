"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Plus, MessageSquare, FileText, Calendar, CheckCircle2, Circle, Clock, LogOut, Trash2, MoreVertical, Users, X, Bell } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null); // Still keeping user as any for now but could be User from supabase
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

  const supabase = createClient();

  const fetchTeams = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membershipData } = await supabase
      .from('memberships')
      .select('team:teams(*)')
      .eq('user_id', user.id);

    if (membershipData) {
      const userTeams = membershipData.map((m: any) => m.team).filter(Boolean);
      setTeams(userTeams);
    }
  }, [supabase]);

  const fetchTasks = useCallback(async () => {
    let query = supabase
      .from('tasks')
      .select('*, team:teams(name)')
      .order('created_at', { ascending: false });

    if (selectedTeamId === 'personal') {
      query = query.is('team_id', null);
    } else if (selectedTeamId) {
      query = query.eq('team_id', selectedTeamId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTasks(data);
    }
  }, [supabase, selectedTeamId]);

  useEffect(() => {
    setMounted(true);
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        fetchTeams();
        fetchTasks();
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTeams();
        fetchTasks();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchTasks, fetchTeams, supabase.auth]);

  useEffect(() => {
    // Handle navigation parameters
    const params = new URLSearchParams(window.location.search);
    if (params.get('chat') === 'true') {
      setShowAIChat(true);
      window.history.replaceState({}, '', pathname);
    } else if (params.get('import') === 'true') {
      setShowDocImport(true);
      window.history.replaceState({}, '', pathname);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
    setActiveMenu(null);
  };

  const updateTaskPriority = async (taskId: string, priority: TaskPriority) => {
    const { error } = await supabase
      .from('tasks')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, priority } : t));
    }
    setActiveMenu(null);
  };

  const formatDueDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return "Aujourd'hui";
      if (isTomorrow(date)) return "Demain";
      return format(date, "d MMM", { locale: fr });
    } catch {
      return null;
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return { label: 'Haute', color: 'bg-red-500/10 text-red-500' };
      case 'medium': return { label: 'Moyenne', color: 'bg-yellow-500/10 text-yellow-500' };
      case 'low': return { label: 'Basse', color: 'bg-green-500/10 text-green-500' };
    }
  };

  if (!mounted || loading) return null;

  if (!user) {
    return <AuthModal onSuccess={() => { }} />;
  }

  const todoTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  // Calculate daily progress
  const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
  const todayDone = todayTasks.filter(t => t.status === 'done');
  const progress = todayTasks.length > 0 ? Math.round((todayDone.length / todayTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-white font-sans overflow-x-hidden pb-20 md:pb-0">
      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onSuccess={fetchTasks}
        />
      )}

      {/* Document Import Modal */}
      {showDocImport && (
        <DocumentImport
          onClose={() => setShowDocImport(false)}
          onTextExtracted={(text, filename) => {
            setShowAIChat(true);
            setAiInitialMessage(`Analyse ce document (${filename}) et suggère-moi les tâches à créer :\n\n${text.slice(0, 2000)}${text.length > 2000 ? '...' : ''}`);
          }}
        />
      )}

      {/* Notification Panel Overlay */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
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
      />

      {/* Main Content - Tasks List or Calendar */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <header className="mb-8 md:mb-12 flex justify-between items-start md:items-end">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-outfit gradient-text mb-2 tracking-tight">
                {showCalendar ? "Mon Agenda" : "Bonjour !"}
              </h1>
              <p className="text-white/40 font-medium text-sm md:text-base">
                {showCalendar
                  ? "Visualisez vos tâches dans le temps."
                  : (todoTasks.length === 0 ? "Vous n'avez aucune tâche en cours. 🎉" : `Vous avez ${todoTasks.length} tâche${todoTasks.length > 1 ? 's' : ''} en cours.`)}
              </p>
            </div>

            {/* Desktop New Task Button */}
            {!showCalendar && (
              <div className="flex items-center gap-6">
                {todayTasks.length > 0 && (
                  <div className="hidden lg:flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Progression du jour</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-primary to-blue-400"
                        />
                      </div>
                      <span className="text-sm font-bold text-primary">{progress}%</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="hidden md:flex items-center gap-2 bg-primary hover:bg-blue-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  <span>Nouvelle Tâche</span>
                </button>
              </div>
            )}
          </header>

          {/* Floating Action Button for Mobile */}
          {!showAIChat && !showCalendar && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] z-50 active:scale-90 transition-transform"
            >
              <Plus className="w-7 h-7" strokeWidth={3} />
            </button>
          )}

          {/* Team Filter Bar */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide flex-shrink-0">
            <button
              onClick={() => setSelectedTeamId(null)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${selectedTeamId === null
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                }`}
            >
              Tout
            </button>
            <button
              onClick={() => setSelectedTeamId('personal')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${selectedTeamId === 'personal'
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                }`}
            >
              Personnel
            </button>
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${selectedTeamId === team.id
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                  }`}
              >
                <Users className="w-4 h-4" />
                {team.name}
              </button>
            ))}
          </div>

          {showCalendar ? (
            <div className="flex-1 min-h-0">
              <CalendarView tasks={tasks} onTaskClick={toggleTaskStatus} />
            </div>
          ) : (
            <>
              {/* Todo Tasks */}
              <section className="space-y-4 mb-8">
                <AnimatePresence>
                  {todoTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="glass-morphism p-5 flex items-center gap-6 group hover:border-primary/30 transition-all"
                    >
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="text-white/20 hover:text-primary transition-colors"
                      >
                        <Circle className="w-7 h-7" strokeWidth={2.5} />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{task.title}</h3>
                          {(task as any).team?.name && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {(task as any).team.name}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-white/40 mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-white/30 font-semibold uppercase tracking-widest">
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {formatDueDate(task.due_date)}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-md ${getPriorityLabel(task.priority).color}`}>
                            {getPriorityLabel(task.priority).label}
                          </span>
                          {task.team_id && task.user_id !== user?.id && (
                            <span className="text-[10px] text-white/20">
                              Par {task.user_id.slice(0, 5)}...
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === task.id ? null : task.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-5 h-5 text-white/40" />
                        </button>
                        {activeMenu === task.id && (
                          <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 min-w-[160px] z-50 shadow-xl">
                            <div className="text-[10px] uppercase tracking-widest text-white/30 px-3 py-2">Priorité</div>
                            <button
                              onClick={() => updateTaskPriority(task.id, 'high')}
                              className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm flex items-center gap-2"
                            >
                              <span className="w-2 h-2 bg-red-500 rounded-full" /> Haute
                            </button>
                            <button
                              onClick={() => updateTaskPriority(task.id, 'medium')}
                              className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm flex items-center gap-2"
                            >
                              <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Moyenne
                            </button>
                            <button
                              onClick={() => updateTaskPriority(task.id, 'low')}
                              className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm flex items-center gap-2"
                            >
                              <span className="w-2 h-2 bg-green-500 rounded-full" /> Basse
                            </button>
                            <div className="border-t border-white/10 my-2" />
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="w-full text-left px-3 py-2 hover:bg-red-500/10 rounded-lg text-sm flex items-center gap-2 text-red-500"
                            >
                              <Trash2 className="w-4 h-4" /> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </section>

              {/* Done Tasks */}
              {doneTasks.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">
                    Terminées ({doneTasks.length})
                  </h2>
                  <AnimatePresence>
                    {doneTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="glass-morphism p-5 flex items-center gap-6 group opacity-50 hover:opacity-80 transition-all"
                      >
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className="text-primary transition-colors"
                        >
                          <CheckCircle2 className="w-7 h-7" strokeWidth={2.5} />
                        </button>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold line-through text-white/50">{task.title}</h3>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 text-red-500/60 hover:text-red-500"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </section>
              )}

              {/* Empty State */}
              {tasks.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-white/20" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Aucune tâche</h3>
                  <p className="text-white/40 mb-6">Commencez par créer votre première tâche&nbsp;!</p>
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="bg-primary hover:bg-blue-600 px-6 py-3 rounded-2xl font-bold transition-all"
                  >
                    Créer une tâche
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Right Sidebar - AI Agent (Mobile: Overlay, Desktop: Sidebar) */}
      <div className={`
        fixed inset-0 md:relative md:inset-auto md:w-96 md:flex z-[100] md:z-10
        ${showAIChat ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Mobile Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setShowAIChat(false)}
        />
        <div className="relative w-full h-full flex flex-col p-4 md:p-0" >
          <AIChat
            onTaskCreated={fetchTasks}
            initialMessage={aiInitialMessage || undefined}
            onMessageProcessed={() => setAiInitialMessage(null)}
          />
          {/* Mobile Close Button */}
          <button
            onClick={() => setShowAIChat(false)}
            className="md:hidden absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Live Voice Assistant (Global Overlay) */}
      <LiveVoiceAssistant onTaskCreated={fetchTasks} />
    </div>
  );
}
