# 📚 DOCUMENTATION COMPLÈTE - SEDI TABLETTE

## 🎯 Vue d'ensemble du projet

**SEDI Tablette** est une application web de gestion des opérations de production via tablette, intégrée à l'ERP SEDI. Elle permet aux opérateurs de gérer leurs lancements de production avec des fonctionnalités de pause/reprise et aux administrateurs de suivre les opérations en temps réel.

---

## 📁 Structure du projet

```
tablettev2/
├── 📂 backend/                    # API Node.js + Express
├── 📂 frontend/                   # Interface web vanilla JS
├── 📂 docker/                     # Configuration Docker
├── 📂 docs/                       # Documentation
├── 📂 scripts/                    # Scripts utilitaires
├── 📄 README.md                   # Documentation principale
├── 📄 GUIDE-DEMARRAGE.md          # Guide de démarrage
└── 📄 package.json               # Configuration racine
```

---

## 🔧 BACKEND - API Node.js

### 📄 `backend/server.js`
**Point d'entrée principal du serveur API**

**Fonctionnalités :**
- Configuration Express avec middleware de sécurité (Helmet, CORS)
- Rate limiting (100 req/15min en prod, 1000 en dev)
- Gestion des routes API
- Gestion des erreurs globales
- Health check endpoint
- Logging avec Morgan

**Ports :** 3000 (développement), 3001 (production)

### 📄 `backend/config/database.js`
**Configuration de la base de données SQL Server**

**Fonctionnalités :**
- Connexion à SQL Server (SERVEURERP)
- Pool de connexions (max 10, min 0)
- Fonctions utilitaires : `executeQuery`, `executeProcedure`, `executeNonQuery`
- Gestion des erreurs de connexion
- Mode test avec données simulées

**Tables utilisées :**
- `SEDI_ERP.dbo.RESSOURC` (opérateurs)
- `SEDI_ERP.dbo.LCTE` (lancements)
- `SEDI_APP_INDEPENDANTE.dbo.ABHISTORIQUE_OPERATEURS` (historique)
- `SEDI_APP_INDEPENDANTE.dbo.ABSESSIONS_OPERATEURS` (sessions)
- `SEDI_APP_INDEPENDANTE.dbo.ABTEMPS_OPERATEURS` (temps)

### 📂 `backend/routes/` - Routes API

#### 📄 `operations.js` ⭐ **FICHIER PRINCIPAL**
**Gestion des opérations de production**

**Endpoints :**
- `POST /start` - Démarrer une opération (utilise 3 tables)
- `POST /pause` - Mettre en pause
- `POST /resume` - Reprendre
- `POST /stop` - Terminer (calcule les durées)
- `GET /current/:operatorId` - État actuel
- `POST /create-session` - Créer session opérateur
- `POST /close-session` - Fermer session
- `POST /update-temps` - Mettre à jour les temps
- `GET /dashboard/:operatorId` - Vue d'ensemble 3 tables

**Logique métier :**
- Validation des codes lancement dans LCTE
- Gestion des sessions opérateurs
- Calcul automatique des durées
- Gestion des pauses/reprises
- Intégration avec 3 tables SEDI_APP_INDEPENDANTE

#### 📄 `admin.js` ⭐ **FICHIER PRINCIPAL**
**Interface d'administration complète**

**Endpoints :**
- `GET /` - Dashboard admin avec stats et opérations
- `GET /operations` - Liste paginée des opérations
- `GET /stats` - Statistiques uniquement
- `GET /export/:format` - Export CSV
- `PUT /operations/:id` - Modifier une opération
- `POST /operations` - Ajouter une opération
- `DELETE /operations/:id` - Supprimer une opération
- `GET /operators` - Opérateurs connectés
- `GET /operators/:code/operations` - Opérations d'un opérateur
- `GET /validate-lancement/:code` - Valider un code lancement

**Fonctionnalités avancées :**
- Regroupement des événements par lancement
- Gestion des pauses séparées
- Calcul des durées et temps productifs
- Validation des codes lancement
- Gestion des tables SEDI_APP_INDEPENDANTE
- Debug et maintenance des données

#### 📄 `auth.js`
**Authentification simple**

**Endpoints :**
- `POST /login` - Connexion admin (admin/admin)
- `POST /logout` - Déconnexion
- `GET /verify` - Vérifier session

#### 📄 `operators.js`
**Gestion des opérateurs**

**Endpoints :**
- `GET /:code` - Récupérer un opérateur par code
- `GET /` - Liste des opérateurs

#### 📄 `lancements.js`
**Gestion des lancements**

**Endpoints :**
- `GET /` - Liste des lancements
- `GET /:code` - Détails d'un lancement

### 📂 `backend/tests/` - Tests automatisés

#### 📄 `health.test.js`
**Tests de santé de base**
- Health check endpoint
- Headers de sécurité
- Gestion des erreurs 404
- Performance de base

#### 📄 `integration.test.js`
**Tests d'intégration**
- Connectivité base de données
- Intégration endpoints
- Gestion des erreurs
- Rate limiting

#### 📄 `security.test.js`
**Tests de sécurité**
- Protection SQL injection
- Protection XSS
- Validation des données
- Headers de sécurité

#### 📄 `performance.test.js`
**Tests de performance**
- Temps de réponse
- Tests de charge
- Tests de mémoire
- Performance base de données

#### 📄 `setup.js` & `testSequencer.js`
**Configuration des tests**
- Configuration Jest
- Séquenceur optimisé
- Gestion des timeouts

### 📄 `backend/package.json`
**Configuration du backend**

**Scripts disponibles :**
- `npm start` - Démarrage production
- `npm run dev` - Démarrage développement
- `npm test` - Tous les tests
- `npm run test:health` - Tests de santé
- `npm run test:integration` - Tests d'intégration
- `npm run test:security` - Tests de sécurité
- `npm run test:performance` - Tests de performance
- `npm run test:coverage` - Tests avec couverture

**Dépendances principales :**
- Express, CORS, Helmet (API)
- MSSQL (base de données)
- Jest, Supertest (tests)
- Morgan (logging)
- Joi (validation)

---

## 🎨 FRONTEND - Interface Web

### 📄 `frontend/index.html`
**Page HTML principale**

**Structure :**
- Écran de connexion opérateur
- Écran de connexion admin
- Interface opérateur avec contrôles
- Interface admin avec tableau de bord
- Responsive design pour tablettes

**Fonctionnalités :**
- Connexion par code opérateur
- Mode administrateur (code 929)
- Interface tactile optimisée
- Gestion des sessions

### 📄 `frontend/app.js` ⭐ **FICHIER PRINCIPAL**
**Classe principale de l'application**

**Fonctionnalités :**
- Gestion des écrans (login, opérateur, admin)
- Authentification opérateur et admin
- Navigation entre interfaces
- Gestion des notifications
- Gestion du loading
- Raccourcis clavier (Ctrl+A pour admin)

### 📂 `frontend/components/` - Composants

#### 📄 `OperateurInterface.js` ⭐ **FICHIER PRINCIPAL**
**Interface opérateur simplifiée**

**Fonctionnalités :**
- Saisie manuelle des codes lancement
- Validation en temps réel dans LCTE
- Contrôles : Démarrer, Pause, Reprendre, Terminer
- Timer en temps réel
- Historique des opérations
- Gestion des erreurs et notifications
- Debouncing pour éviter les clics répétés

**Logique métier :**
- Validation des codes lancement
- Gestion des états (en cours, en pause, terminé)
- Calcul des durées
- Synchronisation avec l'API

#### 📄 `AdminPage.js` ⭐ **FICHIER PRINCIPAL**
**Interface d'administration complète**

**Fonctionnalités :**
- Dashboard avec statistiques temps réel
- Tableau des opérations avec pagination
- Filtres par opérateur, statut, période
- Édition inline des heures
- Ajout/suppression d'opérations
- Export CSV
- Gestion des pauses séparées
- Validation automatique des codes
- Sauvegarde automatique

**Fonctionnalités avancées :**
- Système de sauvegarde automatique
- Validation des codes lancement
- Gestion des heures incohérentes
- Debug et maintenance
- Tests de connectivité

#### 📄 `App.js` (ancien)
**Ancienne version de l'application principale**

### 📂 `frontend/services/` - Services

#### 📄 `ApiService.js`
**Service de communication avec l'API**

**Méthodes :**
- `getOperator(code)` - Récupérer opérateur
- `getLancement(code)` - Valider lancement
- `startOperation(operatorId, code)` - Démarrer opération
- `pauseOperation(operatorId, code)` - Mettre en pause
- `resumeOperation(operatorId, code)` - Reprendre
- `stopOperation(operatorId, code)` - Terminer
- `getCurrentOperation(operatorId)` - État actuel
- `adminLogin(username, password)` - Connexion admin
- `getAdminData()` - Données admin
- `updateOperation(id, data)` - Modifier opération
- `deleteOperation(id)` - Supprimer opération

#### 📄 `StorageService.js`
**Service de stockage local**

**Méthodes :**
- `setCurrentOperator(operator)` - Sauvegarder opérateur
- `getCurrentOperator()` - Récupérer opérateur
- `clearCurrentOperator()` - Effacer opérateur

### 📂 `frontend/utils/` - Utilitaires

#### 📄 `TimeUtils.js`
**Utilitaires de gestion du temps**

**Fonctionnalités :**
- Formatage des durées (HH:MM:SS)
- Calcul des durées
- Conversion minutes/secondes
- Gestion des fuseaux horaires

#### 📄 `NotificationManager.js`
**Gestionnaire de notifications**

**Types :**
- Success (vert)
- Error (rouge)
- Warning (jaune)
- Info (bleu)

### 📄 `frontend/assets/styles.css`
**Feuille de style principale**

**Fonctionnalités :**
- Design responsive pour tablettes
- Interface tactile optimisée
- Animations et transitions
- Thème SEDI (couleurs, typographie)
- Styles pour les différents états

### 📄 `frontend/package.json`
**Configuration du frontend**

**Scripts :**
- `npm start` - Serveur de développement
- `npm run dev` - Mode développement

**Dépendances :**
- http-server (serveur statique)

---

## 🐳 DOCKER - Conteneurisation

### 📄 `docker/docker-compose.yml`
**Configuration production**

**Services :**
- `sedi-backend` - API Node.js (port 3001)
- `sedi-frontend` - Nginx (port 80)
- `sedi-network` - Réseau Docker
- `sedi-logs` - Volume pour logs

**Fonctionnalités :**
- Health checks
- Restart automatique
- Volumes persistants
- Labels de traçabilité

### 📄 `docker/docker-compose.dev.yml`
**Configuration développement**

**Services :**
- `sedi-backend-dev` - API avec hot reload
- `sedi-frontend-dev` - Nginx avec volumes
- `sedi-dev-network` - Réseau développement

**Fonctionnalités :**
- Volumes de développement
- Port de debug Node.js (9229)
- Mode debug activé

### 📄 `docker/Dockerfile.backend`
**Image Docker pour le backend**

**Stages :**
- `base` - Image Node.js 18 Alpine
- `dependencies` - Installation dépendances
- `development` - Mode développement
- `production` - Mode production

**Fonctionnalités :**
- Multi-stage build
- Utilisateur non-root
- Health check
- Labels de traçabilité

### 📄 `docker/Dockerfile.frontend`
**Image Docker pour le frontend**

**Base :** Nginx 1.25 Alpine

**Fonctionnalités :**
- Utilisateur non-root
- Compression gzip
- Optimisation fichiers statiques
- Health check

### 📄 `docker/nginx.conf`
**Configuration Nginx optimisée**

**Fonctionnalités :**
- Proxy vers backend
- Compression gzip
- Rate limiting
- Headers de sécurité
- Cache optimisé pour tablettes
- Gestion des erreurs

### 📄 `docker/nginx.dev.conf`
**Configuration Nginx développement**

**Fonctionnalités :**
- Configuration simplifiée
- Pas de cache
- Logs détaillés

---

## 📚 DOCS - Documentation

### 📄 `docs/API.md`
**Documentation complète de l'API**

**Sections :**
- Base URL et authentification
- Endpoints opérateurs
- Endpoints lancements
- Endpoints opérations
- Endpoints administration
- Codes d'erreur
- Rate limiting
- Headers de sécurité
- Format des dates/durées
- Pagination et filtrage

### 📄 `docs/DATABASE_FLOW.md`
**Flux de données et architecture BDD**

**Tables :**
- `GPSQL.abetemps_temp` - Lancements disponibles
- `GPSQL.abetemps_temps` - Opérations en cours
- `GPSQL.abetemps_pause` - Pauses détaillées
- `GPSQL.abetemps` - Opérations terminées

**Flux :**
- Sélection lancement
- Démarrage opération
- Mise en pause
- Fin d'opération
- Intégration SILOG

### 📄 `docs/TESTS.md`
**Documentation des tests**

**Types de tests :**
- Tests de santé (rapides)
- Tests d'intégration (moyens)
- Tests de sécurité (lents)
- Tests de performance (très lents)

**Configuration :**
- Jest avec seuils de couverture
- Séquenceur optimisé
- Scripts npm
- Intégration CI/CD

---

## 🚀 SCRIPTS - Utilitaires

### 📄 `start.bat`
**Script de démarrage Windows**

**Fonctionnalités :**
- Arrêt des processus existants
- Démarrage backend (port 3000)
- Démarrage frontend (port 8080)
- Ouverture automatique du navigateur

### 📄 `start-servers.bat`
**Script de démarrage serveurs**

**Fonctionnalités :**
- Démarrage séquentiel
- Messages informatifs
- Ouverture automatique

### 📄 `test-pause-reprise.js`
**Script de test pause/reprise**

**Fonctionnalités :**
- Test de la logique pause/reprise
- Debug des paires pause/reprise
- Validation des données

### 📄 `scripts/validate.sh`
**Script de validation complète**

**Modes :**
- `--quick` - Validation rapide
- `--full` - Validation complète
- `--security` - Tests de sécurité
- `--performance` - Tests de performance

**Fonctionnalités :**
- Vérification prérequis
- Installation dépendances
- Exécution tests
- Tests Docker
- Génération rapports

---

## 📄 FICHIERS RACINE

### 📄 `README.md` ⭐ **FICHIER PRINCIPAL**
**Documentation principale du projet**

**Sections :**
- Résumé du projet
- Fonctionnalités implémentées
- Architecture base de données
- Guide de démarrage
- Configuration
- Structure du projet
- Flux des opérations
- Dépannage
- API endpoints
- Statut du projet

### 📄 `GUIDE-DEMARRAGE.md`
**Guide de démarrage rapide**

**Sections :**
- Démarrage automatique
- Démarrage manuel
- Accès aux interfaces
- Dépannage
- Fonctionnalités disponibles

### 📄 `package.json`
**Configuration racine du projet**

**Scripts :**
- `npm start` - Démarrage backend
- `npm run start:backend` - Backend uniquement
- `npm run start:frontend` - Frontend uniquement
- `npm run dev` - Mode développement

---

## 🎯 FICHIERS PRINCIPAUX À RETENIR

### ⭐ **FICHIERS CRITIQUES**

1. **`backend/routes/operations.js`** - Logique métier principale
2. **`backend/routes/admin.js`** - Interface d'administration
3. **`frontend/components/OperateurInterface.js`** - Interface opérateur
4. **`frontend/components/AdminPage.js`** - Interface admin
5. **`backend/config/database.js`** - Configuration BDD
6. **`README.md`** - Documentation principale

### 🔧 **FICHIERS DE CONFIGURATION**

1. **`docker/docker-compose.yml`** - Production
2. **`docker/docker-compose.dev.yml`** - Développement
3. **`backend/package.json`** - Dépendances backend
4. **`frontend/package.json`** - Dépendances frontend

### 📚 **FICHIERS DE DOCUMENTATION**

1. **`docs/API.md`** - Documentation API
2. **`docs/DATABASE_FLOW.md`** - Flux de données
3. **`docs/TESTS.md`** - Tests automatisés

---

## 🚀 DÉMARRAGE RAPIDE

### Option 1 : Script automatique
```bash
# Windows
start.bat

# Linux/Mac
./scripts/validate.sh --quick
```

### Option 2 : Manuel
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

### Option 3 : Docker
```bash
cd docker
docker-compose up -d
```

---

## 🌐 ACCÈS

- **Frontend** : http://localhost:8080
- **Backend API** : http://localhost:3000
- **Code Admin** : 929

---

## 📊 STATUT DU PROJET

✅ **Terminé et fonctionnel**
- Interface opérateur simplifiée
- Stockage en base de données réel
- Lecture des données ERP existantes
- Interface admin avec statistiques
- Scripts de démarrage automatique
- Tests automatisés complets
- Configuration Docker
- Documentation complète

---

**Développé pour SEDI ERP - Interface Tablette Production** 🏭📱

