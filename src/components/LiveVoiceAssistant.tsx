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
    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">("idle");
    const [transcript, setTranscript] = useState("");
    const [textInput, setTextInput] = useState("");
    const [volume, setVolume] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const recognitionRef = useRef<any>(null);
    const currentFullTranscriptRef = useRef<string>("");
    const statusRef = useRef(status);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastSpeechTimeRef = useRef<number>(Date.now());
    const isSpeakingRef = useRef<boolean>(false);

    // Constants for tuning
    const SILENCE_SUBMIT_DELAY = 3000; // 3 seconds of silence = auto-submit
    const BARGE_IN_THRESHOLD = 0.12; // Lower = more sensitive interruption
    const BARGE_IN_FRAMES = 4; // ~80ms of sustained voice to interrupt

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)); }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
            if (audioCtxRef.current) {
                try { audioCtxRef.current.close(); } catch (e) { }
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        setStatus("idle");
    }, []);

    const processMessage = async (text: string) => {
        if (statusRef.current === "processing") return;
        if (!text.trim()) return;

        // Stop recognition cleanly
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            try { recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }

        setStatus("processing");
        setErrorMessage("");

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
                credentials: 'include'
            });

            if (res.status === 401) { window.location.href = "/auth"; return; }
            if (!res.ok) throw new Error("Erreur serveur");

            const data = await res.json();
            if (data.actions && data.actions.length > 0) onTaskCreated?.();

            speak(data.message);

            setTranscript("");
            currentFullTranscriptRef.current = "";
            setTextInput("");

        } catch (error: any) {
            console.error(error);
            setStatus("error");
            setErrorMessage(error.message);
            setTimeout(() => {
                setStatus("idle");
                startListening(); // Auto-restart after error
            }, 2000);
        }
    };

    const speak = (text: string) => {
        if (!text) { setStatus("idle"); return; }
        const cleanText = text.replace(/```json[\s\S]*?```/g, '').replace(/[*#\-]/g, '').trim();
        if (!cleanText) { setStatus("idle"); return; }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            isSpeakingRef.current = true;
            setStatus("speaking");
        };
        utterance.onend = () => {
            isSpeakingRef.current = false;
            setStatus("idle");
            // Hands-free: Auto-listen after AI finishes
            setTimeout(() => {
                if (statusRef.current === "idle") {
                    startListening();
                }
            }, 300); // Small delay to let audio session settle
        };
        utterance.onerror = () => {
            isSpeakingRef.current = false;
            setStatus("idle");
        };

        window.speechSynthesis.speak(utterance);
    };

    const startListening = useCallback(async () => {
        if (statusRef.current === "listening" || statusRef.current === "processing") return;

        try {
            setTranscript("");
            currentFullTranscriptRef.current = "";
            setStatus("listening");
            setErrorMessage("");
            lastSpeechTimeRef.current = Date.now();

            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRec) {
                setErrorMessage("Non supporté");
                setStatus("idle");
                return;
            }

            const rec = new SpeechRec();
            rec.lang = "fr-FR";
            rec.continuous = true;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event: any) => {
                lastSpeechTimeRef.current = Date.now();
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

                let fullText = "";
                for (let i = 0; i < event.results.length; i++) {
                    fullText += event.results[i][0].transcript;
                }

                const result = fullText.trim();
                if (result) {
                    setTranscript(result);
                    setTextInput(result);
                    currentFullTranscriptRef.current = result;

                    // Smart auto-submit: 3s of silence after last speech
                    silenceTimeoutRef.current = setTimeout(() => {
                        if (statusRef.current === "listening" && currentFullTranscriptRef.current.trim()) {
                            stopListeningAndSend();
                        }
                    }, SILENCE_SUBMIT_DELAY);
                }
            };

            rec.onerror = (e: any) => {
                console.warn("Rec Error:", e.error);
                if (e.error === 'not-allowed') {
                    setErrorMessage("Micro bloqué");
                    setStatus("idle");
                }
                // For other errors (network, aborted), we'll let onend handle restart
            };

            rec.onend = () => {
                // Only restart if we're still supposed to be listening
                if (statusRef.current === "listening") {
                    const hasText = currentFullTranscriptRef.current.trim();
                    if (hasText) {
                        // User said something, check if enough silence passed
                        const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
                        if (timeSinceLastSpeech >= SILENCE_SUBMIT_DELAY) {
                            stopListeningAndSend();
                        } else {
                            // Restart to keep listening
                            try {
                                setTimeout(() => rec.start(), 100);
                            } catch (e) {
                                console.warn("Restart failed", e);
                            }
                        }
                    } else {
                        // No text yet, restart silently
                        try {
                            setTimeout(() => rec.start(), 100);
                        } catch (e) {
                            console.warn("Restart failed", e);
                        }
                    }
                }
            };

            rec.start();
            recognitionRef.current = rec;

        } catch (err) {
            console.error(err);
            setStatus("idle");
        }
    }, []);

    const stopListeningAndSend = useCallback(() => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        const textToSend = currentFullTranscriptRef.current.trim() || textInput.trim();

        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            try { recognitionRef.current.stop(); } catch (e) { }
            recognitionRef.current = null;
        }

        if (textToSend) {
            processMessage(textToSend);
        } else {
            setStatus("idle");
        }
    }, [textInput]);

    // Barge-In Detection via Volume Monitoring
    useEffect(() => {
        let animationId: number;
        let bargeInFrames = 0;

        const monitorMic = async () => {
            if (status !== 'speaking' && status !== 'listening') return;

            try {
                const stream = micStreamRef.current || await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                micStreamRef.current = stream;

                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioCtx();
                audioCtxRef.current = ctx;
                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.5;
                source.connect(analyser);
                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const checkVolume = () => {
                    if (statusRef.current !== 'speaking' && statusRef.current !== 'listening') {
                        ctx.close();
                        return;
                    }

                    analyser.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                    const avgVolume = sum / dataArray.length / 255;
                    setVolume(avgVolume);

                    // Barge-in: User speaks while AI is talking
                    if (statusRef.current === 'speaking' && avgVolume > BARGE_IN_THRESHOLD) {
                        bargeInFrames++;
                        if (bargeInFrames >= BARGE_IN_FRAMES) {
                            console.log("[Voice] Barge-in detected!");
                            stopSpeaking();
                            startListening();
                            ctx.close();
                            return;
                        }
                    } else {
                        bargeInFrames = Math.max(0, bargeInFrames - 1);
                    }

                    animationId = requestAnimationFrame(checkVolume);
                };
                checkVolume();
            } catch (e) {
                console.error("Mic monitor error:", e);
            }
        };

        monitorMic();
        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [status, stopSpeaking, startListening]);

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

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center px-6 py-4 overflow-y-auto">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className={`relative flex items-center justify-center transition-all duration-700 ${status === 'listening' ? 'scale-105' : 'scale-100'}`}>
                        <div className={`w-24 h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${status === 'listening' ? 'border-[var(--accent-cyan)] shadow-[0_0_40px_rgba(6,182,212,0.3)] bg-[var(--accent-cyan)]/10' :
                            status === 'processing' ? 'border-white/20 animate-pulse' :
                                status === 'speaking' ? 'border-[var(--accent-tan)] shadow-[0_0_40px_rgba(216,180,154,0.3)] bg-[var(--accent-tan)]/10' :
                                    'border-white/5 bg-white/[0.02]'
                            }`}>
                            {status === 'processing' ? <Loader2 size={36} className="text-white animate-spin" /> :
                                status === 'speaking' || status === 'idle' && window.speechSynthesis.speaking ? <Volume2 size={36} className="text-[var(--accent-tan)] animate-pulse" /> :
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
                        onClick={() => {
                            if (status === 'speaking') {
                                stopSpeaking();
                            } else if (status === 'listening') {
                                stopListeningAndSend();
                            } else {
                                startListening();
                            }
                        }}
                        className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-300 shadow-lg ${status === 'listening' || status === 'speaking' ? 'bg-rose-500 shadow-rose-500/30' : 'bg-[var(--accent-cyan)] shadow-[var(--accent-cyan)]/30'
                            }`}
                    >
                        {status === 'speaking' ? <StopCircle size={24} /> : status === 'listening' ? <Send size={24} /> : <Mic size={24} />}
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
                                    const textToSend = textInput.trim();
                                    if (textToSend) processMessage(textToSend);
                                }
                            }}
                        />
                        {textInput.trim() && status !== 'listening' && status !== 'speaking' && (
                            <button
                                onClick={() => processMessage(textInput.trim())}
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
