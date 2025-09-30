// script.js
class CalculatriceImmobiliere {
    constructor() {
        this.surfaces = {
            'T1': 25,
            'T2': 40, 
            'T3': 65,
            'T4': 90,
            'T5': 110
        };
        
        this.coutTravaux = {
            'rafraichissement': 400,
            'lourde': 1000
        };
        
        this.tauxNotaire = {
            'ancien': 0.075,
            'neuf': 0.03
        };
        
        this.init();
    }
    
    init() {
        console.log('🚀 Initialisation calculatrice...');
        
        const form = document.getElementById('calculForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.analyser();
            });
        }
        
        console.log('✅ Calculatrice initialisée');
    }
    
    // Méthode principale d'analyse
    async analyser() {
        console.log('🧮 Début analyse...');
        
        try {
            // Récupération et validation des données
            const donnees = this.collecterDonnees();
            if (!donnees) {
                console.error('❌ Données invalides');
                return;
            }
            
            console.log('📊 Données collectées:', donnees);
            
            // Affichage loading
            this.afficherLoading();
            
            // Calculs locaux
            const calculs = this.calculerRendement(donnees);
            console.log('💰 Calculs effectués:', calculs);
            
            // Génération et envoi du prompt à l'API
            const prompt = this.genererPrompt(donnees, calculs);
            console.log('📝 Prompt généré (longueur):', prompt.length);
            
            // Appel API Perplexity
            const reponseIA = await this.callPerplexityAPI(prompt);
            console.log('🤖 Réponse IA reçue (longueur):', reponseIA.length);
            
            // Affichage des résultats
            this.afficherResultats(calculs, reponseIA);
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
            this.afficherErreur(error.message);
        }
    }
    
    // Collecte des données du formulaire
    collecterDonnees() {
        const form = document.getElementById('calculForm');
        if (!form) {
            throw new Error('Formulaire non trouvé');
        }
        
        const formData = new FormData(form);
        const donnees = {
            ville: formData.get('ville')?.trim() || '',
            budget: parseInt(formData.get('budget')) || 0,
            typeLogement: formData.get('typeLogement') || '',
            typeBien: formData.get('typeBien') || 'ancien',
            travaux: formData.get('travaux') || 'aucun'
        };
        
        // Validation
        if (!donnees.ville || donnees.budget <= 0 || !donnees.typeLogement) {
            throw new Error('Veuillez remplir tous les champs obligatoires');
        }
        
        if (donnees.budget < 50000 || donnees.budget > 2000000) {
            throw new Error('Budget doit être entre 50 000€ et 2 000 000€');
        }
        
        return donnees;
    }
    
    // Calculs de rendement
    calculerRendement(donnees) {
        const surface = this.surfaces[donnees.typeLogement] || 50;
        const fraisNotaire = donnees.budget * this.tauxNotaire[donnees.typeBien];
        
        let coutTravauxTotal = 0;
        if (donnees.travaux !== 'aucun') {
            coutTravauxTotal = surface * this.coutTravaux[donnees.travaux];
        }
        
        const investissementTotal = donnees.budget + fraisNotaire + coutTravauxTotal;
        const loyerEstime = this.estimerLoyer(donnees.ville, donnees.typeLogement, surface);
        const rendementBrut = ((loyerEstime * 12) / investissementTotal) * 100;
        
        return {
            surface,
            fraisNotaire: Math.round(fraisNotaire),
            coutTravaux: Math.round(coutTravauxTotal),
            investissementTotal: Math.round(investissementTotal),
            loyerEstime: Math.round(loyerEstime),
            rendementBrut: Math.round(rendementBrut * 100) / 100
        };
    }
    
    // Estimation loyer basique
    estimerLoyer(ville, type, surface) {
        const tauxBase = {
            'paris': 35,
            'lyon': 18,
            'marseille': 15,
            'toulouse': 16,
            'nice': 20,
            'nantes': 16,
            'bordeaux': 17,
            'lille': 14
        };
        
        const taux = tauxBase[ville.toLowerCase()] || 12;
        return surface * taux;
    }
    
    // Génération du prompt pour l'IA
    genererPrompt(donnees, calculs) {
        return `Tu es un expert en investissement immobilier français. Analyse cette opportunité et réponds UNIQUEMENT avec des tableaux markdown précis.

**DONNÉES D'INVESTISSEMENT:**
- Ville: ${donnees.ville}
- Budget: ${donnees.budget.toLocaleString()}€
- Type: ${donnees.typeLogement} (${calculs.surface}m²)
- Bien: ${donnees.typeBien}
- Travaux: ${donnees.travaux}
- Investissement total: ${calculs.investissementTotal.toLocaleString()}€
- Loyer estimé: ${calculs.loyerEstime}€/mois
- Rendement brut: ${calculs.rendementBrut}%

**DEMANDE PRÉCISE:**
Crée 3 tableaux markdown distincts:

1. **Analyse de quartiers** (Format: | Quartier | Prix moyen €/m² | Loyer moyen €/m² | Rendement estimé | Note investissement |)

2. **3 meilleures annonces actuelles** (Format: | Rang | Adresse | Prix | Surface | Loyer potentiel | Rendement | Lien |)

3. **Synthèse recommandations** (Format: | Critère | Évaluation | Recommandation |)

Utilise des données réelles du marché ${new Date().getFullYear()} pour ${donnees.ville}. Sois précis et factuel.`;
    }
    
    // Appel API Perplexity
    async callPerplexityAPI(prompt) {
        console.log('📡 Appel API Perplexity...');
        
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            throw new Error('Prompt invalide ou vide');
        }
        
        const payload = {
            model: 'sonar-deep-research',
            messages: [
                {
                    role: 'system',
                    content: 'Tu es un expert en immobilier français. Réponds uniquement avec des tableaux markdown précis et des données réelles du marché 2025.'
                },
                {
                    role: 'user',
                    content: prompt.trim()
                }
            ],
            temperature: 0.7,
            max_tokens: 4000
        };
        
        console.log('📦 Payload préparé:', JSON.stringify(payload, null, 2));
        
        try {
            const response = await fetch('/api/perplexity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('📡 Statut réponse:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📨 Réponse reçue:', data);
            
            if (data.success === true && data.content) {
                console.log('✅ Contenu API récupéré');
                return data.content;
            }
            
            throw new Error(data.error || 'Réponse API invalide');
            
        } catch (error) {
            console.error('❌ Erreur appel API:', error);
            throw new Error(`API indisponible: ${error.message}`);
        }
    }
    
    // Affichage loading
    afficherLoading() {
        const resultatsDiv = document.getElementById('resultats');
        if (resultatsDiv) {
            resultatsDiv.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>🤖 Analyse en cours avec l'IA...</p>
                    <small>Recherche des meilleures opportunités</small>
                </div>
            `;
            resultatsDiv.style.display = 'block';
        }
    }
    
    // Affichage des résultats
    afficherResultats(calculs, reponseIA) {
        const resultatsDiv = document.getElementById('resultats');
        if (!resultatsDiv) return;
        
        const html = `
            <div class="resultats-container">
                <h2>📊 Résultats d'Analyse</h2>
                
                <div class="calculs-rapides">
                    <div class="metric">
                        <span class="label">💰 Investissement total</span>
                        <span class="value">${calculs.investissementTotal.toLocaleString()}€</span>
                    </div>
                    <div class="metric">
                        <span class="label">🏠 Loyer estimé</span>
                        <span class="value">${calculs.loyerEstime}€/mois</span>
                    </div>
                    <div class="metric">
                        <span class="label">📈 Rendement brut</span>
                        <span class="value ${calculs.rendementBrut >= 5 ? 'bon' : calculs.rendementBrut >= 3 ? 'moyen' : 'faible'}">${calculs.rendementBrut}%</span>
                    </div>
                </div>
                
                <div class="analyse-ia">
                    <h3>🤖 Analyse IA Perplexity</h3>
                    <div class="contenu-ia">
                        ${this.formaterReponseIA(reponseIA)}
                    </div>
                </div>
                
                <div class="actions">
                    <button onclick="window.print()" class="btn-print">🖨️ Imprimer</button>
                    <button onclick="this.nouvelleAnalyse()" class="btn-nouveau">🔄 Nouvelle analyse</button>
                </div>
            </div>
        `;
        
        resultatsDiv.innerHTML = html;
        resultatsDiv.style.display = 'block';
        resultatsDiv.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Formatage de la réponse IA
    formaterReponseIA(texte) {
        if (!texte || typeof texte !== 'string') {
            return '<p class="erreur">Réponse IA non disponible</p>';
        }
        
        // Conversion markdown vers HTML basique
        let html = texte
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        // Amélioration des tableaux
        html = html.replace(/\|/g, '</td><td>').replace(/<td>/g, '<td>', 1);
        
        return `<div class="reponse-formatee">${html}</div>`;
    }
    
    // Affichage erreur
    afficherErreur(message) {
        const resultatsDiv = document.getElementById('resultats');
        if (resultatsDiv) {
            resultatsDiv.innerHTML = `
                <div class="erreur-container">
                    <h3>❌ Erreur</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-retry">🔄 Réessayer</button>
                </div>
            `;
            resultatsDiv.style.display = 'block';
        }
    }
    
    // Nouvelle analyse
    nouvelleAnalyse() {
        const resultatsDiv = document.getElementById('resultats');
        if (resultatsDiv) {
            resultatsDiv.style.display = 'none';
            resultatsDiv.innerHTML = '';
        }
        
        const form = document.getElementById('calculForm');
        if (form) {
            form.reset();
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM chargé, initialisation...');
    
    try {
        window.calculatrice = new CalculatriceImmobiliere();
        console.log('✅ Application initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});

// Gestion erreurs globales
window.addEventListener('error', (event) => {
    console.error('❌ Erreur JavaScript:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise rejetée:', event.reason);
});
