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
            className="group relative overflow-hidden rounded-[32px] border border-white/[0.05] bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-500 hover:bg-white/[0.06] hover:border-[var(--accent-cyan)]/30 hover:shadow-[0_15px_40px_-10px_rgba(0,240,255,0.15)]"
        >
            {/* Animated Glow Spot */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-[var(--accent-cyan)]/20 blur-[60px] group-hover:bg-[var(--accent-cyan)]/40 transition-all duration-700" />

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/70 group-hover:text-[var(--accent-cyan)] group-hover:scale-110 transition-all duration-300">
                    <Icon size={22} strokeWidth={1.5} />
                </div>
                {trendValue && (
                    <div className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider",
                        trend === 'up' ? "text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10" :
                            trend === 'down' ? "text-rose-400 bg-rose-500/10" : "text-white/40 bg-white/5"
                    )}>
                        <TrendIcon size={12} />
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-4xl font-semibold tracking-tighter text-white mb-2">{value}</p>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/40 group-hover:text-white/70 transition-colors">{label}</p>
            </div>
        </motion.div>
    );
}
