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
            className="group relative rounded-[28px] p-[1px] transition-all duration-500 hover:scale-[1.02]"
        >
            {/* Outer Border / Bevel Effect */}
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />

            {/* Main Card Body */}
            <div
                className="relative h-full w-full rounded-[27px] p-6 backdrop-blur-xl transition-all duration-500 border border-white/5 overflow-hidden shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] group-hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.25)]"
                style={{
                    background: 'rgba(20, 20, 20, 0.7)',
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
                    transform: 'translateZ(0)',
                    willChange: 'backdrop-filter'
                }}
            >
                {/* Subtle Inner Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-[var(--accent-cyan)]/10 blur-[60px] group-hover:bg-[var(--accent-cyan)]/20 transition-all duration-700" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--accent-cyan)] shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Icon size={22} strokeWidth={1.5} />
                    </div>
                    {trendValue && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider backdrop-blur-md border border-white/5 shadow-sm",
                            trend === 'up' ? "text-[var(--accent-tan)] bg-[var(--accent-tan)]/10" :
                                trend === 'down' ? "text-rose-400 bg-rose-500/10" : "text-white/40 bg-white/5"
                        )}>
                            <TrendIcon size={10} />
                            <span>{trendValue}</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <p className="text-3xl font-black tracking-tight text-white mb-1 drop-shadow-md">{value}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">{label}</p>
                </div>

                {/* Glass Reflection effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
            </div>
        </motion.div>
    );
}
