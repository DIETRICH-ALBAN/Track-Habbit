"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Loader2, Volume2, Activity, Sparkles, X,
    Mic, MicOff, Keyboard, MessageSquare, Send,
    PlayCircle, AlertCircle
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
    const [mode, setMode] = useState<"voice" | "text">("voice");
    const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking" | "error">("idle");
    const [transcript, setTranscript] = useState("");
    const [textInput, setTextInput] = useState("");
    const [volume, setVolume] = useState(0);
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [showInitOverlay, setShowInitOverlay] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const recognitionRef = useRef<any>(null);
    const lastTranscriptRef = useRef<string>("");
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const statusRef = useRef(status);
    const isMicEnabledRef = useRef(isMicEnabled);
    const lastTalkingTimeRef = useRef<number>(Date.now());

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isMicEnabledRef.current = isMicEnabled; }, [isMicEnabled]);

    const handleCompleteTermination = useCallback(() => {
        setIsMicEnabled(false);
        isMicEnabledRef.current = false;

        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onresult = null;
            try { recognitionRef.current.abort(); } catch (e) { }
        }
        recognitionRef.current = null;

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state !== 'inactive') try { mediaRecorderRef.current.stop(); } catch (e) { }
        }
        mediaRecorderRef.current = null;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
        }
        window.speechSynthesis.cancel();
    }, []);

    const speak = (text: string) => {
        if (!text) return;
        const cleanText = text.replace(/```json[\s\S]*?```/g, '').replace(/[*#]/g, '').trim();
        if (!cleanText) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";

        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => {
            setStatus("listening");
            if (mode === "voice" && isMicEnabledRef.current) {
                restartListening();
            }
        };
        utterance.onerror = () => {
            setStatus("listening");
            if (mode === "voice" && isMicEnabledRef.current) {
                restartListening();
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const processMessage = async (text: string, audioBase64?: string) => {
        if (statusRef.current === "processing") return;
        setStatus("processing");
        setErrorMessage("");

        try {
            console.log("[VoiceAssistant] Sending request to /api/chat...");
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, audio: audioBase64 }),
                credentials: 'include'
            });

            if (res.status === 401) {
                throw new Error("⚠️ Session expirée. Veuillez vous reconnecter.");
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur serveur (${res.status})`);
            }

            const data = await res.json();
            console.log("[VoiceAssistant] Response received:", data);

            if (data.actions && data.actions.length > 0) onTaskCreated?.();
            speak(data.message);
            setTranscript("");
            lastTranscriptRef.current = "";
        } catch (error: any) {
            console.error("[VoiceAssistant] API Error:", error.message);
            setStatus("error");
            setErrorMessage(error.message);

            setTimeout(() => {
                if (statusRef.current === "error") {
                    setErrorMessage("");
                    setStatus("listening");
                    try { recognitionRef.current?.start(); } catch (e) { }
                }
            }, 5000);
        }
    };

    const startAudioAnalysis = (stream: MediaStream) => {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();

        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const update = () => {
            if (analyserRef.current && statusRef.current === "listening" && isMicEnabledRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setVolume(avg / 128);

                if (avg > 15) {
                    lastTalkingTimeRef.current = Date.now();
                } else if (Date.now() - lastTalkingTimeRef.current > 4500) {
                    // Auto-submit after 4.5s of silence on mobile/unstable links
                    if (transcript.trim() && statusRef.current === "listening") handleVoiceSubmit();
                }
            }
            animationFrameRef.current = requestAnimationFrame(update);
        };
        update();
    };

    const startVoiceSession = async () => {
        try {
            console.log("[VoiceAssistant] Starting voice session...");
            setStatus("listening");
            setErrorMessage("");

            // On Mobile: AVOID getUserMedia/AudioContext allowing SpeechRecognition to claim the mic exclusively.
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (!isMobile) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                startAudioAnalysis(stream);

                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                mediaRecorderRef.current.onstop = async () => {
                    if (!isMicEnabledRef.current) return;
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    audioChunksRef.current = [];
                    // Process audio if needed
                };
                mediaRecorderRef.current.start();
            } else {
                // Mobile Fallback: Simulate volume for visualizer
                const simulateVolume = () => {
                    if (statusRef.current === "listening" && isMicEnabledRef.current) {
                        setVolume(Math.random() * 0.5 + 0.1);
                    }
                    animationFrameRef.current = requestAnimationFrame(simulateVolume);
                };
                simulateVolume();
            }

            initRecognition();
        } catch (err) {
            console.error("[VoiceAssistant] Media error:", err);
            setStatus("error");
            setErrorMessage("Microphone inaccessible.");
        }
    };

    const initRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("[VoiceAssistant] Web Speech API not supported.");
            setErrorMessage("Navigateur non supporté.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "fr-FR";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("[VoiceAssistant] Recognition ON");
            setErrorMessage("");
        };

        recognition.onresult = (event: any) => {
            let fullText = lastTranscriptRef.current;
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    lastTranscriptRef.current += text + " ";
                    fullText = lastTranscriptRef.current;
                } else {
                    interim += text;
                }
            }
            // Update immediately
            setTranscript((fullText + interim).trim());
            lastTalkingTimeRef.current = Date.now();
        };

        recognition.onend = () => {
            console.log("[VoiceAssistant] Recognition OFF");
            if (isMicEnabledRef.current && statusRef.current === "listening") {
                try { recognition.start(); } catch (e) { }
            }
        };

        recognition.onerror = (e: any) => {
            console.error("[VoiceAssistant] Recognition error:", e.error);
            if (e.error === 'not-allowed') setErrorMessage("Microphone bloqué.");
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error("[VoiceAssistant] Failed to start recognition:", e);
        }
    };

    const restartListening = () => {
        if (!isMicEnabledRef.current) return;
        lastTranscriptRef.current = "";
        setTranscript("");
        try { recognitionRef.current?.start(); } catch (e) { }
        if (mediaRecorderRef.current?.state === "inactive") mediaRecorderRef.current.start();
    };

    const handleVoiceSubmit = () => {
        const final = transcript.trim();
        if (final) {
            console.log("[VoiceAssistant] Submitting:", final);
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            if (mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current!.onstop = null;
                mediaRecorderRef.current!.stop();
            }
            processMessage(final);
        }
    };

    const handleTextSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (textInput.trim()) {
            processMessage(textInput.trim());
            setTextInput("");
        }
    };

    const toggleMic = () => {
        if (isMicEnabled) {
            setIsMicEnabled(false);
            isMicEnabledRef.current = false;
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            if (mediaRecorderRef.current?.state !== 'inactive') try { mediaRecorderRef.current!.stop(); } catch (e) { }
        } else {
            setIsMicEnabled(true);
            isMicEnabledRef.current = true;
            restartListening();
        }
    };

    // Initialization Logic for Mobile
    useEffect(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            setShowInitOverlay(true);
        } else {
            startVoiceSession();
        }

        const checkInterval = setInterval(() => {
            if (isMicEnabledRef.current && statusRef.current === 'listening' && mode === 'voice' && !showInitOverlay) {
                try { recognitionRef.current?.start(); } catch (e) { }
            }
        }, 5000);

        return () => {
            clearInterval(checkInterval);
            handleCompleteTermination();
        };
    }, [handleCompleteTermination]);

    const handleManualInit = () => {
        setShowInitOverlay(false);
        startVoiceSession();
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#030014]/95 backdrop-blur-3xl lg:relative lg:inset-auto lg:h-full lg:bg-transparent lg:backdrop-blur-none">
            {/* Header Mobile Only */}
            <div className="flex items-center justify-between p-6 lg:hidden">
                <div className="flex items-center gap-2">
                    <Sparkles className="text-[var(--accent-purple)]" size={20} />
                    <span className="font-bold tracking-tight text-white">Track Habbit AI</span>
                </div>
                <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
                {/* Visualizer Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-square bg-[var(--accent-purple)]/10 blur-[120px] rounded-full pointer-events-none" />

                {/* Initialisation Overlay (Mainly for Mobile) */}
                <AnimatePresence>
                    {showInitOverlay && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-[#030014]/80 backdrop-blur-3xl px-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="max-w-xs space-y-6"
                            >
                                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                                    <Volume2 className="text-purple-400" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white">Prêt à discuter ?</h3>
                                    <p className="text-sm text-white/50">Sur mobile, une action manuelle est nécessaire pour activer le micro.</p>
                                </div>
                                <button
                                    onClick={handleManualInit}
                                    className="btn-primary w-full h-14 rounded-2xl text-lg font-bold"
                                >
                                    Activer l'Assistant
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Interaction Area */}
                <div className="relative w-full max-w-lg flex flex-col items-center gap-12 z-10">

                    {/* Visualizer (Only in voice mode) */}
                    {mode === "voice" && (
                        <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-[60px]"
                            />

                            <div className="flex items-center gap-1.5 h-32">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: isMicEnabled && status === 'listening' ? [12, 12 + (volume * 120), 12] : 8 }}
                                        className={`w-1 rounded-full ${status === 'processing' ? 'bg-purple-500 animate-pulse' : status === 'speaking' ? 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-purple-500/50'}`}
                                    />
                                ))}
                            </div>

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer" onClick={() => {
                                if (status === 'error' || status === 'idle') {
                                    setStatus('listening');
                                    restartListening();
                                }
                            }}>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`w-28 h-28 rounded-3xl border-2 flex flex-col items-center justify-center bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${status === 'listening' ? (volume > 0.05 ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-purple-500/30') :
                                        status === 'speaking' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]' :
                                            status === 'error' ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                                                'border-white/10'
                                        }`}>
                                    {status === 'processing' ? <Loader2 className="w-10 h-10 text-purple-500 animate-spin" /> :
                                        status === 'speaking' ? <Volume2 size={40} className="text-cyan-400 animate-pulse" /> :
                                            status === 'error' ? <AlertCircle size={40} className="text-rose-500 animate-bounce" /> :
                                                <Activity size={40} className={volume > 0.05 ? "text-purple-300" : "text-purple-500/50"} />}
                                    {status === 'listening' && volume <= 0.05 && (
                                        <span className="text-[10px] text-white/20 mt-1 uppercase font-bold tracking-widest">Silence</span>
                                    )}
                                    {status === 'error' && (
                                        <span className="text-[10px] text-rose-500 mt-1 uppercase font-bold tracking-widest">Relancer</span>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    )}

                    {/* Transcriptions / Text Output / Errors */}
                    <div className="w-full text-center space-y-6">
                        <div className="space-y-4">
                            <h2 className={`text-2xl font-bold tracking-tight transition-colors duration-500 ${status === 'error' ? 'text-rose-400' : 'text-white'}`}>
                                {status === 'listening' ? "Je vous écoute..." :
                                    status === 'processing' ? "Analyse en cours..." :
                                        status === 'speaking' ? "Réponse Vocale" :
                                            status === 'error' ? "Oups ! Un souci technique" :
                                                "Assistant Prêt"}
                            </h2>

                            <div className={`min-h-[100px] p-6 rounded-2xl bg-white/[0.03] border backdrop-blur-md transition-all duration-500 ${status === 'error' ? 'border-rose-500/30' : 'border-white/10'}`}>
                                {status === 'error' ? (
                                    <div className="space-y-3">
                                        <p className="text-rose-400 font-medium">{errorMessage}</p>
                                        <p className="text-xs text-white/30 italic">Essayez de recharger la page si le problème persiste.</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/70 italic leading-relaxed">
                                        {mode === "voice" ? (
                                            <>
                                                {/* transcript contient tout le texte maintenant, pas besoin de lastTranscriptRef pour l'affichage pur */}
                                                <span className="text-white font-medium">{transcript || lastTranscriptRef.current || "Dites quelque chose..."}</span>
                                            </>
                                        ) : (
                                            "Tapez votre demande ci-dessous..."
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Controls Bar */}
                        <div className="flex items-center justify-center gap-4">
                            {mode === "voice" ? (
                                <>
                                    <button
                                        onClick={toggleMic}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMicEnabled ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                                    >
                                        {isMicEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                                    </button>

                                    <button
                                        onClick={handleVoiceSubmit}
                                        disabled={!transcript.trim() || status === 'processing'}
                                        className="btn-primary flex-1 h-14 max-w-[200px] disabled:opacity-30"
                                    >
                                        {status === 'processing' ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        <span>{status === 'processing' ? "Analyse..." : "Envoyer"}</span>
                                    </button>

                                    <button
                                        onClick={() => setMode("text")}
                                        className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        <Keyboard size={24} />
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleTextSubmit} className="w-full flex gap-3">
                                    <input
                                        autoFocus
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="Comment puis-je vous aider ?"
                                        className="flex-1 h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                                    />
                                    <button type="submit" disabled={status === 'processing'} className="w-14 h-14 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-30">
                                        {status === 'processing' ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode("voice")}
                                        className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 text-white/60 flex items-center justify-center"
                                    >
                                        <MessageSquare size={24} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Close Button */}
            <button
                onClick={onClose}
                className="hidden lg:flex absolute top-8 right-8 w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all z-[110]"
            >
                <X size={24} />
            </button>
        </div>
    );
}
