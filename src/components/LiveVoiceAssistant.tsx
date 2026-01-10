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

    const stopSession = useCallback(() => {
        setIsActive(false);
        setStatus("idle");
        setDebugInfo("");
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        window.speechSynthesis.cancel();
    }, []);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        setDebugInfo("L'IA parle...");
        const cleanText = text.replace(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/g, '').trim();

        if (!cleanText) {
            setDebugInfo("Réponse vide");
            restartListening();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.0;

        utterance.onstart = () => setStatus("speaking");
        utterance.onend = () => {
            setDebugInfo("En attente...");
            restartListening();
        };
        utterance.onerror = (e) => {
            console.error("Erreur TTS:", e);
            restartListening();
        };

        window.speechSynthesis.speak(utterance);
    };

    const processText = async (text: string) => {
        if (!text.trim()) {
            restartListening();
            return;
        }

        setStatus("processing");
        setDebugInfo("Envoi à l'IA...");
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
                credentials: 'include' // S'assurer que les cookies Supabase sont envoyés
            });

            if (response.status === 401) {
                throw new Error("Session expirée. Veuillez recharger la page.");
            }

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
            console.error("Erreur AI:", err);
            setDebugInfo("Erreur Reseau");
            setStatus("error");
            setTimeout(restartListening, 2000);
        }
    };

    const restartListening = () => {
        setStatus("listening");
        setTranscript("");
        lastTranscriptRef.current = "";
        setDebugInfo("Écoute...");
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Déjà démarré
            }
        }
    };

    const initRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setDebugInfo("Mode Clavier Seul");
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setStatus("listening");
            setDebugInfo("Parlez, je vous écoute...");
        };

        recognition.onresult = (event: any) => {
            let fullTranscript = "";
            // On parcourt TOUS les résultats accumulés depuis le début de la session
            for (let i = 0; i < event.results.length; i++) {
                fullTranscript += event.results[i][0].transcript;
            }

            if (fullTranscript.trim()) {
                setTranscript(fullTranscript);
                lastTranscriptRef.current = fullTranscript;
                setDebugInfo("Je vous écoute...");
            }
        };

        recognition.onspeechend = () => {
            setDebugInfo("Traitement de votre phrase...");
        };

        recognition.onerror = (event: any) => {
            console.warn("STT Error:", event.error);
            if (event.error === 'no-speech') {
                setDebugInfo("Parlez plus fort ?");
                return;
            }
            if (event.error === 'not-allowed') {
                setDebugInfo("Micro Bloqué - Autorisez-le");
                return;
            }
            if (event.error === 'network') {
                setDebugInfo("Erreur Réseau (STT)");
                return;
            }
        };

        // Relance automatique si ça coupe sans raison (fréquent sur mobile)
        recognition.onend = () => {
            if (isActive && status === "listening") {
                // Petite pause pour éviter les boucles infinies de CPU
                setTimeout(() => {
                    if (isActive && status === "listening") {
                        try { recognition.start(); } catch (e) { }
                    }
                }, 300);
            }
        };

        return recognition;
    };

    const startSession = async () => {
        setIsActive(true);
        setStatus("processing");
        setDebugInfo("Démarrage...");

        // ASTUCE IOS: Jouer un son vide pour débloquer l'audio du navigateur
        const unlockAudio = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(unlockAudio);

        // Essayer d'initier l'audio, mais ne pas bloquer si échec
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            const updateVolume = () => {
                if (!analyserRef.current) return;
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                setVolume(average / 128);
                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (e) {
            console.warn("Micro non disponible, passage en mode mixte");
            setDebugInfo("Mode Texte Actif");
        }

        recognitionRef.current = initRecognition();
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) { }
        } else {
            setStatus("listening");
        }
    };

    const handleSubmit = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (status !== "listening") return;

        const textToProcess = lastTranscriptRef.current.trim();

        if (textToProcess) {
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            processText(textToProcess);
        } else {
            setDebugInfo("Rien entendu");
        }
    };

    const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const text = fd.get('text') as string;
        if (text.trim()) {
            if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
            processText(text);
            e.currentTarget.reset();
        }
    };

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
                                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all relative z-[10000] cursor-pointer ${status === "listening"
                                        ? "bg-red-500 hover:bg-red-600 border-4 border-white/20"
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
