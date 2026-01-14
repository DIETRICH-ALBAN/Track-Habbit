"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, Clock, Sparkles, Activity, Plus, Users, Bell, MoreHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { motion, AnimatePresence } from "framer-motion";

interface NavigationDockProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setIsAIActive: (active: boolean) => void;
    setShowTaskForm: (show: boolean) => void;
}

export function NavigationDock({ activeTab, setActiveTab, setIsAIActive, setShowTaskForm }: NavigationDockProps) {
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);

    const primaryItems = [
        { id: 'home', label: 'Accueil', icon: LayoutGrid, onClick: () => setActiveTab('home') },
        { id: 'calendar', label: 'Calendrier', icon: Clock, onClick: () => setActiveTab('calendar') },
        { id: 'ai', label: 'Assistant AI', icon: Sparkles, onClick: () => setIsAIActive(true), special: true },
    ];

    const secondaryItems = [
        { id: 'teams', label: 'Équipes', icon: Users, onClick: () => setActiveTab('teams') },
        { id: 'notifications', label: 'Notifications', icon: Bell, onClick: () => setActiveTab('notifications') },
        { id: 'stats', label: 'Stats', icon: Activity, onClick: () => setActiveTab('stats') },
        { id: 'add', label: 'Nouveau', icon: Plus, onClick: () => setShowTaskForm(true) },
    ];

    // Close menu when activeTab changes
    useEffect(() => {
        setIsMenuExpanded(false);
    }, [activeTab]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pb-[env(safe-area-inset-bottom)] px-4 flex flex-col items-center w-fit pointer-events-none">

            {/* Expanded Vertical Menu */}
            <AnimatePresence>
                {isMenuExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="flex flex-col gap-1.5 p-2 bg-[#121212]/90 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-3 min-w-[200px] pointer-events-auto"
                    >
                        <div className="px-4 py-2 mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 border-b border-white/5 mb-1 flex justify-between items-center">
                            Options
                            <ChevronDown size={12} className="opacity-50" />
                        </div>
                        {secondaryItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200",
                                    activeTab === item.id
                                        ? "bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20"
                                        : "text-white/50 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                                    activeTab === item.id
                                        ? "bg-[var(--accent-cyan)] text-[var(--bg-primary)] shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                        : "bg-white/5 group-hover:bg-white/10"
                                )}>
                                    <item.icon size={18} />
                                </div>
                                <span className="text-sm font-semibold tracking-tight">{item.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Dock Container */}
            <div className="pointer-events-auto">
                <Dock
                    className="items-end pb-3 bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-[32px]"
                    panelHeight={64}
                    magnification={55} // Reduced further for a more professional feel
                    distance={110}
                >
                    {primaryItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <DockItem
                                key={item.id}
                                onClick={item.onClick}
                                className={cn(
                                    "aspect-square rounded-2xl transition-all duration-500",
                                    item.special
                                        ? "bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white shadow-[0_10px_25px_rgba(6,182,212,0.4)]"
                                        : isActive
                                            ? "bg-white/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 ring-1 ring-[var(--accent-cyan)]/20 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]"
                                            : "bg-white/5 text-white/30 border border-white/5"
                                )}
                            >
                                <DockLabel className="bg-[#1a1a1a] border-white/10 text-white font-bold">{item.label}</DockLabel>
                                <DockIcon>
                                    <item.icon size={22} className={cn(
                                        "transition-all duration-300",
                                        item.special && "drop-shadow-[0_0_10px_white]",
                                        isActive && !item.special && "drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] scale-110 text-[var(--accent-cyan)]"
                                    )} />
                                </DockIcon>
                                {isActive && !item.special && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_10px_#06b6d4]"
                                    />
                                )}
                            </DockItem>
                        );
                    })}

                    {/* Ellipsis / More Button */}
                    <DockItem
                        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                        className={cn(
                            "aspect-square rounded-2xl transition-all duration-300 border",
                            isMenuExpanded
                                ? "bg-[var(--accent-tan)] text-[var(--bg-primary)] border-[var(--accent-tan)] shadow-[0_0_20px_rgba(212,189,172,0.4)]"
                                : "bg-white/5 text-white/30 border-white/5"
                        )}
                    >
                        <DockLabel className="bg-[#1a1a1a] border-white/10 text-white font-bold">Menu</DockLabel>
                        <DockIcon>
                            <MoreHorizontal size={22} className={cn(isMenuExpanded && "scale-110")} />
                        </DockIcon>
                    </DockItem>
                </Dock>
            </div>
        </div>
    );
}
