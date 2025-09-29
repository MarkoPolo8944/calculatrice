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
            'neuf': 0.025
        };
        
        this.tauxHonoraires = 0.084;
        
        // Frais d'agence immobilière
        this.fraisAgence = {
            'bas': 0.04,
            'haut': 0.10
        };
        
        // Configuration API Perplexity
        this.API_KEY = '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'; // Remplacez par votre clé API
        this.API_URL = 'https://api.perplexity.ai/chat/completions';
        
        // Base de données prix marché (backup si API échoue)
        this.prixMarche = {
            'Paris': { min: 8000, max: 15000 },
            'Lyon': { min: 4500, max: 7000 },
            'Marseille': { min: 3000, max: 5500 },
            'Toulouse': { min: 3500, max: 5800 },
            'Nice': { min: 4800, max: 8500 },
            'Nantes': { min: 3800, max: 6000 },
            'Bordeaux': { min: 4200, max: 6800 },
            'Lille': { min: 2800, max: 4500 },
            'Montpellier': { min: 3200, max: 5200 }
        };
        
        this.loyersMarche = {
            'Paris': { min: 30, max: 45 },
            'Lyon': { min: 14, max: 20 },
            'Marseille': { min: 12, max: 18 },
            'Toulouse': { min: 13, max: 19 },
            'Nice': { min: 16, max: 24 },
            'Nantes': { min: 12, max: 18 },
            'Bordeaux': { min: 13, max: 19 },
            'Lille': { min: 11, max: 16 },
            'Montpellier': { min: 12, max: 17 }
        };
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        const form = document.getElementById('calculatorForm');
        const benchmarkBtn = document.getElementById('benchmarkBtn');
        
        form.addEventListener('submit', (e) => this.handleCalculation(e));
        benchmarkBtn.addEventListener('click', () => this.getBenchmarkSequential());
    }
    
    handleCalculation(e) {
        e.preventDefault();
        
        const data = {
            budgetClient: parseInt(document.getElementById('budgetClient').value),
            budgetTravaux: parseInt(document.getElementById('budgetTravaux').value) || 0,
            projet: document.getElementById('projet').value,
            typeBien: document.getElementById('typeBien').value,
            ville: document.getElementById('ville').value,
            typologie: document.getElementById('typologie').value,
            typeRenovation: document.getElementById('typeRenovation').value
        };
        
        const results = this.calculate(data);
        this.displayResults(results, data);
    }
    
    calculate(data) {
        const surface = this.surfaces[data.typologie];
        const ville = this.findClosestCity(data.ville);
        
        // Prix d'achat marché
        const prixMin = (this.prixMarche[ville]?.min || 3000) * surface;
        const prixMax = (this.prixMarche[ville]?.max || 6000) * surface;
        
        // Calculs pour fourchette basse
        const calculsBas = this.calculateForPrice(prixMin, data, surface);
        
        // Calculs pour fourchette haute  
        const calculsHaut = this.calculateForPrice(prixMax, data, surface);
        
        // Loyers estimés
        const loyerMin = (this.loyersMarche[ville]?.min || 12) * surface;
        const loyerMax = (this.loyersMarche[ville]?.max || 18) * surface;
        
        return {
            prixAchat: { min: prixMin, max: prixMax },
            fraisNotaire: { min: calculsBas.fraisNotaire, max: calculsHaut.fraisNotaire },
            honorairesAgence: { min: calculsBas.honorairesAgence, max: calculsHaut.honorairesAgence },
            fraisAgenceImmo: { min: calculsBas.fraisAgenceImmo, max: calculsHaut.fraisAgenceImmo },
            travaux: calculsBas.travaux,
            coutHT: { min: calculsBas.coutHT, max: calculsHaut.coutHT },
            coutTTC: { min: calculsBas.coutTTC, max: calculsHaut.coutTTC },
            loyerMensuel: { min: loyerMin, max: loyerMax },
            rentabiliteHT: { 
                min: this.calculateRentability(loyerMin, calculsHaut.coutHT), 
                max: this.calculateRentability(loyerMax, calculsBas.coutHT) 
            },
            rentabiliteTTC: { 
                min: this.calculateRentability(loyerMin, calculsHaut.coutTTC), 
                max: this.calculateRentability(loyerMax, calculsBas.coutTTC) 
            },
            surface: surface,
            ville: ville,
            budgetNetVendeur: this.calculateBudgetNetVendeur(data.budgetClient, data.typeBien)
        };
    }
    
    calculateForPrice(prix, data, surface) {
        const fraisNotaire = prix * this.tauxNotaire[data.typeBien];
        const honorairesAgence = prix * this.tauxHonoraires;
        const fraisAgenceImmoMin = prix * this.fraisAgence.bas;
        const fraisAgenceImmoMax = prix * this.fraisAgence.haut;
        const fraisAgenceImmo = { min: fraisAgenceImmoMin, max: fraisAgenceImmoMax };
        const travaux = surface * this.coutTravaux[data.typeRenovation];
        
        const coutHTMin = prix + fraisNotaire + honorairesAgence + fraisAgenceImmoMin;
        const coutHTMax = prix + fraisNotaire + honorairesAgence + fraisAgenceImmoMax;
        const coutHT = prix + fraisNotaire + honorairesAgence + ((fraisAgenceImmoMin + fraisAgenceImmoMax) / 2);
        
        const coutTTC = coutHT + travaux;
        
        return { 
            fraisNotaire, 
            honorairesAgence, 
            fraisAgenceImmo, 
            travaux, 
            coutHT, 
            coutTTC 
        };
    }
    
    calculateRentability(loyerMensuel, coutTotal) {
        return ((loyerMensuel * 12) / coutTotal * 100);
    }
    
    calculateBudgetNetVendeur(budgetClient, typeBien) {
        const tauxNotaire = this.tauxNotaire[typeBien];
        const tauxFraisAgenceMoyen = (this.fraisAgence.bas + this.fraisAgence.haut) / 2;
        const tauxTotal = 1 + tauxNotaire + this.tauxHonoraires + tauxFraisAgenceMoyen;
        return budgetClient / tauxTotal;
    }
    
    findClosestCity(ville) {
        const villeKey = Object.keys(this.prixMarche).find(key => 
            key.toLowerCase().includes(ville.toLowerCase()) || 
            ville.toLowerCase().includes(key.toLowerCase())
        );
        return villeKey || 'Lyon'; // Valeur par défaut
    }
    
    displayResults(results, data) {
        const resultsContainer = document.getElementById('results');
        const calculationResults = document.getElementById('calculationResults');
        const benchmarkBtn = document.getElementById('benchmarkBtn');
        
        calculationResults.innerHTML = `
            <div class="result-card">
                <h3>🏠 Prix d'achat</h3>
                <div class="result-value">${this.formatPrice(results.prixAchat.min)} - ${this.formatPrice(results.prixAchat.max)}</div>
                <div class="result-range">Fourchette marché ${results.ville}</div>
            </div>
            
            <div class="result-card">
                <h3>📋 Frais de notaire</h3>
                <div class="result-value">${this.formatPrice(results.fraisNotaire.min)} - ${this.formatPrice(results.fraisNotaire.max)}</div>
                <div class="result-range">${data.typeBien === 'ancien' ? '7,5%' : '2,5%'} du prix d'achat</div>
            </div>
            
            <div class="result-card">
                <h3>🤝 Honoraires d'agence</h3>
                <div class="result-value">${this.formatPrice(results.honorairesAgence.min)} - ${this.formatPrice(results.honorairesAgence.max)}</div>
                <div class="result-range">8,4% du prix d'achat</div>
            </div>
            
            <div class="result-card">
                <h3>🏢 Frais d'agence immobilière</h3>
                <div class="result-value">${this.formatPrice(results.fraisAgenceImmo.min)} - ${this.formatPrice(results.fraisAgenceImmo.max)}</div>
                <div class="result-range">4% - 10% du prix d'achat</div>
            </div>
            
            <div class="result-card">
                <h3>🔨 Travaux estimés</h3>
                <div class="result-value">${this.formatPrice(results.travaux)}</div>
                <div class="result-range">${results.surface}m² × ${this.coutTravaux[data.typeRenovation]}€/m²</div>
            </div>
            
            <div class="result-card">
                <h3>💰 Coût total HT</h3>
                <div class="result-value">${this.formatPrice(results.coutHT.min)} - ${this.formatPrice(results.coutHT.max)}</div>
                <div class="result-range">Prix + Notaire + Honoraires + Agence</div>
            </div>
            
            <div class="result-card">
                <h3>💯 Coût total TTC</h3>
                <div class="result-value">${this.formatPrice(results.coutTTC.min)} - ${this.formatPrice(results.coutTTC.max)}</div>
                <div class="result-range">Avec travaux inclus</div>
            </div>
            
            <div class="result-card">
                <h3>🏠 Loyer mensuel estimé</h3>
                <div class="result-value">${this.formatPrice(results.loyerMensuel.min)} - ${this.formatPrice(results.loyerMensuel.max)}</div>
                <div class="result-range">Fourchette marché ${results.ville}</div>
            </div>
            
            <div class="result-card">
                <h3>💼 Budget net vendeur</h3>
                <div class="result-value">${this.formatPrice(results.budgetNetVendeur)}</div>
                <div class="result-range">Budget disponible achat</div>
            </div>
            
            <div class="result-card">
                <h3>📈 Rentabilité brute HT</h3>
                <div class="result-value ${this.getRentabilityClass(results.rentabiliteHT.min)}">${results.rentabiliteHT.min.toFixed(2)}% - ${results.rentabiliteHT.max.toFixed(2)}%</div>
                <div class="result-range">Hors travaux</div>
            </div>
            
            <div class="result-card">
                <h3>📊 Rentabilité brute TTC</h3>
                <div class="result-value ${this.getRentabilityClass(results.rentabiliteTTC.min)}">${results.rentabiliteTTC.min.toFixed(2)}% - ${results.rentabiliteTTC.max.toFixed(2)}%</div>
                <div class="result-range">Avec travaux inclus</div>
            </div>
        `;
        
        // Stocker les données pour le benchmark
        this.currentData = data;
        this.currentResults = results;
        
        resultsContainer.style.display = 'block';
        benchmarkBtn.style.display = 'block';
        
        // Scroll vers les résultats
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    async getBenchmarkSequential() {
        const loading = document.getElementById('loading');
        const benchmarkResults = document.getElementById('benchmarkResults');
        const benchmarkContent = document.getElementById('benchmarkContent');
        
        loading.style.display = 'flex';
        
        try {
            benchmarkContent.innerHTML = `
                <div class="benchmark-intro">
                    <h4>💡 Budget Net Vendeur Maximum: ${this.formatPrice(this.currentResults.budgetNetVendeur)}</h4>
                    <p>Budget total: ${this.formatPrice(this.currentData.budgetClient)} - Ville: ${this.currentData.ville} - Type: ${this.currentData.typologie} - Objectif: ${this.currentData.projet}</p>
                </div>
                <div id="analysisResults" class="analysis-container">
                    <div class="analysis-step">
                        <h4>🔍 Étape 1 : Recherche d'annonces correspondantes...</h4>
                        <div id="step1Result" class="step-result loading-step">En cours...</div>
                    </div>
                </div>
            `;
            
            benchmarkResults.style.display = 'block';
            benchmarkResults.scrollIntoView({ behavior: 'smooth' });
            
            // Étape 1 : Recherche d'annonces
            console.log('🔍 Appel API Étape 1...');
            const prompt1 = this.createPrompt1();
            const result1 = await this.callPerplexityAPI(prompt1);
            document.getElementById('step1Result').innerHTML = this.formatBenchmarkResponse(result1);
            document.getElementById('step1Result').classList.remove('loading-step');
            
            // Ajouter étape 2
            document.getElementById('analysisResults').innerHTML += `
                <div class="analysis-step">
                    <h4>🏘️ Étape 2 : Analyse des quartiers...</h4>
                    <div id="step2Result" class="step-result loading-step">En cours...</div>
                </div>
            `;
            
            await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre appels
            
            console.log('🏘️ Appel API Étape 2...');
            const prompt2 = this.createPrompt2();
            const result2 = await this.callPerplexityAPI(prompt2);
            document.getElementById('step2Result').innerHTML = this.formatBenchmarkResponse(result2);
            document.getElementById('step2Result').classList.remove('loading-step');
            
            // Ajouter étape 3
            document.getElementById('analysisResults').innerHTML += `
                <div class="analysis-step">
                    <h4>🎯 Étape 3 : Top 3 des meilleures opportunités...</h4>
                    <div id="step3Result" class="step-result loading-step">En cours...</div>
                </div>
            `;
            
            await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre appels
            
            console.log('🎯 Appel API Étape 3...');
            const prompt3 = this.createPrompt3();
            const result3 = await this.callPerplexityAPI(prompt3);
            document.getElementById('step3Result').innerHTML = this.formatBenchmarkResponse(result3);
            document.getElementById('step3Result').classList.remove('loading-step');
            
            console.log('✅ Toutes les étapes terminées avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'analyse:', error);
            benchmarkContent.innerHTML = `
                <div class="error-message">
                    <h4>❌ Erreur lors de l'analyse marché</h4>
                    <p>Impossible de récupérer les données du marché en temps réel. Veuillez réessayer.</p>
                    <p><strong>Détail:</strong> ${error.message}</p>
                </div>
            `;
            benchmarkResults.style.display = 'block';
        }
        
        loading.style.display = 'none';
    }
    
    createPrompt1() {
        return `Agis comme un **chasseur immobilier expert**.  
Ta mission est de proposer uniquement des **tableaux comparatifs d'annonces immobilières** correspondant au profil client.  
⚠️ Tu dois fournir UNIQUEMENT des tableaux, sans aucun texte explicatif.  

### DONNÉES CLIENT ###
- Budget global: ${this.formatPrice(this.currentData.budgetClient)} (incluant prix, notaire ${this.currentData.typeBien === 'ancien' ? '7,5%' : '2,5%'}, honoraires 8,4%, frais d'agence 4-10%).  
- Budget travaux additionnel: ${this.formatPrice(this.currentData.budgetTravaux)}
- Ville: ${this.currentData.ville}
- Typologie souhaitée: ${this.currentData.typologie}
- Objectif: ${this.currentData.projet}

### MÉTHODE ###
1. Convertis le budget global en **budget net vendeur maximum**: ${this.formatPrice(this.currentResults.budgetNetVendeur)}
2. Recherche **3 annonces représentatives par secteur** (bas, médian, haut).  
   - Inclure surface, prix affiché, lien annonce.  
   - Inclure estimation loyers 2025 (fourchette basse/haute) basée sur loyers au m² + annonces locatives réelles.  
   - Calculer la rentabilité brute (fourchette basse/haute).  
3. Si plusieurs secteurs sont pertinents, produire **plusieurs tableaux distincts** (1 tableau par secteur).  

### FORMAT ATTENDU ###
- Tableaux uniquement, sans aucun texte explicatif.  

| Niveau budget | Localisation (secteur) | Type | Surface | Prix affiché (€) | Lien annonce | Loyer estimé 2025 (fourchette €/mois) | Rendement brut estimé (%) |

⚠️ Important :
- Toujours donner **3 annonces par secteur** (bas, médian, haut).  
- Fournir **plusieurs tableaux si plusieurs secteurs**.  
- Indiquer les loyers sous forme de fourchette (basse/haute).  
- Indiquer la rentabilité brute sous forme de fourchette.`;
    }
    
    createPrompt2() {
        return `Agis comme un **expert en investissement immobilier**.  
Ta mission est d'analyser une **ville et ses quartiers** en fonction du **budget du client** et de son **projet**.  
⚠️ Fournis UNIQUEMENT des tableaux, sans aucun texte explicatif.

### DONNÉES CLIENT ###
- Ville: ${this.currentData.ville}
- Budget global: ${this.formatPrice(this.currentData.budgetClient)} (incluant frais de notaire ${this.currentData.typeBien === 'ancien' ? '7,5%' : '2,5%'} + honoraires 8,4% + frais d'agence 4-10%)
- Budget net vendeur: ${this.formatPrice(this.currentResults.budgetNetVendeur)}
- Projet: ${this.currentData.projet}
- Typologie: ${this.currentData.typologie}

### MÉTHODE ###
1. Identifier les **quartiers principaux de ${this.currentData.ville}**.  
2. Pour chaque quartier, indiquer :  
   - Prix d'achat moyen (basse/haute, basé sur annonces actuelles 2025)  
   - Loyer mensuel moyen estimé (basse/haute, 2025)  
   - Rendement brut (%) calculé à partir du budget global et des loyers.  
3. Adapter les résultats selon l'objectif **${this.currentData.projet}**.

### FORMAT ATTENDU ###
Un tableau unique au format suivant :  

| Quartier | Prix d'achat (basse/haute) | Loyer estimé mensuel (basse/haute) | Rendement brut (%) (basse/haute) | Pertinence (${this.currentData.projet}) |

⚠️ Contraintes :  
- Toujours donner des fourchettes (prix, loyers, rendement).  
- Basé uniquement sur données et annonces récentes (2025).  
- Résultat = TABLEAU UNIQUEMENT, aucun texte commentaire.`;
    }
    
    createPrompt3() {
        return `Agis comme un **chasseur immobilier expert**.  
Ta mission est de trouver les **3 meilleures annonces immobilières récentes** correspondant au budget donné par le client.  
⚠️ Fournis UNIQUEMENT un tableau, sans aucun texte ni commentaire.

### DONNÉES CLIENT ###
- Ville: ${this.currentData.ville}
- Budget global: ${this.formatPrice(this.currentData.budgetClient)} (incluant prix, notaire ${this.currentData.typeBien === 'ancien' ? '7,5%' : '2,5%'}, honoraires 8,4%, frais d'agence 4-10%)
- Budget net vendeur maximum: ${this.formatPrice(this.currentResults.budgetNetVendeur)}
- Typologie souhaitée: ${this.currentData.typologie}
- Objectif: ${this.currentData.projet}

### MÉTHODE ###
1. Sélectionner **3 annonces représentatives** dans le budget net vendeur :  
   - Bas du budget (≈ ${this.formatPrice(this.currentResults.budgetNetVendeur * 0.7)})
   - Médian du budget (≈ ${this.formatPrice(this.currentResults.budgetNetVendeur * 0.85)})
   - Haut du budget (≈ ${this.formatPrice(this.currentResults.budgetNetVendeur)})
2. Inclure seulement les **informations essentielles**.

### FORMAT ATTENDU ###
Un tableau unique au format suivant :  

| Niveau budget | Localisation | Type | Surface | Prix affiché (€) | Loyer estimé 2025 (€) | Rendement brut estimé (%) | Lien annonce |

⚠️ Contraintes :  
- 3 lignes exactement (bas, moyen, haut).  
- Les loyers doivent être cohérents avec le marché locatif 2025.  
- Inclure le **lien direct** vers l'annonce.  
- Résultat = UNIQUEMENT le tableau, pas de texte additionnel.`;
    }
    
    async callPerplexityAPI(prompt) {
    console.log('📡 Appel API Perplexity via serveur...');
    console.log('📋 Prompt reçu (type):', typeof prompt);
    console.log('📋 Prompt reçu (longueur):', prompt?.length || 'undefined');
    console.log('📋 Prompt préview:', prompt?.substring(0, 100) || 'VIDE');
    
    // Validation du prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        console.error('❌ Prompt invalide:', { prompt, type: typeof prompt });
        throw new Error('Prompt requis et non vide');
    }

    try {
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
            max_tokens: 8000
        };

        console.log('📤 Payload complet à envoyer:', JSON.stringify(payload, null, 2));

        const response = await fetch('/api/perplexity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📨 Statut HTTP serveur:', response.status);
        console.log('📨 Headers réponse:', [...response.headers.entries()]);
        
        // Vérifier si la réponse est du JSON valide
        const textResponse = await response.text();
        console.log('📨 Réponse brute serveur:', textResponse);
        
        let data;
        try {
            data = JSON.parse(textResponse);
        } catch (parseError) {
            console.error('❌ Erreur parsing JSON:', parseError);
            throw new Error(`Réponse serveur non-JSON: ${textResponse.substring(0, 200)}`);
        }
        
        console.log('📋 Données parsées:', data);
        
        // Gestion des réponses
        if (data.fallback || !data.success) {
            console.warn('⚠️ Mode fallback activé:', data.error);
            return data.content || 'Données indisponibles temporairement';
        }
        
        if (!data.content) {
            console.error('❌ Pas de contenu dans la réponse:', data);
            throw new Error('Réponse serveur sans contenu');
        }

        console.log('✅ Contenu reçu (longueur):', data.content.length);
        return data.content;
        
    } catch (error) {
        console.error('❌ Erreur complète:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw new Error(`Erreur API: ${error.message}`);
    }
}

    
    formatBenchmarkResponse(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const tableLines = lines.filter(line => line.includes('|'));
        
        if (tableLines.length === 0) {
            return `<div class="benchmark-text">${content.replace(/\n/g, '<br>')}</div>`;
        }
        
        let html = '<table class="benchmark-table">';
        
        tableLines.forEach((line, index) => {
            if (index === 1 && line.includes('---')) return; // Ignorer la ligne de séparation markdown
            
            const cells = line.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
            const tag = index === 0 ? 'th' : 'td';
            
            html += '<tr>';
            cells.forEach(cell => {
                // Transformer les liens markdown en liens HTML
                const processedCell = cell.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
                html += `<${tag}>${processedCell}</${tag}>`;
            });
            html += '</tr>';
        });
        
        html += '</table>';
        return html;
    }
    
    formatPrice(price) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(price);
    }
    
    getRentabilityClass(rate) {
        return rate >= 4 ? 'rentability-positive' : 'rentability-negative';
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    new CalculatriceImmobiliere();
});
