# 🚀 SEDI Tablette - Déploiement Production

## 📋 Configuration du Serveur

- **Serveur** : 192.168.1.26
- **Utilisateur** : maintenance
- **Port SSH** : 722
- **Base de données** : SEDI_APP_INDEPENDANTE + SEDI_ERP
- **Utilisateur DB** : QUALITE / QUALITE

## 🔧 Déploiement Automatique

### **1. Cloner le repository :**
```bash
cd /opt/apps
git clone https://github.com/Curtis736/tablette_better.git tablettev2
cd tablettev2
```

### **2. Déployer avec le script automatique :**
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

## 🛠️ Déploiement Manuel

### **1. Arrêter les services existants :**
```bash
cd /opt/apps/tablettev2/docker
docker-compose -f docker-compose.production.yml down
```

### **2. Mettre à jour le code :**
```bash
cd /opt/apps/tablettev2
git pull origin master
```

### **3. Démarrer l'application :**
```bash
cd docker
docker-compose -f docker-compose.production.yml up -d
```

### **4. Vérifier le déploiement :**
```bash
docker-compose -f docker-compose.production.yml ps
curl http://localhost:3001/api/health
```

## 🌐 Accès à l'Application

- **Application** : http://192.168.1.26:3001
- **Frontend** : http://192.168.1.26:8080
- **Interface admin** : http://192.168.1.26:3001/api/admin
- **Santé** : http://192.168.1.26:3001/api/health

## 🔍 Commandes de Maintenance

### **Voir les logs :**
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### **Redémarrer l'application :**
```bash
docker-compose -f docker-compose.production.yml restart
```

### **Vérifier le statut :**
```bash
docker-compose -f docker-compose.production.yml ps
```

### **Nettoyage automatique :**
```bash
curl -X POST http://192.168.1.26:3001/api/admin/cleanup-all
```

## 📊 Configuration

L'application utilise le fichier `backend/config-production.js` qui contient :
- Configuration de la base de données (192.168.1.26)
- Configuration de la base ERP
- Paramètres de sécurité
- Configuration email

## 🚨 Dépannage

### **Problème de connexion DB :**
```bash
# Vérifier les logs
docker-compose -f docker-compose.production.yml logs backend

# Tester la connexion
curl http://localhost:3001/api/health
```

### **Problème de permissions :**
```bash
# Vérifier les permissions
ls -la backend/config-production.js

# Redémarrer Docker
sudo systemctl restart docker
```

## ✅ Checklist de Déploiement

- [ ] Repository cloné
- [ ] Configuration config-production.js présente
- [ ] Docker Compose démarré
- [ ] API répond sur /api/health
- [ ] Interface admin accessible
- [ ] Connexion DB fonctionnelle
- [ ] Frontend accessible
- [ ] Logs sans erreur

---

**🎯 Résultat Attendu :**
- Application accessible sur http://192.168.1.26:3001
- Interface admin sur http://192.168.1.26:3001/api/admin
- Connexion aux bases SEDI_APP_INDEPENDANTE et SEDI_ERP
- Système de nettoyage automatique fonctionnel
