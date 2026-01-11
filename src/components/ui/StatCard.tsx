"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: "blue" | "purple" | "indigo" | "white";
    delay?: number;
}

const colorMap = {
    blue: "text-blue-500",
    purple: "text-purple-500",
    indigo: "text-indigo-600",
    white: "text-white",
};

export function StatCard({ label, value, icon: Icon, color = "indigo", delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass-panel p-6 group flex flex-col gap-4"
        >
            <div className="flex items-center justify-between">
                <div className={cn(
                    "w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/[0.05] transition-all duration-300 group-hover:border-indigo-500/30",
                    colorMap[color]
                )}>
                    <Icon size={20} strokeWidth={2} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                    Active Now
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-400">{label}</span>
                <div className="text-3xl font-bold tracking-tight text-white flex items-baseline gap-2">
                    {value}
                    <span className="text-[10px] text-indigo-500 font-bold tracking-widest uppercase">+2%</span>
                </div>
            </div>
        </motion.div>
    );
}
