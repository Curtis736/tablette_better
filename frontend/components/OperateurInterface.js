// Interface simplifiée pour les opérateurs
import TimeUtils from '../utils/TimeUtils.js';

class OperateurInterface {
    constructor(operator, app) {
        this.operator = operator;
        this.app = app;
        this.apiService = app.getApiService();
        this.notificationManager = app.getNotificationManager();
        this.currentLancement = null;
        this.timerInterval = null;
        this.startTime = null;
        this.isRunning = false;
        this.isPaused = false;
        this.totalPausedTime = 0;
        this.pauseStartTime = null;
        
        // Debouncing pour éviter les clics répétés
        this.lastActionTime = 0;
        this.actionCooldown = 1000; // 1 seconde entre les actions
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeLancementInput();
        this.checkCurrentOperation();
        this.loadOperatorHistory();
    }

    // Vérifier si une action peut être exécutée (debouncing)
    canPerformAction() {
        const now = Date.now();
        if (now - this.lastActionTime < this.actionCooldown) {
            this.notificationManager.warning('Veuillez attendre avant de relancer une action');
            return false;
        }
        this.lastActionTime = now;
        return true;
    }

    initializeElements() {
        this.lancementInput = document.getElementById('lancementSearch');
        this.lancementList = document.getElementById('lancementList');
        this.controlsSection = document.getElementById('controlsSection');
        this.selectedLancement = document.getElementById('selectedLancement');
        this.lancementDetails = document.getElementById('lancementDetails');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.statusDisplay = document.getElementById('statusDisplay');
        this.endTimeDisplay = document.getElementById('endTimeDisplay');
        
        // Éléments pour l'historique
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        this.operatorHistoryTable = document.getElementById('operatorHistoryTable');
        this.operatorHistoryTableBody = document.getElementById('operatorHistoryTableBody');
        
        // Debug des éléments historique
        console.log('refreshHistoryBtn trouvé:', !!this.refreshHistoryBtn);
        console.log('operatorHistoryTableBody trouvé:', !!this.operatorHistoryTableBody);
        console.log('endTimeDisplay trouvé:', !!this.endTimeDisplay);
        
        // Modifier le placeholder pour indiquer la saisie manuelle
        this.lancementInput.placeholder = "Saisir le code de lancement...";
        
        // Cacher la liste des lancements
        this.lancementList.style.display = 'none';
    }

    initializeLancementInput() {
        // Positionner le curseur après "LT" au chargement
        if (this.lancementInput && this.lancementInput.value === 'LT') {
            setTimeout(() => {
                this.lancementInput.focus();
                this.lancementInput.setSelectionRange(2, 2); // Position après "LT"
            }, 100);
        }
        
        // Empêcher la suppression de "LT" au début
        this.lancementInput.addEventListener('keydown', (e) => {
            const value = this.lancementInput.value;
            const cursorPos = this.lancementInput.selectionStart;
            
            // Empêcher la suppression de "LT" au début
            if ((e.key === 'Backspace' || e.key === 'Delete') && 
                (cursorPos <= 2 || value.length <= 2)) {
                e.preventDefault();
                this.lancementInput.value = 'LT';
                this.lancementInput.setSelectionRange(2, 2);
            }
        });
        
        // Réinitialiser à "LT" si le champ devient vide
        this.lancementInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (!value || !value.startsWith('LT')) {
                e.target.value = 'LT';
                e.target.setSelectionRange(2, 2);
            }
        });
        
        // Focus automatique sur le champ au clic
        this.lancementInput.addEventListener('focus', (e) => {
            if (e.target.value === 'LT') {
                setTimeout(() => {
                    e.target.setSelectionRange(2, 2);
                }, 10);
            }
        });
    }

    setupEventListeners() {
        // Validation du code de lancement en temps réel
        this.lancementInput.addEventListener('input', () => this.handleLancementInput());
        this.lancementInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.validateAndSelectLancement();
            }
        });
        
        // Contrôles de lancement
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.pauseBtn.addEventListener('click', () => this.handlePause());
        this.stopBtn.addEventListener('click', () => this.handleStop());
        
        // Bouton actualiser historique
        this.refreshHistoryBtn.addEventListener('click', () => this.loadOperatorHistory());
    }

    handleLancementInput() {
        const code = this.lancementInput.value.trim();
        
        if (code.length > 0) {
            // Afficher les contrôles dès qu'un code est saisi
            this.controlsSection.style.display = 'block';
            this.selectedLancement.textContent = code;
            this.lancementDetails.innerHTML = `
                <strong>Code: ${code}</strong><br>
                <small>Appuyez sur Entrée ou cliquez sur Démarrer pour valider</small>
            `;
            
            // Activer le bouton démarrer seulement si pas d'opération en cours
            if (!this.isRunning) {
                this.startBtn.disabled = false;
                this.startBtn.textContent = 'Démarrer';
            }
        } else {
            // Cacher les contrôles si le champ est vide
            if (!this.isRunning) {
                this.controlsSection.style.display = 'none';
            }
        }
    }

    async validateAndSelectLancement() {
        const code = this.lancementInput.value.trim();
        if (!code) {
            this.notificationManager.error('Veuillez saisir un code de lancement');
            return;
        }

        console.log('Validation du lancement:', code); // Debug
        
        // Afficher immédiatement les contrôles
        this.controlsSection.style.display = 'block';
        this.selectedLancement.textContent = code;
        
        try {
            // Vérifier que le lancement existe dans LCTE
            const response = await this.apiService.getLancement(code);
            const lancement = response.data;
            
            this.currentLancement = { 
                CodeLancement: code, 
                CodeArticle: lancement.CodeArticle,
                DesignationLct1: lancement.DesignationLct1,
                CodeModele: lancement.CodeModele,
                DesignationArt1: lancement.DesignationArt1,
                DesignationArt2: lancement.DesignationArt2
            };
            
            this.lancementDetails.innerHTML = `
                <strong>Code: ${code}</strong><br>
                <strong>Article: ${lancement.CodeArticle || 'N/A'}</strong><br>
                <strong>Désignation: ${lancement.DesignationLct1 || 'N/A'}</strong><br>
                <small>✅ Lancement validé dans LCTE - Prêt à démarrer</small>
            `;
            this.notificationManager.success('Lancement trouvé et validé dans la base de données');
            
            // Activer le bouton démarrer seulement si validation réussie
            if (!this.isRunning) {
                this.startBtn.disabled = false;
                this.startBtn.textContent = 'Démarrer';
            }
            
        } catch (error) {
            // BLOQUER complètement si le lancement n'existe pas dans LCTE
            console.error('Erreur validation lancement:', error);
            this.currentLancement = null;
            this.lancementDetails.innerHTML = `
                <strong>Code: ${code}</strong><br>
                <small>❌ Lancement non trouvé dans la base de données LCTE</small><br>
                <small>Veuillez vérifier le code de lancement</small>
            `;
            this.notificationManager.error('Code de lancement invalide - Non trouvé dans LCTE');
            
            // DÉSACTIVER le bouton démarrer
            this.startBtn.disabled = true;
            this.startBtn.textContent = 'Code invalide';
            
            // Vider le champ après un délai
            setTimeout(() => {
                this.lancementInput.value = '';
                this.controlsSection.style.display = 'none';
            }, 3000);
        }
    }

    async checkCurrentOperation() {
        try {
            const currentOp = await this.apiService.getCurrentOperation(this.operator.id);
            
            if (currentOp && currentOp.CodeLancement) {
                // Il y a une opération en cours
                this.currentLancement = currentOp;
                this.lancementInput.value = currentOp.CodeLancement;
                this.selectedLancement.textContent = currentOp.CodeLancement;
                this.controlsSection.style.display = 'block';
                
                if (currentOp.Statut === 'DEBUT') {
                    // Opération en cours
                    this.resumeRunningOperation(currentOp);
                } else if (currentOp.Statut === 'PAUSE') {
                    // Opération en pause
                    this.resumePausedOperation(currentOp);
                }
            }
        } catch (error) {
            console.log('Aucune opération en cours');
        }
    }

    resumeRunningOperation(operation) {
        this.isRunning = true;
        this.startTime = new Date(operation.DateTravail);
        
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.statusDisplay.textContent = 'En cours';
        
        this.lancementDetails.innerHTML = `
            <strong>Code: ${operation.CodeLancement}</strong><br>
            <small>Opération en cours depuis ${new Date(operation.DateTravail).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}</small>
        `;
        
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        this.lancementInput.disabled = true;
        
        // Mettre à jour l'heure de fin immédiatement
        this.updateEndTime();
    }

    resumePausedOperation(operation) {
        this.isRunning = false;
        this.isPaused = true;
        this.currentLancement = { CodeLancement: operation.CodeLancement };
        
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = '<i class="fas fa-play"></i> Reprendre';
        this.stopBtn.disabled = false;
        this.statusDisplay.textContent = 'En pause';
        
        this.lancementDetails.innerHTML = `
            <strong>Code: ${operation.CodeLancement}</strong><br>
            <small>Opération en pause depuis ${new Date(operation.DateTravail).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}</small>
        `;
        
        this.lancementInput.disabled = true;
    }

    async handleStart() {
        const code = this.lancementInput.value.trim();
        if (!code) {
            this.notificationManager.error('Veuillez saisir un code de lancement');
            return;
        }

        // Vérifier qu'un lancement valide a été sélectionné
        if (!this.currentLancement || this.currentLancement.CodeLancement !== code) {
            this.notificationManager.error('Veuillez d\'abord valider le code de lancement (appuyez sur Entrée)');
            return;
        }

        try {
            if (this.isPaused) {
                // Reprendre l'opération en pause
                await this.apiService.resumeOperation(this.operator.id, code);
                this.notificationManager.success('Opération reprise');
            } else {
                // Démarrer nouvelle opération
                await this.apiService.startOperation(this.operator.id, code);
                this.notificationManager.success('Opération démarrée');
            }
            
            this.currentLancement = { CodeLancement: code };
            this.startTimer();
            this.startBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.stopBtn.disabled = false;
            this.statusDisplay.textContent = 'En cours';
            this.lancementInput.disabled = true;
            this.isPaused = false;
            
            // Actualiser l'historique après démarrage
            this.loadOperatorHistory();
            
        } catch (error) {
            console.error('Erreur:', error);
            this.notificationManager.error(error.message || 'Erreur de connexion');
        }
    }

    async handlePause() {
        if (!this.currentLancement) return;
        
        if (!this.canPerformAction()) return;
        
        try {
            await this.apiService.pauseOperation(this.operator.id, this.currentLancement.CodeLancement);
            
            this.pauseTimer();
            this.startBtn.disabled = false;
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Reprendre';
            this.pauseBtn.disabled = true;
            this.statusDisplay.textContent = 'En pause';
            this.notificationManager.info('Opération mise en pause');
            this.isPaused = true;
            
            // Actualiser l'historique après pause
            this.loadOperatorHistory();
            
        } catch (error) {
            console.error('Erreur:', error);
            this.notificationManager.error(error.message || 'Erreur de connexion');
        }
    }

    async handleStop() {
        if (!this.currentLancement) return;
        
        if (!this.canPerformAction()) return;
        
        try {
            // Définir l'heure de fin avant d'arrêter
            this.setFinalEndTime();
            
            const result = await this.apiService.stopOperation(this.operator.id, this.currentLancement.CodeLancement);
            
            this.stopTimer();
            this.resetControls();
            this.statusDisplay.textContent = 'Terminé';
            this.notificationManager.success(`Opération terminée - Durée: ${result.duration || 'N/A'}`);
            
            // Réinitialiser pour permettre un nouveau lancement
            this.lancementInput.value = '';
            this.lancementInput.disabled = false;
            this.lancementInput.placeholder = "Saisir un nouveau code de lancement...";
            this.controlsSection.style.display = 'none';
            
            // Actualiser l'historique après arrêt
            this.loadOperatorHistory();
            
        } catch (error) {
            console.error('Erreur:', error);
            this.notificationManager.error(error.message || 'Erreur de connexion');
        }
    }

    startTimer() {
        if (!this.isRunning) {
            this.startTime = new Date();
        }
        this.isRunning = true;
        
        if (this.pauseStartTime) {
            // Ajouter le temps de pause au total
            this.totalPausedTime += (new Date() - this.pauseStartTime);
            this.pauseStartTime = null;
        }
        
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    pauseTimer() {
        this.pauseStartTime = new Date();
        clearInterval(this.timerInterval);
    }

    stopTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.timerDisplay.textContent = '00:00:00';
        this.totalPausedTime = 0;
        this.pauseStartTime = null;
    }

    resetControls() {
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = '<i class="fas fa-play"></i> Démarrer';
        this.pauseBtn.disabled = true;
        this.stopBtn.disabled = true;
        this.stopTimer();
        this.statusDisplay.textContent = 'En attente';
        this.isPaused = false;
        if (this.endTimeDisplay) {
            this.endTimeDisplay.textContent = '--:--';
        }
    }

    updateTimer() {
        if (!this.isRunning || !this.startTime) return;
        
        const now = new Date();
        const elapsed = Math.floor((now - this.startTime - this.totalPausedTime) / 1000);
        this.timerDisplay.textContent = TimeUtils.formatDuration(Math.max(0, elapsed));
        
        // Mettre à jour l'heure de fin estimée
        this.updateEndTime();
    }

    updateEndTime() {
        if (!this.endTimeDisplay) {
            console.warn('⚠️ endTimeDisplay non trouvé, impossible de mettre à jour l\'heure de fin');
            return;
        }
        
        if (!this.isRunning || !this.startTime) {
            this.endTimeDisplay.textContent = '--:--';
            return;
        }
        
        // Afficher l'heure actuelle comme heure de fin en cours
        const now = new Date();
        
        // Formater l'heure de fin
        this.endTimeDisplay.textContent = now.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setFinalEndTime() {
        if (!this.endTimeDisplay) {
            console.warn('⚠️ endTimeDisplay non trouvé, impossible de définir l\'heure de fin');
            return;
        }
        
        // Afficher l'heure de fin définitive quand l'opération se termine
        const now = new Date();
        this.endTimeDisplay.textContent = now.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Méthodes de compatibilité
    loadLancements() {
        // Ne fait rien - on utilise la saisie manuelle
    }

    getCurrentLancement() {
        return this.currentLancement;
    }

    getTimerStatus() {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime
        };
    }

    async loadOperatorHistory() {
        try {
            console.log('=== DEBUT loadOperatorHistory ===');
            console.log('operatorHistoryTableBody existe:', !!this.operatorHistoryTableBody);
            
            if (!this.operatorHistoryTableBody) {
                console.error('❌ operatorHistoryTableBody non trouvé !');
                return;
            }
            
            // Afficher un message de chargement
            this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Chargement en cours...</td></tr>';
            
            // Vérifier les propriétés de l'opérateur
            console.log('Opérateur complet:', this.operator);
            const operatorCode = this.operator.code || this.operator.coderessource || this.operator.id;
            console.log('Code opérateur utilisé:', operatorCode);
            
            if (!operatorCode) {
                console.error('❌ Aucun code opérateur trouvé');
                this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Code opérateur non trouvé</td></tr>';
                return;
            }
            
            // Utiliser la route admin pour récupérer l'historique de l'opérateur
            console.log('🔗 Chargement historique pour opérateur:', operatorCode);
            
            const data = await this.apiService.get(`/operators/${operatorCode}/operations`);
            console.log('📊 Données reçues:', data);
            
            if (data.success) {
                console.log('Historique chargé:', data.operations.length, 'opérations');
                this.displayOperatorHistory(data.operations);
            } else {
                console.error('Erreur lors du chargement de l\'historique:', data.error);
                this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Erreur lors du chargement</td></tr>';
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique:', error);
            this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Erreur de connexion</td></tr>';
        }
    }

    displayOperatorHistory(operations) {
        console.log('=== DEBUT displayOperatorHistory ===');
        console.log('Nombre d\'opérations à afficher:', operations ? operations.length : 0);
        
        if (!this.operatorHistoryTableBody) {
            console.error('❌ operatorHistoryTableBody non trouvé dans displayOperatorHistory !');
            return;
        }
        
        if (!operations || operations.length === 0) {
            console.log('⚠️ Aucune opération à afficher');
            this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Aucun lancement trouvé</td></tr>';
            return;
        }

        console.log('🔄 Vidage du tableau et ajout des lignes...');
        this.operatorHistoryTableBody.innerHTML = '';
        
        operations.forEach((operation, index) => {
            console.log(`Ajout ligne ${index + 1}:`, operation.lancementCode, operation.status);
            console.log(`Phase pour ${operation.lancementCode}:`, operation.phase);
            
            const row = document.createElement('tr');
            
            // Ajouter une classe spéciale pour les lignes de pause
            if (operation.type === 'pause') {
                row.classList.add('pause-row');
                if (operation.statusCode === 'PAUSE_TERMINEE') {
                    row.classList.add('pause-terminee');
                }
            }
            
            row.innerHTML = `
                <td>${operation.lancementCode || '-'} ${operation.type === 'pause' ? '<i class="fas fa-pause-circle pause-icon"></i>' : ''}</td>
                <td>${operation.article || '-'}</td>
                <td>${operation.phase || 'PRODUCTION'}</td>
                <td>${operation.startTime || '-'}</td>
                <td>${operation.endTime || '-'}</td>
                <td>
                    <span class="status-badge status-${operation.statusCode}">${operation.status}</span>
                </td>
            `;
            this.operatorHistoryTableBody.appendChild(row);
        });
        
        console.log('✅ Historique affiché avec succès:', operations.length, 'opérations');
        console.log('=== FIN displayOperatorHistory ===');
    }
}

export default OperateurInterface;