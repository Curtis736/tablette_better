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
        
        this.LANCEMENT_PREFIX = 'LT';
        this.MAX_LANCEMENT_DIGITS = 8;
        
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
        
        // Éléments pour les commentaires
        this.commentInput = document.getElementById('commentInput');
        this.addCommentBtn = document.getElementById('addCommentBtn');
        this.commentCharCount = document.getElementById('commentCharCount');
        this.commentsList = document.getElementById('commentsList');
        
        // Éléments pour le scanner
        this.scanBarcodeBtn = document.getElementById('scanBarcodeBtn');
        this.scannerModal = document.getElementById('barcodeScannerModal');
        this.closeScannerBtn = document.getElementById('closeScannerBtn');
        this.scannerContainer = document.getElementById('scannerContainer');
        this.scannerViewport = document.getElementById('scannerViewport');
        this.scannerStatus = document.getElementById('scannerStatus');
        
        // État du scanner
        this.scannerActive = false;
        this.scannerInstance = null;
        this.isProcessingScan = false; // Flag pour éviter les scans multiples
        
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
        if (!this.lancementInput) {
            console.error('Champ de saisie du lancement introuvable');
            return;
        }
        
        // Forcer la présence du préfixe et du format numérique dès l'initialisation
        this.enforceNumericLancementInput(false);
        
        // Focus automatique après un léger délai pour garantir le rendu DOM
        setTimeout(() => {
            this.lancementInput.focus();
            this.setLancementCaretAfterPrefix();
        }, 150);
        
        // À chaque prise de focus ou clic, replacer le curseur après le préfixe
        ['focus', 'click'].forEach((eventName) => {
            this.lancementInput.addEventListener(eventName, () => {
                this.enforceNumericLancementInput();
            });
        });
    }

    setupEventListeners() {
        if (this.lancementInput) {
            // Validation du code de lancement en temps réel avec auto-vérification
            this.lancementInput.addEventListener('input', () => this.handleLancementInput());
            
            // Forcer le clavier numérique et interdire les caractères non numériques
            this.lancementInput.addEventListener('keydown', (event) => this.handleLancementKeydown(event));
            this.lancementInput.addEventListener('paste', (event) => this.handleLancementPaste(event));
            
            // Empêcher l'input de capturer les événements sur la zone du bouton scanner
            this.lancementInput.addEventListener('click', (e) => {
                if (!this.scanBarcodeBtn) return;
                
                const btnRect = this.scanBarcodeBtn.getBoundingClientRect();
                const clickX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                const clickY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                
                // Si le clic est dans la zone du bouton, laisser le bouton gérer
                if (clickX >= btnRect.left && clickX <= btnRect.right &&
                    clickY >= btnRect.top && clickY <= btnRect.bottom) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Déclencher le clic sur le bouton
                    this.scanBarcodeBtn.click();
                    return false;
                }
            });
            
            // Même chose pour les événements tactiles
            this.lancementInput.addEventListener('touchstart', (e) => {
                if (!this.scanBarcodeBtn) return;
                
                const btnRect = this.scanBarcodeBtn.getBoundingClientRect();
                const touch = e.touches[0];
                if (!touch) return;
                
                const touchX = touch.clientX;
                const touchY = touch.clientY;
                
                // Si le touch est dans la zone du bouton, laisser le bouton gérer
                if (touchX >= btnRect.left && touchX <= btnRect.right &&
                    touchY >= btnRect.top && touchY <= btnRect.bottom) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Déclencher le touch sur le bouton
                    const touchEvent = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true,
                        touches: e.touches
                    });
                    this.scanBarcodeBtn.dispatchEvent(touchEvent);
                    return false;
                }
            });
        }
        
        // Contrôles de lancement
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.pauseBtn.addEventListener('click', () => this.handlePause());
        this.stopBtn.addEventListener('click', () => this.handleStop());
        
        // Bouton actualiser historique
        this.refreshHistoryBtn.addEventListener('click', () => this.loadOperatorHistory());
        
        // Gestion des commentaires
        this.commentInput.addEventListener('input', () => this.handleCommentInput());
        this.addCommentBtn.addEventListener('click', () => this.handleAddComment());
        
        // Scanner de code-barres - Approche simple et directe
        if (this.scanBarcodeBtn) {
            // Forcer le style pour garantir la cliquabilité
            this.scanBarcodeBtn.style.pointerEvents = 'auto';
            this.scanBarcodeBtn.style.zIndex = '10000'; // Plus haut que tout
            this.scanBarcodeBtn.style.position = 'absolute';
            this.scanBarcodeBtn.style.cursor = 'pointer';
            this.scanBarcodeBtn.style.right = '10px';
            this.scanBarcodeBtn.style.top = '50%';
            this.scanBarcodeBtn.style.transform = 'translateY(-50%)';
            this.scanBarcodeBtn.style.display = 'flex';
            this.scanBarcodeBtn.style.alignItems = 'center';
            this.scanBarcodeBtn.style.justifyContent = 'center';
            
            // S'assurer que le bouton est au-dessus de tout
            const inputGroup = this.scanBarcodeBtn.closest('.input-group');
            if (inputGroup) {
                inputGroup.style.position = 'relative';
                inputGroup.style.zIndex = '1';
            }
            
            // Gestion simple du clic - une seule méthode pour éviter les conflits
            this.scanBarcodeBtn.addEventListener('click', (e) => {
                console.log('✅ Bouton scanner cliqué');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.openScanner();
            });
            
            // Support tactile pour tablettes
            this.scanBarcodeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            this.scanBarcodeBtn.addEventListener('touchend', (e) => {
                console.log('✅ Bouton scanner touché');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.openScanner();
            });
            
            console.log('✅ Bouton scanner initialisé');
        } else {
            console.error('❌ Bouton scanner introuvable!');
        }
        if (this.closeScannerBtn) {
            this.closeScannerBtn.addEventListener('click', () => this.closeScanner());
        }
        
        // Fermer le scanner en cliquant en dehors
        if (this.scannerModal) {
            this.scannerModal.addEventListener('click', (e) => {
                if (e.target === this.scannerModal) {
                    this.closeScanner();
                }
            });
        }
    }

    handleLancementKeydown(event) {
        if (!this.lancementInput) {
            return;
        }
        
        if (event.key === 'Enter') {
            event.preventDefault();
            this.validateAndSelectLancement();
            return;
        }
        
        // Autoriser les raccourcis clavier (copier/coller, etc.)
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }
        
        const navigationKeys = ['Tab', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (navigationKeys.includes(event.key)) {
            if ((event.key === 'Backspace' || event.key === 'ArrowLeft' || event.key === 'Home') &&
                this.lancementInput.selectionStart <= this.LANCEMENT_PREFIX.length) {
                event.preventDefault();
                this.setLancementCaretAfterPrefix(0);
            }
            return;
        }
        
        // Bloquer tout caractère non numérique
        if (!/^\d$/.test(event.key)) {
            event.preventDefault();
            return;
        }
        
        const digitsLength = this.getSanitizedDigitsFromValue(this.lancementInput.value).length;
        if (digitsLength >= this.MAX_LANCEMENT_DIGITS) {
            event.preventDefault();
        }
    }
    
    handleLancementPaste(event) {
        if (!this.lancementInput) {
            return;
        }
        
        event.preventDefault();
        const pastedData = (event.clipboardData || window.clipboardData).getData('text') || '';
        const digits = this.getSanitizedDigitsFromValue(pastedData);
        this.lancementInput.value = `${this.LANCEMENT_PREFIX}${digits}`;
        this.setLancementCaretAfterPrefix(digits.length);
        this.handleLancementInput();
    }
    
    getSanitizedDigitsFromValue(value = '') {
        if (!value) {
            return '';
        }
        return value.replace(/[^0-9]/g, '').slice(0, this.MAX_LANCEMENT_DIGITS);
    }
    
    enforceNumericLancementInput(restoreCaret = true) {
        if (!this.lancementInput) {
            return `${this.LANCEMENT_PREFIX}`;
        }
        
        const digits = this.getSanitizedDigitsFromValue(this.lancementInput.value);
        const sanitizedValue = `${this.LANCEMENT_PREFIX}${digits}`;
        
        if (this.lancementInput.value !== sanitizedValue) {
            this.lancementInput.value = sanitizedValue;
        }
        
        if (restoreCaret) {
            this.setLancementCaretAfterPrefix(digits.length);
        }
        
        return sanitizedValue;
    }
    
    setLancementCaretAfterPrefix(digitsLength = null) {
        if (!this.lancementInput) {
            return;
        }
        
        const length = typeof digitsLength === 'number'
            ? digitsLength
            : this.getSanitizedDigitsFromValue(this.lancementInput.value).length;
        const position = this.LANCEMENT_PREFIX.length + length;
        
        requestAnimationFrame(() => {
            this.lancementInput.setSelectionRange(position, position);
        });
    }

    handleLancementInput() {
        const code = this.enforceNumericLancementInput();
        
        if (code.length > 0) {
            // Afficher les contrôles dès qu'un code est saisi
            this.controlsSection.style.display = 'block';
            this.selectedLancement.textContent = code;
            this.lancementDetails.innerHTML = `
                <strong>Code: ${code}</strong><br>
                <span class="status-badge status-pending">En attente de validation</span>
            `;
            
            // Activer le bouton démarrer seulement si pas d'opération en cours
            if (!this.isRunning) {
                this.startBtn.disabled = false;
                this.startBtn.innerHTML = '<i class="fas fa-play"></i> Démarrer';
            }
            
            // Valider automatiquement le lancement si le code est complet (LT + 7 chiffres)
            if (code.length === 10 && code.startsWith('LT')) {
                this.validateAndSelectLancement();
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
            
            // Recharger les commentaires pour ce lancement
            await this.loadComments();
            
            // Activer le bouton démarrer seulement si validation réussie
            if (!this.isRunning) {
                this.startBtn.disabled = false;
                this.startBtn.textContent = 'Démarrer';
            }
            
        } catch (error) {
            // Gérer les différents types d'erreurs
            console.error('Erreur validation lancement:', error);
            this.currentLancement = null;
            
            if (error.status === 409) {
                // Conflit : lancement déjà en cours par un autre opérateur
                this.lancementDetails.innerHTML = `
                    <strong>Code: ${code}</strong><br>
                    <small style="color: red;">❌ Lancement déjà en cours par un autre opérateur</small><br>
                    <small style="color: orange;">⚠️ Contactez l'administrateur pour résoudre le conflit</small>
                `;
                this.notificationManager.error(`Conflit : ${error.message}`);
                this.startBtn.disabled = true;
                this.startBtn.textContent = 'Conflit détecté';
            } else {
                // Autres erreurs (lancement non trouvé, etc.)
                this.lancementDetails.innerHTML = `
                    <strong>Code: ${code}</strong><br>
                    <small>❌ Lancement non trouvé dans la base de données LCTE</small><br>
                    <small>Veuillez vérifier le code de lancement</small>
                `;
                this.notificationManager.error('Code de lancement invalide - Non trouvé dans LCTE');
                this.startBtn.disabled = true;
                this.startBtn.textContent = 'Code invalide';
            }
            
            // Vider le champ après un délai
            setTimeout(() => {
                this.lancementInput.value = '';
                this.controlsSection.style.display = 'none';
            }, 3000);
        }
    }

    async checkCurrentOperation() {
        try {
            const operatorCode = this.operator.code || this.operator.id;
            console.log(`🔍 Vérification opération en cours pour opérateur: ${operatorCode}`);
            const currentOp = await this.apiService.getCurrentOperation(operatorCode);
            
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

        try {
            const operatorCode = this.operator.code || this.operator.id;
            
            if (this.isPaused) {
                // Reprendre l'opération en pause
                await this.apiService.resumeOperation(operatorCode, code);
                this.notificationManager.success('Opération reprise');
            } else {
                // Démarrer nouvelle opération
                await this.apiService.startOperation(operatorCode, code);
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
            const operatorCode = this.operator.code || this.operator.id;
            await this.apiService.pauseOperation(operatorCode, this.currentLancement.CodeLancement);
            
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
            
            const operatorCode = this.operator.code || this.operator.id;
            const result = await this.apiService.stopOperation(operatorCode, this.currentLancement.CodeLancement);
            
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
            const loadingRow = document.createElement('tr');
            loadingRow.innerHTML = '<td colspan="6" class="no-data"><i class="fas fa-spinner fa-spin"></i> Chargement en cours...</td>';
            this.operatorHistoryTableBody.innerHTML = '';
            this.operatorHistoryTableBody.appendChild(loadingRow);
            
            // Vérifier les propriétés de l'opérateur
            console.log('=== DEBUG OPÉRATEUR ===');
            console.log('Opérateur complet:', this.operator);
            console.log('Opérateur.id:', this.operator.id);
            console.log('Opérateur.code:', this.operator.code);
            console.log('Opérateur.coderessource:', this.operator.coderessource);
            console.log('Opérateur.nom:', this.operator.nom);
            
            const operatorCode = this.operator.code || this.operator.coderessource || this.operator.id;
            console.log('Code opérateur utilisé pour l\'API:', operatorCode);
            console.log('=== FIN DEBUG OPÉRATEUR ===');
            
            if (!operatorCode) {
                console.error('❌ Aucun code opérateur trouvé');
                const errorRow = document.createElement('tr');
                errorRow.className = 'empty-state-row';
                errorRow.innerHTML = `
                    <td colspan="6" class="empty-state">
                        <div style="text-align: center; padding: 3rem 2rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ffc107; margin-bottom: 1rem; display: block;"></i>
                            <p style="font-size: 1.1rem; color: #666; margin: 0.5rem 0; font-weight: 500;">
                                Code opérateur non trouvé
                            </p>
                            <p style="font-size: 0.9rem; color: #999; margin: 0;">
                                Impossible de charger l'historique. Veuillez vous reconnecter.
                            </p>
                        </div>
                    </td>
                `;
                this.operatorHistoryTableBody.innerHTML = '';
                this.operatorHistoryTableBody.appendChild(errorRow);
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
                const errorRow = document.createElement('tr');
                errorRow.className = 'empty-state-row';
                errorRow.innerHTML = `
                    <td colspan="6" class="empty-state">
                        <div style="text-align: center; padding: 3rem 2rem;">
                            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem; display: block;"></i>
                            <p style="font-size: 1.1rem; color: #666; margin: 0.5rem 0; font-weight: 500;">
                                Erreur lors du chargement
                            </p>
                            <p style="font-size: 0.9rem; color: #999; margin: 0;">
                                ${data.error || 'Une erreur est survenue lors du chargement de l\'historique'}
                            </p>
                        </div>
                    </td>
                `;
                this.operatorHistoryTableBody.innerHTML = '';
                this.operatorHistoryTableBody.appendChild(errorRow);
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement de l\'historique:', error);
            const connectionErrorRow = document.createElement('tr');
            connectionErrorRow.className = 'empty-state-row';
            connectionErrorRow.innerHTML = `
                <td colspan="6" class="empty-state">
                    <div style="text-align: center; padding: 3rem 2rem;">
                        <i class="fas fa-wifi" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem; display: block;"></i>
                        <p style="font-size: 1.1rem; color: #666; margin: 0.5rem 0; font-weight: 500;">
                            Erreur de connexion
                        </p>
                        <p style="font-size: 0.9rem; color: #999; margin: 0;">
                            Impossible de se connecter au serveur. Vérifiez votre connexion internet.
                        </p>
                    </div>
                </td>
            `;
            this.operatorHistoryTableBody.innerHTML = '';
            this.operatorHistoryTableBody.appendChild(connectionErrorRow);
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
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-state-row';
            emptyRow.innerHTML = `
                <td colspan="6" class="empty-state">
                    <div style="text-align: center; padding: 3rem 2rem;">
                        <i class="fas fa-history" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem; display: block;"></i>
                        <p style="font-size: 1.1rem; color: #666; margin: 0.5rem 0; font-weight: 500;">
                            Aucun lancement trouvé
                        </p>
                        <p style="font-size: 0.9rem; color: #999; margin: 0;">
                            Votre historique est vide. Démarrez une opération pour voir votre historique ici.
                        </p>
                    </div>
                </td>
            `;
            this.operatorHistoryTableBody.innerHTML = '';
            this.operatorHistoryTableBody.appendChild(emptyRow);
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

    // Gestion des commentaires
    handleCommentInput() {
        const comment = this.commentInput.value.trim();
        const charCount = comment.length;
        
        // Mettre à jour le compteur de caractères
        this.commentCharCount.textContent = charCount;
        
        // Changer la couleur selon le nombre de caractères
        this.commentCharCount.className = 'comment-counter';
        if (charCount > 1800) {
            this.commentCharCount.classList.add('danger');
        } else if (charCount > 1500) {
            this.commentCharCount.classList.add('warning');
        }
        
        // Activer/désactiver le bouton d'envoi
        this.addCommentBtn.disabled = charCount === 0 || charCount > 2000;
        
        // Mettre à jour le placeholder si nécessaire
        if (this.currentLancement) {
            this.commentInput.placeholder = `Ajouter un commentaire sur ${this.currentLancement.CodeLancement}...`;
        } else {
            this.commentInput.placeholder = 'Ajouter un commentaire sur cette opération...';
        }
    }

    async handleAddComment() {
        const comment = this.commentInput.value.trim();
        
        if (!comment) {
            this.notificationManager.error('Veuillez saisir un commentaire');
            return;
        }
        
        if (comment.length > 2000) {
            this.notificationManager.error('Le commentaire ne peut pas dépasser 2000 caractères');
            return;
        }
        
        if (!this.currentLancement) {
            this.notificationManager.error('Aucun lancement sélectionné pour ajouter un commentaire');
            return;
        }
        
        try {
            // Désactiver le bouton pendant l'envoi
            this.addCommentBtn.disabled = true;
            this.addCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
            
            const result = await this.apiService.addComment(
                this.operator.code || this.operator.id,
                this.operator.nom || this.operator.name,
                this.currentLancement.CodeLancement,
                comment
            );
            
            if (result.success) {
                this.notificationManager.success('Commentaire envoyé avec succès');
                
                // Afficher une notification spéciale pour l'admin
                this.showAdminNotification(comment, this.currentLancement.CodeLancement);
                
                // Vider le champ de commentaire
                this.commentInput.value = '';
                this.handleCommentInput();
                
                // Recharger les commentaires
                await this.loadComments();
                
                // Afficher un message si l'email n'a pas pu être envoyé
                if (!result.emailSent) {
                    this.notificationManager.warning('Commentaire enregistré - Vérifiez la console du serveur');
                }
            } else {
                this.notificationManager.error(result.error || 'Erreur lors de l\'envoi du commentaire');
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi du commentaire:', error);
            this.notificationManager.error('Erreur de connexion lors de l\'envoi du commentaire');
        } finally {
            // Réactiver le bouton
            this.addCommentBtn.disabled = false;
            this.addCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer Commentaire';
        }
    }

    async loadComments() {
        try {
            if (!this.currentLancement) {
                this.displayComments([]);
                return;
            }
            
            const result = await this.apiService.getCommentsByLancement(this.currentLancement.CodeLancement);
            
            if (result.success) {
                this.displayComments(result.data);
            } else {
                console.error('Erreur lors du chargement des commentaires:', result.error);
                this.displayComments([]);
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement des commentaires:', error);
            this.displayComments([]);
        }
    }

    displayComments(comments) {
        if (!this.commentsList) {
            console.warn('⚠️ commentsList non trouvé');
            return;
        }
        
        if (!comments || comments.length === 0) {
            this.commentsList.innerHTML = `
                <div class="no-comments">
                    <i class="fas fa-comment-slash"></i>
                    <p>Aucun commentaire pour le moment</p>
                </div>
            `;
            return;
        }
        
        // Trier les commentaires par date (plus récents en premier)
        const sortedComments = comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.commentsList.innerHTML = sortedComments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <div>
                        <span class="comment-author">${comment.operatorName || comment.operatorCode}</span>
                        <span class="comment-lancement">${comment.lancementCode}</span>
                    </div>
                    <div class="comment-timestamp">${this.formatCommentTimestamp(comment.timestamp)}</div>
                </div>
                <div class="comment-content">${this.escapeHtml(comment.comment)}</div>
                ${this.canDeleteComment(comment) ? `
                    <div class="comment-actions-item">
                        <button class="btn-comment btn-delete-comment" data-comment-id="${comment.id}">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Ajouter les event listeners pour les boutons de suppression
        this.commentsList.querySelectorAll('.btn-delete-comment').forEach(button => {
            button.addEventListener('click', (e) => {
                const commentId = parseInt(e.target.closest('.btn-delete-comment').dataset.commentId);
                this.deleteComment(commentId);
            });
        });
    }

    formatCommentTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('fr-FR', {
                timeZone: 'Europe/Paris',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return timestamp;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    canDeleteComment(comment) {
        // L'opérateur peut supprimer ses propres commentaires
        return comment.operatorCode === (this.operator.code || this.operator.id);
    }

    async deleteComment(commentId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
            return;
        }
        
        try {
            const result = await this.apiService.deleteComment(commentId, this.operator.code || this.operator.id);
            
            if (result.success) {
                this.notificationManager.success('Commentaire supprimé avec succès');
                await this.loadComments();
            } else {
                this.notificationManager.error(result.error || 'Erreur lors de la suppression du commentaire');
            }
            
        } catch (error) {
            console.error('Erreur lors de la suppression du commentaire:', error);
            this.notificationManager.error('Erreur de connexion lors de la suppression du commentaire');
        }
    }

    // Méthode pour recharger les commentaires quand un nouveau lancement est sélectionné
    async onLancementChanged() {
        await this.loadComments();
    }

    // Afficher une notification spéciale pour l'admin
    showAdminNotification(comment, lancementCode) {
        // Créer une notification persistante et visible
        const notification = document.createElement('div');
        notification.className = 'admin-notification';
        notification.innerHTML = `
            <div class="admin-notification-content">
                <div class="admin-notification-header">
                    <i class="fas fa-bell"></i>
                    <strong>NOUVEAU COMMENTAIRE SEDI</strong>
                    <button class="admin-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="admin-notification-body">
                    <p><strong>Lancement:</strong> ${lancementCode}</p>
                    <p><strong>Opérateur:</strong> ${this.operator.nom || this.operator.name}</p>
                    <p><strong>Commentaire:</strong> ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}</p>
                    <p><strong>Heure:</strong> ${new Date().toLocaleString('fr-FR')}</p>
                </div>
            </div>
        `;
        
        // Ajouter au body de la page
        document.body.appendChild(notification);
        
        // Auto-supprimer après 30 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    // ===== SCANNER DE CODE-BARRES =====
    
    async openScanner() {
        if (!this.scannerModal) {
            console.error('Modal scanner non trouvé');
            return;
        }
        
        this.scannerModal.style.display = 'flex';
        this.scannerStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Initialisation de la caméra...</span>';
        
        try {
            // Vérifier si QuaggaJS est disponible
            if (typeof Quagga === 'undefined') {
                throw new Error('QuaggaJS n\'est pas chargé. Vérifiez votre connexion internet.');
            }
            
            // Démarrer le scanner
            await this.startBarcodeScanner();
        } catch (error) {
            console.error('Erreur lors de l\'ouverture du scanner:', error);
            
            let errorMessage = error.message || 'Erreur inconnue';
            let userMessage = errorMessage;
            
            // Messages plus clairs pour l'utilisateur
            if (errorMessage.includes('Permission')) {
                userMessage = 'Permission d\'accès à la caméra requise. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.';
            } else if (errorMessage.includes('Aucune caméra')) {
                userMessage = 'Aucune caméra détectée sur cet appareil. Veuillez connecter une caméra ou utiliser un autre appareil.';
            } else if (errorMessage.includes('déjà utilisée')) {
                userMessage = 'La caméra est déjà utilisée par une autre application. Veuillez fermer les autres applications utilisant la caméra.';
            }
            
            this.scannerStatus.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem; display: block;"></i>
                    <p style="color: #dc3545; font-weight: 500; margin-bottom: 0.5rem;">Erreur d'accès à la caméra</p>
                    <p style="color: #666; font-size: 0.9rem; margin: 0;">${userMessage}</p>
                </div>
            `;
            
            this.notificationManager.error(userMessage);
            
            // Fermer le scanner après un délai
            setTimeout(() => {
                this.closeScanner();
            }, 5000);
        }
    }
    
    async startBarcodeScanner() {
        // Vérifier si l'API MediaDevices est disponible (avec fallback pour anciens navigateurs)
        const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
        const hasLegacyGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        
        if (!hasMediaDevices && !hasLegacyGetUserMedia) {
            throw new Error('L\'accès à la caméra n\'est pas supporté par ce navigateur. Veuillez utiliser un navigateur moderne (Chrome, Firefox, Safari, Edge).');
        }
        
        // Vérifier si on est en HTTPS (requis pour getUserMedia sauf localhost)
        // Note: on laisse passer pour permettre le test, le navigateur bloquera si nécessaire
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            console.warn('⚠️ Connexion non-HTTPS détectée. L\'accès à la caméra peut être bloqué par le navigateur.');
            // On continue quand même, le navigateur gérera la sécurité
        }
        
        // Demander les permissions et vérifier les caméras disponibles
        try {
            // Utiliser l'API moderne si disponible, sinon fallback
            let getUserMediaFunc;
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                getUserMediaFunc = (constraints) => navigator.mediaDevices.getUserMedia(constraints);
            } else if (navigator.getUserMedia) {
                getUserMediaFunc = (constraints) => new Promise((resolve, reject) => {
                    navigator.getUserMedia(constraints, resolve, reject);
                });
            } else if (navigator.webkitGetUserMedia) {
                getUserMediaFunc = (constraints) => new Promise((resolve, reject) => {
                    navigator.webkitGetUserMedia(constraints, resolve, reject);
                });
            } else {
                throw new Error('API de caméra non disponible');
            }
            
            // Demander l'accès à la caméra pour obtenir les permissions
            const stream = await getUserMediaFunc({ video: true });
            // Libérer immédiatement le stream, on va le récupérer via Quagga
            if (stream && stream.getTracks) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // Maintenant on peut énumérer les devices (si l'API est disponible)
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    
                    if (videoDevices.length === 0) {
                        console.warn('Aucune caméra détectée via enumerateDevices');
                    } else {
                        console.log(`${videoDevices.length} caméra(s) disponible(s)`);
                    }
                } catch (enumError) {
                    console.warn('Impossible d\'énumérer les devices:', enumError);
                }
            }
        } catch (error) {
            // Si c'est une erreur de permission, on la gère plus tard
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                throw new Error('Permission d\'accès à la caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Aucune caméra détectée sur cet appareil');
            } else if (error.name === 'NotReadableError') {
                throw new Error('La caméra est déjà utilisée par une autre application');
            }
            // Pour les autres erreurs, on continue quand même
            console.warn('Impossible de vérifier les caméras:', error);
        }
        
        // Essayer différentes configurations de caméra
        const cameraConfigs = [
            { facingMode: "environment" }, // Caméra arrière (priorité pour mobile)
            { facingMode: "user" },         // Caméra avant
            {}                              // Aucune préférence (première caméra disponible)
        ];
        
        for (let i = 0; i < cameraConfigs.length; i++) {
            try {
                const config = cameraConfigs[i];
                console.log(`Tentative ${i + 1}/${cameraConfigs.length} avec config:`, config);
                
                const result = await this.tryInitQuagga(config);
                return result;
            } catch (error) {
                console.warn(`Tentative ${i + 1} échouée:`, error);
                
                // Si c'est la dernière tentative, rejeter avec un message clair
                if (i === cameraConfigs.length - 1) {
                    let errorMessage = 'Impossible d\'accéder à la caméra. ';
                    
                    if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
                        errorMessage += 'Aucune caméra disponible ou caméra déjà utilisée par une autre application.';
                    } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                        errorMessage += 'Permission d\'accès à la caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.';
                    } else if (error.name === 'OverconstrainedError') {
                        errorMessage += 'Les paramètres de la caméra ne sont pas supportés par cet appareil.';
                    } else {
                        errorMessage += error.message || 'Erreur inconnue.';
                    }
                    
                    throw new Error(errorMessage);
                }
            }
        }
    }
    
    async tryInitQuagga(constraints) {
        return new Promise((resolve, reject) => {
            // Configuration QuaggaJS pour les code-barres EAN, CODE128, etc.
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: this.scannerViewport,
                    constraints: {
                        width: { min: 320, ideal: 640, max: 1280 },
                        height: { min: 240, ideal: 480, max: 720 },
                        ...constraints
                    }
                },
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: 2,
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader",
                        "code_39_vin_reader",
                        "codabar_reader",
                        "upc_reader",
                        "upc_e_reader",
                        "i2of5_reader"
                    ]
                },
                locate: true
            }, (err) => {
                if (err) {
                    console.error('Erreur initialisation Quagga:', err);
                    reject(err);
                    return;
                }
                
                console.log('Scanner initialisé avec succès');
                Quagga.start();
                this.scannerActive = true;
                this.scannerInstance = Quagga;
                
                this.scannerStatus.innerHTML = '<i class="fas fa-check-circle" style="color: green;"></i> <span style="color: green;">Caméra active - Scannez un code-barres</span>';
                
                // Écouter les résultats de scan
                Quagga.onDetected((result) => {
                    if (result && result.codeResult && result.codeResult.code) {
                        const scannedCode = result.codeResult.code.trim();
                        console.log('Code scanné:', scannedCode);
                        this.handleScannedCode(scannedCode);
                    }
                });
                
                resolve();
            });
        });
    }
    
    handleScannedCode(scannedCode) {
        // Empêcher les scans multiples rapides
        if (this.isProcessingScan) {
            console.log('Scan déjà en cours de traitement, ignoré');
            return;
        }
        this.isProcessingScan = true;
        
        try {
            // Nettoyer le code scanné (enlever les espaces, caractères spéciaux, etc.)
            let cleanCode = scannedCode.trim().replace(/[\s\-_\.]/g, '');
            
            console.log('Code scanné brut:', scannedCode);
            console.log('Code nettoyé:', cleanCode);
            
            // Validation basique : le code doit contenir au moins des caractères alphanumériques
            if (!cleanCode || cleanCode.length < 3) {
                throw new Error('Code scanné trop court ou invalide');
            }
            
            // Si le code ne commence pas par "LT", l'ajouter
            const upperCode = cleanCode.toUpperCase();
            if (!upperCode.startsWith('LT')) {
                // Si c'est juste des chiffres, ajouter "LT"
                if (/^\d+$/.test(cleanCode)) {
                    cleanCode = 'LT' + cleanCode;
                } else if (upperCode.includes('LT')) {
                    // Si "LT" est présent ailleurs, le déplacer au début
                    cleanCode = 'LT' + cleanCode.replace(/LT/gi, '');
                } else {
                    // Sinon, ajouter "LT" au début
                    cleanCode = 'LT' + cleanCode;
                }
            }
            
            // Normaliser en majuscules
            cleanCode = cleanCode.toUpperCase();
            
            // Validation finale : format attendu LT + chiffres
            if (!/^LT\d+$/.test(cleanCode)) {
                console.warn('Format de code non standard:', cleanCode);
                // On accepte quand même mais on log un avertissement
            }
            
            console.log('Code final après traitement:', cleanCode);
            
            // Mettre le code dans le champ de saisie et le normaliser
            this.lancementInput.value = cleanCode;
            const normalizedCode = this.enforceNumericLancementInput();
            this.handleLancementInput();
            
            // Fermer le scanner
            this.closeScanner();
            
            // Notification de succès
            this.notificationManager.success(`Code scanné: ${normalizedCode}`);
            
            // Valider automatiquement le lancement après un court délai
            setTimeout(() => {
                this.validateAndSelectLancement();
                this.isProcessingScan = false;
            }, 500);
            
        } catch (error) {
            console.error('Erreur lors du traitement du code scanné:', error);
            this.notificationManager.error(`Erreur scan: ${error.message}`);
            this.isProcessingScan = false;
            // Ne pas fermer le scanner en cas d'erreur pour permettre un nouveau scan
        }
    }
    
    closeScanner() {
        if (this.scannerActive && this.scannerInstance) {
            try {
                this.scannerInstance.stop();
                this.scannerInstance = null;
                this.scannerActive = false;
            } catch (error) {
                console.error('Erreur lors de l\'arrêt du scanner:', error);
            }
        }
        
        if (this.scannerModal) {
            this.scannerModal.style.display = 'none';
        }
        
        this.scannerStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Initialisation de la caméra...</span>';
    }
}

export default OperateurInterface;