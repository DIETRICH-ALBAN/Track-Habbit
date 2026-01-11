"use client";

import { motion } from "framer-motion";
import { Activity, Clock, CheckCircle2, ChevronRight } from "lucide-react";
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
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ x: 4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={cn(
                "glass-panel p-4 flex items-center gap-4 group cursor-pointer relative overflow-hidden",
                isDone ? "opacity-40" : "opacity-100"
            )}
        >
            {/* Icon */}
            <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                isDone
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-indigo-600/10 border-indigo-600/20 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white"
            )}>
                {isDone ? <CheckCircle2 size={18} /> : <Activity size={18} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <h3 className={cn(
                    "font-semibold tracking-tight transition-all duration-300 truncate",
                    isDone ? "text-slate-500 line-through" : "text-white group-hover:text-white"
                )}>
                    {task.title}
                </h3>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={12} strokeWidth={2.5} />
                        <span className="text-[11px] font-medium">
                            {task.due_date ? format(parseISO(task.due_date), "HH:mm") : 'À planifier'}
                        </span>
                    </div>
                    {task.team && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {task.team.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                    isDone ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400 group-hover:border-indigo-500/50 group-hover:text-indigo-400"
                )}>
                    {isDone ? "Terminé" : "En cours"}
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
            </div>
        </motion.div>
    );
}
