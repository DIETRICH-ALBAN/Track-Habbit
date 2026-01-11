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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ x: 6, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={cn(
                "glass-panel p-5 flex items-center gap-5 group cursor-pointer relative",
                isDone && "opacity-50"
            )}
        >
            {/* Neon Status Indicator */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-300",
                isDone
                    ? "bg-[#00d4ff] shadow-[0_0_10px_rgba(0,212,255,0.5)]"
                    : "bg-[#a855f7] group-hover:w-1.5 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
            )} />

            {/* Icon */}
            <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ml-2",
                isDone
                    ? "bg-[#00d4ff]/10 text-[#00d4ff]"
                    : "bg-white/5 text-[#a855f7]/60 group-hover:bg-[#a855f7]/10 group-hover:text-[#a855f7]"
            )}>
                {isDone ? <CheckCircle2 size={22} /> : <Activity size={22} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className={cn(
                    "font-bold tracking-tight transition-all duration-300 truncate text-lg",
                    isDone ? "text-white/40 line-through" : "text-white/90 group-hover:text-white"
                )}>
                    {task.title}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <Clock size={12} className="text-white/30" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                            {task.due_date ? format(parseISO(task.due_date), "HH:mm") : 'À planifier'}
                        </span>
                    </div>
                    {task.team && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d946ef]/70">
                            {task.team.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Check Button */}
            <div className={cn(
                "w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                isDone
                    ? "border-[#00d4ff]/50 bg-[#00d4ff]/10 text-[#00d4ff]"
                    : "border-white/10 group-hover:border-[#a855f7]/50 group-hover:bg-[#a855f7]/5 text-transparent group-hover:text-[#a855f7]/50"
            )}>
                <CheckCircle2 size={18} />
            </div>
        </motion.div>
    );
}
