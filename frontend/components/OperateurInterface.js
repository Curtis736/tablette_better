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
        
        // Éléments pour les commentaires
        this.commentInput = document.getElementById('commentInput');
        this.addCommentBtn = document.getElementById('addCommentBtn');
        this.commentCharCount = document.getElementById('commentCharCount');
        this.commentsList = document.getElementById('commentsList');
        
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

        // Focus automatique et positionnement après "LT" à chaque interaction
        this.lancementInput.addEventListener('click', (e) => {
            if (e.target.value === 'LT') {
                setTimeout(() => {
                    e.target.setSelectionRange(2, 2);
                }, 10);
            }
        });

        // Focus automatique au chargement de la page
        this.lancementInput.addEventListener('load', () => {
            this.lancementInput.focus();
            this.lancementInput.setSelectionRange(2, 2);
        });
    }

    setupEventListeners() {
        // Validation du code de lancement en temps réel avec auto-vérification
        this.lancementInput.addEventListener('input', () => this.handleLancementInput());
        this.lancementInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                this.validateAndSelectLancement();
            }
        });
        
        // Gestion de la saisie du code de lancement
        this.lancementInput.addEventListener('input', () => {
            this.handleLancementInput();
        });
        
        // Contrôles de lancement
        this.startBtn.addEventListener('click', () => this.handleStart());
        this.pauseBtn.addEventListener('click', () => this.handlePause());
        this.stopBtn.addEventListener('click', () => this.handleStop());
        
        // Bouton actualiser historique
        this.refreshHistoryBtn.addEventListener('click', () => this.loadOperatorHistory());
        
        // Gestion des commentaires
        this.commentInput.addEventListener('input', () => this.handleCommentInput());
        this.addCommentBtn.addEventListener('click', () => this.handleAddComment());
    }

    handleLancementInput() {
        const code = this.lancementInput.value.trim();
        
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
            this.operatorHistoryTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Chargement en cours...</td></tr>';
            
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
}

export default OperateurInterface;