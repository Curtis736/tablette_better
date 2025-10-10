// Page d'administration
import TimeUtils from '../utils/TimeUtils.js';

class AdminPage {
    constructor(app) {
        this.app = app;
        this.apiService = app.getApiService();
        this.notificationManager = app.getNotificationManager();
        this.operations = [];
        this.stats = {};
        this.pagination = null;
        this.currentPage = 1;
        
        // Système de sauvegarde automatique
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 secondes
        this.pendingChanges = new Map(); // Map des modifications en attente
        this.autoSaveTimer = null;
        
        console.log('AdminPage constructor - Initialisation');
        console.log('ApiService:', this.apiService);
        console.log('NotificationManager:', this.notificationManager);
        
        // Initialisation immédiate (le DOM devrait être prêt maintenant)
        this.initializeElements();
        this.setupEventListeners();
        this.startAutoSave();
    }

    initializeElements() {
        console.log('AdminPage.initializeElements() - Recherche des éléments DOM');
        
        this.refreshDataBtn = document.getElementById('refreshDataBtn');
        this.totalOperators = document.getElementById('totalOperators');
        this.activeLancements = document.getElementById('activeLancements');
        this.pausedLancements = document.getElementById('pausedLancements');
        this.completedLancements = document.getElementById('completedLancements');
        this.operationsTableBody = document.getElementById('operationsTableBody');
        this.operatorSelect = document.getElementById('operatorFilter');
        
        console.log('Éléments trouvés:');
        console.log('  - refreshDataBtn:', !!this.refreshDataBtn);
        console.log('  - operationsTableBody:', !!this.operationsTableBody);
        console.log('  - operatorSelect:', !!this.operatorSelect);
        
        if (!this.operationsTableBody) {
            console.error('ERREUR: operationsTableBody non trouvé!');
        }
    }

    addEventListenerSafe(elementId, eventType, handler) {
        try {
            const element = document.getElementById(elementId);
            if (element && typeof element.addEventListener === 'function') {
                element.addEventListener(eventType, handler);
                console.log(`Listener ajouté: ${elementId} (${eventType})`);
            } else {
                console.warn(`Élément non trouvé ou invalide: ${elementId}`);
            }
        } catch (error) {
            console.error(`Erreur ajout listener ${elementId}:`, error);
        }
    }

    setupEventListeners() {
        console.log('setupEventListeners - Début');
        
        // Attendre un peu que le DOM soit complètement prêt
        setTimeout(() => {
            try {
                // Bouton Actualiser
                const refreshBtn = document.getElementById('refreshDataBtn');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => this.loadData());
                    console.log('Listener ajouté: refreshDataBtn');
                }
                
                // Menu déroulant opérateurs
                const operatorSelect = document.getElementById('operatorFilter');
                if (operatorSelect) {
                    operatorSelect.addEventListener('change', () => this.handleOperatorChange());
                    console.log('Listener ajouté: operatorSelect');
                }
                
                   // Bouton Transfert
                   const transferBtn = document.getElementById('transferBtn');
                   if (transferBtn) {
                       transferBtn.addEventListener('click', () => this.handleTransfer());
                       console.log('Listener ajouté: transferBtn');
                   }
                   
                   // Bouton Ajouter une ligne
                   const addOperationBtn = document.getElementById('addOperationBtn');
                   if (addOperationBtn) {
                       addOperationBtn.addEventListener('click', () => this.handleAddOperation());
                       console.log('Listener ajouté: addOperationBtn');
                   }
                
                // Tableau des opérations
                const tableBody = document.getElementById('operationsTableBody');
                if (tableBody) {
                    tableBody.addEventListener('click', (e) => {
                        if (e.target.closest('.btn-delete')) {
                            const id = e.target.closest('.btn-delete').dataset.id;
                            this.deleteOperation(id);
                        } else if (e.target.closest('.btn-edit')) {
                            const id = e.target.closest('.btn-edit').dataset.id;
                            this.editOperation(id);
                        }
                    });
                    console.log('Listener ajouté: operationsTableBody');
                }
                
                console.log('Tous les listeners ajoutés avec succès');
                
            } catch (error) {
                console.error('Erreur lors de l\'ajout des listeners:', error);
            }
        }, 300);
        
        // Actualisation automatique
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadData();
            }
        }, 60000);
    }

    async loadData() {
        if (this.isLoading) {
            console.log('Chargement déjà en cours, ignorer...');
            return;
        }
        
        try {
            console.log('DEBUT loadData()');
            this.isLoading = true;
            
            // Charger les opérateurs connectés et les données admin en parallèle
            const [adminResponse, operatorsResponse] = await Promise.all([
                fetch('http://localhost:3000/api/admin'),
                fetch('http://localhost:3000/api/admin/operators')
            ]);
            
            // Vérifier les erreurs de rate limiting
            if (adminResponse.status === 429) {
                this.showRateLimitWarning();
                return;
            }
            if (operatorsResponse.status === 429) {
                this.showRateLimitWarning();
                return;
            }
            
            const data = await adminResponse.json();
            const operatorsData = await operatorsResponse.json();
            
            console.log('DONNEES BRUTES:', data);
            console.log('OPERATEURS CONNECTES:', operatorsData);
            
            if (data.operations) {
                this.operations = data.operations;
                this.pagination = data.pagination;
                console.log('OPERATIONS ASSIGNEES:', this.operations.length);
                console.log('PAGINATION:', this.pagination);
            } else {
                console.log('PAS D\'OPERATIONS DANS LA REPONSE');
                this.operations = [];
                this.pagination = null;
            }
            
            if (data.stats) {
                this.stats = data.stats;
                console.log('STATS ASSIGNEES:', this.stats);
            } else {
                console.log('PAS DE STATS DANS LA REPONSE');
                this.stats = {};
            }
            
            // Mettre à jour le menu déroulant des opérateurs
            if (operatorsData.success && operatorsData.operators) {
                this.updateOperatorSelect(operatorsData.operators);
            }
            
            console.log('🔄 APPEL updateStats()');
            this.updateStats();
            
            console.log('🔄 APPEL updateOperationsTable()');
            this.updateOperationsTable();
            
            console.log('🔄 APPEL updatePaginationInfo()');
            this.updatePaginationInfo();
            
            console.log('✅ FIN loadData()');
        } catch (error) {
            console.error('❌ ERREUR loadData():', error);
            this.notificationManager.error('Erreur de connexion au serveur');
        } finally {
            this.isLoading = false;
        }
    }

    updateStats() {
        this.totalOperators.textContent = this.stats.totalOperators || 0;
        this.activeLancements.textContent = this.stats.activeLancements || 0;
        this.pausedLancements.textContent = this.stats.pausedLancements || 0;
        this.completedLancements.textContent = this.stats.completedLancements || 0;
    }

    showRateLimitWarning() {
        console.warn('⚠️ Rate limit atteint - affichage du message d\'avertissement');
        
        // Afficher un message d'erreur dans l'interface
        const errorDiv = document.createElement('div');
        errorDiv.className = 'rate-limit-warning';
        errorDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                margin: 20px;
                text-align: center;
                box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
                animation: slideIn 0.3s ease-out;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
                <h3 style="margin: 0 0 8px 0; font-size: 18px;">Trop de requêtes</h3>
                <p style="margin: 0; opacity: 0.9;">
                    Le serveur est temporairement surchargé. Veuillez patienter quelques secondes avant de recharger.
                </p>
                <button onclick="this.parentElement.parentElement.remove(); window.adminPage.loadData();" 
                        style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            padding: 8px 16px;
                            border-radius: 6px;
                            margin-top: 12px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        "
                        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    <i class="fas fa-refresh"></i> Réessayer
                </button>
            </div>
        `;
        
        // Insérer le message au début du contenu principal
        const mainContent = document.querySelector('.admin-content') || document.querySelector('main');
        if (mainContent) {
            mainContent.insertBefore(errorDiv, mainContent.firstChild);
        }
        
        // Auto-supprimer après 10 secondes
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    updateOperatorSelect(operators) {
        console.log('🔄 Mise à jour du menu déroulant des opérateurs:', operators.length);
        if (!this.operatorSelect) {
            console.error('ERREUR: operatorSelect non trouvé !');
            return;
        }
        // Vider le select et ajouter l'option par défaut
        this.operatorSelect.innerHTML = '<option value="">Tous les opérateurs connectés</option>';
        // Ajouter chaque opérateur
        operators.forEach(operator => {
            const option = document.createElement('option');
            option.value = operator.code;
            option.textContent = `${operator.name} (${operator.code})`;
            this.operatorSelect.appendChild(option);
        });
        console.log('✅ Menu déroulant mis à jour avec', operators.length, 'opérateurs');
    }

    updateOperatorSelect(operators) {
        console.log('🔄 Mise à jour du menu déroulant des opérateurs:', operators.length);
        
        // Vider le select et ajouter l'option par défaut
        this.operatorSelect.innerHTML = '<option value="">Tous les opérateurs connectés</option>';
        
        // Ajouter chaque opérateur
        operators.forEach(operator => {
            const option = document.createElement('option');
            option.value = operator.code;
            option.textContent = `${operator.name} (${operator.code})`;
            this.operatorSelect.appendChild(option);
        });
        
        console.log('✅ Menu déroulant mis à jour avec', operators.length, 'opérateurs');
    }

    async handleOperatorChange() {
        if (this.isLoading) {
            console.log('⚠️ Chargement en cours, ignorer le changement d\'opérateur');
            return;
        }
        
        const selectedOperator = this.operatorSelect.value;
        console.log('🔄 Changement d\'opérateur sélectionné:', selectedOperator);
        
        if (selectedOperator === '') {
            // Afficher tous les opérateurs - recharger les données normales
            this.loadData();
        } else {
            // Charger les lancements de l'opérateur spécifique
            try {
                this.isLoading = true;
                const response = await fetch(`http://localhost:3000/api/admin/operators/${selectedOperator}/operations`);
                const data = await response.json();
                
                if (data.success) {
                    console.log(`📊 ${data.count} lancements trouvés pour l'opérateur ${selectedOperator}`);
                    this.operations = data.operations;
                    this.updateOperationsTable();
                } else {
                    console.error('Erreur lors du chargement des lancements:', data.error);
                    this.notificationManager.error('Erreur lors du chargement des lancements');
                }
            } catch (error) {
                console.error('Erreur lors du chargement des lancements:', error);
                this.notificationManager.error('Erreur de connexion au serveur');
            } finally {
                this.isLoading = false;
            }
        }
    }

    async handleAddOperation() {
        try {
            // Demander les informations pour la nouvelle ligne
            const operatorCode = prompt('Code opérateur :');
            if (!operatorCode) return;
            
            const lancementCode = prompt('Code lancement :');
            if (!lancementCode) return;
            
            const phase = prompt('Phase (optionnel) :') || '';
            
            // Créer une nouvelle opération
            const newOperation = {
                operatorId: operatorCode,
                lancementCode: lancementCode,
                phase: phase,
                startTime: new Date().toISOString(),
                status: 'DEBUT'
            };
            
            console.log('Ajout d\'une nouvelle opération:', newOperation);
            
            // Appeler l'API pour ajouter l'opération
            const response = await fetch('http://localhost:3000/api/admin/operations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newOperation)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.notificationManager.success('Opération ajoutée avec succès');
                console.log('Opération ajoutée:', result);
                
                // Recharger les données pour afficher la nouvelle ligne
                this.loadData();
            } else {
                this.notificationManager.error(`Erreur lors de l'ajout : ${result.error}`);
                console.error('Erreur d\'ajout:', result);
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout d\'opération:', error);
            this.notificationManager.error('Erreur de connexion lors de l\'ajout');
        }
    }

    async handleTransfer() {
        try {
            // Confirmer l'action avec l'utilisateur
            if (!confirm('Voulez-vous transférer toutes les opérations terminées vers la table SEDI_APP_INDEPENDANTE ?')) {
                return;
            }

            console.log('Début du transfert vers SEDI_APP_INDEPENDANTE...');
            
            // Appeler l'API de transfert
            const response = await fetch('http://localhost:3000/api/admin/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.notificationManager.success(`Transfert réussi : ${result.transferredCount} opérations transférées`);
                console.log('Transfert terminé:', result);
                
                // Recharger les données pour refléter les changements
                this.loadData();
            } else {
                this.notificationManager.error(`Erreur de transfert : ${result.error}`);
                console.error('Erreur de transfert:', result);
            }
            
        } catch (error) {
            console.error('Erreur lors du transfert:', error);
            this.notificationManager.error('Erreur de connexion lors du transfert');
        }
    }

    updateOperationsTable() {
        console.log('🔄 DEBUT updateOperationsTable()');
        console.log('📊 OPERATIONS A AFFICHER:', this.operations.length);
        console.log('📋 TABLEAU BODY:', this.operationsTableBody);
        
        if (!this.operationsTableBody) {
            console.error('❌ ERREUR: operationsTableBody est null!');
            return;
        }
        
        this.operationsTableBody.innerHTML = '';
        console.log('🧹 TABLEAU VIDE');
        
        if (this.operations.length === 0) {
            console.log('⚠️ AUCUNE OPERATION - AFFICHAGE MESSAGE');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 2rem; color: #666;">
                    Aucune opération trouvée pour cette date
                </td>
            `;
            this.operationsTableBody.appendChild(row);
            console.log('✅ MESSAGE AJOUTE AU TABLEAU');
            return;
        }
        
        console.log('🔄 CREATION DES LIGNES POUR', this.operations.length, 'OPERATIONS');
        console.log('📋 DONNEES COMPLETES DES OPERATIONS:', this.operations);
        
        this.operations.forEach((operation, index) => {
            // Debug pour voir les données reçues
            console.log(`🔍 Opération ${index + 1}:`, {
                id: operation.id,
                operatorName: operation.operatorName,
                lancementCode: operation.lancementCode,
                startTime: operation.startTime,
                endTime: operation.endTime,
                status: operation.status
            });
            
            const formattedStartTime = this.formatDateTime(operation.startTime);
            const formattedEndTime = this.formatDateTime(operation.endTime);
            
            // Validation des heures incohérentes
            let timeWarning = '';
            if (formattedStartTime && formattedEndTime && formattedStartTime !== '-' && formattedEndTime !== '-') {
                const [startHours, startMinutes] = formattedStartTime.split(':').map(Number);
                const [endHours, endMinutes] = formattedEndTime.split(':').map(Number);
                
                const startTotalMinutes = startHours * 60 + startMinutes;
                const endTotalMinutes = endHours * 60 + endMinutes;
                
                // Si l'heure de fin est avant l'heure de début (et pas de traversée de minuit)
                if (endTotalMinutes < startTotalMinutes && endTotalMinutes > 0) {
                    timeWarning = ' ⚠️';
                    console.warn(`⚠️ Heures incohérentes pour ${operation.lancementCode}: ${formattedStartTime} -> ${formattedEndTime}`);
                }
            }
            
            console.log(`⏰ Heures formatées pour ${operation.lancementCode}:`, {
                startTime: `${operation.startTime} -> ${formattedStartTime}`,
                endTime: `${operation.endTime} -> ${formattedEndTime}`,
                warning: timeWarning ? 'Heures incohérentes détectées' : 'OK'
            });
            
            const row = document.createElement('tr');
            
            // Ajouter une classe spéciale pour les lignes de pause
            if (operation.type === 'pause') {
                row.classList.add('pause-row');
                if (operation.statusCode === 'PAUSE_TERMINEE') {
                    row.classList.add('pause-terminee');
                }
            }
            
            row.innerHTML = `
                <td>${operation.operatorName || '-'}</td>
                <td>${operation.lancementCode || '-'} ${operation.type === 'pause' ? '<i class="fas fa-pause-circle pause-icon"></i>' : ''}</td>
                <td>${operation.article || '-'}</td>
                <td>${formattedStartTime}</td>
                <td>${formattedEndTime}${timeWarning}</td>
                <td>
                    <span class="status-badge status-${operation.statusCode}">${operation.status}</span>
                </td>
                <td class="actions-cell">
                    <button class="btn-edit" data-id="${operation.id}" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${operation.id}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            this.operationsTableBody.appendChild(row);
        });
    }

    formatDateTime(dateString) {
        // Si c'est null ou undefined, retourner un tiret
        if (!dateString) return '-';
        
        // Si c'est déjà au format HH:mm ou HH:mm:ss, extraire juste HH:mm
        if (typeof dateString === 'string') {
            const timeMatch = dateString.match(/^(\d{2}:\d{2})(:\d{2})?$/);
            if (timeMatch) {
                return timeMatch[1]; // Retourner juste HH:mm
            }
        }
        
        // Si c'est un objet Date, extraire l'heure avec fuseau horaire français
        if (dateString instanceof Date) {
            return dateString.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        
        // Sinon, essayer de formater comme une date complète avec fuseau horaire Paris
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                // Utiliser fuseau horaire français (Europe/Paris)
                return date.toLocaleTimeString('fr-FR', {
                    timeZone: 'Europe/Paris',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }
        } catch (error) {
            console.warn('Erreur formatage heure:', dateString, error);
        }
        
        // En dernier recours, retourner la valeur originale ou un tiret
        return dateString || '-';
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'En cours',
            'paused': 'En pause',
            'completed': 'Terminé',
            'started': 'Démarré',
            'TERMINE': 'Terminé',
            'PAUSE': 'En pause',
            'EN_COURS': 'En cours',
            'PAUSE_TERMINEE': 'Pause terminée'
        };
        return statusMap[status] || status;
    }
    
    // ===== SYSTÈME DE SAUVEGARDE AUTOMATIQUE =====
    
    startAutoSave() {
        if (this.autoSaveEnabled) {
            this.autoSaveTimer = setInterval(() => {
                this.processAutoSave();
            }, this.autoSaveInterval);
            
            console.log(`🔄 Sauvegarde automatique activée (${this.autoSaveInterval/1000}s)`);
        }
    }
    
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('⏹️ Sauvegarde automatique désactivée');
        }
    }
    
    addPendingChange(operationId, field, value) {
        if (!this.pendingChanges.has(operationId)) {
            this.pendingChanges.set(operationId, {});
        }
        
        const operationChanges = this.pendingChanges.get(operationId);
        operationChanges[field] = value;
        
        console.log(`📝 Modification en attente pour ${operationId}:`, operationChanges);
        
        // Sauvegarde immédiate pour les modifications critiques
        if (field === 'startTime' || field === 'endTime') {
            this.saveOperationImmediately(operationId, operationChanges);
        }
    }
    
    async processAutoSave() {
        if (this.pendingChanges.size === 0) {
            return;
        }
        
        console.log(`💾 Sauvegarde automatique de ${this.pendingChanges.size} modifications...`);
        
        const savePromises = [];
        
        for (const [operationId, changes] of this.pendingChanges) {
            if (Object.keys(changes).length > 0) {
                savePromises.push(this.saveOperationChanges(operationId, changes));
            }
        }
        
        try {
            await Promise.all(savePromises);
            this.pendingChanges.clear();
            console.log('✅ Sauvegarde automatique terminée');
            
            // Notification discrète
            this.showAutoSaveNotification('Modifications sauvegardées automatiquement');
            
        } catch (error) {
            console.error('❌ Erreur sauvegarde automatique:', error);
            this.showAutoSaveNotification('Erreur lors de la sauvegarde automatique', 'error');
        }
    }
    
    async saveOperationImmediately(operationId, changes) {
        try {
            await this.saveOperationChanges(operationId, changes);
            this.pendingChanges.delete(operationId);
            console.log(`⚡ Sauvegarde immédiate réussie pour ${operationId}`);
        } catch (error) {
            console.error(`❌ Erreur sauvegarde immédiate ${operationId}:`, error);
        }
    }
    
    async saveOperationChanges(operationId, changes) {
        const operation = this.operations.find(op => op.id == operationId);
        if (!operation) {
            throw new Error(`Opération ${operationId} non trouvée`);
        }
        
        const updateData = {
            ...changes,
            id: operationId
        };
        
        const result = await this.apiService.updateOperation(updateData);
        
        if (result.success) {
            // Mettre à jour l'opération locale
            Object.assign(operation, changes);
            console.log(`✅ Opération ${operationId} mise à jour:`, changes);
        } else {
            throw new Error(result.error || 'Erreur lors de la mise à jour');
        }
        
        return result;
    }
    
    showAutoSaveNotification(message, type = 'success') {
        if (this.notificationManager) {
            this.notificationManager.show(message, type, 3000);
        } else {
            // Fallback si pas de notification manager
            console.log(`📢 ${message}`);
        }
    }
    
    // ===== VALIDATION AUTOMATIQUE DES CODES LANCEMENT =====
    
    async validateLancementCode(code) {
        if (!code || code.length < 3) {
            return { valid: false, error: 'Code trop court' };
        }
        
        try {
            const result = await this.apiService.validateLancementCode(code);
            return result;
        } catch (error) {
            console.error('❌ Erreur validation code:', error);
            return { valid: false, error: 'Erreur de validation' };
        }
    }
    
    setupLancementValidation(inputElement) {
        let validationTimeout;
        
        inputElement.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            
            // Annuler la validation précédente
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
            
            // Validation différée (éviter trop d'appels API)
            validationTimeout = setTimeout(async () => {
                if (code.length >= 3) {
                    await this.performLancementValidation(inputElement, code);
                } else {
                    this.clearValidationFeedback(inputElement);
                }
            }, 500);
        });
    }
    
    async performLancementValidation(inputElement, code) {
        // Ajouter indicateur de chargement
        inputElement.classList.add('validating');
        
        try {
            const result = await this.validateLancementCode(code);
            
            if (result.valid) {
                this.showValidationSuccess(inputElement, result.data);
            } else {
                this.showValidationError(inputElement, result.error);
            }
            
        } catch (error) {
            this.showValidationError(inputElement, 'Erreur de validation');
        } finally {
            inputElement.classList.remove('validating');
        }
    }
    
    showValidationSuccess(inputElement, data) {
        inputElement.classList.remove('validation-error');
        inputElement.classList.add('validation-success');
        
        // Ajouter un tooltip avec les infos
        const tooltip = document.createElement('div');
        tooltip.className = 'validation-tooltip success';
        tooltip.innerHTML = `
            <strong>✅ Code valide</strong><br>
            ${data.designation}<br>
            <small>Statut: ${data.statut}</small>
        `;
        
        inputElement.parentNode.appendChild(tooltip);
        
        // Supprimer le tooltip après 3 secondes
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
    }
    
    showValidationError(inputElement, error) {
        inputElement.classList.remove('validation-success');
        inputElement.classList.add('validation-error');
        
        // Ajouter un tooltip d'erreur
        const tooltip = document.createElement('div');
        tooltip.className = 'validation-tooltip error';
        tooltip.innerHTML = `<strong>❌ ${error}</strong>`;
        
        inputElement.parentNode.appendChild(tooltip);
        
        // Supprimer le tooltip après 5 secondes
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 5000);
    }
    
    clearValidationFeedback(inputElement) {
        inputElement.classList.remove('validation-success', 'validation-error', 'validating');
        
        // Supprimer les tooltips existants
        const existingTooltips = inputElement.parentNode.querySelectorAll('.validation-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
    }

    cleanTimeValue(timeString) {
        if (!timeString) return '';
        
        // Si c'est déjà au format HH:mm, le retourner directement
        if (typeof timeString === 'string' && /^\d{2}:\d{2}$/.test(timeString)) {
            return timeString;
        }
        
        // Si c'est au format HH:mm:ss, enlever les secondes
        if (typeof timeString === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
            return timeString.substring(0, 5);
        }
        
        // Si c'est au format H:mm ou H:m, ajouter le zéro manquant
        if (typeof timeString === 'string' && /^\d{1,2}:\d{1,2}$/.test(timeString)) {
            const parts = timeString.split(':');
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        
        console.warn(`⚠️ Format d'heure non reconnu pour nettoyage: "${timeString}"`);
        return '';
    }

    formatTimeForInput(timeString) {
        if (!timeString) return '';
        
        console.log(`🔧 formatTimeForInput: "${timeString}"`);
        
        // Si c'est déjà au format HH:mm, le retourner directement
        if (typeof timeString === 'string' && /^\d{2}:\d{2}$/.test(timeString)) {
            console.log(`✅ Format HH:mm direct: ${timeString}`);
            return timeString;
        }
        
        // Si c'est au format HH:mm:ss, enlever les secondes
        if (typeof timeString === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
            const result = timeString.substring(0, 5);
            console.log(`✅ Format HH:mm:ss → HH:mm: ${timeString} → ${result}`);
            return result;
        }
        
        // Si c'est une date complète, extraire seulement l'heure
        if (typeof timeString === 'string' && timeString.includes('T')) {
            try {
                const date = new Date(timeString);
                if (!isNaN(date.getTime())) {
                    // Utiliser toLocaleTimeString avec fuseau horaire français
                    const formattedTime = date.toLocaleTimeString('fr-FR', {
                        timeZone: 'Europe/Paris',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    console.log(`✅ Date complète → HH:mm: ${timeString} → ${formattedTime}`);
                    return formattedTime;
                }
            } catch (error) {
                console.warn('Erreur parsing date:', timeString, error);
            }
        }
        
        // Si c'est un objet Date, extraire l'heure avec fuseau horaire français
        if (timeString instanceof Date) {
            const formattedTime = timeString.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            console.log(`✅ Date object → HH:mm: ${timeString} → ${formattedTime}`);
            return formattedTime;
        }
        
        console.warn(`⚠️ Format d'heure non reconnu: "${timeString}" (type: ${typeof timeString})`);
        return '';
    }

    formatDateTimeForInput(dateString) {
        if (!dateString) return '';
        
        // Si c'est déjà au format HH:mm, créer une date d'aujourd'hui avec cette heure
        if (typeof dateString === 'string' && /^\d{2}:\d{2}$/.test(dateString)) {
            const today = new Date();
            const [hours, minutes] = dateString.split(':');
            today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return today.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
        }
        
        // Sinon, essayer de traiter comme une date complète
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Date invalide reçue:', dateString);
            return '';
        }
        
        return date.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
    }

    editOperation(id) {
        console.log('🔧 Édition de l\'opération:', id);
        
        // Trouver la ligne correspondante
        const button = document.querySelector(`button[data-id="${id}"]`);
        if (!button) {
            console.error('Bouton non trouvé pour l\'ID:', id);
            return;
        }
        const row = button.closest('tr');
        if (!row) {
            console.error('Ligne non trouvée pour l\'ID:', id);
            return;
        }
        
        // Trouver l'opération dans les données
        const operation = this.operations.find(op => op.id == id);
        if (!operation) {
            console.error('Opération non trouvée pour l\'ID:', id);
            return;
        }
        
        // Sauvegarder et nettoyer les valeurs originales
        const originalStartTime = this.cleanTimeValue(operation.startTime || '');
        const originalEndTime = this.cleanTimeValue(operation.endTime || '');
        
        console.log(`🔧 Valeurs originales sauvegardées:`, {
            startTime: `${operation.startTime} → ${originalStartTime}`,
            endTime: `${operation.endTime} → ${originalEndTime}`
        });
        
        // Remplacer les cellules par des inputs
        const cells = row.querySelectorAll('td');
        
        // Heure Début (index 3)
        const startTimeCell = cells[3];
        startTimeCell.innerHTML = `
            <div class="time-input-container">
                <input type="time" 
                       value="${originalStartTime}" 
                       data-id="${id}" 
                       data-field="startTime"
                       data-original="${originalStartTime}"
                       class="time-input"
                       step="60">
            </div>
        `;
        
        // Heure Fin (index 4)
        const endTimeCell = cells[4];
        endTimeCell.innerHTML = `
            <div class="time-input-container">
                <input type="time" 
                       value="${originalEndTime}" 
                       data-id="${id}" 
                       data-field="endTime"
                       data-original="${originalEndTime}"
                       class="time-input"
                       step="60">
            </div>
        `;
        
        // Actions (index 6)
        const actionsCell = cells[6];
        actionsCell.innerHTML = `
            <button class="btn-save" data-id="${id}" title="Sauvegarder">
                <i class="fas fa-save"></i>
            </button>
            <button class="btn-cancel" data-id="${id}" title="Annuler">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Ajouter les event listeners pour les nouveaux boutons
        const saveBtn = actionsCell.querySelector('.btn-save');
        const cancelBtn = actionsCell.querySelector('.btn-cancel');
        
        saveBtn.addEventListener('click', () => this.saveOperation(id));
        cancelBtn.addEventListener('click', () => this.cancelEdit(id));
        
        // Ajouter des event listeners pour détecter les modifications automatiques
        const timeInputs = row.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            const originalValue = input.getAttribute('data-original');
            
            // Détecter les changements automatiques
            input.addEventListener('change', () => {
                const currentValue = input.value;
                console.log(`🔍 Changement détecté sur ${input.dataset.field}:`, {
                    original: originalValue,
                    current: currentValue,
                    changed: currentValue !== originalValue
                });
            });
            
            // Détecter les modifications par le navigateur
            input.addEventListener('input', () => {
                const currentValue = input.value;
                if (currentValue !== originalValue) {
                    console.log(`⚠️ Modification automatique détectée sur ${input.dataset.field}: ${originalValue} → ${currentValue}`);
                }
            });
        });
    }

    cancelEdit(id) {
        console.log('❌ Annulation de l\'édition:', id);
        // Recharger les données pour restaurer l'état original
        this.loadData();
    }

    async saveOperation(id) {
        try {
            const startTimeInput = document.querySelector(`input[data-id="${id}"][data-field="startTime"]`);
            const endTimeInput = document.querySelector(`input[data-id="${id}"][data-field="endTime"]`);
            
            // Récupérer les valeurs originales
            const originalStartTime = startTimeInput.getAttribute('data-original');
            const originalEndTime = endTimeInput.getAttribute('data-original');
            
            // Vérifier si les valeurs ont vraiment changé
            const startTimeChanged = startTimeInput.value !== originalStartTime;
            const endTimeChanged = endTimeInput.value !== originalEndTime;
            
            console.log(`🔧 Comparaison des valeurs pour ${id}:`, {
                startTime: {
                    original: originalStartTime,
                    current: startTimeInput.value,
                    changed: startTimeChanged
                },
                endTime: {
                    original: originalEndTime,
                    current: endTimeInput.value,
                    changed: endTimeChanged
                }
            });
            
            // Si aucune valeur n'a changé, ne pas envoyer de requête
            if (!startTimeChanged && !endTimeChanged) {
                console.log(`ℹ️ Aucune modification détectée pour l'opération ${id}`);
                this.notificationManager.info('Aucune modification détectée');
                this.loadData(); // Recharger pour revenir à l'état normal
                return;
            }
            
            const updateData = {};
            
            // Ajouter seulement les champs qui ont changé
            if (startTimeChanged) {
                updateData.startTime = startTimeInput.value;
            }
            
            if (endTimeChanged) {
                updateData.endTime = endTimeInput.value || null;
            }

            console.log(`💾 Sauvegarde opération ${id}:`, updateData);

            const response = await this.apiService.updateOperation(id, updateData);
            
            if (response.success) {
                this.notificationManager.success('Opération mise à jour avec succès');
                this.loadData(); // Recharger les données
            } else {
                this.notificationManager.error('Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            this.notificationManager.error('Erreur lors de la sauvegarde');
        }
    }

    async deleteOperation(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) {
            return;
        }

        try {
            console.log(` Suppression opération ${id}`);

            const response = await this.apiService.deleteOperation(id);
            
            if (response.success) {
                this.notificationManager.success('Opération supprimée avec succès');
                this.loadData(); // Recharger les données
            } else {
                this.notificationManager.error('Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            this.notificationManager.error('Erreur lors de la suppression');
        }
    }

    // Méthodes pour l'export des données
    exportToCSV() {
        if (this.operations.length === 0) {
            this.notificationManager.warning('Aucune donnée à exporter');
            return;
        }

        const headers = ['Opérateur', 'Code Lancement', 'Article', 'Début', 'Fin', 'Durée', 'Statut'];
        const csvContent = [
            headers.join(','),
            ...this.operations.map(op => [
                op.operatorName || '',
                op.lancementCode || '',
                op.article || '',
                this.formatDateTime(op.startTime),
                op.endTime ? this.formatDateTime(op.endTime) : '',
                op.duration || '',
                this.getStatusText(op.status)
            ].join(','))
        ].join('\n');

        const today = new Date().toISOString().split('T')[0];
        this.downloadCSV(csvContent, `operations_${today}.csv`);
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Méthodes pour les statistiques avancées
    getDailyStats() {
        const stats = {
            totalOperations: this.operations.length,
            totalDuration: 0,
            averageDuration: 0,
            operators: new Set(),
            lancements: new Set()
        };

        this.operations.forEach(op => {
            if (op.operatorName) stats.operators.add(op.operatorName);
            if (op.lancementCode) stats.lancements.add(op.lancementCode);
            if (op.duration) {
                const duration = this.parseDuration(op.duration);
                stats.totalDuration += duration;
            }
        });

        stats.uniqueOperators = stats.operators.size;
        stats.uniqueLancements = stats.lancements.size;
        stats.averageDuration = stats.totalOperations > 0 ? stats.totalDuration / stats.totalOperations : 0;

        return stats;
    }

    parseDuration(durationString) {
        return TimeUtils.parseDuration(durationString) / 60; // Convertir en minutes
    }

    formatDuration(minutes) {
        return TimeUtils.formatDuration(Math.floor(minutes * 60));
    }

    // Méthode pour filtrer les opérations
    filterOperations(filter) {
        let filtered = [...this.operations];

        if (filter.operator) {
            filtered = filtered.filter(op => 
                op.operatorName && op.operatorName.toLowerCase().includes(filter.operator.toLowerCase())
            );
        }

        if (filter.lancement) {
            filtered = filtered.filter(op => 
                op.lancementCode && op.lancementCode.toLowerCase().includes(filter.lancement.toLowerCase())
            );
        }

        if (filter.status) {
            filtered = filtered.filter(op => op.status === filter.status);
        }

        return filtered;
    }

    getOperations() {
        return this.operations;
    }

    getStats() {
        return this.stats;
    }

    async loadTablesData() {
        try {
            console.log('  Chargement des données des tables ERP...');
            
            const data = await this.apiService.getTablesInfo();
            
            if (data.success) {
                this.updateTablesDisplay(data.data, data.counts);
                this.notificationManager.success(`Données chargées: ${data.counts.pause} entrées Pause, ${data.counts.temp} entrées Temp`);
            } else {
                this.notificationManager.error('Erreur lors du chargement des tables ERP');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des tables:', error);
            this.notificationManager.error('Erreur de connexion lors du chargement des tables ERP');
        }
    }

    updateTablesDisplay(data, counts) {
        // Mise à jour des compteurs
        document.getElementById('pauseCount').textContent = counts.pause;
        document.getElementById('tempCount').textContent = counts.temp;

        // Mise à jour de la table abetemps_Pause
        this.updateErpTable('pauseTableBody', data.abetemps_Pause);
        
        // Mise à jour de la table abetemps_temp
        this.updateErpTable('tempTableBody', data.abetemps_temp);
    }

    updateErpTable(tableBodyId, tableData) {
        const tableBody = document.getElementById(tableBodyId);
        tableBody.innerHTML = '';

        if (!tableData || tableData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 1rem; color: #666;">
                    Aucune donnée trouvée
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        tableData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.NoEnreg || '-'}</td>
                <td><span class="badge badge-${this.getIdentBadgeClass(item.Ident)}">${item.Ident || '-'}</span></td>
                <td>${this.formatDateTime(item.DateTravail) || '-'}</td>
                <td>${item.CodeLanctImprod || '-'}</td>
                <td>${item.Phase || '-'}</td>
                <td>${item.CodePoste || '-'}</td>
                <td><strong>${item.CodeOperateur || '-'}</strong></td>
                <td>${item.NomOperateur || 'Non assigné'}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    getIdentBadgeClass(ident) {
        const classMap = {
            'DEBUT': 'success',
            'PAUSE': 'warning', 
            'REPRISE': 'info',
            'FIN': 'secondary',
            'ARRET': 'danger'
        };
        return classMap[ident] || 'light';
    }

    // Méthodes de pagination
    async loadPage(page) {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.currentPage = page;
            
            const response = await fetch(`http://localhost:3000/api/admin/operations?page=${page}&limit=25`);
            const data = await response.json();
            
            if (data.operations) {
                this.operations = data.operations;
                this.pagination = data.pagination;
                this.updateOperationsTable();
                this.updatePaginationInfo();
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la page:', error);
            this.notificationManager.error('Erreur lors du chargement de la page');
        } finally {
            this.isLoading = false;
        }
    }

    updatePaginationInfo() {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo && this.pagination) {
            paginationInfo.innerHTML = `
                <div class="pagination-info">
                    <span>Page ${this.pagination.currentPage} sur ${this.pagination.totalPages}</span>
                    <span>(${this.pagination.totalItems} éléments au total)</span>
                    <div class="pagination-controls">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.adminPage.loadPage(${this.pagination.currentPage - 1})"
                                ${!this.pagination.hasPrevPage ? 'disabled' : ''}>
                            ← Précédent
                        </button>
                        <button class="btn btn-sm btn-outline-primary"
                                onclick="window.adminPage.loadPage(${this.pagination.currentPage + 1})"
                                ${!this.pagination.hasNextPage ? 'disabled' : ''}>
                            Suivant →
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

export default AdminPage;
