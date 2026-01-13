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
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#030014] lg:bg-[#030014]/95 backdrop-blur-3xl lg:relative lg:inset-auto lg:h-full lg:backdrop-blur-none transition-all duration-500">

            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-[var(--accent-purple)]" size={20} />
                    <span className="font-bold tracking-tight text-white">Assistant IA</span>
                </div>
                <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">

                {/* Status Indicator */}
                <div className="absolute top-10 flex flex-col items-center gap-4">
                    <div className={`relative flex items-center justify-center transition-all duration-500 ${status === 'listening' ? 'scale-110' : 'scale-100'
                        }`}>
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${status === 'listening' ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)] bg-purple-500/10' :
                            status === 'processing' ? 'border-white/20 animate-pulse' :
                                status === 'speaking' ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)] bg-cyan-400/10' :
                                    'border-white/10 bg-white/[0.02]'
                            }`}>
                            {status === 'processing' ? <Loader2 size={40} className="text-white animate-spin" /> :
                                status === 'speaking' ? <Volume2 size={40} className="text-cyan-400 animate-bounce" /> :
                                    status === 'listening' ? <Mic size={40} className="text-purple-400" /> :
                                        <Sparkles size={40} className="text-white/20" />}
                        </div>
                    </div>
                    <p className="text-white/60 font-medium animate-pulse">
                        {status === 'listening' ? "Je vous écoute..." :
                            status === 'processing' ? "Réflexion..." :
                                status === 'speaking' ? "Je réponds..." :
                                    "Prêt"}
                    </p>
                </div>

                {/* Chat/Transcript Area */}
                <div className="w-full max-w-md mt-32 space-y-6 flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-[120px] max-h-[50vh] bg-white/[0.05] rounded-3xl p-6 border border-white/10 flex flex-col items-center text-center overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                        {textInput || transcript ? (
                            <p className="text-xl text-white font-medium leading-relaxed break-words w-full">
                                {transcript || textInput}
                            </p>
                        ) : (
                            <p className="text-white/30 italic">
                                Appuyez sur le micro pour parler ou écrivez votre message...
                            </p>
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-4 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30 text-sm font-medium">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 pb-8 w-full max-w-md mx-auto">
                <div className="flex items-end gap-3">
                    {/* Voice Toggle Button - The STAR of the show on Mobile */}
                    <button
                        onClick={() => {
                            if (status === 'listening') {
                                stopListeningAndSend();
                            } else {
                                startListening();
                            }
                        }}
                        className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-300 shadow-xl ${status === 'listening'
                            ? 'bg-rose-500 text-white translate-y-0 shadow-rose-500/30'
                            : 'bg-purple-600 text-white -translate-y-0 shadow-purple-600/30 hover:bg-purple-500'
                            }`}
                    >
                        {status === 'listening' ? <Send size={28} className="ml-1" /> : <Mic size={28} />}
                    </button>

                    {/* Text Input Area */}
                    <div className="flex-1 bg-white/[0.05] rounded-2xl p-2 border border-white/10 flex items-center gap-2">
                        <input
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Écrire..."
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 px-3 h-12"
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
                                className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-center text-white/20 text-xs mt-4">
                    Track Habbit AI • v2.0
                </p>
            </div>
        </div>
    );
}
