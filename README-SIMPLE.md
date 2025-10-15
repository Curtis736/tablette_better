# 🚀 Déploiement Simple SEDI Tablette

## ⚡ Démarrage rapide (sans Docker)

### 🖥️ **Sur Windows (développement) :**
```cmd
# Double-cliquer sur start-simple.bat
# OU
start-simple.bat
```

### 🐧 **Sur Linux (production) :**
```bash
# Rendre le script exécutable
chmod +x deploy-simple.sh

# Lancer le déploiement
./deploy-simple.sh
```

## 📋 **Ce que fait le script :**

### ✅ **Installation automatique :**
- Node.js (si pas installé)
- Nginx (si pas installé)
- Dépendances npm

### ✅ **Configuration automatique :**
- Base de données : `192.168.1.14`
- Ports : Frontend 8080, Backend 3001
- Services systemd (Linux)
- Proxy Nginx vers API

### ✅ **Démarrage automatique :**
- Backend API sur port 3001
- Frontend sur port 8080
- Services au démarrage

## 🔧 **Configuration manuelle (si nécessaire) :**

### Backend (.env) :
```env
NODE_ENV=production
PORT=3001
DB_SERVER=192.168.1.14
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=QUALITE
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

### Frontend (ApiService.js) :
- Détection automatique de l'environnement
- Fallback vers IP serveur si localhost

## 🌐 **Accès à l'application :**

- **Frontend** : http://localhost:8080
- **API Backend** : http://localhost:3001
- **Santé API** : http://localhost:3001/api/health

## 🔍 **Vérification :**

### Test de connectivité :
```bash
# Tester l'API
curl http://localhost:3001/api/health

# Tester l'opérateur 929
curl http://localhost:3001/api/operators/929
```

### Logs :
```bash
# Linux
sudo systemctl status sedi-backend
sudo journalctl -u sedi-backend -f

# Windows
# Voir les fenêtres de commande ouvertes
```

## 🚨 **Résolution de problèmes :**

### Erreur "Failed to fetch" :
- ✅ **Résolu** : Configuration IP serveur mise à jour
- ✅ **Résolu** : CORS configuré pour toutes les IPs

### Erreur de base de données :
- ✅ **Résolu** : IP serveur `192.168.1.14`
- ✅ **Résolu** : Configuration de connexion optimisée

### Erreur de port :
- ✅ **Résolu** : Ports 3001 (backend) et 8080 (frontend)
- ✅ **Résolu** : Configuration Nginx proxy

## 📞 **Support :**

Si vous rencontrez des problèmes :
1. Vérifiez que le serveur `192.168.1.14` est accessible
2. Vérifiez que les ports 3001 et 8080 sont libres
3. Consultez les logs des services

## 🎯 **Avantages de cette solution :**

✅ **Simple** : Un seul script à lancer  
✅ **Rapide** : Installation et configuration automatiques  
✅ **Fiable** : Pas de dépendance Docker/DNS  
✅ **Maintenable** : Services systemd standard  
✅ **Sécurisé** : Configuration de production optimisée  
