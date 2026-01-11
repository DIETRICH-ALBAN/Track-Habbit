"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: string;
    delay?: number;
}

export function StatCard({ label, value, icon: Icon, color = "text-primary", delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="glass-panel p-6 rounded-[2rem] group relative overflow-hidden"
        >
            {/* Selection Glow */}
            <div className={cn(
                "absolute -bottom-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-current",
                color
            )} />

            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className={cn(
                    "p-2.5 rounded-2xl bg-white/5 transition-colors duration-300 group-hover:bg-white/10",
                    color
                )}>
                    <Icon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">
                    {label}
                </span>
            </div>

            <div className="text-4xl font-black font-outfit lowercase italic tracking-tight relative z-10">
                {value}
            </div>
        </motion.div>
    );
}
