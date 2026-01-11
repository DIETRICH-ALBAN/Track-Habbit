"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, PhoneOff, Loader2, Volume2, Activity, Square, AlertCircle, Sparkles, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveVoiceAssistantProps {
    onTaskCreated?: () => void;
}

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function LiveVoiceAssistant({ onTaskCreated }: LiveVoiceAssistantProps) {
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
    const statusRef = useRef(status);
    const isActiveRef = useRef(isActive);
    const [shake, setShake] = useState(false);

    // Pour l'audio natif (Fallback si STT échoue)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Synchronize refs with state to avoid stale closures in events
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

    const stopSession = useCallback(() => {
        setIsActive(false);
        setStatus("idle");
        setDebugInfo("");
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try { mediaRecorderRef.current.stop(); } catch (e) { }
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        window.speechSynthesis.cancel();
    }, []);

    function restartListening() {
        setStatus("listening");
        setTranscript("");
        lastTranscriptRef.current = "";
        setDebugInfo("Je vous écoute...");
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) { }
        }
    }

    function speak(text: string) {
        window.speechSynthesis.cancel();
        const cleanText = text
            .replace(/```json[\s\S]*?```/g, '') // Enlever les blocs de code JSON
            .replace(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g, '') // Enlever les vieux JSON inline
            .replace(/[\{\}\[\]"']/g, '')
            .trim();

        if (!cleanText) {
            restartListening();
            return;
        }

        const doSpeak = () => {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'fr-FR';

            const voices = window.speechSynthesis.getVoices();
            console.log("Available voices:", voices.length);

            // Priorité aux voix Google/Premium pour Android/Desktop
            const preferredVoice = voices.find(v => v.lang.startsWith('fr') &&
                (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Microsoft') || v.name.includes('Thomas') || v.name.includes('Audrey')));

            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.rate = 1.05;
            utterance.onstart = () => {
                setStatus("speaking");
                setDebugInfo("L'IA parle...");
            };
            utterance.onend = () => {
                setDebugInfo("Je vous écoute...");
                restartListening();
            };
            utterance.onerror = (e) => {
                console.error("TTS Error:", e);
                restartListening();
            };

            window.speechSynthesis.speak(utterance);
        };

        // Sur mobile, les voix peuvent mettre du temps à charger
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                doSpeak();
                window.speechSynthesis.onvoiceschanged = null;
            };
        } else {
            doSpeak();
        }
    }

    async function processText(text: string, audioBase64?: string) {
        if (!text.trim() && !audioBase64) {
            restartListening();
            return;
        }

        setStatus("processing");
        setDebugInfo(audioBase64 ? "Analyse Audio..." : "Analyse...");
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    audio: audioBase64
                }),
                credentials: 'include'
            });

            if (response.status === 401) throw new Error("Session expirée");

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.message) {
                speak(data.message);
            } else {
                restartListening();
            }

            if (data.actions && data.actions.length > 0 && onTaskCreated) {
                onTaskCreated();
            }
        } catch (err: any) {
            console.error("AI Error:", err);
            setDebugInfo("Erreur");
            setStatus("error");
            setTimeout(restartListening, 2000);
        }
    }

    function initRecognition() {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';

        // Android Chrome stability: continuous = false is often more reliable
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        recognition.continuous = !isMobile;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("🎤 Recognition started");
            setStatus("listening");
            setDebugInfo("Je vous écoute...");
        };

        recognition.onresult = (event: any) => {
            console.log("📨 Result received:", event.results);
            // Re-calcul du transcript complet pour l'UI
            let total = "";
            for (let i = 0; i < event.results.length; i++) {
                total += event.results[i][0].transcript;
            }

            if (total.trim()) {
                setTranscript(total);
                lastTranscriptRef.current = total;
                setDebugInfo("Je vous écoute...");

                // Auto-submit logic - un peu plus long pour laisser respirer
                if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
                autoSubmitTimeoutRef.current = setTimeout(() => {
                    const text = lastTranscriptRef.current.trim();
                    if (text && isActiveRef.current && statusRef.current === "listening") {
                        console.log("🚀 Auto-submitting:", text);
                        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
                        processText(text);
                    }
                }, 2000);
            }
        };

        recognition.onerror = (event: any) => {
            console.error("❌ Recognition error:", event.error);
            if (event.error === 'no-speech' && isActiveRef.current && statusRef.current === "listening") {
                // On mobile, silence is common, restart gently
                try { recognition.stop(); } catch (e) { }
            }
            if (event.error === 'not-allowed') {
                setDebugInfo("Micro bloqué");
                stopSession();
            }
        };

        recognition.onend = () => {
            if (isActiveRef.current && statusRef.current === "listening") {
                console.log("🔄 Recognition ended, restarting...");
                setTimeout(() => {
                    if (isActiveRef.current && statusRef.current === "listening") {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 400); // Longer delay for mobile stability
            }
        };

        return recognition;
    }

    async function startSession() {
        setIsActive(true);
        setStatus("processing");
        setDebugInfo("Démarrage...");
        setTranscript("");
        lastTranscriptRef.current = "";
        audioChunksRef.current = [];

        // Débloquer l'audio
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);

        try {
            // Demande le flux micro une seule fois pour tous
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 1. Lancer MediaRecorder (Fallback Robuste)
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                // Si pas de transcript, on envoie l'audio
                if (!lastTranscriptRef.current.trim() && isActiveRef.current) {
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result as string;
                        processText("", base64Audio);
                    };
                }
            };
            mediaRecorder.start();

            // 2. Lancer la reconnaissance vocale browser (UI réactive)
            recognitionRef.current = initRecognition();
            if (recognitionRef.current) {
                recognitionRef.current.start();
                console.log("Speech recognition started.");
            } else {
                console.warn("STT not supported, falling back to pure recording");
            }

            // 3. Visualiseur
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            const updateVolume = () => {
                if (!analyserRef.current || !isActiveRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                setVolume(average / 128);
                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

        } catch (e: any) {
            console.error("Start session failed:", e);
            setDebugInfo("Erreur Micro");
            setStatus("error");
            setTimeout(stopSession, 3000);
        }
    }

    function handleSubmit(e?: React.MouseEvent) {
        e?.preventDefault();
        e?.stopPropagation();
        if (status !== "listening") return;
        if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);

        const text = lastTranscriptRef.current.trim();

        // On arrête tout, les onstop/onend s'occuperont de la suite
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }

        if (text) {
            // On a du texte, on l'envoie direct (on stoppe le recorder sans traiter son résultat)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.onstop = null; // On annule le callback audio
                mediaRecorderRef.current.stop();
            }
            processText(text);
        } else {
            // Pas de texte : on laisse le onstop du MediaRecorder envoyer l'audio
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                setDebugInfo("Envoi Audio...");
                mediaRecorderRef.current.stop();
            } else {
                setShake(true);
                setDebugInfo("Dites quelque chose...");
                setTimeout(() => setShake(false), 500);
            }
        }
    }

    function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const text = fd.get('text') as string;
        if (text.trim()) {
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            processText(text);
            e.currentTarget.reset();
        }
    }

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]">
            <AnimatePresence>
                {!isActive ? (
                    <motion.button
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={startSession}
                        className="flex items-center gap-3 bg-primary hover:bg-blue-600 px-8 py-5 rounded-full font-bold shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all active:scale-90"
                    >
                        <Mic className="w-6 h-6 text-white" />
                        <span className="text-white text-lg">Assistant Vocal</span>
                    </motion.button>
                ) : (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="glass-morphism-premium p-8 rounded-[40px] border-2 border-primary/40 min-w-[340px] shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex flex-col items-center gap-6">
                            {/* Header */}
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-green-500 animate-ping' : 'bg-primary'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">TRACK HABBIT AI</span>
                                </div>
                                <button onClick={stopSession} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white">
                                    <PhoneOff className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Visualizer - Mode fallback si pas de volume */}
                            <div className="relative h-20 w-full flex items-center justify-center">
                                <motion.div
                                    animate={{ scale: [1, 1 + volume, 1], opacity: [0.1, 0.3, 0.1] }}
                                    transition={{ duration: 0.3, repeat: Infinity }}
                                    className="absolute w-28 h-28 bg-primary/30 rounded-full blur-2xl"
                                />
                                {status === "processing" ? (
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                ) : (
                                    <Activity className={`w-12 h-12 ${status === 'listening' ? 'text-green-400' : 'text-primary'}`} />
                                )}
                            </div>

                            {/* Zone Texte Mixte (Vocal + Clavier) */}
                            <div className="w-full flex flex-col gap-2 relative">
                                <p className="text-center text-white font-bold text-lg mb-1">
                                    {status === "listening" ? "Je vous écoute..." :
                                        status === "speaking" ? "L'IA vous répond" : "Traitement..."}
                                </p>

                                {status === "listening" ? (
                                    <form onSubmit={handleManualSubmit} className="relative w-full">
                                        <input
                                            name="text"
                                            autoComplete="off"
                                            placeholder="Parlez ou écrivez ici..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/10 text-center transition-all"
                                            onChange={(e) => {
                                                setTranscript(e.target.value);
                                                lastTranscriptRef.current = e.target.value;
                                            }}
                                            value={transcript} // Bindé pour afficher aussi la reco vocale
                                        />
                                        <Keyboard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                                    </form>
                                ) : (
                                    <div className="bg-black/20 rounded-2xl p-4 min-h-[50px] flex items-center justify-center">
                                        <p className="text-white/70 text-sm italic text-center">
                                            {transcript || "..."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* LE BOUTON DE SOUMISSION */}
                            <div className="flex flex-col items-center gap-3 mt-2">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleSubmit}
                                    disabled={status !== "listening"}
                                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all relative z-[10000] cursor-pointer ${status === "listening"
                                        ? (lastTranscriptRef.current.trim() ? "bg-red-500 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]" : "bg-gray-600")
                                        : "bg-gray-700 opacity-50 cursor-not-allowed"
                                        }`}
                                >
                                    {status === "listening" ? (
                                        <Square className="w-8 h-8 text-white fill-white" />
                                    ) : (
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    )}
                                </motion.button>

                                {/* DEBUG INFO */}
                                <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 bg-primary/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                                    <Sparkles className="w-3 h-3" />
                                    {debugInfo || "Prêt"}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
