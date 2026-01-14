"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, ChevronRight, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
    index?: number;
}

export function TaskCard({ task, onClick, index = 0 }: TaskCardProps) {
    const isDone = task.status === "done";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={onClick}
            className={cn(
                "group relative p-[1px] cursor-pointer transition-all duration-300",
                isDone && "opacity-60 grayscale-[0.5]"
            )}
        >
            {/* Outer Bevel */}
            <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-50" />

            {/* Main Surface */}
            <div
                className="relative p-4 flex items-center gap-4 rounded-[21px] backdrop-blur-lg border border-white/5 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group-hover:shadow-[0_12px_30px_rgba(6,182,212,0.15)] group-hover:scale-[1.01]"
                style={{
                    background: 'rgba(25, 25, 25, 0.6)',
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
                    transform: 'translateZ(0)',
                    willChange: 'backdrop-filter'
                }}
            >
                {/* Check Button */}
                <button
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300",
                        isDone
                            ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)] text-[var(--bg-primary)] scale-110"
                            : "border-[var(--accent-steel)] text-transparent hover:border-[var(--accent-cyan)]"
                    )}
                >
                    <CheckCircle2 size={14} className={cn("transition-transform", isDone ? "scale-100" : "scale-0")} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className={cn(
                        "font-medium text-[15px] truncate transition-all",
                        isDone ? "line-through text-white/30" : "text-white"
                    )}>
                        {task.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        {task.due_date && (
                            <div className="flex items-center gap-1.5 text-[var(--accent-blue)]">
                                <Clock size={12} />
                                <span className="text-[11px] font-medium">{format(parseISO(task.due_date), "HH:mm")}</span>
                            </div>
                        )}
                        {task.team && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-secondary)] border border-white/5">
                                {task.team.name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status & Arrow */}
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                        isDone
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-[var(--accent-tan)]/10 text-[var(--accent-tan)]"
                    )}>
                        {isDone ? "Terminé" : "En cours"}
                    </span>
                    <ChevronRight
                        size={16}
                        className="text-white/20 group-hover:text-[var(--accent-cyan)] group-hover:translate-x-1 transition-all"
                    />
                </div>
            </div>
        </motion.div>
    );
}
