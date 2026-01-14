"use client";

import React, { useState } from "react";
import {
    Home,
    LayoutGrid,
    Users,
    Activity,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Clock,
    MessageSquare,
    Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

interface DesktopSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function DesktopSidebar({ activeTab, setActiveTab }: DesktopSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const supabase = createClient();

    const menuItems = [
        { id: "home", label: "Accueil", icon: LayoutGrid },
        { id: "calendar", label: "Calendrier", icon: Clock },
        { id: "chat", label: "Assistant IA", icon: MessageSquare },
        { id: "teams", label: "Équipes", icon: Users },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "stats", label: "Statistiques", icon: Activity },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/auth";
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 260 }}
            className="hidden md:flex flex-col h-screen sticky top-0 left-0 border-r border-white/5 z-50 backdrop-blur-3xl transition-all duration-300 ease-in-out relative overflow-hidden"
            style={{
                background: 'rgba(15, 15, 15, 0.7)',
                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)'
            }}
        >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

            {/* Header with Logo and Toggle */}
            <div className="relative flex items-center h-24 px-6 shrink-0 z-10">
                <div className="flex items-center gap-3">
                    {/* Wrobs Isometric Logo Style */}
                    <div className="relative w-10 h-10 shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-lg rotate-12 opacity-50" />
                        <div className="absolute inset-0 bg-[#6366f1] rounded-lg flex items-center justify-center shadow-lg border border-white/20">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-2xl font-bold tracking-tight text-white font-sans ml-1"
                            >
                                Wrobs
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-4 top-10 w-8 h-8 rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all shadow-xl z-50 backdrop-blur-md hover:scale-110"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto scrollbar-hide z-10">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center gap-4 py-3 px-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                                isActive
                                    ? "text-[var(--accent-cyan)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] scale-[1.02]"
                                    : "text-white/40 hover:text-white"
                            )}
                            style={isActive ? {
                                background: 'rgba(255, 255, 255, 0.05)',
                                backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)'
                            } : {}}
                        >
                            {/* Hover effect background */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
                            )}

                            <item.icon size={22} className={cn("shrink-0 transition-all duration-300 relative z-10", isActive ? "text-[var(--accent-cyan)] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "group-hover:text-white")} />

                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-[15px] font-bold relative z-10 tracking-tight"
                                >
                                    {item.label}
                                </motion.span>
                            )}

                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute left-0 w-1 h-6 bg-[var(--accent-cyan)] rounded-r-full"
                                />
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-20 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 z-50 shadow-2xl">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5 space-y-4 z-10">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-4 py-3.5 px-4 rounded-2xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-300",
                        isCollapsed && "justify-center"
                    )}
                >
                    <LogOut size={22} />
                    {!isCollapsed && <span className="text-[15px] font-bold tracking-tight">Logout</span>}
                </button>
            </div>
        </motion.aside>
    );
}
