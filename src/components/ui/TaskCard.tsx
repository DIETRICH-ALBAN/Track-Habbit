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
                "card p-4 flex items-center gap-4 group cursor-pointer",
                isDone && "opacity-50"
            )}
        >
            {/* Check Button */}
            <button
                className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200",
                    isDone
                        ? "bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white"
                        : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)]"
                )}
            >
                {isDone ? <CheckCircle2 size={16} /> : <Sparkles size={14} />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className={cn(
                    "font-medium text-[15px] truncate transition-all",
                    isDone && "line-through text-[var(--text-muted)]"
                )}>
                    {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                    {task.due_date && (
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <Clock size={12} />
                            <span className="text-xs">{format(parseISO(task.due_date), "HH:mm")}</span>
                        </div>
                    )}
                    {task.team && (
                        <span className="badge">{task.team.name}</span>
                    )}
                </div>
            </div>

            {/* Status & Arrow */}
            <div className="flex items-center gap-3">
                <span className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full",
                    isDone
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                )}>
                    {isDone ? "Terminé" : "En cours"}
                </span>
                <ChevronRight
                    size={18}
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent-purple)] group-hover:translate-x-1 transition-all"
                />
            </div>
        </motion.div>
    );
}
