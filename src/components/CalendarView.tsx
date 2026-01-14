"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "@/types/task";

interface CalendarViewProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onClose?: () => void;
}

export default function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: fr });
    const endDate = endOfWeek(monthEnd, { locale: fr });

    const dateFormat = "d";
    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    const getDayTasks = (date: Date) => {
        return tasks.filter(task => {
            if (!task.due_date) return false;
            return isSameDay(new Date(task.due_date), date);
        });
    };

    const selectedDayTasks = selectedDate ? getDayTasks(selectedDate) : [];

    return (
        <div className="flex flex-col xl:flex-row gap-6 h-full relative z-10 overflow-hidden">
            {/* Calendar Grid */}
            <div
                className="relative overflow-hidden p-5 md:p-6 rounded-[32px] border border-white/10 flex-[1.5] lg:flex-1 min-h-[380px] flex flex-col backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                style={{
                    background: 'rgba(25, 25, 25, 0.4)',
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
                    transform: 'translateZ(0)'
                }}
            >
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <div className="flex justify-between items-center mb-6 shrink-0 relative z-10">
                    <h2 className="text-xl font-black text-white capitalize tracking-tight">
                        {format(currentMonth, "MMMM", { locale: fr })} <span className="text-[var(--accent-tan)]">{format(currentMonth, "yyyy")}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all border border-white/5">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all border border-white/5">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-4 shrink-0 relative z-10">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[9px] font-bold text-[var(--accent-tan)] uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 overflow-y-auto scrollbar-hide relative z-10">
                    {days.map((day, dayIdx) => {
                        const dayTasks = getDayTasks(day);
                        const hasTasks = dayTasks.length > 0;
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, monthStart);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative p-2 rounded-xl cursor-pointer transition-all aspect-square min-h-[48px] flex flex-col items-center justify-center gap-1 border
                                    ${!isCurrentMonth ? "text-white/10" : "text-white"}
                                    ${isSelected ? "bg-[var(--accent-cyan)]/25 border-[var(--accent-cyan)] shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "border-transparent"}
                                    ${isToday(day) && !isSelected ? "border-[var(--accent-tan)]/30 text-[var(--accent-tan)] font-bold bg-[var(--accent-tan)]/5" : ""}
                                    active:scale-90
                                `}
                            >
                                <span className="text-sm font-bold">{format(day, dateFormat)}</span>
                                {hasTasks && (
                                    <div className="flex gap-0.5">
                                        {dayTasks.slice(0, 3).map((t, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 h-1 rounded-full ${t.status === 'done' ? 'bg-emerald-400' : 'bg-[var(--accent-cyan)] shadow-[0_0_4px_#06b6d4]'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Tasks Panel */}
            <div
                className="relative overflow-hidden w-full xl:w-[420px] p-6 lg:p-8 rounded-[38px] border border-white/10 flex flex-col backdrop-blur-3xl shadow-[0_30px_70px_rgba(0,0,0,0.7)] h-full xl:h-auto min-h-[280px]"
                style={{
                    background: 'rgba(20, 20, 20, 0.65)',
                    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%)',
                    transform: 'translateZ(0)'
                }}
            >
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-transparent flex items-center justify-center text-[var(--accent-cyan)] border border-white/5 ring-1 ring-[var(--accent-cyan)]/20">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white capitalize leading-none mb-1">
                            {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélection"}
                        </h3>
                        {selectedDayTasks.length > 0 && (
                            <p className="text-[10px] uppercase font-bold tracking-widest text-white/30">
                                {selectedDayTasks.length} Tâche{selectedDayTasks.length > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 relative z-10">
                    {selectedDayTasks.length > 0 ? (
                        <AnimatePresence>
                            {selectedDayTasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => onTaskClick(task)}
                                    className={`
                                        p-4 rounded-2xl border transition-all cursor-pointer group
                                        ${task.status === 'done'
                                            ? 'bg-emerald-500/5 border-emerald-500/20'
                                            : 'bg-white/5 border-white/5 hover:border-[var(--accent-cyan)]/30'}
                                    `}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 group-hover:border-[var(--accent-cyan)]'}`}>
                                            {task.status === 'done' && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm truncate ${task.status === 'done' ? 'text-white/30 line-through' : 'text-white'}`}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-400' :
                                                    task.priority === 'medium' ? 'bg-[var(--accent-tan)]/10 text-[var(--accent-tan)]' :
                                                        'bg-emerald-500/10 text-emerald-400'
                                                    }`}>
                                                    {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="text-center py-16 flex flex-col items-center">
                            <Sparkles size={40} className="text-white/10 mb-4" />
                            <p className="text-sm font-medium text-white/30 uppercase tracking-widest">Aucune tâche</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
