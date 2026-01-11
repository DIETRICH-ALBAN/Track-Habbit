"use client";

import { useState, useRef } from "react";
import { FileUp, Loader2, X, CheckCircle, FileText, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-lg glass-morphism p-8 space-y-6 relative border-2 border-primary/20"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileUp className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-outfit font-bold gradient-text">Importer un Document</h2>
                    <p className="text-white/40 text-sm">Analysez vos PDFs ou fichiers Excel pour générer des tâches automatiquement.</p>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                        ${file ? "border-primary bg-primary/5" : "border-white/10 hover:border-primary/40 hover:bg-white/5"}
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
                        <div className="space-y-2">
                            <FileText className="w-10 h-10 text-primary mx-auto" />
                            <p className="font-bold text-white">{file.name}</p>
                            <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <FileUp className="w-10 h-10 text-white/20 mx-auto" />
                            <p className="text-white/60 font-medium">Cliquez pour sélectionner un fichier</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">PDF, XLSX, XLS</p>
                        </div>
                    )}
                </div>

                {errorMsg && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex items-center gap-2 text-green-500 text-sm bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Document analysé avec succès ! Transmission à l&apos;IA...</span>
                    </div>
                )}

                <button
                    onClick={handleUpload}
                    disabled={!file || loading || status === "success"}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 py-4 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <CheckCircle className="w-5 h-5" />
                    )}
                    <span>{loading ? "Traitement en cours..." : "Lancer l'analyse"}</span>
                </button>
            </motion.div>
        </div>
    );
}
