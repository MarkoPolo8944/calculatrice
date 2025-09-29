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

// Route API Perplexity - VERSION CORRIGÉE
app.post('/api/perplexity', async (req, res) => {
    console.log('📡 Route /api/perplexity appelée');
    console.log('📦 Body reçu:', JSON.stringify(req.body, null, 2));
    
    try {
        const { model, messages, temperature, max_tokens } = req.body;
        
        // Validation du payload
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error('❌ Messages manquants ou invalides');
            return res.json({
                success: false,
                fallback: true,
                error: 'Messages requis dans le format messages[]',
                content: getFallbackContent('')
            });
        }

        // Extraire le prompt du message utilisateur
        const userMessage = messages.find(msg => msg.role === 'user');
        if (!userMessage || !userMessage.content || userMessage.content.trim() === '') {
            console.error('❌ Contenu utilisateur manquant');
            return res.json({
                success: false,
                fallback: true,
                error: 'Contenu utilisateur requis',
                content: getFallbackContent('')
            });
        }

        const prompt = userMessage.content.trim();
        console.log('✅ Prompt extrait (100 chars):', prompt.substring(0, 100) + '...');

        // Mode fallback direct si API non configurée
        if (!PERPLEXITY_API_KEY || PERPLEXITY_API_KEY.length < 20) {
            console.warn('⚠️ API Key insuffisante, mode fallback direct');
            return res.json({
                success: false,
                fallback: true,
                error: 'Mode hors ligne',
                content: getFallbackContent(prompt)
            });
        }

        // Appel API Perplexity
        console.log('🚀 Tentative appel API Perplexity...');
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
            console.log(`❌ API Error ${response.status}, fallback activé`);
            return res.json({
                success: false,
                fallback: true,
                error: `API Error ${response.status}`,
                content: getFallbackContent(prompt)
            });
        }

        const data = await response.json();
        console.log('✅ Réponse API reçue avec succès');

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.log('❌ Réponse API malformée, fallback activé');
            return res.json({
                success: false,
                fallback: true,
                error: 'Réponse API invalide',
                content: getFallbackContent(prompt)
            });
        }

        // Succès !
        res.json({
            success: true,
            content: data.choices[0].message.content,
            usage: data.usage
        });

    } catch (error) {
        console.error('❌ Erreur serveur complète:', error.message);
        
        // Toujours renvoyer du fallback en cas d'erreur
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

// Fonction fallback robuste
function getFallbackContent(prompt) {
    console.log('🎭 Génération contenu fallback...');
    
    if (prompt.includes('chasseur immobilier') || prompt.includes('Étape 1')) {
        return `| Niveau budget | Localisation (secteur) | Type | Surface | Prix affiché (€) | Lien annonce | Loyer estimé 2025 (€/mois) | Rendement brut (%) |
|---------------|------------------------|------|---------|------------------|--------------|----------------------------|-------------------|
| 🥉 Bas | Nantes Malakoff | T2 | 42m² | 180 000€ | [Voir SeLoger](#) | 1000-1200 | 6.7-8.0% |
| 🥈 Médian | Nantes Procé | T2 | 45m² | 190 000€ | [Voir LeBonCoin](#) | 1100-1300 | 6.9-8.2% |
| 🥇 Haut | Nantes Centre | T2 | 48m² | 200 000€ | [Voir PAP](#) | 1200-1400 | 7.2-8.4% |

*Mode démonstration - Reconnectez-vous pour données temps réel*`;
    }
    
    if (prompt.includes('quartiers') || prompt.includes('Étape 2')) {
        return `| Quartier | Prix d'achat (€) | Loyer estimé mensuel (€) | Rendement brut (%) | Pertinence (patrimoine) |
|----------|------------------|--------------------------|--------------------|-----------------------|
| Malakoff | 170000-190000 | 950-1150 | 6.0-8.1% | ⭐⭐⭐⭐ |
| Procé | 180000-200000 | 1050-1250 | 6.3-8.3% | ⭐⭐⭐⭐⭐ |
| Centre-ville | 190000-210000 | 1150-1350 | 6.5-8.5% | ⭐⭐⭐⭐⭐ |
| Bottière | 160000-180000 | 900-1100 | 6.1-8.3% | ⭐⭐⭐ |

*Mode hors ligne - Reconnectez-vous pour analyse complète*`;
    }
    
    if (prompt.includes('3 meilleures') || prompt.includes('Étape 3')) {
        return `| Niveau budget | Localisation | Type | Surface | Prix affiché (€) | Loyer estimé 2025 (€) | Rendement brut (%) | Lien annonce |
|---------------|--------------|------|---------|------------------|----------------------|--------------------|--------------|
| 🥉 Bas | Nantes Malakoff | T2 | 41m² | 175000€ | 1050-1200 | 7.2-8.2% | [Détails](#) |
| 🥈 Médian | Nantes Procé | T2 | 44m² | 185000€ | 1150-1300 | 7.4-8.4% | [Détails](#) |
| 🥇 Haut | Nantes Centre | T2 | 47m² | 195000€ | 1250-1400 | 7.7-8.6% | [Détails](#) |

*Sélection mode hors ligne - Reconnectez-vous pour annonces temps réel*`;
    }
    
    return `| Information | Valeur |
|-------------|---------|
| Mode | Hors ligne activé |
| Recommandation | Vérifiez votre connexion |

**✅ Données calculées localement**`;
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
    console.log(`🌐 Production: https://votre-app.onrender.com`);
});

"Fix: Correction route API Perplexity"
