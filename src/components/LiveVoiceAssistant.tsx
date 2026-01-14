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
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0A] backdrop-blur-3xl lg:static lg:inset-auto lg:h-screen lg:w-[420px] lg:flex-shrink-0 lg:border-l lg:border-white/5 transition-all duration-500" style={{ background: 'var(--bg-glass-gradient)' }}>

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

            {/* Main Content - Proper flex layout without absolute positioning */}
            <div className="flex-1 flex flex-col items-center px-6 py-4 overflow-y-auto">
                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className={`relative flex items-center justify-center transition-all duration-700 ${status === 'listening' ? 'scale-105' : 'scale-100'}`}>
                        <div className={`w-24 h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${status === 'listening' ? 'border-[var(--accent-cyan)] shadow-[0_0_40px_rgba(6,182,212,0.3)] bg-[var(--accent-cyan)]/10' :
                            status === 'processing' ? 'border-white/20 animate-pulse' :
                                status === 'speaking' ? 'border-[var(--accent-tan)] shadow-[0_0_40px_rgba(216,180,154,0.3)] bg-[var(--accent-tan)]/10' :
                                    'border-white/5 bg-white/[0.02]'
                            }`}>
                            {status === 'processing' ? <Loader2 size={36} className="text-white animate-spin" /> :
                                status === 'speaking' ? <Volume2 size={36} className="text-[var(--accent-tan)] animate-pulse" /> :
                                    status === 'listening' ? <Mic size={36} className="text-[var(--accent-cyan)]" /> :
                                        <Sparkles size={36} className="text-white/10" />}
                        </div>
                        {status === 'listening' && (
                            <div className="absolute inset-[-10px] border border-[var(--accent-cyan)]/20 rounded-full animate-[spin_4s_linear_infinite]" />
                        )}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-tan)] text-center">
                        {status === 'listening' ? "ÉCOUTE EN COURS" :
                            status === 'processing' ? "RÉFLEXION" :
                                status === 'speaking' ? "RÉPONSE" :
                                    "PRÊT À VOUS AIDER"}
                    </p>
                </div>

                {/* Transcript Area */}
                <div className="w-full flex-1 min-h-0 flex flex-col">
                    <div
                        className="flex-1 min-h-[100px] rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center overflow-y-auto"
                        style={{ background: 'rgba(10,10,10,0.5)' }}
                    >
                        {textInput || transcript ? (
                            <p className="text-lg text-white font-semibold leading-relaxed break-words w-full">
                                {transcript || textInput}
                            </p>
                        ) : (
                            <p className="text-white/30 text-sm">
                                Appuyez sur le micro pour parler<br />ou tapez votre message...
                            </p>
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-4 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-xs font-bold uppercase">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 lg:p-6 w-full shrink-0 border-t border-white/5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => status === 'listening' ? stopListeningAndSend() : startListening()}
                        className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 shadow-lg ${status === 'listening' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-[var(--accent-cyan)] shadow-[var(--accent-cyan)]/30'
                            }`}
                    >
                        {status === 'listening' ? <Send size={24} /> : <Mic size={24} />}
                    </button>

                    <div className="flex-1 rounded-xl p-1.5 border border-white/5 flex items-center gap-2" style={{ background: 'rgba(10,10,10,0.5)' }}>
                        <input
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Écrivez votre commande..."
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 px-3 h-11 text-sm"
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
                                className="w-9 h-9 bg-[var(--accent-tan)]/10 text-[var(--accent-tan)] rounded-lg hover:bg-[var(--accent-tan)]/20 transition-all flex items-center justify-center"
                            >
                                <Send size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 opacity-30">
                    <Activity size={10} className="text-[var(--accent-cyan)]" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Track Habbit AI</span>
                </div>
            </div>
        </div>
    );
}
