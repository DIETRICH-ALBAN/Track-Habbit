"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color?: "cyan" | "purple" | "magenta" | "white";
    delay?: number;
}

const colorMap = {
    cyan: "text-[#00d4ff]",
    purple: "text-[#a855f7]",
    magenta: "text-[#d946ef]",
    white: "text-white",
};

const glowMap = {
    cyan: "rgba(0, 212, 255, 0.3)",
    purple: "rgba(168, 85, 247, 0.3)",
    magenta: "rgba(217, 70, 239, 0.3)",
    white: "rgba(255, 255, 255, 0.1)",
};

export function StatCard({ label, value, icon: Icon, color = "purple", delay = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
            className="glass-panel p-6 group"
            style={{
                "--hover-glow": `0 0 40px ${glowMap[color]}`
            } as React.CSSProperties}
        >
            <div className="flex items-center gap-4 mb-5">
                <div className={cn(
                    "p-3 rounded-2xl bg-white/5 transition-all duration-300 group-hover:scale-110",
                    colorMap[color]
                )}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
                <span className="section-label mb-0">{label}</span>
            </div>

            <div className={cn(
                "text-4xl font-black tracking-tight transition-all duration-300",
                colorMap[color]
            )}>
                {value}
            </div>
        </motion.div>
    );
}
