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
    Sparkles
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
        { id: "home", label: "Home", icon: Home },
        { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
        { id: "customers", label: "Customers", icon: Users },
        { id: "business", label: "Business", icon: Activity },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/auth";
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 260 }}
            className="hidden md:flex flex-col h-screen sticky top-0 left-0 bg-[#0A0A0A] border-r border-white/5 z-50 transition-all duration-300 ease-in-out overflow-hidden"
        >
            {/* Header with Logo */}
            <div className="flex items-center justify-between h-20 px-6 shrink-0 relative">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-lg font-bold tracking-tight text-white"
                        >
                            Wrobs
                        </motion.span>
                    )}
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "w-full flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon size={22} className={cn("shrink-0", isActive && "text-[#a855f7]")} />
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-[15px] font-medium whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-16 bg-white text-black px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "w-full flex items-center gap-4 py-3 px-4 rounded-xl text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all",
                        isCollapsed && "justify-center px-0"
                    )}
                >
                    <LogOut size={22} />
                    {!isCollapsed && <span className="text-[15px] font-medium">Logout</span>}
                </button>
            </div>
        </motion.aside>
    );
}
