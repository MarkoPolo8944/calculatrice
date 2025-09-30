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
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

console.log('🔧 Configuration serveur:');
console.log(`   PORT: ${PORT}`);
console.log(`   API Key configurée: ${PERPLEXITY_API_KEY ? '✅' : '❌'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

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
        
        // Validation stricte du payload
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

        // Vérification stricte clé API
        if (!PERPLEXITY_API_KEY || PERPLEXITY_API_KEY === 'your_key_here' || PERPLEXITY_API_KEY.length < 20) {
            console.warn('⚠️ Clé API invalide ou manquante');
            return res.status(500).json({
                success: false,
                error: 'Clé API Perplexity non configurée ou invalide'
            });
        }

        // Appel API Perplexity
        console.log('🚀 Appel API Perplexity...');
        const apiPayload = {
            model: model || 'llama-3.1-sonar-large-128k-online',
            messages: messages,
            temperature: temperature || 0.7,
            max_tokens: max_tokens || 8000,
            stream: false
        };

        console.log('📤 Payload API:', JSON.stringify(apiPayload, null, 2));

        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'CalculatriceImmobiliere/1.0'
            },
            body: JSON.stringify(apiPayload),
            timeout: 30000 // 30 secondes
        });

        console.log('📨 Statut API:', response.status);
        console.log('📨 Headers API:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API Perplexity:', response.status, errorText);
            
            if (response.status === 401) {
                return res.status(401).json({
                    success: false,
                    error: 'Clé API Perplexity invalide'
                });
            }
            
            if (response.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'Limite d\'utilisation API atteinte'
                });
            }
            
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Réponse API reçue:', JSON.stringify(data, null, 2));

        // Validation de la réponse
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ Structure réponse API invalide:', data);
            throw new Error('Réponse API invalide - structure inattendue');
        }

        const content = data.choices[0].message.content;
        if (!content || content.trim() === '') {
            throw new Error('Contenu vide reçu de l\'API');
        }

        console.log('✅ Contenu validé, longueur:', content.length);

        res.json({
            success: true,
            content: content,
            usage: data.usage,
            model_used: data.model,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erreur complète API Perplexity:', error);
        
        // Retourner une erreur explicite sans fallback
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Route de test API
app.get('/api/test', async (req, res) => {
    try {
        if (!PERPLEXITY_API_KEY) {
            return res.json({
                status: 'ERROR',
                message: 'Clé API manquante',
                api_configured: false
            });
        }

        console.log('🧪 Test API Perplexity...');
        const testResponse = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'user',
                        content: 'Réponds simplement "API fonctionnelle" pour tester la connexion.'
                    }
                ],
                max_tokens: 10
            })
        });

        const testData = await testResponse.json();
        
        res.json({
            status: testResponse.ok ? 'OK' : 'ERROR',
            api_configured: true,
            api_status: testResponse.status,
            response: testResponse.ok ? testData.choices?.[0]?.message?.content : testData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.json({
            status: 'ERROR',
            message: error.message,
            api_configured: !!PERPLEXITY_API_KEY,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        api_configured: !!PERPLEXITY_API_KEY,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Gestion erreurs globales
app.use((error, req, res, next) => {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({
        success: false,
        error: 'Erreur serveur interne',
        timestamp: new Date().toISOString()
    });
});

// Démarrage serveur avec gestion erreurs
const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📱 URL locale: http://localhost:${PORT}`);
    console.log(`🌐 URL production: https://calculatrice-5pp8.onrender.com`);
    console.log(`🧪 Test API: https://calculatrice-5pp8.onrender.com/api/test`);
});

server.on('error', (error) => {
    console.error('❌ Erreur serveur:', error);
});

// Gestion arrêt propre
process.on('SIGTERM', () => {
    console.log('🔄 Arrêt serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

module.exports = app;
