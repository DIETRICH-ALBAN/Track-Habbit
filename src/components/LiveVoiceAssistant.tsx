"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, PhoneOff, Loader2, Volume2, Sparkles, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LiveVoiceAssistantProps {
    onTaskCreated?: () => void;
}

export default function LiveVoiceAssistant({ onTaskCreated }: LiveVoiceAssistantProps) {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
    const nextPlayTimeRef = useRef<number>(0);

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

    const stopSession = useCallback(() => {
        setIsActive(false);
        setStatus("idle");

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    }, []);

    const startSession = async () => {
        if (!apiKey) {
            alert("Clé API Gemini manquante dans NEXT_PUBLIC_GEMINI_API_KEY");
            return;
        }

        setStatus("connecting");
        setIsActive(true);

        try {
            // 1. Initialisation Audio
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
            });

            // 2. Capture Micro
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            streamRef.current = stream;

            // 3. WebSocket Gemini Live
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.MultimodalLive?key=${apiKey}`;
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus("active");
                // Config initiale
                ws.send(JSON.stringify({
                    setup: {
                        model: "models/gemini-1.5-flash-8b", // Utilisation de la version 8b pour plus de rapidité live
                        generation_config: {
                            response_modalities: ["audio"],
                        }
                    }
                }));

                // Start audio streaming
                const source = audioContextRef.current!.createMediaStreamSource(stream);
                const processor = audioContextRef.current!.createScriptProcessor(2048, 1, 1);
                processorRef.current = processor;

                source.connect(processor);
                processor.connect(audioContextRef.current!.destination);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN && !isMuted) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convertir Float32 en PCM 16bit base64
                        const pcmData = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                        }

                        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                        ws.send(JSON.stringify({
                            realtime_input: {
                                media_chunks: [{
                                    data: base64Audio,
                                    mime_type: "audio/pcm"
                                }]
                            }
                        }));

                        // Visualisation volume
                        const sum = inputData.reduce((acc, val) => acc + val * val, 0);
                        setVolume(Math.sqrt(sum / inputData.length));
                    }
                };
            };

            ws.onmessage = async (event) => {
                const response = JSON.parse(event.data);

                if (response.server_content?.model_turn?.parts) {
                    for (const part of response.server_content.model_turn.parts) {
                        if (part.inline_data?.mime_type === "audio/pcm") {
                            // Lecture de l'audio reçu
                            const binaryString = atob(part.inline_data.data);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const pcm16 = new Int16Array(bytes.buffer);
                            const float32 = new Float32Array(pcm16.length);
                            for (let i = 0; i < pcm16.length; i++) {
                                float32[i] = pcm16[i] / 0x7FFF;
                            }

                            const buffer = audioContextRef.current!.createBuffer(1, float32.length, 16000);
                            buffer.getChannelData(0).set(float32);

                            const source = audioContextRef.current!.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContextRef.current!.destination);

                            const startTime = Math.max(audioContextRef.current!.currentTime, nextPlayTimeRef.current);
                            source.start(startTime);
                            nextPlayTimeRef.current = startTime + buffer.duration;
                        }
                    }
                }
            };

            ws.onerror = (e) => {
                console.error("WS Error:", e);
                setStatus("error");
            };

            ws.onclose = () => {
                stopSession();
            };

        } catch (err) {
            console.error("Session Start Error:", err);
            setStatus("error");
            setIsActive(false);
        }
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]">
            <AnimatePresence>
                {!isActive ? (
                    <motion.button
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        onClick={startSession}
                        className="flex items-center gap-3 bg-primary hover:bg-blue-600 px-8 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all hover:scale-105 active:scale-95 group"
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:animate-pulse">
                            <Mic className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg">Démarrer le Mode Live Vocal</span>
                    </motion.button>
                ) : (
                    <motion.div
                        initial={{ y: 50, scale: 0.9, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        className="glass-morphism-premium p-6 rounded-[40px] border-2 border-primary/30 min-w-[320px] shadow-[0_0_50px_rgba(59,130,246,0.3)] relative overflow-hidden"
                    >
                        {/* Background Animation */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent -z-10" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />

                        <div className="flex flex-col items-center gap-6">
                            <div className="flex items-center justify-between w-full mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Gemini Live Active</span>
                                </div>
                                <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
                            </div>

                            {/* Visualizer */}
                            <div className="flex gap-1 items-end h-16 w-full justify-center">
                                {[...Array(15)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            height: status === "active" ? 10 + (volume * 100 * (Math.sin(i * 0.5) + 1.5)) : 4
                                        }}
                                        className="w-1 bg-primary rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    />
                                ))}
                            </div>

                            {status === "connecting" ? (
                                <div className="flex items-center gap-2 text-white/60 font-medium">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Connexion à l'IA...</span>
                                </div>
                            ) : (
                                <div className="text-center space-y-1">
                                    <p className="text-xl font-bold font-outfit">Je vous écoute...</p>
                                    <p className="text-sm text-white/40">Parlez-moi naturellement</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-4 rounded-2xl transition-all ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                                >
                                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                </button>

                                <button
                                    onClick={stopSession}
                                    className="p-5 bg-red-500 hover:bg-red-600 rounded-3xl transition-all shadow-lg hover:rotate-12 active:scale-95 text-white"
                                >
                                    <PhoneOff className="w-8 h-8" />
                                </button>

                                <button className="p-4 bg-white/5 text-white/60 rounded-2xl">
                                    <Volume2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
