# 🏭 SEDI TABLETTE - Interface de Gestion des Opérations

## 📋 **RÉSUMÉ DU PROJET**

Application web pour la gestion des opérations de production via tablette, intégrée à l'ERP SEDI.

### ✅ **FONCTIONNALITÉS IMPLÉMENTÉES**

- **Interface Opérateur** : Saisie manuelle de code de lancement, démarrage, pause, reprise, arrêt
- **Interface Admin** : Statistiques et suivi des opérations (code 929)
- **Stockage BDD** : Utilisation de `SEDI_APP_INDEPENDANTE.ABHISTORIQUE_OPERATEURS`
- **Lecture des données** : Intégration avec `RESSOURC`, `LCTE`, `abetemps_temp`, `abetemps_Pause`

### 🗄️ **ARCHITECTURE BASE DE DONNÉES**

**Tables utilisées :**
- **`[SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]`** : Stockage des opérations (INSERT autorisé)
- **`[SEDI_ERP].[dbo].[RESSOURC]`** : Informations opérateurs (lecture seule)
- **`[SEDI_ERP].[dbo].[LCTE]`** : Informations lancements (lecture seule)
- **`[SEDI_ERP].[GPSQL].[abetemps_temp]`** : Données temporaires (lecture seule)
- **`[SEDI_ERP].[GPSQL].[abetemps_Pause]`** : Historique pauses (lecture seule)

**Structure ABHISTORIQUE_OPERATEURS :**
```sql
NoEnreg          -- ID auto-increment
Ident            -- DEBUT, PAUSE, REPRISE, FIN
DateTravail      -- Timestamp de l'action
CodeLanctImprod  -- Code du lancement
Phase            -- Phase de l'opération
CodeRubrique     -- ID de l'opérateur
Statut           -- ACTIF, PAUSE, TERMINE
DateCreation     -- Date de création
```

## 🚀 **DÉMARRAGE RAPIDE**

### **Option 1 : Script automatique (RECOMMANDÉ)**
```bash
# Double-cliquez sur le fichier
start.bat
```

### **Option 2 : Commandes manuelles**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

### **Option 3 : Depuis la racine**
```bash
npm run start:backend    # Démarre le backend
npm run start:frontend   # Démarre le frontend
```

## 🌐 **ACCÈS À L'APPLICATION**

- **Frontend** : http://localhost:8080
- **Backend API** : http://localhost:3000
- **Code Admin** : **929**

## 📱 **UTILISATION**

### **Interface Opérateur**
1. Saisir le code de lancement
2. Appuyer sur **Entrée** ou cliquer **Démarrer**
3. Utiliser **Pause** / **Reprendre** / **Terminer** selon besoin

### **Interface Admin (Code 929)**
- Statistiques en temps réel
- Liste des opérations du jour
- Suivi des opérateurs actifs

## 🔧 **CONFIGURATION**

### **Variables d'environnement (backend/.env)**
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:8080

# Base de données
DB_SERVER=SERVEURERP
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=QUALITE
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

## 📁 **STRUCTURE DU PROJET**

```
tablettev2/
├── backend/                 # API Node.js + Express
│   ├── config/
│   │   └── database.js     # Configuration BDD
│   ├── routes/
│   │   ├── admin.js        # Routes admin
│   │   ├── auth.js         # Authentification
│   │   ├── lancements.js   # Gestion lancements
│   │   ├── operations.js   # Gestion opérations ⭐
│   │   └── operators.js    # Gestion opérateurs
│   ├── package.json
│   └── server.js           # Point d'entrée
├── frontend/               # Interface web vanilla JS
│   ├── components/
│   │   ├── AdminPage.js
│   │   ├── App.js
│   │   └── OperateurInterface.js ⭐
│   ├── services/
│   │   └── ApiService.js
│   ├── assets/
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── package.json            # Scripts racine
└── start.bat              # Script de démarrage ⭐
```

## 🔄 **FLUX DES OPÉRATIONS**

1. **Démarrage** : `INSERT ABHISTORIQUE_OPERATEURS (Ident='DEBUT')`
2. **Pause** : `INSERT ABHISTORIQUE_OPERATEURS (Ident='PAUSE')`
3. **Reprise** : `INSERT ABHISTORIQUE_OPERATEURS (Ident='REPRISE')`
4. **Fin** : `INSERT ABHISTORIQUE_OPERATEURS (Ident='FIN')`

## 🛠️ **DÉPANNAGE**

### **Backend ne démarre pas**
```bash
# Vérifier les ports occupés
netstat -ano | findstr :3000

# Arrêter les processus
taskkill /F /IM node.exe

# Redémarrer
cd backend && npm start
```

### **Erreur de base de données**
- Vérifier la connexion au serveur `SERVEURERP`
- Contrôler les permissions sur `SEDI_APP_INDEPENDANTE`
- Vérifier l'utilisateur `QUALITE`

### **Frontend ne se connecte pas**
- Vérifier que le backend est démarré (port 3000)
- Contrôler les erreurs CORS dans la console
- Tester l'API : http://localhost:3000/api/health

## 📊 **API ENDPOINTS**

### **Opérations**
- `POST /api/operations/start` - Démarrer opération
- `POST /api/operations/pause` - Mettre en pause
- `POST /api/operations/resume` - Reprendre
- `POST /api/operations/stop` - Terminer
- `GET /api/operations/current/:operatorId` - État actuel

### **Admin**
- `GET /api/admin/stats` - Statistiques
- `GET /api/admin/operations` - Liste opérations

### **Autres**
- `GET /api/health` - Santé de l'API
- `GET /api/operators/:code` - Info opérateur

## 🎯 **STATUT DU PROJET**

✅ **Terminé et fonctionnel**
- Interface opérateur simplifiée
- Stockage en base de données réel
- Lecture des données ERP existantes
- Interface admin avec statistiques
- Scripts de démarrage automatique

---

**Développé pour SEDI ERP - Interface Tablette Production**














