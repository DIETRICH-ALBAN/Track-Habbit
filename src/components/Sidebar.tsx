"use client";

import { useState, useEffect } from "react";
import {
    Calendar, MessageSquare, Bell, LogOut, Users,
    ChevronLeft, ChevronRight, LayoutDashboard, Settings,
    Activity, Cpu, FolderOpen, FileText
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MiniNeuralSphere } from "./NeuralSphere";

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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/", active: pathname === "/" && !showCalendar },
        { icon: Calendar, label: "Planning", onClick: onToggleCalendar, active: showCalendar },
        { icon: FileText, label: "Import", onClick: onToggleDocImport, active: false },
        { icon: Users, label: "Équipes", href: "/teams", active: pathname === "/teams" },
        { icon: MessageSquare, label: "AI Chat", onClick: onToggleAIChat, active: showAIChat },
        { icon: Bell, label: "Alertes", onClick: onToggleNotifications, active: showNotifications },
    ];

    if (isMobile) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md h-20 glass-panel rounded-[24px] flex items-center justify-around px-2 z-[100] border-white/10 shadow-2xl">
                {navItems.slice(0, 2).map((item, i) => (
                    <button key={i} onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn("flex flex-col items-center gap-1 transition-colors", item.active ? "text-indigo-500" : "text-white/30")}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}

                {/* Central AI Trigger */}
                <div className="relative -top-10">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onActivateAI}
                        className="w-16 h-16 bg-[#0a0a0b] border border-indigo-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] relative z-10 overflow-hidden"
                    >
                        <div className="w-12 h-12">
                            <MiniNeuralSphere active={showAIChat} />
                        </div>
                    </motion.button>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                </div>

                {navItems.slice(2, 4).map((item, i) => (
                    <button key={i} onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn("flex flex-col items-center gap-1 transition-colors", item.active ? "text-indigo-500" : "text-white/30")}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 84 : 260 }}
            className="fixed top-0 left-0 bottom-0 glass-panel border-r border-white/5 flex flex-col z-[60] bg-[#030303]/40"
        >
            {/* Logo Area */}
            <div className="p-6 mb-8 flex items-center justify-between overflow-hidden">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                                <Cpu className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold tracking-tight text-white">Track Habbit</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-4 space-y-2">
                <div className="section-label px-2 mb-4">
                    {!isCollapsed ? "Menu Principal" : "..."}
                </div>
                {navItems.map((item, i) => (
                    <button
                        key={i}
                        onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn(
                            "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all relative group",
                            item.active ? "bg-indigo-600/10 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <item.icon size={20} className={cn("shrink-0", item.active && "text-indigo-500 drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]")} />
                        {!isCollapsed && (
                            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">{item.label}</span>
                        )}
                        {item.active && (
                            <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full shadow-[0_0_10px_rgba(79,70,229,0.6)]" />
                        )}
                        {isCollapsed && (
                            <div className="absolute left-16 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-bold uppercase tracking-widest z-50 shadow-lg">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 mt-auto border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-4 px-3 py-3 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/5 transition-all group",
                        isCollapsed && "justify-center"
                    )}
                >
                    <LogOut size={20} />
                    {!isCollapsed && <span className="text-sm font-medium">Déconnexion</span>}
                </button>
            </div>
        </motion.aside>
    );
}
