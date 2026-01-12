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
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Calendar Grid */}
            <div className="card p-6 flex-1 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="heading-display text-2xl capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: fr })}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="icon-box icon-box-sm hover:bg-[var(--bg-elevated)] transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="icon-box icon-box-sm hover:bg-[var(--bg-elevated)] transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-4">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 flex-1">
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
                                    relative p-2 rounded-xl cursor-pointer transition-all min-h-[70px] flex flex-col items-center justify-start gap-1 border border-transparent
                                    ${!isCurrentMonth ? "text-[var(--text-muted)] opacity-50" : "text-[var(--text-primary)]"}
                                    ${isSelected ? "bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "hover:bg-[var(--bg-elevated)]"}
                                    ${isToday(day) && !isSelected ? "bg-[var(--bg-elevated)] text-[var(--accent-purple)] font-bold border-[var(--border-subtle)]" : ""}
                                `}
                            >
                                <span className="text-sm">{format(day, dateFormat)}</span>
                                {hasTasks && (
                                    <div className="flex gap-1 mt-1">
                                        {dayTasks.slice(0, 3).map((t, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-emerald-500' : 'bg-[var(--accent-purple)]'}`}
                                            />
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Tasks */}
            <div className="w-full lg:w-96 card p-6 flex flex-col border-l border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                    <div className="icon-box icon-box-sm">
                        <Clock size={16} className="text-[var(--accent-purple)]" />
                    </div>
                    <h3 className="heading-serif text-lg capitalize">
                        {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélectionnez une date"}
                    </h3>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 max-h-[400px] lg:max-h-full pr-2">
                    {selectedDayTasks.length > 0 ? (
                        <AnimatePresence>
                            {selectedDayTasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={() => onTaskClick(task)}
                                    className={`
                                        p-4 rounded-xl border transition-all cursor-pointer group
                                        ${task.status === 'done'
                                            ? 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30'
                                            : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--accent-purple)]/50'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        {task.status === 'done' ? (
                                            <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />
                                        ) : (
                                            <Circle size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent-purple)] transition-colors mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm truncate ${task.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
                                <Sparkles size={24} className="text-[var(--text-muted)]" opacity={0.5} />
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">Aucune tâche prévue ce jour.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
