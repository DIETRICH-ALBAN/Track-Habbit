// Utilise fetch natif (Node 18+)
async function listModels() {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
            }
        });
        const data = await response.json();
        console.log('Models disponibles (OpenRouter):');
        data.data?.filter(m => m.id.includes('gemini-2.0-flash')).forEach(m => {
            console.log(`- ${m.id}`);
        });
    } catch (e) {
        console.error('Erreur:', e);
    }
}

listModels();
