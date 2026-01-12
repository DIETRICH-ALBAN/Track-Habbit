"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent text-[var(--text-primary)] p-4 text-center overflow-hidden relative z-10">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-10 max-w-md relative z-10 border-rose-500/20"
            >
                <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20 shadow-2xl">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                </div>

                <h1 className="heading-display text-2xl mb-4">Erreur d&apos;authentification</h1>
                <p className="text-[var(--text-muted)] mb-8 leading-relaxed">
                    Une erreur est survenue lors de la tentative de connexion ou de validation de votre code d&apos;accès.
                </p>

                <a
                    href="/"
                    className="btn-primary w-full py-4 text-lg"
                >
                    <ArrowLeft size={18} />
                    <span>Retour à l&apos;accueil</span>
                </a>

                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-8 opacity-50">
                    Security Protection Established
                </p>
            </motion.div>
        </div>
    );
}
