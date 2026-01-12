"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Loader2, Volume2, Activity, Sparkles, X,
    Mic, MicOff, Keyboard, MessageSquare, Send
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

    // Handle Cleanup
    useEffect(() => {
        if (mode === "voice" && isMicEnabled) {
            startVoiceSession();
        }
        return () => {
            handleCompleteTermination();
        };
    }, []);

    const handleCompleteTermination = () => {
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
    };

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

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, audio: audioBase64 }),
            });

            if (!res.ok) throw new Error("Erreur");
            const data = await res.json();

            if (data.actions && data.actions.length > 0) onTaskCreated?.();
            speak(data.message);
            setTranscript("");
            lastTranscriptRef.current = "";
        } catch (error) {
            console.error(error);
            setStatus("error");
            setTimeout(() => setStatus("listening"), 3000);
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
                } else if (Date.now() - lastTalkingTimeRef.current > 3000) {
                    // Auto-submit after 3s of silence
                    const final = (lastTranscriptRef.current + transcript).trim();
                    if (final && statusRef.current === "listening") handleVoiceSubmit();
                }
            }
            animationFrameRef.current = requestAnimationFrame(update);
        };
        update();
    };

    const startVoiceSession = async () => {
        try {
            setStatus("listening");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            initRecognition();
            startAudioAnalysis(stream);

            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                if (!isMicEnabledRef.current) return;
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                audioChunksRef.current = [];
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    if (!lastTranscriptRef.current.trim() && !transcript.trim() && isMicEnabledRef.current) {
                        processMessage("", base64.split(',')[1]);
                    }
                };
            };
            mediaRecorderRef.current.start();
        } catch (err) {
            setStatus("error");
        }
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
                if (event.results[i].isFinal) lastTranscriptRef.current += text + " ";
                else interim += text;
            }
            setTranscript(interim); // We show interim separately for smoothness
            lastTalkingTimeRef.current = Date.now();
        };

        recognition.onend = () => {
            if (isMicEnabledRef.current && statusRef.current === "listening") {
                try { recognition.start(); } catch (e) { }
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const restartListening = () => {
        if (!isMicEnabledRef.current) return;
        lastTranscriptRef.current = "";
        setTranscript("");
        try { recognitionRef.current?.start(); } catch (e) { }
        if (mediaRecorderRef.current?.state === "inactive") mediaRecorderRef.current.start();
    };

    const handleVoiceSubmit = () => {
        const final = (lastTranscriptRef.current + transcript).trim();
        if (final) {
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

                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <motion.div className={`w-24 h-24 rounded-3xl border-2 flex items-center justify-center bg-white/[0.03] backdrop-blur-xl transition-all duration-500 ${status === 'listening' ? 'border-purple-500/50' : status === 'speaking' ? 'border-cyan-400' : 'border-white/10'}`}>
                                    {status === 'processing' ? <Loader2 className="w-10 h-10 text-purple-500 animate-spin" /> : status === 'speaking' ? <Volume2 size={40} className="text-cyan-400 animate-pulse" /> : <Activity size={40} className="text-purple-400" />}
                                </motion.div>
                            </div>
                        </div>
                    )}

                    {/* Transcriptions / Text Output */}
                    <div className="w-full text-center space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {status === 'listening' ? "Je vous écoute..." : status === 'processing' ? "Analyse en cours..." : status === 'speaking' ? "Réponse Vocale" : "Assistant Prêt"}
                            </h2>
                            <div className="min-h-[80px] p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
                                <p className="text-sm text-white/70 italic leading-relaxed">
                                    {mode === "voice" ? (
                                        <>
                                            <span className="text-white/40">{lastTranscriptRef.current}</span>
                                            <span className="text-white font-medium">{transcript}</span>
                                            {!lastTranscriptRef.current && !transcript && "Dites quelque chose..."}
                                        </>
                                    ) : (
                                        "Tapez votre demande ci-dessous..."
                                    )}
                                </p>
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
                                        disabled={!lastTranscriptRef.current.trim() && !transcript.trim()}
                                        className="btn-primary flex-1 h-14 max-w-[200px] disabled:opacity-30"
                                    >
                                        <Sparkles size={18} />
                                        <span>Envoyer</span>
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
                                    <button type="submit" className="w-14 h-14 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all active:scale-95">
                                        <Send size={24} />
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
