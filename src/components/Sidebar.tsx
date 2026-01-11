"use client";

import { Calendar, MessageSquare, FileText, Bell, LogOut, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface SidebarProps {
    onToggleCalendar?: () => void;
    showCalendar?: boolean;
    onToggleAIChat?: () => void;
    showAIChat?: boolean;
    onToggleDocImport?: () => void;
    onToggleNotifications?: () => void;
    showNotifications?: boolean;
}

export default function Sidebar({
    onToggleCalendar,
    showCalendar,
    onToggleAIChat,
    showAIChat,
    onToggleDocImport,
    onToggleNotifications,
    showNotifications
}: SidebarProps) {
    const pathname = usePathname();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    return (
        <aside className="fixed bottom-0 left-0 right-0 md:relative md:w-20 border-t md:border-t-0 md:border-r border-white/10 flex flex-row md:flex-col items-center py-4 md:py-8 px-6 md:px-0 gap-8 bg-[#050505]/80 backdrop-blur-xl z-[60]">
            <Link href="/" className="hidden md:flex w-10 h-10 bg-primary rounded-xl items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-transform hover:scale-110 active:scale-95">
                <CheckCircle2 className="w-6 h-6 text-white" />
            </Link>

            <nav className="flex flex-row md:flex-col gap-6 md:gap-8 flex-1 justify-around md:justify-center w-full">
                {/* Dashboard / Calendar Button */}
                <button
                    onClick={() => {
                        if (pathname !== "/") {
                            window.location.href = "/";
                        } else if (onToggleCalendar) {
                            onToggleCalendar();
                        }
                    }}
                    className={`p-3 rounded-xl transition-all border ${showCalendar ? 'bg-white/10 text-primary border-primary/20' : 'bg-white/5 text-white/60 border-transparent hover:text-primary'} ${pathname === "/" && !showCalendar ? "text-primary bg-white/5" : ""}`}
                >
                    <Calendar className="w-6 h-6 mx-auto" strokeWidth={2.5} />
                </button>

                {/* Teams Link */}
                <Link
                    href="/teams"
                    className={`p-3 rounded-xl transition-all border ${pathname === "/teams" ? 'bg-white/10 text-primary border-primary/20' : 'bg-white/5 text-white/60 border-transparent hover:text-primary'}`}
                >
                    <Users className="w-6 h-6 mx-auto" />
                </Link>

                {/* AI Chat Button */}
                <button
                    onClick={() => {
                        if (pathname !== "/") {
                            // On pourrait passer un param pour l'ouvrir direct
                            window.location.href = "/?chat=true";
                        } else if (onToggleAIChat) {
                            onToggleAIChat();
                        }
                    }}
                    className={`p-3 rounded-xl transition-all border ${showAIChat ? 'bg-white/10 text-primary border-primary/20' : 'bg-white/5 text-white/60 border-transparent hover:text-primary'}`}
                >
                    <MessageSquare className="w-6 h-6 mx-auto" />
                </button>

                {/* Document Import Button */}
                <button
                    onClick={() => {
                        if (pathname !== "/") {
                            window.location.href = "/?import=true";
                        } else if (onToggleDocImport) {
                            onToggleDocImport();
                        }
                    }}
                    className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-primary border border-transparent"
                >
                    <FileText className="w-6 h-6 mx-auto" />
                </button>

                {/* Notifications Button */}
                <button
                    onClick={() => onToggleNotifications?.()}
                    className={`p-3 rounded-xl transition-all border ${showNotifications ? 'bg-white/10 text-primary border-primary/20' : 'bg-white/5 text-white/60 border-transparent hover:text-primary'}`}
                >
                    <Bell className="w-6 h-6 mx-auto" />
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="p-3 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all text-red-500/60 hover:text-red-500 border border-transparent"
                >
                    <LogOut className="w-6 h-6 mx-auto" />
                </button>
            </nav>
        </aside>
    );
}
