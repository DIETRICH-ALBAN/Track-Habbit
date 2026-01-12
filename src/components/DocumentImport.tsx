"use client";

import { useState, useRef } from "react";
import { FileUp, Loader2, X, CheckCircle, FileText, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DocumentImportProps {
    onClose: () => void;
    onTextExtracted: (text: string, filename: string) => void;
}

export default function DocumentImport({ onClose, onTextExtracted }: DocumentImportProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-excel"
            ];

            if (validTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
                setErrorMsg("");
            } else {
                setErrorMsg("Format non supporté. PDF ou Excel uniquement.");
                setFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setStatus("uploading");
        setErrorMsg("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/import", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Une erreur est survenue lors de l'importation.");
            }

            setStatus("success");
            setTimeout(() => {
                onTextExtracted(data.text, data.filename);
                onClose();
            }, 1000);

        } catch (err: any) {
            setErrorMsg(err.message);
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center glass-overlay p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="modal-panel w-full max-w-lg p-8 space-y-6 relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 icon-box icon-box-sm hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)' }}>
                        <FileUp size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="heading-display text-2xl">Importer un <span className="heading-serif">Document</span></h2>
                        <p className="text-[var(--text-muted)] text-sm mt-2">Analysez vos PDFs ou fichiers Excel pour générer des tâches automatiquement.</p>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        card p-8 text-center cursor-pointer transition-all border-2 border-dashed
                        ${file
                            ? "border-[var(--accent-purple)] bg-[var(--accent-purple)]/5"
                            : "border-[var(--border-default)] hover:border-[var(--accent-purple)]/50"
                        }
                    `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.xlsx,.xls"
                        className="hidden"
                    />

                    {file ? (
                        <div className="space-y-3">
                            <div className="icon-box w-14 h-14 mx-auto">
                                <FileText size={24} />
                            </div>
                            <p className="font-semibold text-[var(--text-primary)]">{file.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="icon-box w-14 h-14 mx-auto">
                                <FileUp size={24} />
                            </div>
                            <p className="text-[var(--text-secondary)] font-medium">Cliquez pour sélectionner un fichier</p>
                            <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">PDF, XLSX, XLS</p>
                        </div>
                    )}
                </div>

                {/* Error */}
                {errorMsg && (
                    <div className="flex items-center gap-3 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Success */}
                {status === "success" && (
                    <div className="flex items-center gap-3 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                        <CheckCircle size={18} className="flex-shrink-0" />
                        <span>Document analysé avec succès ! Transmission à l&apos;IA...</span>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleUpload}
                    disabled={!file || loading || status === "success"}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5" />
                    )}
                    <span>{loading ? "Traitement en cours..." : "Lancer l'analyse"}</span>
                </button>
            </motion.div>
        </motion.div>
    );
}
