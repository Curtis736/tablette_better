// Service pour gérer les appels API
class ApiService {
    constructor() {
        // Détection automatique de l'environnement
        const currentPort = window.location.port;
        const currentHost = window.location.hostname;
        
        // Si on est en production (sans port ou port 80/443), utiliser le proxy Nginx
        if (!currentPort || currentPort === '80' || currentPort === '443') {
            // Environnement de production - utiliser le proxy Nginx
            this.baseUrl = `${window.location.protocol}//${window.location.host}/api`;
        } else if (currentPort === '8080') {
            // Environnement de développement - frontend sur 8080, backend sur 3000
            this.baseUrl = 'http://localhost:3000/api';
        } else {
            // Autre cas - utiliser localhost:3000 par défaut
            this.baseUrl = 'http://localhost:3000/api';
        }
        
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        console.log(`🔗 ApiService configuré pour: ${this.baseUrl}`);
    }

    // Méthode générique pour les requêtes
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
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
}

export default ApiService;
