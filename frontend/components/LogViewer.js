// Composant de visualisation de logs
class LogViewer {
    constructor(app) {
        this.app = app;
        this.apiService = app.getApiService();
        this.notificationManager = app.getNotificationManager();
        this.logs = [];
        this.stats = null;
        this.filters = {
            ip: '',
            status: '',
            method: '',
            path: '',
            search: ''
        };
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        // Conteneur principal
        this.container = document.getElementById('logViewerContainer');
        this.logTextarea = document.getElementById('logTextarea');
        this.parseBtn = document.getElementById('parseLogsBtn');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');
        
        // Filtres
        this.filterIP = document.getElementById('logFilterIP');
        this.filterStatus = document.getElementById('logFilterStatus');
        this.filterMethod = document.getElementById('logFilterMethod');
        this.filterPath = document.getElementById('logFilterPath');
        this.filterSearch = document.getElementById('logFilterSearch');
        this.clearFiltersBtn = document.getElementById('clearLogFiltersBtn');
        
        // Résultats
        this.statsContainer = document.getElementById('logStatsContainer');
        this.logsTableBody = document.getElementById('logsTableBody');
        this.logsCount = document.getElementById('logsCount');
        
        // Onglets
        this.statsTab = document.getElementById('logStatsTab');
        this.logsTab = document.getElementById('logListTab');
    }

    setupEventListeners() {
        if (this.parseBtn) {
            this.parseBtn.addEventListener('click', () => this.parseLogs());
        }
        
        if (this.clearLogsBtn) {
            this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        }
        
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Filter listeners
        if (this.filterIP) {
            this.filterIP.addEventListener('input', () => this.applyFilters());
        }
        
        if (this.filterStatus) {
            this.filterStatus.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.filterMethod) {
            this.filterMethod.addEventListener('change', () => this.applyFilters());
        }
        
        if (this.filterPath) {
            this.filterPath.addEventListener('input', () => this.applyFilters());
        }
        
        if (this.filterSearch) {
            this.filterSearch.addEventListener('input', () => this.applyFilters());
        }
        
        // Tab listeners
        if (this.statsTab) {
            this.statsTab.addEventListener('click', () => this.showStatsTab());
        }
        
        if (this.logsTab) {
            this.logsTab.addEventListener('click', () => this.showLogsTab());
        }
    }

    async parseLogs() {
        if (!this.logTextarea || !this.logTextarea.value.trim()) {
            this.notificationManager.error('Veuillez coller des logs à analyser');
            return;
        }

        try {
            this.parseBtn.disabled = true;
            this.parseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse en cours...';

            const logText = this.logTextarea.value;
            const response = await this.apiService.post('/admin/logs/parse', {
                logText,
                filters: this.filters
            });

            if (response.success) {
                this.logs = response.logs || [];
                this.stats = response.stats || null;
                
                this.displayStats();
                this.displayLogs();
                this.updateLogsCount();
                
                this.notificationManager.success(
                    `${response.totalParsed} logs parsés, ${response.totalFiltered} affichés`
                );
            } else {
                this.notificationManager.error(response.error || 'Erreur lors de l\'analyse des logs');
            }

        } catch (error) {
            console.error('Error parsing logs:', error);
            this.notificationManager.error('Erreur lors de l\'analyse des logs: ' + error.message);
        } finally {
            this.parseBtn.disabled = false;
            this.parseBtn.innerHTML = '<i class="fas fa-search"></i> Analyser les logs';
        }
    }

    async applyFilters() {
        // Update filters object
        this.filters = {
            ip: this.filterIP?.value || '',
            status: this.filterStatus?.value || '',
            method: this.filterMethod?.value || '',
            path: this.filterPath?.value || '',
            search: this.filterSearch?.value || ''
        };

        // Re-parse with filters if we have logs
        if (this.logTextarea && this.logTextarea.value.trim()) {
            await this.parseLogs();
        }
    }

    clearFilters() {
        if (this.filterIP) this.filterIP.value = '';
        if (this.filterStatus) this.filterStatus.value = '';
        if (this.filterMethod) this.filterMethod.value = '';
        if (this.filterPath) this.filterPath.value = '';
        if (this.filterSearch) this.filterSearch.value = '';
        
        this.filters = {
            ip: '',
            status: '',
            method: '',
            path: '',
            search: ''
        };

        if (this.logTextarea && this.logTextarea.value.trim()) {
            this.parseLogs();
        }
    }

    clearLogs() {
        if (this.logTextarea) {
            this.logTextarea.value = '';
        }
        this.logs = [];
        this.stats = null;
        this.displayStats();
        this.displayLogs();
        this.updateLogsCount();
    }

    displayStats() {
        if (!this.statsContainer || !this.stats) {
            return;
        }

        const stats = this.stats;

        this.statsContainer.innerHTML = `
            <div class="log-stats-grid">
                <div class="log-stat-card">
                    <i class="fas fa-list"></i>
                    <h3>${stats.total || 0}</h3>
                    <p>Total des requêtes</p>
                </div>
                
                <div class="log-stat-card">
                    <i class="fas fa-server"></i>
                    <h3>${stats.averageSize || 0} B</h3>
                    <p>Taille moyenne</p>
                </div>
                
                <div class="log-stat-card">
                    <i class="fas fa-database"></i>
                    <h3>${(stats.totalSize || 0).toLocaleString()} B</h3>
                    <p>Taille totale</p>
                </div>
                
                <div class="log-stat-card">
                    <i class="fas fa-clock"></i>
                    <h3>${stats.timeRange?.start ? new Date(stats.timeRange.start).toLocaleString('fr-FR') : 'N/A'}</h3>
                    <p>Première requête</p>
                </div>
                
                <div class="log-stat-card">
                    <i class="fas fa-clock"></i>
                    <h3>${stats.timeRange?.end ? new Date(stats.timeRange.end).toLocaleString('fr-FR') : 'N/A'}</h3>
                    <p>Dernière requête</p>
                </div>
            </div>
            
            <div class="log-stats-details">
                <div class="log-stats-section">
                    <h4><i class="fas fa-code"></i> Codes de statut</h4>
                    <div class="log-stats-list">
                        ${(stats.statusCodes || []).slice(0, 10).map(item => `
                            <div class="log-stat-item">
                                <span class="log-stat-label">${item.code}</span>
                                <span class="log-stat-value">${item.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="log-stats-section">
                    <h4><i class="fas fa-exchange-alt"></i> Méthodes HTTP</h4>
                    <div class="log-stats-list">
                        ${(stats.methods || []).map(item => `
                            <div class="log-stat-item">
                                <span class="log-stat-label">${item.method}</span>
                                <span class="log-stat-value">${item.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="log-stats-section">
                    <h4><i class="fas fa-route"></i> Endpoints les plus fréquents</h4>
                    <div class="log-stats-list">
                        ${(stats.paths || []).slice(0, 10).map(item => `
                            <div class="log-stat-item">
                                <span class="log-stat-label">${item.path}</span>
                                <span class="log-stat-value">${item.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="log-stats-section">
                    <h4><i class="fas fa-network-wired"></i> Adresses IP</h4>
                    <div class="log-stats-list">
                        ${(stats.ips || []).slice(0, 10).map(item => `
                            <div class="log-stat-item">
                                <span class="log-stat-label">${item.ip}</span>
                                <span class="log-stat-value">${item.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    displayLogs() {
        if (!this.logsTableBody) {
            return;
        }

        if (!this.logs || this.logs.length === 0) {
            this.logsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>Aucun log à afficher</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.logsTableBody.innerHTML = this.logs.map(log => {
            const statusClass = this.getStatusClass(log.status);
            const timestamp = this.formatTimestamp(log.timestamp);
            
            return `
                <tr>
                    <td>${log.ip}</td>
                    <td>${timestamp}</td>
                    <td><span class="method-badge method-${log.method.toLowerCase()}">${log.method}</span></td>
                    <td class="log-path">${this.escapeHtml(log.path)}</td>
                    <td><span class="status-badge ${statusClass}">${log.status}</span></td>
                    <td>${this.formatSize(log.size)}</td>
                    <td class="log-user-agent">${this.escapeHtml(log.userAgent)}</td>
                    <td>
                        <button class="btn-icon" onclick="logViewer.showLogDetails('${this.escapeHtml(JSON.stringify(log))}')" title="Détails">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showLogDetails(logJson) {
        try {
            const log = JSON.parse(logJson);
            const details = `
                <div class="log-details-modal">
                    <div class="log-details-content">
                        <h3>Détails du log</h3>
                        <div class="log-details-grid">
                            <div><strong>IP:</strong> ${this.escapeHtml(log.ip)}</div>
                            <div><strong>Timestamp:</strong> ${this.escapeHtml(log.timestamp)}</div>
                            <div><strong>Méthode:</strong> ${this.escapeHtml(log.method)}</div>
                            <div><strong>Chemin:</strong> ${this.escapeHtml(log.path)}</div>
                            <div><strong>Protocole:</strong> ${this.escapeHtml(log.protocol)}</div>
                            <div><strong>Statut:</strong> ${log.status}</div>
                            <div><strong>Taille:</strong> ${this.formatSize(log.size)}</div>
                            <div><strong>Referer:</strong> ${this.escapeHtml(log.referer)}</div>
                            <div><strong>User Agent:</strong> ${this.escapeHtml(log.userAgent)}</div>
                        </div>
                        <div class="log-details-raw">
                            <strong>Log brut:</strong>
                            <pre>${this.escapeHtml(log.raw)}</pre>
                        </div>
                        <button class="btn-primary" onclick="this.closest('.log-details-modal').remove()">Fermer</button>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', details);
        } catch (error) {
            console.error('Error showing log details:', error);
            this.notificationManager.error('Erreur lors de l\'affichage des détails');
        }
    }

    updateLogsCount() {
        if (this.logsCount) {
            this.logsCount.textContent = `${this.logs.length} log(s) affiché(s)`;
        }
    }

    getStatusClass(status) {
        if (status >= 200 && status < 300) return 'status-success';
        if (status >= 300 && status < 400) return 'status-info';
        if (status >= 400 && status < 500) return 'status-warning';
        if (status >= 500) return 'status-error';
        return 'status-unknown';
    }

    formatTimestamp(timestamp) {
        try {
            // Try to parse nginx timestamp format
            const match = timestamp.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+([^\]]+)\]/);
            if (match) {
                const dateStr = `${match[1]} ${match[2]} ${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString('fr-FR');
                }
            }
            return timestamp;
        } catch (e) {
            return timestamp;
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showStatsTab() {
        if (this.statsTab) this.statsTab.classList.add('active');
        if (this.logsTab) this.logsTab.classList.remove('active');
        // Show stats container, hide logs table
    }

    showLogsTab() {
        if (this.logsTab) this.logsTab.classList.add('active');
        if (this.statsTab) this.statsTab.classList.remove('active');
        // Show logs table, hide stats container
    }
}

export default LogViewer;

