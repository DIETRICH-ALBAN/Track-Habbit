"use client";

import { Calendar, MessageSquare, FileText, Bell, LogOut, Users, CheckCircle2, LayoutDashboard, Database, Cpu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { motion } from "framer-motion";

interface SidebarProps {
    onToggleCalendar?: () => void;
    showCalendar?: boolean;
    onToggleAIChat?: () => void;
    showAIChat?: boolean;
    onToggleDocImport?: () => void;
    onToggleNotifications?: () => void;
    showNotifications?: boolean;
    onActivateAI?: () => void;
}

export default function Sidebar({
    onToggleCalendar,
    showCalendar,
    onToggleAIChat,
    showAIChat,
    onToggleDocImport,
    onToggleNotifications,
    showNotifications,
    onActivateAI
}: SidebarProps) {
    const pathname = usePathname();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <>
            {/* Desktop Side Bar (Left) */}
            <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-24 border-r border-white/5 flex-col items-center py-8 gap-8 bg-[#020203]/80 backdrop-blur-3xl z-[60]">
                <Link href="/" className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-transform hover:scale-110 active:scale-95">
                    <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                </Link>

                <nav className="flex flex-col gap-6 flex-1 justify-center w-full items-center">
                    <button
                        onClick={onToggleCalendar}
                        className={`p-4 rounded-2xl transition-all ${showCalendar ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Calendar className="w-6 h-6" />
                    </button>

                    <Link href="/teams" className={`p-4 rounded-2xl transition-all ${pathname === '/teams' ? 'bg-primary text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                        <Users className="w-6 h-6" />
                    </Link>

                    <button
                        onClick={onToggleAIChat}
                        className={`p-4 rounded-2xl transition-all ${showAIChat ? 'bg-primary text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>

                    <button
                        onClick={onToggleNotifications}
                        className={`p-4 rounded-2xl transition-all ${showNotifications ? 'bg-primary text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Bell className="w-6 h-6" />
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="p-4 text-white/20 hover:text-red-500 transition-colors mt-auto"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </aside>

            {/* Mobile Bottom Navigation (Pill Style) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-20 glass-morphism border-white/10 flex items-center justify-around px-4 z-[100] md:hidden">
                <button
                    onClick={() => pathname !== "/" ? window.location.href = "/" : onToggleCalendar?.()}
                    className={`flex flex-col items-center gap-1 ${pathname === "/" && !showCalendar ? "text-primary" : "text-white/40"}`}
                >
                    <Database className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Flux</span>
                </button>

                <Link href="/teams" className={`flex flex-col items-center gap-1 ${pathname === "/teams" ? "text-primary" : "text-white/40"}`}>
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Équipes</span>
                </Link>

                {/* Central AI Button */}
                <div className="relative -top-10">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onActivateAI}
                        className="w-16 h-16 bg-[#020203] border-4 border-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)] relative z-10"
                    >
                        <div className="w-10 h-10 border-2 border-primary/50 rounded-full flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-primary" strokeWidth={3} />
                        </div>
                    </motion.button>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                </div>

                <button
                    onClick={onToggleCalendar}
                    className={`flex flex-col items-center gap-1 ${showCalendar ? "text-primary" : "text-white/40"}`}
                >
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Tâches</span>
                </button>

                <button
                    onClick={onToggleAIChat}
                    className={`flex flex-col items-center gap-1 ${showAIChat ? "text-primary" : "text-white/40"}`}
                >
                    <Cpu className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">IA</span>
                </button>
            </div>
        </>
    );
}
