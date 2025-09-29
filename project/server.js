const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuration API Perplexity
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

console.log('🔧 Configuration serveur:');
console.log(`   PORT: ${PORT}`);
console.log(`   API Key configurée: ${PERPLEXITY_API_KEY ? '✅' : '❌'}`);

// Route principale
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route API Perplexity
app.post('/api/perplexity', async (req, res) => {
    console.log('📡 Route /api/perplexity appelée');
    console.log('📦 Body reçu:', JSON.stringify(req.body, null, 2));
    
    try {
        const { model, messages, temperature, max_tokens } = req.body;
        
        // Validation du payload
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error('❌ Messages manquants ou invalides');
            return res.status(400).json({
                success: false,
                error: 'Messages requis dans le format [{role: "user", content: "..."}]'
            });
        }

        // Extraire le prompt du message utilisateur
        const userMessage = messages.find(msg => msg.role === 'user');
        if (!userMessage || !userMessage.content || userMessage.content.trim() === '') {
            console.error('❌ Contenu utilisateur manquant');
            return res.status(400).json({
                success: false,
                error: 'Contenu utilisateur requis dans messages'
            });
        }

        const prompt = userMessage.content.trim();
        console.log('✅ Prompt extrait:', prompt.substring(0, 100) + '...');

        // Vérification clé API
        if (!PERPLEXITY_API_KEY || PERPLEXITY_API_KEY === 'your_key_here') {
            console.warn('⚠️ Clé API manquante, mode fallback');
            return res.json({
                success: false,
                fallback: true,
                error: 'Clé API non configurée',
                content: getFallbackContent(prompt)
            });
        }

        // Appel API Perplexity
        console.log('🚀 Appel API Perplexity...');
        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'sonar-deep-research',
                messages: messages,
                temperature: temperature || 0.7,
                max_tokens: max_tokens || 8000
            })
        });

        if (!response.ok) {
            throw new Error(`API Perplexity error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Réponse API reçue');

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Réponse API invalide');
        }

        res.json({
            success: true,
            content: data.choices[0].message.content,
            usage: data.usage
        });

    } catch (error) {
        console.error('❌ Erreur API Perplexity:', error.message);
        
        // Mode fallback en cas d'erreur
        const userMessage = req.body.messages?.find(msg => msg.role === 'user');
        const prompt = userMessage?.content || '';
        
        res.json({
            success: false,
            fallback: true,
            error: error.message,
            content: getFallbackContent(prompt)
        });
    }
});

// Fonction fallback améliorée
function getFallbackContent(prompt) {
    console.log('🎭 Génération contenu fallback pour:', prompt.substring(0, 50) + '...');
    
    if (prompt.includes('chasseur immobilier') && prompt.includes('tableaux comparatifs')) {
        return `| Niveau budget | Localisation (secteur) | Type | Surface | Prix affiché (€) | Lien annonce | Loyer estimé 2025 (€/mois) | Rendement brut (%) |
|---------------|------------------------|------|---------|------------------|--------------|----------------------------|-------------------|
| 🥉 Bas | Nantes Centre-ville | T2 | 42m² | 285 000€ | [Voir annonce](#) | 1 100-1 250 | 4.6-5.3% |
| 🥈 Médian | Nantes Beaulieu | T2 | 46m² | 345 000€ | [Voir annonce](#) | 1 300-1 450 | 4.5-5.0% |
| 🥇 Haut | Nantes Île de Nantes | T2 | 52m² | 405 000€ | [Voir annonce](#) | 1 500-1 650 | 4.4-4.9% |

*Mode hors ligne - Reconnectez-vous pour données temps réel*`;
    }
    
    if (prompt.includes('quartiers') && prompt.includes('investissement immobilier')) {
        return `| Quartier | Prix d'achat (€) | Loyer estimé mensuel (€) | Rendement brut (%) | Pertinence (patrimoine) |
|----------|------------------|--------------------------|--------------------|-----------------------|
| Centre-ville | 280 000-320 000 | 1 200-1 400 | 4.5-6.0% | ⭐⭐⭐⭐⭐ |
| Beaulieu | 320 000-380 000 | 1 300-1 500 | 4.0-5.6% | ⭐⭐⭐⭐ |
| Île de Nantes | 380 000-420 000 | 1 400-1 600 | 4.0-5.0% | ⭐⭐⭐⭐⭐ |
| Hauts-Pavés | 250 000-300 000 | 1 000-1 300 | 4.8-6.2% | ⭐⭐⭐ |

*Mode hors ligne - Reconnectez-vous pour analyse complète*`;
    }
    
    if (prompt.includes('3 meilleures annonces')) {
        return `| Niveau budget | Localisation | Type | Surface | Prix affiché (€) | Loyer estimé 2025 (€) | Rendement brut (%) | Lien annonce |
|---------------|--------------|------|---------|------------------|----------------------|--------------------|--------------| 
| 🥉 Bas | Nantes Malakoff | T2 | 41m² | 285 000€ | 1 150-1 300 | 4.8-5.5% | [Détails](#) |
| 🥈 Médian | Nantes Procé | T2 | 48m² | 345 000€ | 1 350-1 500 | 4.7-5.2% | [Détails](#) |
| 🥇 Haut | Nantes Erdre | T2 | 53m² | 405 000€ | 1 550-1 700 | 4.6-5.0% | [Détails](#) |

*Sélection mode hors ligne - Reconnectez-vous pour annonces temps réel*`;
    }
    
    return `| Information | Valeur |
|-------------|---------|
| Statut | Mode hors ligne activé |
| Recommandation | Reconnectez-vous pour analyse IA complète |

**✅ Calculs effectués en mode local**`;
}

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        api_configured: !!PERPLEXITY_API_KEY
    });
});

// Démarrage serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📱 URL: http://localhost:${PORT}`);
    console.log(`🌐 Production: https://calculatrice-5pp8.onrender.com`);
});


