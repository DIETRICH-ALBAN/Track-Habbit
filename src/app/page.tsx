"use client";

import { useState, useEffect } from "react";
import { Plus, MessageSquare, FileText, Calendar, CheckCircle2, Circle, Clock, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([
    { id: 1, title: "Finaliser le design de l'App", priority: "high", status: "todo", due: "Aujourd'hui" },
    { id: 2, title: "Connecter l'API OpenAI", priority: "medium", status: "in_progress", due: "Demain" },
    { id: 3, title: "Importer le budget (Excel)", priority: "low", status: "todo", due: "10 Janv." },
  ]);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!mounted || loading) return null;

  if (!user) {
    return <AuthModal onSuccess={() => { }} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar - Navigation */}
      <aside className="w-full md:w-20 border-r border-white/10 flex md:flex-col items-center py-8 gap-8 glass-morphism z-20">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <nav className="flex md:flex-col gap-6 flex-1 justify-center text-center">
          <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-primary border border-primary/20">
            <Calendar className="w-6 h-6 mx-auto" strokeWidth={2.5} />
          </button>
          <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60">
            <MessageSquare className="w-6 h-6 mx-auto" />
          </button>
          <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60">
            <FileText className="w-6 h-6 mx-auto" />
          </button>
        </nav>
        <button
          onClick={handleLogout}
          className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all text-red-500/60 hover:text-red-500"
        >
          <LogOut className="w-6 h-6 mx-auto" />
        </button>
      </aside>

      {/* Main Content - Tasks List */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-outfit gradient-text mb-2 tracking-tight">Bonjour !</h1>
              <p className="text-white/40 font-medium">Voici vos tâches pour aujourd'hui.</p>
            </div>
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" strokeWidth={3} />
              <span>Nouvelle Tâche</span>
            </button>
          </header>

          <section className="space-y-4">
            <AnimatePresence>
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-morphism p-5 flex items-center gap-6 group hover:border-primary/30 transition-all cursor-pointer"
                >
                  <button className="text-white/20 hover:text-primary transition-colors">
                    {task.status === "done" ? <CheckCircle2 className="w-7 h-7 text-primary" strokeWidth={2.5} /> : <Circle className="w-7 h-7" strokeWidth={2.5} />}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-white/30 font-semibold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {task.due}</span>
                      <span className={`px-2 py-0.5 rounded-md ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Right Sidebar - AI Agent Preview */}
      <aside className="w-full md:w-96 border-l border-white/10 glass-morphism flex flex-col p-6 m-4 rounded-[32px]">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-tr from-primary to-blue-400 rounded-full animate-pulse blur-[2px] opacity-50 absolute inset-0" />
            <div className="w-12 h-12 bg-gradient-to-tr from-primary to-blue-400 rounded-full relative z-10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full z-20" />
          </div>
          <div>
            <h2 className="font-bold text-lg font-outfit">Track Habbit AI</h2>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">En ligne</p>
          </div>
        </div>

        <div className="flex-1 bg-white/[0.03] rounded-[24px] p-5 mb-4 text-sm text-white/60 overflow-y-auto border border-white/5">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4 text-white/80 font-medium leading-relaxed">
            Bonjour ! Je suis votre assistant. Vous pouvez me poser des questions ou m'envoyer un document pour l'analyser.
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] my-6 opacity-30">Aujourd'hui</div>
          <p className="italic text-center text-white/20 text-xs">En attente de votre message...</p>
        </div>

        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <input
            type="text"
            placeholder="Écrivez à l'agent..."
            className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-sm placeholder:text-white/20"
          />
          <button className="bg-primary p-3 rounded-xl hover:bg-blue-600 transition-all text-white shadow-lg active:scale-95">
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 border border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/5 cursor-pointer transition-all group">
            <FileText className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Importer PDF/Excel</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
