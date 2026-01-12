"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    delay?: number;
}

export function StatCard({
    label,
    value,
    icon: Icon,
    trend = "neutral",
    trendValue,
    delay = 0
}: StatCardProps) {
    const trendConfig = {
        up: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        down: { icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-400/10" },
        neutral: { icon: Minus, color: "text-zinc-400", bg: "bg-zinc-400/10" }
    };

    const TrendIcon = trendConfig[trend].icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-md transition-all hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(157,78,221,0.1)]"
        >
            {/* Animated Gradient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/5 via-transparent to-[var(--accent-pink)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/[0.08] to-transparent border border-white/[0.1] flex items-center justify-center text-[var(--accent-purple-light)] group-hover:text-white transition-colors">
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                {trendValue && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
                        trendConfig[trend].bg,
                        trendConfig[trend].color
                    )}>
                        <TrendIcon size={10} />
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{label}</p>
                <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            </div>
        </motion.div>
    );
}
