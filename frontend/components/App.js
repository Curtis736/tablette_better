// Classe principale de l'application
import OperateurInterface from './OperateurInterface.js?v=20251010-fixed';
import AdminPage from './AdminPage.js?v=20251007-final';
import ApiService from '../services/ApiService.js?v=20251007-final';
import StorageService from '../services/StorageService.js?v=20251007-final';
import notificationManager from '../utils/NotificationManager.js';

class App {
    constructor() {
        this.currentScreen = 'login';
        this.currentOperator = null;
        this.isAdmin = false;
        this.operateurInterface = null;
        this.adminPage = null;
        this.apiService = new ApiService();
        this.storageService = new StorageService();
        this.notificationManager = notificationManager;
        
        // Rendre notificationManager accessible globalement
        window.notificationManager = notificationManager;
        
        this.initializeApp();
        this.setupEventListeners();
    }

    initializeApp() {
        // Vérifier si un opérateur est déjà connecté
        const savedOperator = this.storageService.getCurrentOperator();
        if (savedOperator) {
            this.currentOperator = savedOperator;
            this.showOperatorScreen();
        } else {
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Gestion de la connexion
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
        
        // Navigation entre les écrans
        document.getElementById('backToOperatorBtn').addEventListener('click', () => this.showOperatorScreen());
        document.getElementById('adminModeBtn').addEventListener('click', () => this.showAdminLoginScreen());
        
        // Bouton retour de la page admin login
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => this.showLoginScreen());
        }
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'a') {
                e.preventDefault();
                this.showAdminLoginScreen();
            }
        });

        // Gestion des erreurs globales
        window.addEventListener('error', (e) => {
            console.error('Erreur globale:', e.error);
            notificationManager.error('Une erreur inattendue s\'est produite');
        });

        // Vérification de la connexion
        setInterval(() => {
            if (this.currentOperator) {
                this.apiService.healthCheck()
                    .catch(() => {
                        notificationManager.error('Connexion au serveur perdue');
                    });
            }
        }, 30000);
    }

    async handleLogin(e) {
        e.preventDefault();
        const operatorCode = document.getElementById('operatorCode').value.trim();
        
        if (!operatorCode) {
            notificationManager.error('Veuillez saisir un code opérateur');
            return;
        }
        
        try {
            this.showLoading(true);
            const operator = await this.apiService.getOperator(operatorCode);
            
            this.currentOperator = operator;
            this.storageService.setCurrentOperator(operator);
            this.showOperatorScreen();
            notificationManager.success(`Bienvenue ${operator.nom}`);
        } catch (error) {
            console.error('Erreur de connexion:', error);
            notificationManager.error(error.message || 'Erreur de connexion au serveur');
        } finally {
            this.showLoading(false);
        }
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value.trim();
        
        if (!username || !password) {
            notificationManager.error('Veuillez saisir le nom d\'utilisateur et le mot de passe');
            return;
        }
        
        try {
            console.log('🔐 Tentative de connexion admin:', username);
            this.showLoading(true);
            const response = await this.apiService.adminLogin(username, password);
            
            console.log('📡 Réponse du serveur:', response);
            
            if (response.success) {
                console.log('✅ Connexion admin réussie');
                this.isAdmin = true;
                this.showAdminScreen();
                notificationManager.success(`Bienvenue ${response.user.name}`);
            } else {
                console.log('❌ Identifiants invalides');
                notificationManager.error('Identifiants invalides');
            }
        } catch (error) {
            console.error('❌ Erreur de connexion admin:', error);
            notificationManager.error(error.message || 'Erreur de connexion au serveur');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        this.currentOperator = null;
        this.isAdmin = false;
        this.storageService.clearCurrentOperator();
        this.showLoginScreen();
        notificationManager.info('Déconnexion réussie');
    }

    showLoginScreen() {
        this.hideAllScreens();
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('operatorCode').value = '';
        this.currentScreen = 'login';
    }

    showOperatorScreen() {
        this.hideAllScreens();
        document.getElementById('operatorScreen').classList.add('active');
        this.currentScreen = 'operator';
        
        if (this.currentOperator) {
            document.getElementById('currentOperator').textContent = this.currentOperator.nom;
            
            if (!this.operateurInterface) {
                this.operateurInterface = new OperateurInterface(this.currentOperator, this);
            }
            this.operateurInterface.loadLancements();
        }
    }

    showAdminLoginScreen() {
        this.hideAllScreens();
        document.getElementById('adminLoginScreen').classList.add('active');
        this.currentScreen = 'adminLogin';
        document.getElementById('adminUsername').value = '';
        document.getElementById('adminPassword').value = '';
    }

    showAdminScreen() {
        console.log('🔄 App.showAdminScreen() - Début');
        this.hideAllScreens();
        document.getElementById('adminScreen').classList.add('active');
        this.currentScreen = 'admin';
        
        console.log('🏗️ Création/récupération AdminPage...');
        
        // Attendre que l'écran soit complètement affiché avant de créer AdminPage
        setTimeout(() => {
            if (!this.adminPage) {
                console.log('🆕 Création nouvelle AdminPage');
                this.adminPage = new AdminPage(this);
                // Rendre adminPage accessible globalement pour la pagination
                window.adminPage = this.adminPage;
            } else {
                console.log('♻️ Utilisation AdminPage existante');
            }
            
            console.log('📊 Chargement des données admin...');
            this.adminPage.loadData();
        }, 200);
        console.log('✅ App.showAdminScreen() - Terminé');
    }

    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }

    getApiService() {
        return this.apiService;
    }

    getNotificationManager() {
        return this.notificationManager;
    }

    getStorageService() {
        return this.storageService;
    }

    getNotificationManager() {
        return notificationManager;
    }

    showNotification(message, type = 'info') {
        notificationManager.show(message, type);
    }

    showLoading(show) {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (show) {
                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.setAttribute('data-original-text', originalText);
                btn.innerHTML = '<span class="loading"></span> Chargement...';
            } else {
                btn.disabled = false;
                const originalText = btn.getAttribute('data-original-text');
                if (originalText) {
                    btn.innerHTML = originalText;
                }
            }
        });
    }

    getCurrentOperator() {
        return this.currentOperator;
    }

    getCurrentScreen() {
        return this.currentScreen;
    }
}

export default App;