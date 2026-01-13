"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Loader2, Volume2, Activity, Sparkles, X,
    Mic, MicOff, Keyboard, MessageSquare, Send,
    PlayCircle, AlertCircle, StopCircle
} from "lucide-react";
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
    // Mode is now effectively always "Text" with Voice augmentation on Mobile
    // But we keep "voice" state for desktop visualizer behavior if needed.
    // For mobile fix: We default to a "Hybrid" view.

    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">("idle");
    const [transcript, setTranscript] = useState("");
    const [textInput, setTextInput] = useState("");
    const [volume, setVolume] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileInit, setShowMobileInit] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const recognitionRef = useRef<any>(null);
    const lastTranscriptRef = useRef<string>("");
    const currentFullTranscriptRef = useRef<string>(""); // New Ref to track live state
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const statusRef = useRef(status);
    const lastTalkingTimeRef = useRef<number>(Date.now());
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => { statusRef.current = status; }, [status]);

    useEffect(() => {
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }, []);

    const handleCompleteTermination = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            try { recognitionRef.current.abort(); } catch (e) { }
        }
        recognitionRef.current = null;
        window.speechSynthesis.cancel();
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => handleCompleteTermination();
    }, [handleCompleteTermination]);

    const speak = (text: string) => {
        if (!text) return;
        const cleanText = text.replace(/```json[\s\S]*?```/g, '').replace(/[*#]/g, '').trim();
        if (!cleanText) return;

        console.log("[VoiceAssistant] Speaking:", cleanText);
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";
        utterance.rate = 1.1;

        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => setStatus("idle");
        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setStatus("idle");
        };

        window.speechSynthesis.speak(utterance);
    };

    const processMessage = async (text: string) => {
        if (statusRef.current === "processing") return;
        setStatus("processing");
        setErrorMessage("");

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
                credentials: 'include'
            });

            if (res.status === 401) {
                window.location.href = "/auth";
                throw new Error("Session expirée.");
            }

            if (!res.ok) throw new Error("Erreur serveur");

            const data = await res.json();

            if (data.actions && data.actions.length > 0) onTaskCreated?.();
            speak(data.message);

            // Clear inputs
            setTranscript("");
            lastTranscriptRef.current = "";
            currentFullTranscriptRef.current = "";
            setTextInput("");

        } catch (error: any) {
            console.error(error);
            setStatus("error");
            setErrorMessage(error.message);
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    const startListening = async () => {
        try {
            setStatus("listening");
            setErrorMessage("");

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                setErrorMessage("Non supporté");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = "fr-FR";
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onstart = () => console.log("Recognition Started");

            recognition.onstart = () => console.log("Recognition Started");

            recognition.onresult = (event: any) => {
                // Fix for duplication: Do NOT iterate and append to ref.
                // Just map the current session's results entirely.
                const currentSessionText = Array.from(event.results)
                    .map((res: any) => res[0].transcript)
                    .join('');

                const fullText = (lastTranscriptRef.current + " " + currentSessionText).trim();

                // Update Ref for onend to see
                currentFullTranscriptRef.current = fullText;

                setTranscript(fullText);
                setTextInput(fullText);
            };

            recognition.onerror = (event: any) => {
                console.error("Rec Error", event.error);
                if (event.error === 'not-allowed') {
                    setErrorMessage("Micro bloqué");
                    setStatus("idle");
                }
            };

            recognition.onend = () => {
                // Correctly save the full transcript to history using the Ref (not stale state)
                if (currentFullTranscriptRef.current) {
                    lastTranscriptRef.current = currentFullTranscriptRef.current;
                }

                if (statusRef.current === "listening") {
                    setStatus("idle");
                }
            };

            recognition.start();
            recognitionRef.current = recognition;

        } catch (err) {
            setErrorMessage("Erreur Micro");
            setStatus("idle");
        }
    };

    const stopListeningAndSend = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        const textToSend = transcript.trim() || textInput.trim();
        if (textToSend) {
            processMessage(textToSend);
        } else {
            setStatus("idle");
            setErrorMessage("Je n'ai rien entendu");
        }
    };

    // Desktop Visualizer Logic (Only run if !isMobile)
    useEffect(() => {
        if (isMobile) return;
        // ... (We could keep the old logic for desktop, but for simplicity let's unify the UX for now to ensure stability)
    }, [isMobile]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0A]/90 backdrop-blur-3xl lg:relative lg:inset-auto lg:h-full lg:w-[28rem] lg:backdrop-blur-none transition-all duration-500">

            {/* Header */}
            <div className="flex items-center justify-between p-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/10 flex items-center justify-center text-[var(--accent-cyan)]">
                        <Sparkles size={20} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-white uppercase tracking-widest">Assistant <span className="text-[var(--accent-tan)]">Vocal</span></span>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all border border-white/5">
                    <X size={20} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                {/* Status Indicator */}
                <div className="absolute top-10 flex flex-col items-center gap-6">
                    <div className={`relative flex items-center justify-center transition-all duration-700 ${status === 'listening' ? 'scale-110' : 'scale-100'}`}>
                        <div className={`w-40 h-40 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${status === 'listening' ? 'border-[var(--accent-cyan)] shadow-[0_0_60px_rgba(6,182,212,0.3)] bg-[var(--accent-cyan)]/10' :
                            status === 'processing' ? 'border-white/20 animate-pulse' :
                                status === 'speaking' ? 'border-[var(--accent-tan)] shadow-[0_0_60px_rgba(216,180,154,0.3)] bg-[var(--accent-tan)]/10' :
                                    'border-white/5 bg-white/[0.02]'
                            }`}>
                            {status === 'processing' ? <Loader2 size={48} className="text-white animate-spin" /> :
                                status === 'speaking' ? <Volume2 size={48} className="text-[var(--accent-tan)] animate-pulse" /> :
                                    status === 'listening' ? <Mic size={48} className="text-[var(--accent-cyan)]" /> :
                                        <Sparkles size={48} className="text-white/10" />}
                        </div>
                        {/* Orbiting Ring for Listening Mode */}
                        {status === 'listening' && (
                            <div className="absolute inset-[-15px] border border-[var(--accent-cyan)]/20 rounded-full animate-[spin_4s_linear_infinite]" />
                        )}
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-[var(--accent-tan)]">
                        {status === 'listening' ? "ÉCOUTE EN COURS" :
                            status === 'processing' ? "RÉFLEXION" :
                                status === 'speaking' ? "RÉPONSE" :
                                    "PRÊT À VOUS AIDER"}
                    </p>
                </div>

                {/* Transcript Area */}
                <div className="w-full max-w-lg mt-40 space-y-6 flex-1 min-h-0 flex flex-col">
                    <div
                        className="flex-1 min-h-[160px] max-h-[40vh] rounded-[32px] p-8 border border-white/5 flex flex-col items-center justify-center text-center overflow-y-auto scrollbar-hide backdrop-blur-md"
                        style={{ background: 'var(--bg-glass-gradient)' }}
                    >
                        {textInput || transcript ? (
                            <p className="text-2xl text-white font-bold leading-tight break-words w-full">
                                {transcript || textInput}
                            </p>
                        ) : (
                            <p className="text-white/20 font-medium tracking-wide">
                                Appuyez sur le micro pour parler<br />ou tapez votre message...
                            </p>
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-6 px-6 py-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 text-sm font-bold tracking-tight uppercase">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-8 pb-12 w-full max-w-lg mx-auto">
                <div className="flex items-end gap-4">
                    <button
                        onClick={() => status === 'listening' ? stopListeningAndSend() : startListening()}
                        className={`w-20 h-20 rounded-[24px] flex-shrink-0 flex items-center justify-center transition-all duration-500 shadow-2xl relative group overflow-hidden ${status === 'listening' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-[var(--accent-cyan)] shadow-[var(--accent-cyan)]/30'
                            }`}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {status === 'listening' ? <Send size={32} className="relative z-10" /> : <Mic size={32} className="relative z-10" />}
                    </button>

                    <div
                        className="flex-1 rounded-[24px] p-2 border border-white/5 flex items-center gap-2 backdrop-blur-md"
                        style={{ background: 'var(--bg-glass-gradient)' }}
                    >
                        <input
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Écrivez votre commande..."
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 px-5 h-16 text-lg font-medium"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    stopListeningAndSend();
                                }
                            }}
                        />
                        {textInput.trim() && status !== 'listening' && (
                            <button
                                onClick={() => stopListeningAndSend()}
                                className="w-12 h-12 bg-[var(--accent-tan)]/10 text-[var(--accent-tan)] rounded-xl hover:bg-[var(--accent-tan)]/20 transition-all flex items-center justify-center"
                            >
                                <Send size={20} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-8 opacity-20">
                    <Activity size={12} className="text-[var(--accent-cyan)]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Track Habbit AI Core</span>
                </div>
            </div>
        </div>
    );
}
