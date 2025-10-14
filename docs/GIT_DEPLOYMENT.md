# Guide de Déploiement Git - SEDI Tablette

## 🚀 **Déploiement Simple avec Git**

### **Principe :**
1. **Push** le code sur Git
2. **Clone** sur le serveur de production
3. **Démarrage** des conteneurs Docker

## 📋 **Informations du Serveur de Production**

- **Nom de domaine** : sedi-tablette.local
- **Adresse IP** : 192.168.1.26
- **Utilisateur** : maintenance
- **Port SSH** : 722
- **Répertoire** : `/home/maintenance/sedi-tablette`

## 🔧 **Configuration Initiale (Une seule fois)**

### **1. Se connecter au serveur**
```bash
ssh -p 722 maintenance@sedi-tablette.local
```

### **2. Cloner le repository**
```bash
cd /home/maintenance
git clone [URL_DU_REPOSITORY] sedi-tablette
cd sedi-tablette
```

### **3. Configuration DNS (optionnel)**
```bash
# Ajouter l'entrée DNS dans /etc/hosts
echo "127.0.0.1 sedi-tablette.local" | sudo tee -a /etc/hosts
```

## 🚀 **Déploiement d'une Nouvelle Version**

### **Étape 1 : Push sur Git (depuis votre machine)**
```bash
git add .
git commit -m "Description des modifications"
git push origin main
```

### **Étape 2 : Déploiement sur le serveur**
```bash
# Se connecter au serveur
ssh -p 722 maintenance@sedi-tablette.local

# Aller dans le répertoire du projet
cd /home/maintenance/sedi-tablette

# Sauvegarder la version actuelle (optionnel)
git tag backup-$(date +%Y%m%d-%H%M%S)

# Récupérer la dernière version
git pull origin main

# Redémarrer les conteneurs
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d --build
```

## 🔍 **Vérification du Déploiement**

### **Vérifier l'état des conteneurs**
```bash
docker ps --filter "name=sedi-tablette"
```

### **Vérifier les logs**
```bash
# Logs du backend
docker logs sedi-tablette-backend

# Logs du frontend
docker logs sedi-tablette-frontend

# Tous les logs
docker-compose -f docker/docker-compose.yml logs
```

### **Tester l'application**
- **Frontend** : http://sedi-tablette.local
- **API** : http://sedi-tablette.local:3001/api/health

## 🛠️ **Commandes Docker Utiles**

### **Gestion des conteneurs**
```bash
# Démarrer
docker-compose -f docker/docker-compose.yml up -d

# Arrêter
docker-compose -f docker/docker-compose.yml down

# Redémarrer
docker-compose -f docker/docker-compose.yml restart

# Reconstruire
docker-compose -f docker/docker-compose.yml up -d --build
```

### **Surveillance**
```bash
# État des conteneurs
docker ps -a

# Utilisation des ressources
docker stats

# Logs en temps réel
docker-compose -f docker/docker-compose.yml logs -f
```

## 🔄 **Script de Déploiement Automatique (Optionnel)**

Créez un script `deploy.sh` sur le serveur :

```bash
#!/bin/bash
# Script de déploiement automatique

echo "🚀 Déploiement SEDI Tablette..."

# Sauvegarder la version actuelle
git tag backup-$(date +%Y%m%d-%H%M%S)

# Récupérer la dernière version
echo "📥 Récupération de la dernière version..."
git pull origin main

# Arrêter les conteneurs
echo "🛑 Arrêt des conteneurs..."
docker-compose -f docker/docker-compose.yml down

# Reconstruire et démarrer
echo "🔨 Reconstruction et démarrage..."
docker-compose -f docker/docker-compose.yml up -d --build

# Vérifier l'état
echo "✅ Vérification de l'état..."
docker ps --filter "name=sedi-tablette"

echo "🎉 Déploiement terminé !"
echo "🌐 Application disponible sur : http://sedi-tablette.local"
```

**Utilisation :**
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🚨 **Dépannage**

### **Problème de connexion Git**
```bash
# Vérifier la configuration Git
git config --list

# Configurer Git si nécessaire
git config --global user.name "maintenance"
git config --global user.email "maintenance@sedi-tablette.local"
```

### **Problème de permissions**
```bash
# Donner les permissions au répertoire
sudo chown -R maintenance:maintenance /home/maintenance/sedi-tablette
```

### **Problème de ports**
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep -E ":(80|3001)"
```

## 📝 **Avantages de cette Approche**

✅ **Simplicité** - Pas de scripts complexes  
✅ **Traçabilité** - Historique Git complet  
✅ **Sécurité** - Pas de mots de passe dans les scripts  
✅ **Flexibilité** - Facile de revenir à une version précédente  
✅ **Collaboration** - Plusieurs développeurs peuvent déployer  
✅ **Backup automatique** - Tags Git pour les sauvegardes  

## 🔒 **Sécurité**

- Utilisez des clés SSH pour l'authentification
- Configurez un utilisateur Git dédié si nécessaire
- Limitez l'accès au repository de production
- Utilisez des branches de production protégées

## 📞 **Support**

En cas de problème :
1. Vérifiez les logs : `docker-compose logs`
2. Vérifiez l'état : `docker ps`
3. Consultez l'historique Git : `git log --oneline`
4. Revenez à une version précédente : `git checkout [TAG]`
