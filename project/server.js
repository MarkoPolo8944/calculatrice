const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Configuration API
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';

// Route API Perplexity
app.post('/api/perplexity', async (req, res) => {
    console.log('📡 Route appelée, body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { messages } = req.body;
        
        if (!messages || !messages[1]?.content) {
            return res.status(400).json({
                success: false,
                error: 'Messages requis'
            });
        }

        const prompt = messages[1].content;
        
        // Appel API Perplexity
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        res.json({
            success: true,
            content: data.choices[0].message.content
        });

    } catch (error) {
        console.error('❌ Erreur API:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        api_key: PERPLEXITY_API_KEY ? 'Configurée' : 'Manquante',
        timestamp: new Date().toISOString()
    });
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur sur port ${PORT}`);
    console.log(`🔑 API Key: ${PERPLEXITY_API_KEY ? '✅' : '❌'}`);
});
