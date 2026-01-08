export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-4 text-center">
            <div className="glass-morphism p-8 max-w-md">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Erreur d'authentification</h1>
                <p className="text-white/60 mb-6">
                    Une erreur est survenue lors de la tentative de connexion. Veuillez réessayer.
                </p>
                <a
                    href="/"
                    className="bg-primary px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all inline-block"
                >
                    Retour à l'accueil
                </a>
            </div>
        </div>
    );
}
