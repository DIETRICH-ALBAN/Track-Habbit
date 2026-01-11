"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
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
            <div className="glass-morphism p-6 flex-1 min-h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold font-outfit capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: fr })}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-4">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-white/30 uppercase tracking-wider">
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
                                    relative p-2 rounded-xl cursor-pointer transition-all min-h-[60px] flex flex-col items-center justify-start gap-1 border border-transparent
                                    ${!isCurrentMonth ? "text-white/10" : "text-white/80"}
                                    ${isSelected ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "hover:bg-white/5"}
                                    ${isToday(day) && !isSelected ? "bg-white/5 text-primary font-bold" : ""}
                                `}
                            >
                                <span className="text-sm">{format(day, dateFormat)}</span>
                                {hasTasks && (
                                    <div className="flex gap-0.5 mt-1">
                                        {dayTasks.slice(0, 3).map((t, i) => (
                                            <div
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-green-500' : 'bg-primary'}`}
                                            />
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Tasks */}
            <div className="w-full lg:w-80 glass-morphism p-6 flex flex-col">
                <h3 className="text-lg font-bold mb-6 capitalize flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {selectedDate ? format(selectedDate, "EEEE d MMMM", { locale: fr }) : "Sélectionnez une date"}
                </h3>

                <div className="space-y-3 overflow-y-auto flex-1 max-h-[400px] lg:max-h-full scrollbar-thin scrollbar-thumb-white/10">
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
                                        p-3 rounded-xl border transition-all cursor-pointer group
                                        ${task.status === 'done'
                                            ? 'bg-green-500/5 border-green-500/10 hover:border-green-500/30'
                                            : 'bg-white/5 border-white/10 hover:border-primary/30'}
                                    `}
                                >
                                    <div className="flex items-start gap-3">
                                        {task.status === 'done' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-sm truncate ${task.status === 'done' ? 'text-white/40 line-through' : 'text-white'}`}>
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                                                    task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        'bg-green-500/10 text-green-500'
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
                        <div className="text-center py-10 text-white/30">
                            <p className="text-sm">Aucune tâche prévue ce jour.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
