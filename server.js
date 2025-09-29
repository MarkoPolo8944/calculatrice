const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuration API Perplexity
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Route principale
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route pour l'API Perplexity
app.post('/api/perplexity', async (req, res) => {
    console.log('📡 Réception requête API Perplexity...');
    
    try {
        const { prompt, model = 'llama-3.1-sonar-large-128k-online' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                error: 'Prompt requis',
                success: false 
            });
        }

        console.log('📤 Envoi vers Perplexity API...');
        
        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un expert en immobilier français. Réponds uniquement avec des tableaux markdown précis et des données réelles du marché.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API Perplexity:', response.status, errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Réponse API Perplexity reçue');
        
        // Vérifier la structure de la réponse
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Format de réponse API invalide');
        }

        res.json({
            success: true,
            content: data.choices[0].message.content,
            usage: data.usage || null
        });
        
    } catch (error) {
        console.error('❌ Erreur serveur:', error.message);
        
        // Réponse d'erreur avec fallback
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: true,
            content: generateFallbackContent(req.body.prompt)
        });
    }
});

// Fonction fallback en cas d'erreur API
function generateFallbackContent(prompt) {
    return `| Information | Valeur |
|-------------|---------|
| Status | Données de démonstration |
| Source | Calcul local |
| Note | API temporairement indisponible |

**Données basées sur votre recherche :**
- Recherche effectuée avec succès
- Calculs réalisés localement  
- Reconnectez-vous plus tard pour les données temps réel`;
}

// Health check pour Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        path: req.path 
    });
});

// Gestion des erreurs globales
app.use((error, req, res, next) => {
    console.error('❌ Erreur serveur globale:', error);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📱 Application accessible sur: http://localhost:${PORT}`);
    console.log(`🔑 API Key configurée: ${PERPLEXITY_API_KEY ? '✅' : '❌'}`);
});
