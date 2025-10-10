# SEDI Tablette v2.1 - Configuration Docker

## 🚀 Déploiement rapide

### Production
```bash
# Démarrer en production
docker-compose up -d

# Ou utiliser le script de déploiement
./deploy.sh prod
```

### Développement
```bash
# Démarrer en développement
docker-compose -f docker/docker-compose.dev.yml up -d

# Ou utiliser le script de déploiement
./deploy.sh dev
```

## 📋 Services

### Backend (sedi-backend)
- **Port**: 3000
- **Health check**: http://localhost:3000/api/health
- **Logs**: `docker logs sedi-tablette-backend`
- **Debug port** (dev): 9229

### Frontend (sedi-frontend)
- **Port**: 80 (prod) / 8080 (dev)
- **Health check**: http://localhost/health
- **Logs**: `docker logs sedi-tablette-frontend`

## 🔧 Configuration

### Variables d'environnement

#### Backend
```env
NODE_ENV=production
PORT=3000
DB_SERVER=SERVEURERP
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=QUALITE
DB_ENCRYPT=false
DB_TRUST_CERT=true
FRONTEND_URL=http://localhost
API_TIMEOUT=30000
CACHE_ENABLED=true
LOG_LEVEL=info
```

#### Secrets (à définir)
```env
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

### Volumes

#### Production
- `sedi-logs`: Logs centralisés
- `/etc/localtime`: Synchronisation de l'heure

#### Développement
- `./backend:/app`: Code source backend (hot reload)
- `./frontend:/usr/share/nginx/html`: Code source frontend
- `sedi-logs-dev`: Logs de développement

## 🛠️ Commandes utiles

### Gestion des services
```bash
# Démarrer
docker-compose up -d

# Arrêter
docker-compose down

# Redémarrer
docker-compose restart

# Voir les logs
docker-compose logs -f

# Voir le statut
docker-compose ps
```

### Maintenance
```bash
# Mettre à jour les images
docker-compose pull

# Reconstruire les images
docker-compose build --no-cache

# Nettoyer le système
docker system prune -f

# Sauvegarder les logs
docker run --rm -v sedi-tablette-logs:/data -v $(pwd)/backup:/backup alpine tar czf /backup/logs.tar.gz -C /data .
```

### Debug
```bash
# Accéder au conteneur backend
docker exec -it sedi-tablette-backend sh

# Accéder au conteneur frontend
docker exec -it sedi-tablette-frontend sh

# Voir les logs en temps réel
docker-compose logs -f sedi-backend
docker-compose logs -f sedi-frontend
```

## 🔍 Health Checks

### Vérifications automatiques
- **Backend**: `curl http://localhost:3000/api/health`
- **Frontend**: `curl http://localhost/health`

### Statuts possibles
- `healthy`: Service opérationnel
- `unhealthy`: Service en erreur
- `starting`: Service en cours de démarrage

## 📊 Monitoring

### Logs
```bash
# Tous les logs
docker-compose logs

# Logs d'un service spécifique
docker-compose logs sedi-backend
docker-compose logs sedi-frontend

# Logs en temps réel
docker-compose logs -f --tail=100
```

### Métriques
```bash
# Utilisation des ressources
docker stats

# Espace disque des volumes
docker system df

# Informations détaillées
docker-compose ps --services
docker-compose config
```

## 🚨 Dépannage

### Problèmes courants

#### Service ne démarre pas
```bash
# Vérifier les logs
docker-compose logs [service]

# Vérifier la configuration
docker-compose config

# Reconstruire l'image
docker-compose build --no-cache [service]
```

#### Problème de base de données
```bash
# Vérifier la connectivité réseau
docker-compose exec sedi-backend ping SERVEURERP

# Tester la connexion SQL
docker-compose exec sedi-backend curl http://localhost:3000/api/health
```

#### Problème de permissions
```bash
# Vérifier les volumes
docker volume inspect sedi-tablette-logs

# Recréer les volumes
docker-compose down -v
docker-compose up -d
```

### Nettoyage complet
```bash
# Arrêter et supprimer tout
docker-compose down -v --remove-orphans

# Supprimer les images
docker rmi $(docker images "sedi-tablette*" -q)

# Nettoyer le système
docker system prune -a -f
```

## 🔒 Sécurité

### Bonnes pratiques
- ✅ Utilisateurs non-root dans les conteneurs
- ✅ Health checks configurés
- ✅ Secrets via variables d'environnement
- ✅ Volumes avec permissions appropriées
- ✅ Rate limiting sur Nginx
- ✅ Headers de sécurité

### À faire en production
- [ ] Changer les secrets par défaut
- [ ] Configurer HTTPS
- [ ] Mettre en place la rotation des logs
- [ ] Configurer la surveillance
- [ ] Sauvegardes automatiques

## 📈 Optimisations

### Performance
- **Multi-stage builds**: Réduction de la taille des images
- **Gzip compression**: Compression des ressources statiques
- **Cache headers**: Mise en cache optimisée pour tablettes
- **Buffer tuning**: Optimisation des buffers Nginx

### Tablettes
- **Touch-friendly**: Headers spécifiques pour les écrans tactiles
- **Responsive**: Configuration adaptée aux différentes tailles d'écran
- **Performance**: Timeouts et buffers optimisés

## 📞 Support

En cas de problème :
1. Vérifier les logs : `docker-compose logs`
2. Vérifier la santé : `docker-compose ps`
3. Consulter cette documentation
4. Contacter l'équipe de développement











