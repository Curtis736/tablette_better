# Guide de Déploiement Production - SEDI Tablette

> **⚠️ Ce guide est obsolète. Utilisez maintenant le [Guide de Déploiement Git](GIT_DEPLOYMENT.md) pour une approche plus simple et professionnelle.**

## 📋 Informations du Serveur de Production

- **Nom du serveur** : ServeurPRODUCTION
- **Nom de domaine** : sedi-tablette.local
- **Adresse IP** : 192.168.1.26
- **Utilisateur** : maintenance
- **Port SSH** : 722

## 🚀 **Nouvelle Méthode de Déploiement (Recommandée)**

### **Utilisez Git pour le déploiement :**

1. **Push sur Git** depuis votre machine
2. **Clone/Pull** sur le serveur de production
3. **Démarrage** des conteneurs Docker

**Voir le guide complet :** [GIT_DEPLOYMENT.md](GIT_DEPLOYMENT.md)

## 🔧 **Commandes de Base**

### **Connexion au serveur**
```bash
ssh -p 722 maintenance@sedi-tablette.local
```

### **Gestion Docker**
```bash
# Démarrer
docker-compose -f docker/docker-compose.yml up -d

# Arrêter
docker-compose -f docker/docker-compose.yml down

# Redémarrer
docker-compose -f docker/docker-compose.yml restart
```

## 🔍 Vérification du Déploiement

### 1. Vérifier l'état des conteneurs
```bash
docker ps -a --filter "name=sedi-tablette"
```

### 2. Vérifier les logs
```bash
docker logs sedi-tablette-backend
docker logs sedi-tablette-frontend
```

### 3. Tester l'application
- **Frontend** : http://sedi-tablette.local
- **Backend API** : http://sedi-tablette.local:3001
- **Health Check** : http://sedi-tablette.local:3001/api/health

## 📊 Surveillance et Maintenance

### Surveillance en Temps Réel
```bash
./scripts/docker-production.sh monitor
```

### Vérification de la Santé
```bash
./scripts/docker-production.sh health
```

### Sauvegarde des Logs
```bash
./scripts/docker-production.sh backup
```

### Nettoyage des Ressources
```bash
./scripts/docker-production.sh cleanup
```

## 🚨 Dépannage

### Problèmes Courants

1. **Conteneurs ne démarrent pas**
   ```bash
   docker logs sedi-tablette-backend
   docker logs sedi-tablette-frontend
   ```

2. **Erreur de connexion à la base de données**
   - Vérifier les variables d'environnement
   - Vérifier la connectivité réseau

3. **Port déjà utilisé**
   ```bash
   netstat -tulpn | grep :3001
   netstat -tulpn | grep :80
   ```

4. **Espace disque insuffisant**
   ```bash
   df -h
   docker system df
   ```

### Logs Importants

- **Backend** : `/home/maintenance/sedi-tablette/logs/backend.log`
- **Frontend** : `/home/maintenance/sedi-tablette/logs/frontend.log`
- **Docker** : `docker logs sedi-tablette-backend`
- **Nginx** : `docker logs sedi-tablette-frontend`

## 🔒 Sécurité

### Recommandations

1. **Changer les mots de passe par défaut**
   - Modifier les variables d'environnement dans `docker-compose.yml`
   - Utiliser des secrets Docker pour les mots de passe

2. **Configurer un pare-feu**
   - Limiter l'accès aux ports 80 et 3001
   - Utiliser HTTPS en production

3. **Sauvegardes régulières**
   - Automatiser les sauvegardes quotidiennes
   - Tester la restauration des sauvegardes

## 📞 Support

En cas de problème :

1. Vérifier les logs avec `./scripts/docker-production.sh logs`
2. Vérifier l'état avec `./scripts/docker-production.sh status`
3. Vérifier la santé avec `./scripts/docker-production.sh health`
4. Consulter ce guide de dépannage

## 📝 Changelog

- **v2.2** - Ajout de la gestion des pauses
- **v2.1** - Amélioration de la surveillance
- **v2.0** - Migration vers Docker
