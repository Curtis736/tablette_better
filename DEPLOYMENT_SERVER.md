# 🚀 Guide de Déploiement sur Serveur

## 📋 Prérequis

- **Git** installé sur le serveur
- **Docker** et **Docker Compose** installés
- **Node.js** (version 18+) pour les scripts de maintenance
- Accès SSH au serveur

## 🔧 Étapes de Déploiement

### 1. **Cloner le Repository**

```bash
# Se connecter au serveur via SSH
ssh user@your-server-ip

# Naviguer vers le répertoire de déploiement
cd /opt/apps

# Cloner le repository
git clone https://github.com/Curtis736/tablette_better.git tablettev2

# Entrer dans le répertoire
cd tablettev2
```

### 2. **Configuration de l'Environnement**

```bash
# Copier le fichier d'environnement
cp backend/env.example backend/.env

# Éditer la configuration
nano backend/.env
```

**Configuration requise dans `.env` :**
```env
# Base de données
DB_SERVER=your-sql-server
DB_DATABASE=SEDI_APP_INDEPENDANTE
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=1433

# Serveur
PORT=3001
NODE_ENV=production

# Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. **Déploiement avec Docker**

```bash
# Arrêter les conteneurs existants (si nécessaire)
cd docker
docker-compose down

# Construire et démarrer les conteneurs
docker-compose build --no-cache
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### 4. **Configuration du Nettoyage Automatique**

```bash
# Rendre le script exécutable
chmod +x backend/scripts/auto-cleanup.js

# Tester le script
cd backend
node scripts/auto-cleanup.js

# Configurer le crontab
crontab -e
```

**Ajouter dans le crontab :**
```crontab
# Nettoyage toutes les heures
0 * * * * cd /opt/apps/tablettev2/backend && node scripts/auto-cleanup.js >> logs/cleanup.log 2>&1

# Nettoyage complet quotidien à 2h
0 2 * * * cd /opt/apps/tablettev2/backend && node scripts/auto-cleanup.js >> logs/cleanup-daily.log 2>&1
```

### 5. **Vérification du Déploiement**

```bash
# Vérifier les logs
docker-compose logs -f

# Tester l'API
curl http://localhost:3001/api/health

# Tester l'interface admin
curl http://localhost:3001/api/admin
```

## 🔧 Maintenance

### **Nettoyage Manuel**

```bash
# Via l'API
curl -X POST http://localhost:3001/api/admin/cleanup-all

# Via le script
cd backend
node scripts/auto-cleanup.js
```

### **Mise à Jour**

```bash
# Arrêter les conteneurs
docker-compose down

# Récupérer les dernières modifications
git pull origin master

# Rebuilder et redémarrer
docker-compose build --no-cache
docker-compose up -d
```

### **Logs et Monitoring**

```bash
# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs de nettoyage
tail -f backend/logs/cleanup.log

# Vérifier l'espace disque
df -h
```

## 🛡️ Sécurité

- **Firewall** : Ouvrir seulement les ports 80, 443, et 3001
- **SSL** : Configurer un reverse proxy avec Let's Encrypt
- **Backup** : Automatiser les sauvegardes de la base de données
- **Monitoring** : Surveiller les logs d'erreur

## 📊 Monitoring

### **Endpoints de Santé**

- `GET /api/health` - Santé générale
- `GET /api/admin/operators` - Statut des opérateurs
- `POST /api/admin/cleanup-all` - Nettoyage complet

### **Métriques Importantes**

- Nombre d'opérateurs actifs
- Sessions expirées
- Erreurs dans les logs
- Utilisation de la mémoire

## 🚨 Dépannage

### **Problèmes Courants**

1. **Port déjà utilisé** : `netstat -tulpn | grep :3001`
2. **Base de données inaccessible** : Vérifier la configuration `.env`
3. **Permissions** : `chmod +x backend/scripts/*.js`
4. **Docker** : `docker system prune -f`

### **Logs d'Erreur**

```bash
# Logs du backend
docker-compose logs backend

# Logs du frontend
docker-compose logs frontend

# Logs système
journalctl -u docker
```

## ✅ Checklist de Déploiement

- [ ] Repository cloné
- [ ] Configuration `.env` créée
- [ ] Docker Compose démarré
- [ ] API répond sur `/api/health`
- [ ] Interface admin accessible
- [ ] Crontab configuré
- [ ] Script de nettoyage testé
- [ ] Logs surveillés
- [ ] Backup configuré
- [ ] Monitoring en place

---

**🎯 Résultat Attendu :**
- Application accessible sur `http://your-server:3001`
- Interface admin sur `http://your-server:3001/api/admin`
- Nettoyage automatique fonctionnel
- 0 opérateurs actifs par défaut
- Système de maintenance autonome
