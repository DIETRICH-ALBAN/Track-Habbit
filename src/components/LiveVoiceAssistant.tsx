"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Volume2, Activity, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";

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

    const recognitionRef = useRef<any>(null);
    const lastTranscriptRef = useRef<string>("");
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const statusRef = useRef(status);
    const shouldIdentifyRef = useRef(false);
    const lastTalkingTimeRef = useRef<number>(Date.now());

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        statusRef.current = status;
        console.log("[LiveVoiceAssistant] Status changed to:", status);
    }, [status]);

    // Major fix: set shouldIdentifyRef.current immediately when isActive is true
    useEffect(() => {
        shouldIdentifyRef.current = isActive;
    }, [isActive]);

    // Cleanup & Auto-start
    useEffect(() => {
        console.log("[LiveVoiceAssistant] Component Mounted. Starting session...");
        startSession();

        return () => {
            console.log("[LiveVoiceAssistant] Component Unmounting. Cleaning up...");
            handleCompleteTermination();
        };
    }, []);

    const handleCompleteTermination = () => {
        shouldIdentifyRef.current = false;

        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onstart = null;
            try {
                recognitionRef.current.abort();
            } catch (e) { }
        }
        recognitionRef.current = null;

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
        mediaRecorderRef.current = null;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
        }
        window.speechSynthesis.cancel();
    };

    const speak = (text: string) => {
        console.log("[LiveVoiceAssistant] Assistant speaking:", text);
        if (!text) return;
        const cleanText = text.replace(/```json[\s\S]*?```/g, '').replace(/[*#]/g, '').trim();
        if (!cleanText) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => {
            if (shouldIdentifyRef.current) {
                setStatus("listening");
                restartListening();
            }
        };
        utterance.onerror = (e) => {
            console.error("[LiveVoiceAssistant] Speech synthesis error:", e);
            if (shouldIdentifyRef.current) {
                setStatus("listening");
                restartListening();
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const processText = async (text: string, audioBase64?: string) => {
        if (statusRef.current === "processing") return;
        if (!shouldIdentifyRef.current) {
            console.warn("[LiveVoiceAssistant] Aborting processText: Session not active");
            return;
        }

        console.log("[LiveVoiceAssistant] Processing input:", text || "[Audio only]");
        setStatus("processing");

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, audio: audioBase64 }),
            });

            if (!res.ok) throw new Error(`Serveur error: ${res.status}`);
            const data = await res.json();
            console.log("[LiveVoiceAssistant] IA Response received:", data);

            if (data.actions && data.actions.length > 0) {
                console.log("[LiveVoiceAssistant] Actions detected. calling onTaskCreated.");
                onTaskCreated?.();
            }
            speak(data.message);
        } catch (error) {
            console.error("[LiveVoiceAssistant] API call failed:", error);
            setStatus("error");
            if (shouldIdentifyRef.current) {
                setTimeout(() => setStatus("listening"), 3000);
            }
        }
    };

    const startAudioAnalysis = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const update = () => {
            if (!shouldIdentifyRef.current) return;

            if (analyserRef.current && statusRef.current === "listening") {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setVolume(avg / 128);

                // Auto-submit on silence detection (2.5 seconds)
                if (avg > 15) {
                    lastTalkingTimeRef.current = Date.now();
                } else if (Date.now() - lastTalkingTimeRef.current > 2500) {
                    const currentTranscript = (lastTranscriptRef.current + transcript).trim();
                    if (currentTranscript && statusRef.current === "listening") {
                        console.log("[LiveVoiceAssistant] Silence detected. Auto-submitting...");
                        handleSubmit();
                    }
                }
            }
            animationFrameRef.current = requestAnimationFrame(update);
        };
        update();
    };

    const startSession = async () => {
        try {
            console.log("[LiveVoiceAssistant] startSession() triggered.");
            shouldIdentifyRef.current = true; // Set IMMEDIATELY to avoid race conditions
            setIsActive(true);
            setStatus("listening");
            setTranscript("");
            lastTranscriptRef.current = "";

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("[LiveVoiceAssistant] Microphone access granted.");

            initRecognition();
            startAudioAnalysis(stream);

            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                if (!shouldIdentifyRef.current) return;
                console.log("[LiveVoiceAssistant] MediaRecorder stopped. Processing fallback audio.");
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                audioChunksRef.current = [];
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    // Only use audio fallback if transcript is empty
                    if (!lastTranscriptRef.current.trim() && !transcript.trim() && shouldIdentifyRef.current) {
                        processText("", base64.split(',')[1]);
                    }
                };
            };
            mediaRecorderRef.current.start();

        } catch (err) {
            console.error("[LiveVoiceAssistant] Microphone access error:", err);
            setStatus("error");
        }
    };

    const stopSession = () => {
        console.log("[LiveVoiceAssistant] User manually stopped session.");
        handleCompleteTermination();
        setIsActive(false);
        onClose?.();
    };

    const initRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("[LiveVoiceAssistant] SpeechRecognition not supported by this browser.");
            return;
        }

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
            if (shouldIdentifyRef.current && statusRef.current === "listening") {
                console.log("[LiveVoiceAssistant] Recognition ended unexpectedly. Restarting...");
                try { recognition.start(); } catch (e) { }
            } else {
                console.log("[LiveVoiceAssistant] Recognition ended naturally.");
            }
        };

        recognition.onerror = (event: any) => {
            console.error("[LiveVoiceAssistant] Recognition error:", event.error);
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            console.log("[LiveVoiceAssistant] Recognition started successfully.");
        } catch (e) {
            console.error("[LiveVoiceAssistant] Failed to start recognition:", e);
        }
    };

    const restartListening = () => {
        if (!shouldIdentifyRef.current) return;
        console.log("[LiveVoiceAssistant] Resetting for new input.");
        lastTranscriptRef.current = "";
        setTranscript("");
        try { recognitionRef.current?.start(); } catch (e) { }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
            mediaRecorderRef.current.start();
        }
    };

    const handleSubmit = () => {
        const finalTranscript = (lastTranscriptRef.current + transcript).trim();
        console.log("[LiveVoiceAssistant] handleSubmit() called with text:", finalTranscript);

        if (finalTranscript) {
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                // Prevent fallback processing when we have text
                mediaRecorderRef.current.onstop = null;
                mediaRecorderRef.current.stop();
            }
            processText(finalTranscript);
        } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            // No text, trigger fallback audio via onstop
            mediaRecorderRef.current.stop();
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-transparent px-6">
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

                <div className="flex items-center gap-1.5 h-40">
                    {[...Array(24)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: status === 'listening' ? [12, 12 + (volume * 140 * (0.5 + Math.random() * 0.5)), 12] : 8
                            }}
                            className={`w-1 rounded-full ${status === 'processing' ? 'bg-[var(--accent-purple)] animate-pulse' :
                                status === 'speaking' ? 'bg-cyan-400' :
                                    'bg-[var(--accent-purple)]'
                                }`}
                        />
                    ))}
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`w-28 h-28 rounded-3xl border-2 flex items-center justify-center bg-[var(--bg-card)]/80 backdrop-blur-xl shadow-2xl transition-all duration-500 ${status === 'listening' ? 'border-[var(--accent-purple)] shadow-[var(--accent-purple)]/20' :
                            status === 'speaking' ? 'border-cyan-400 shadow-cyan-400/20' :
                                'border-[var(--border-subtle)]'
                            }`}
                    >
                        {status === 'processing' ? <Loader2 className="w-10 h-10 text-[var(--accent-purple)] animate-spin" /> :
                            status === 'speaking' ? <div className="text-cyan-400"><Volume2 size={40} className="animate-pulse" /></div> :
                                <div className="text-[var(--accent-purple)]"><Activity size={40} /></div>}
                    </motion.div>
                </div>
            </div>

            {/* Controls and Transcript */}
            <div className="w-full max-w-2xl mt-12 space-y-8 z-20">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 badge px-4 py-1.5 border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                        <span className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white">
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
                                {transcript || (lastTranscriptRef.current.trim() ? lastTranscriptRef.current : "Commencez à parler pour que l'IA puisse vous aider...")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleSubmit}
                        disabled={!transcript.trim() && !lastTranscriptRef.current.trim() && status === 'processing'}
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
