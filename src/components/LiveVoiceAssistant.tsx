"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, PhoneOff, Loader2, Volume2, Activity, Square, AlertCircle, Sparkles, Keyboard, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveVoiceAssistantProps {
    onTaskCreated?: () => void;
    onClose?: () => void;
}

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function LiveVoiceAssistant({ onTaskCreated, onClose }: LiveVoiceAssistantProps) {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">("idle");
    const [transcript, setTranscript] = useState("");
    const [volume, setVolume] = useState(0);
    const [debugInfo, setDebugInfo] = useState("");

    const recognitionRef = useRef<any>(null);
    const lastTranscriptRef = useRef<string>("");
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTalkingTimeRef = useRef<number>(Date.now());
    const statusRef = useRef(status);
    // Immediate state ref to prevent async race conditions
    const shouldIdentifyRef = useRef(false);

    useEffect(() => {
        shouldIdentifyRef.current = isActive;
        isActiveRef.current = isActive;
    }, [isActive]);

    // Robust Cleanup
    useEffect(() => {
        // Auto-start on mount
        startSession();

        return () => {
            shouldIdentifyRef.current = false; // Kill switch
            isActiveRef.current = false;

            if (recognitionRef.current) {
                recognitionRef.current.onend = null; // Prevent restart
                recognitionRef.current.stop();
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    const stopSession = () => {
        shouldIdentifyRef.current = false;
        setIsActive(false);
        setStatus("idle");
        window.speechSynthesis.cancel();

        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Prevent restart loop
            recognitionRef.current.stop();
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();

        onClose?.();
    };

    const initRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = "fr-FR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    lastTranscriptRef.current += text + " ";
                } else {
                    interim += text;
                }
            }
            setTranscript(lastTranscriptRef.current + interim);
            lastTalkingTimeRef.current = Date.now();
        };

        recognition.onend = () => {
            // Only restart if we are explicitly still active
            if (shouldIdentifyRef.current && statusRef.current === "listening") {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Restart error:", e);
                }
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error("Start error:", e);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-transparent px-6">
            {/* Background Neural Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-square bg-[var(--accent-purple)]/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Neural Visualizer UI */}
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center z-10">
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0.4, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/10 to-[var(--accent-teal)]/10 rounded-full blur-[60px]"
                />

                {/* Animated Audio Lines */}
                <div className="flex items-center gap-1.5 h-40">
                    {[...Array(24)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: status === 'listening' ? [12, 12 + (volume * 140 * (0.5 + Math.random() * 0.5)), 12] : 8
                            }}
                            className={`w-1 rounded-full ${status === 'processing' ? 'bg-[var(--accent-purple)] animate-pulse' :
                                status === 'speaking' ? 'bg-[var(--accent-teal)]' :
                                    'bg-[var(--accent-purple)]'
                                }`}
                        />
                    ))}
                </div>

                {/* Status Indicator Overlays */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`w-28 h-28 rounded-3xl border-2 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-xl shadow-2xl transition-all duration-500 ${status === 'listening' ? 'border-[var(--accent-purple)] shadow-[var(--accent-purple)]/20' :
                            status === 'speaking' ? 'border-[var(--accent-teal)] shadow-[var(--accent-teal)]/20' :
                                'border-[var(--border-subtle)]'
                            }`}
                    >
                        {status === 'processing' ? <Loader2 className="w-10 h-10 text-[var(--accent-purple)] animate-spin" /> :
                            status === 'speaking' ? <div className="text-[var(--accent-teal)]"><Volume2 size={40} className="animate-pulse" /></div> :
                                <div className="text-[var(--accent-purple)]"><Activity size={40} /></div>}
                    </motion.div>
                </div>
            </div>

            {/* Controls and Transcript */}
            <div className="w-full max-w-2xl mt-12 space-y-8 z-20">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 badge px-4 py-1.5 border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                        <span className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">
                            {status === 'listening' ? "Live System Active" : "Neural Link Established"}
                        </span>
                    </div>

                    <div>
                        <h2 className="heading-display text-3xl">
                            {status === 'listening' ? "Je vous écoute..." :
                                status === 'processing' ? "Analyse Neurone" :
                                    status === 'speaking' ? "Système Vocal" : "Assistant Vocal"}
                            <span className="heading-serif"> .</span>
                        </h2>
                        <div className="mt-4 min-h-[60px] max-h-[120px] overflow-y-auto px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl">
                            <p className="text-[var(--text-secondary)] text-sm italic opacity-80 leading-relaxed font-medium">
                                {transcript || "Commencez à parler pour que l'IA puisse vous aider..."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={!transcript.trim() && !lastTranscriptRef.current.trim()}
                        className="btn-primary min-w-[200px] h-14 text-base disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Sparkles size={18} />
                        <span>Envoyer</span>
                    </button>

                    <button
                        onClick={stopSession}
                        className="btn-secondary w-14 h-14 p-0 flex items-center justify-center border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] text-center uppercase tracking-widest opacity-50 flex items-center justify-center gap-2">
                    <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                    Neural Processing Core V2.0.0
                    <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>
            </div>
        </div>
    );
}
