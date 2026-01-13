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
        <div className="flex flex-col xl:flex-row gap-8 h-full relative z-10">
            {/* Calendar Grid */}
            <div
                className="p-8 rounded-[32px] border border-white/5 flex-1 min-h-[400px] flex flex-col backdrop-blur-md shadow-2xl"
                style={{ background: 'var(--bg-glass-gradient)' }}
            >
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-white capitalize tracking-tight">
                        {format(currentMonth, "MMMM", { locale: fr })} <span className="text-[var(--accent-tan)]">{format(currentMonth, "yyyy")}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-6">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-[var(--accent-tan)] uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2 flex-1">
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
                                    relative p-2 rounded-[18px] cursor-pointer transition-all min-h-[70px] flex flex-col items-center justify-center gap-1 border
                                    ${!isCurrentMonth ? "text-white/20 opacity-30" : "text-white"}
                                    ${isSelected ? "bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)]/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "border-white/5 hover:bg-white/5"}
                                    ${isToday(day) && !isSelected ? "border-[var(--accent-tan)]/40 text-[var(--accent-tan)] font-black" : ""}
                                `}
                            >
                                <span className="text-sm font-bold">{format(day, dateFormat)}</span>
                                {hasTasks && (
                                    <div className="flex gap-1 mt-1">
                                        {dayTasks.slice(0, 3).map((t, i) => (
                                            <div
                                                key={i}
                                                className={`w-1 h-1 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : 'bg-[var(--accent-cyan)]'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Tasks */}
            <div
                className="w-full xl:w-[400px] p-8 rounded-[32px] border border-white/5 flex flex-col backdrop-blur-md shadow-2xl"
                style={{ background: 'var(--bg-glass-gradient)' }}
            >
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/10 flex items-center justify-center text-[var(--accent-cyan)]">
                        <Clock size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-white capitalize">
                        {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélection"}
                    </h3>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-hide">
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
