"use client";

import { LayoutGrid, Clock, Sparkles, Activity, Plus, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";

interface NavigationDockProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setIsAIActive: (active: boolean) => void;
    setShowTaskForm: (show: boolean) => void;
}

export function NavigationDock({ activeTab, setActiveTab, setIsAIActive, setShowTaskForm }: NavigationDockProps) {
    const items = [
        { id: 'home', label: 'Accueil', icon: LayoutGrid, onClick: () => setActiveTab('home') },
        { id: 'calendar', label: 'Calendrier', icon: Clock, onClick: () => setActiveTab('calendar') },
        { id: 'ai', label: 'Assistant AI', icon: Sparkles, onClick: () => setIsAIActive(true), special: true },
        { id: 'teams', label: 'Équipes', icon: Users, onClick: () => setActiveTab('teams') },
        { id: 'notifications', label: 'Notifications', icon: Bell, onClick: () => setActiveTab('notifications') },
        { id: 'stats', label: 'Stats', icon: Activity, onClick: () => setActiveTab('stats') },
        { id: 'add', label: 'Ajouter', icon: Plus, onClick: () => setShowTaskForm(true) },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pb-[env(safe-area-inset-bottom)] px-4 w-full flex justify-center">
            <Dock
                className="items-end pb-3 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl"
                panelHeight={64}
                magnification={80}
                distance={140}
            >
                {items.map((item) => (
                    <DockItem
                        key={item.id}
                        className={cn(
                            "aspect-square rounded-2xl transition-all duration-300",
                            item.special
                                ? "bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white shadow-lg shadow-[var(--accent-cyan)]/20"
                                : activeTab === item.id
                                    ? "bg-white/10 text-[var(--accent-cyan)] border border-white/10 shadow-inner"
                                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <button onClick={item.onClick} className="w-full h-full flex items-center justify-center">
                            <DockLabel className="bg-[#1a1a1a] border-white/10 text-white font-bold">{item.label}</DockLabel>
                            <DockIcon>
                                <item.icon size={22} className={cn(item.special && "drop-shadow-[0_0_8px_white]")} />
                            </DockIcon>
                        </button>
                    </DockItem>
                ))}
            </Dock>
        </div>
    );
}
