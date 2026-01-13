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
            className="group relative overflow-hidden rounded-[20px] border border-white/5 bg-[#1a1a1a]/40 backdrop-blur-md p-6 transition-all duration-300 hover:bg-[#1a1a1a]/60 hover:border-[var(--accent-cyan)]/50 hover:shadow-[0_10px_30px_-10px_rgba(61,167,208,0.25)]"
        >
            {/* Subtle Glow */}
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-[var(--accent-cyan)]/10 blur-[40px] group-hover:bg-[var(--accent-cyan)]/25 transition-all duration-500" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-steel)]/30 border border-[var(--accent-steel)]/50 flex items-center justify-center text-[var(--accent-cyan)] group-hover:scale-105 transition-transform">
                    <Icon size={20} strokeWidth={1.5} />
                </div>
                {trendValue && (
                    <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider",
                        trend === 'up' ? "text-[var(--accent-tan)] bg-[var(--accent-tan)]/15" :
                            trend === 'down' ? "text-rose-400 bg-rose-500/10" : "text-white/40 bg-white/5"
                    )}>
                        <TrendIcon size={10} />
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                <p className="text-3xl font-semibold tracking-tight text-white mb-1">{value}</p>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</p>
            </div>
        </motion.div>
    );
}
