// Service pour gérer les appels API - v20251014-fixed-v3
class ApiService {
    constructor() {
        // Détection automatique de l'environnement
        const currentPort = window.location.port;
        const currentHost = window.location.hostname;
        
        // Si on est en production (sans port ou port 80/443), utiliser le proxy Nginx
        if (!currentPort || currentPort === '80' || currentPort === '443') {
            // Environnement de production - utiliser le proxy Nginx
            this.baseUrl = `${window.location.protocol}//${window.location.host}/api`;
        } else if (currentPort === '8080' && currentHost === 'localhost') {
            // Environnement de développement local - frontend sur 8080, backend sur 3001
            this.baseUrl = `http://localhost:3001/api`;
        } else {
            // Environnement de production avec port 8080 - utiliser le proxy Nginx
            this.baseUrl = `${window.location.protocol}//${window.location.host}/api`;
        }
        
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        // Rate limiting côté client
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 100ms minimum entre les requêtes
        
        console.log(`🔗 ApiService configuré pour: ${this.baseUrl}`);
    }

    // Méthode générique pour les requêtes avec rate limiting
    async request(endpoint, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ endpoint, options, resolve, reject });
            this.processQueue();
        });
    }

    // Traitement de la file d'attente avec rate limiting
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.minRequestInterval) {
                await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
            }

            const { endpoint, options, resolve, reject } = this.requestQueue.shift();
            this.lastRequestTime = Date.now();

            try {
                const result = await this.executeRequest(endpoint, options);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.isProcessing = false;
    }

    // Exécution réelle de la requête
    async executeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                // Gestion spéciale pour l'erreur 429
                if (response.status === 429) {
                    console.warn(`⚠️ Rate limit atteint pour ${endpoint}, attente de 3 secondes...`);
                    
                    // Essayer de récupérer le message d'erreur du serveur
                    let errorMessage = 'Trop de requêtes, veuillez patienter';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        // Ignorer si on ne peut pas parser le JSON
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // Retry une fois
                    console.log(`🔄 Retry pour ${endpoint}...`);
                    const retryResponse = await fetch(url, config);
                    if (!retryResponse.ok) {
                        if (retryResponse.status === 429) {
                            throw new Error(errorMessage);
                        }
                        throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                    }
                    return await retryResponse.json();
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erreur API ${endpoint}:`, error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url);
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Vérifier la santé du serveur
    async healthCheck() {
        return this.get('/health');
    }

    // Authentification admin
    async adminLogin(username, password) {
        return this.post('/auth/login', { username, password });
    }

    async adminLogout() {
        return this.post('/auth/logout');
    }

    async verifyAdmin() {
        return this.get('/auth/verify');
    }

    // Opérateurs
    async getOperator(code) {
        return this.get(`/operators/${code}`);
    }

    async getAllOperators() {
        return this.get('/operators');
    }

    async createOperator(operatorData) {
        return this.post('/operators', operatorData);
    }

    async updateOperator(code, operatorData) {
        return this.put(`/operators/${code}`, operatorData);
    }

    async deleteOperator(code) {
        return this.delete(`/operators/${code}`);
    }

    // Lancements
    async getLancements(search = '', limit = 100) {
        return this.get('/lancements', { search, limit });
    }

    async getLancement(code) {
        return this.get(`/operators/lancement/${code}`);
    }

    async getActiveLancements() {
        return this.get('/lancements/active');
    }

    async getLancementsByOperator(operatorId, date = null) {
        return this.get(`/lancements/by-operator/${operatorId}`, { date });
    }

    async createLancement(lancementData) {
        return this.post('/lancements', lancementData);
    }

    async updateLancement(code, lancementData) {
        return this.put(`/lancements/${code}`, lancementData);
    }

    // Opérations
    async startOperation(operatorId, lancementCode) {
        return this.post('/operators/start', { operatorId, lancementCode });
    }

    async pauseOperation(operatorId, lancementCode) {
        return this.post('/operators/pause', { operatorId, lancementCode });
    }

    async resumeOperation(operatorId, lancementCode) {
        return this.post('/operators/resume', { operatorId, lancementCode });
    }

    async stopOperation(operatorId, lancementCode) {
        return this.post('/operators/stop', { operatorId, lancementCode });
    }

    async getCurrentOperation(operatorId) {
        return this.get(`/operators/current/${operatorId}`);
    }

    async getOperationHistory(operatorId, date = null, limit = 50) {
        return this.get(`/operations/history/${operatorId}`, { date, limit });
    }

    // Admin
    async getAdminData(date) {
        return this.get('/admin', { date });
    }

    async getAdminStats(date) {
        return this.get('/admin/stats', { date });
    }

    // Modifier une opération (admin)
    async updateOperation(id, data) {
        return this.put(`/admin/operations/${id}`, data);
    }

    // Supprimer une opération (admin)
    async deleteOperation(id) {
        return this.delete(`/admin/operations/${id}`);
    }

    // Ajouter une nouvelle opération (admin)
    async addOperation(data) {
        return this.post('/admin/operations', data);
    }

    // Récupérer les informations des tables abetemps
    async getTablesInfo() {
        return this.get('/admin/tables-info');
    }

    // Récupérer la liste des opérateurs connectés
    async getConnectedOperators() {
        return this.get('/admin/operators');
    }

    // Récupérer les lancements d'un opérateur spécifique
    async getOperatorOperations(operatorCode) {
        return this.get(`/admin/operators/${operatorCode}/operations`);
    }

    async getAdminOperations(date, filters = {}) {
        return this.get('/admin/operations', { date, ...filters });
    }

    // Export
    async exportOperations(date, format = 'csv') {
        return this.get(`/admin/export/${format}`, { date });
    }
    
    // Commentaires
    async addComment(operatorCode, operatorName, lancementCode, comment) {
        return this.post('/comments', {
            operatorCode,
            operatorName,
            lancementCode,
            comment
        });
    }

    async getCommentsByOperator(operatorCode, limit = 50) {
        return this.get(`/comments/operator/${operatorCode}`, { limit });
    }

    async getCommentsByLancement(lancementCode, limit = 50) {
        return this.get(`/comments/lancement/${lancementCode}`, { limit });
    }

    async getAllComments(limit = 100) {
        return this.get('/comments', { limit });
    }

    async deleteComment(commentId, operatorCode) {
        return this.delete(`/comments/${commentId}`, {
            body: JSON.stringify({ operatorCode })
        });
    }

    async testEmail() {
        return this.post('/comments/test-email');
    }

    async getCommentStats(period = 'today') {
        return this.get('/comments/stats', { period });
    }
    
    // Validation automatique d'un code de lancement
    async validateLancementCode(code) {
        try {
            console.log(`🔍 Validation du code: ${code}`);
            
            const response = await fetch(`${this.baseUrl}/admin/validate-lancement/${encodeURIComponent(code)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.defaultHeaders
                }
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`✅ Résultat validation:`, result);
            
            return result;
            
        } catch (error) {
            console.error('❌ Erreur validation code lancement:', error);
            return {
                success: false,
                valid: false,
                error: 'Erreur de connexion lors de la validation'
            };
        }
    }
}

export default ApiService;
