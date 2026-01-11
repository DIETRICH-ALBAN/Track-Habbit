"use client";

import { motion } from "framer-motion";
import { Activity, Clock, CheckCircle2 } from "lucide-react";
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
            initial={{ opacity: 0, scale: 0.98, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ scale: 1.01, x: 4 }}
            onClick={onClick}
            className={cn(
                "glass-panel p-5 rounded-2xl flex items-center gap-6 group cursor-pointer overflow-hidden relative",
                isDone ? "opacity-50" : "opacity-100"
            )}
        >
            {/* Dynamic Status Border */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 transition-all duration-500",
                isDone ? "bg-green-500" : "bg-primary group-hover:w-1.5"
            )} />

            {/* Icon Wrapper */}
            <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                isDone ? "bg-green-500/10 text-green-500" : "bg-white/5 text-primary/60 group-hover:bg-primary/10 group-hover:text-primary"
            )}>
                {isDone ? <CheckCircle2 size={22} /> : <Activity size={22} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className={cn(
                    "font-bold tracking-tight transition-all duration-300 truncate",
                    isDone ? "text-white/40 line-through" : "text-white/90 group-hover:text-white"
                )}>
                    {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                            {task.due_date ? format(parseISO(task.due_date), "HH:mm") : 'À planifier'}
                        </span>
                    </div>
                    {task.team && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/60 italic">
               // {task.team.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Completion Indicator */}
            <div className={cn(
                "w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-500",
                isDone
                    ? "border-green-500/40 bg-green-500/10 text-green-500"
                    : "border-white/5 group-hover:border-primary/40 group-hover:bg-primary/5 text-transparent group-hover:text-primary/40"
            )}>
                <CheckCircle2 size={16} />
            </div>
        </motion.div>
    );
}
