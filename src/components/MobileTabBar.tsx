"use client";

import React from "react";
import { LayoutGrid, Clock, Sparkles, Activity, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setIsAIActive: (active: boolean) => void;
    setShowTaskForm: (show: boolean) => void;
}

export function MobileTabBar({ activeTab, setActiveTab, setIsAIActive, setShowTaskForm }: MobileTabBarProps) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg md:hidden">
            <div className="flex items-center justify-between bg-[var(--bg-card)] backdrop-blur-xl border border-white/10 rounded-[24px] px-5 py-3 shadow-2xl">
                <button
                    onClick={() => setActiveTab('home')}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeTab === 'home' ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' : 'text-white/40'
                    )}
                >
                    <LayoutGrid size={22} />
                </button>

                <button
                    onClick={() => setActiveTab('calendar')}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeTab === 'calendar' ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' : 'text-white/40'
                    )}
                >
                    <Clock size={22} />
                </button>

                {/* CENTRAL AI FAB */}
                <button
                    onClick={() => setIsAIActive(true)}
                    className="w-14 h-14 -mt-10 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-cyan)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--accent-cyan)]/30 border-[3px] border-[var(--bg-primary)] active:scale-95 transition-transform"
                >
                    <Sparkles size={24} />
                </button>

                <button
                    onClick={() => setActiveTab('stats')}
                    className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeTab === 'stats' ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' : 'text-white/40'
                    )}
                >
                    <Activity size={22} />
                </button>

                <button
                    onClick={() => setShowTaskForm(true)}
                    className="p-2.5 rounded-xl text-white/40 hover:text-[var(--accent-tan)] transition-colors"
                >
                    <Plus size={22} />
                </button>
            </div>
        </div>
    );
}
