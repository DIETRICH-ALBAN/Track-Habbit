"use client";

import { useState, useEffect } from "react";
import {
    Calendar, MessageSquare, Bell, LogOut, Users,
    ChevronLeft, ChevronRight, LayoutDashboard,
    FileText, Sparkles
} from "lucide-react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
        window.location.href = "/auth";
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/", active: pathname === "/" && !showCalendar },
        { icon: Calendar, label: "Planning", onClick: onToggleCalendar, active: showCalendar },
        { icon: FileText, label: "Import", onClick: onToggleDocImport, active: false },
        { icon: Users, label: "Équipes", href: "/teams", active: pathname === "/teams" },
        { icon: MessageSquare, label: "AI Chat", onClick: onToggleAIChat, active: showAIChat },
        { icon: Bell, label: "Alertes", onClick: onToggleNotifications, active: showNotifications },
    ];

    // Mobile Bottom Navigation
    // Mobile Floating Navigation
    if (isMobile) {
        return (
            <div className="floating-tab-bar">
                {/* Left Group */}
                {navItems.slice(0, 2).map((item, i) => (
                    <button
                        key={i}
                        onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn(
                            "nav-item",
                            item.active && "active"
                        )}
                    >
                        <item.icon size={26} strokeWidth={item.active ? 2.5 : 2} />
                    </button>
                ))}

                {/* Central AI Trigger - Corn Revolution Style */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onActivateAI}
                    className="w-16 h-16 rounded-full flex items-center justify-center relative shadow-[0_8px_32px_rgba(0,240,255,0.4)] transition-all z-50 hover:scale-105 active:scale-95"
                    style={{ background: 'var(--accent-cyan)' }}
                >
                    <Sparkles size={28} className="text-black fill-black" />
                </motion.button>

                {/* Right Group */}
                {navItems.slice(3, 5).map((item, i) => (
                    <button
                        key={i}
                        onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn(
                            "nav-item",
                            item.active && "active"
                        )}
                    >
                        <item.icon size={26} strokeWidth={item.active ? 2.5 : 2} />
                    </button>
                ))}
            </div>
        );
    }

    // Desktop Sidebar
    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? 80 : 260 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="sidebar fixed top-0 left-0 bottom-0 flex flex-col z-[60]"
        >
            {/* Logo */}
            <div className="h-20 px-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(157,78,221,0.4)]" style={{ background: 'linear-gradient(135deg, #9d4edd 0%, #f72585 100%)' }}>
                                <Sparkles size={18} className="text-white" />
                            </div>
                            <div>
                                <span className="font-bold text-[15px] tracking-tight">Track Habbit</span>
                                <p className="text-[9px] text-cyan-400/80 font-bold uppercase tracking-[0.2em]">Liquid AI</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="section-label px-3 mb-3">
                    {!isCollapsed ? "Navigation" : ""}
                </div>
                {navItems.map((item, i) => (
                    <button
                        key={i}
                        onClick={() => item.href ? window.location.href = item.href : item.onClick?.()}
                        className={cn(
                            "sidebar-item w-full",
                            item.active && "active"
                        )}
                    >
                        <item.icon size={20} />
                        {!isCollapsed && (
                            <span className="text-sm font-medium">{item.label}</span>
                        )}
                        {isCollapsed && (
                            <div className="absolute left-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)]">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "sidebar-item w-full hover:text-rose-400 hover:bg-rose-500/10",
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
