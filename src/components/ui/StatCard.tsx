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
            className="card p-6 group"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="icon-box">
                    <Icon size={22} strokeWidth={1.5} />
                </div>
                {trendValue && (
                    <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        trendConfig[trend].bg,
                        trendConfig[trend].color
                    )}>
                        <TrendIcon size={12} />
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="space-y-1">
                <p className="text-sm text-[var(--text-muted)]">{label}</p>
                <p className="text-3xl font-bold tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
}
