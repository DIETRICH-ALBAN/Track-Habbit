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
    const isActiveRef = useRef(isActive);
    const [shake, setShake] = useState(false);

    // Pour l'audio natif
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    const speak = (text: string) => {
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
            setStatus("listening");
            restartListening();
        };
        utterance.onerror = () => {
            setStatus("listening");
            restartListening();
        };

        window.speechSynthesis.speak(utterance);
    };

    const processText = async (text: string, audioBase64?: string) => {
        if (statusRef.current === "processing") return;
        setStatus("processing");
        setDebugInfo("L'IA réfléchit...");

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, audio: audioBase64 }),
            });

            if (!res.ok) throw new Error("Erreur serveur");
            const data = await res.json();

            if (data.actions && data.actions.length > 0) onTaskCreated?.();
            speak(data.message);
        } catch (error) {
            console.error(error);
            setStatus("error");
            setTimeout(() => setStatus("listening"), 3000);
        }
    };

    const startAudioAnalysis = (stream: MediaStream) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const update = () => {
            if (analyserRef.current && statusRef.current === "listening") {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength;
                setVolume(avg / 128);

                if (avg > 15) {
                    lastTalkingTimeRef.current = Date.now();
                } else if (Date.now() - lastTalkingTimeRef.current > 2000) {
                    if (lastTranscriptRef.current.trim() && statusRef.current === "listening") {
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
            setIsActive(true);
            setStatus("listening");
            setTranscript("");
            lastTranscriptRef.current = "";
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            initRecognition();
            startAudioAnalysis(stream);

            // MediaRecorder for fallback
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                audioChunksRef.current = [];
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    if (!lastTranscriptRef.current.trim()) {
                        processText("", base64.split(',')[1]);
                    }
                };
            };
            mediaRecorderRef.current.start();

        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    const stopSession = () => {
        setIsActive(false);
        setStatus("idle");
        window.speechSynthesis.cancel();
        if (recognitionRef.current) recognitionRef.current.stop();
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
            if (isActiveRef.current && statusRef.current === "listening") {
                try { recognition.start(); } catch (e) { }
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    };

    const restartListening = () => {
        if (!isActiveRef.current) return;
        lastTranscriptRef.current = "";
        setTranscript("");
        try { recognitionRef.current?.start(); } catch (e) { }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
            mediaRecorderRef.current.start();
        }
    };

    const handleSubmit = () => {
        const text = transcript.trim() || lastTranscriptRef.current.trim();
        if (text) {
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = null;
                mediaRecorderRef.current.stop();
            }
            processText(text);
        } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
    };

    // Auto-start if wrapped
    useEffect(() => {
        if (!isActive) startSession();
    }, []);

    return (
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Immersive Neural Visualizer */}
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                        borderRadius: ["40%", "50%", "40%"]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/20 blur-[100px]"
                />

                {/* Audio Waves Simulation */}
                <div className="flex items-center gap-1 h-32">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{
                                height: status === 'listening' ? [10, 10 + (volume * 100 * Math.random()), 10] : 4
                            }}
                            className={`w-1 rounded-full ${status === 'processing' ? 'bg-primary/40 animate-pulse' : 'bg-primary'}`}
                        />
                    ))}
                </div>

                {/* Central Status Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-[#020203] shadow-[0_0_50px_rgba(59,130,246,0.2)] ${status === 'listening' ? 'border-primary' : 'border-white/10'}`}>
                        {status === 'processing' ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> :
                            status === 'speaking' ? <Volume2 className="w-8 h-8 text-primary animate-pulse" /> :
                                <Activity className="w-8 h-8 text-primary" />}
                    </div>
                </div>
            </div>

            {/* Transcript & Input */}
            <div className="w-full max-w-xl mt-8 flex flex-col items-center gap-6 px-4">
                <div className="text-center">
                    <p className="hero-title text-2xl text-white mb-2">
                        {status === 'listening' ? "Dites quelque chose..." :
                            status === 'processing' ? "Analyse neuronale..." :
                                status === 'speaking' ? "Réponse en cours" : "Lien établi"}
                    </p>
                    <p className="text-white/40 text-sm font-medium tracking-wide max-h-24 overflow-y-auto no-scrollbar italic">
                        {transcript || "..."}
                    </p>
                </div>

                <div className="flex gap-4 w-full justify-center">
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-4 bg-primary rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(59,130,246,0.3)]"
                    >
                        Envoyer
                    </button>
                    <button
                        onClick={stopSession}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white hover:bg-red-500/20 transition-all"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Background Data Stream (Visual only) */}
            <div className="absolute inset-0 -z-10 opacity-5 pointer-events-none select-none overflow-hidden text-[8px] font-mono leading-none text-primary p-2 flex flex-wrap gap-1">
                {[...Array(1000)].map((_, i) => (
                    <span key={i}>{Math.random() > 0.5 ? '1' : '0'}</span>
                ))}
            </div>
        </div>
    );
}
