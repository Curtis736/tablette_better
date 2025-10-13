# CI/CD SEDI Tablette

## Vue d'ensemble

Pipeline CI/CD automatisé pour le déploiement de SEDI Tablette avec tests automatiques et déploiement sur serveur de production.

## Flux CI/CD

### 1. Déclenchement
- **Push sur `master`** → Tests + Déploiement Production
- **Push sur `develop`** → Tests + Déploiement Staging
- **Pull Request** → Tests uniquement

### 2. Pipeline de tests
```yaml
- Installation des dépendances
- Tests backend (Jest)
- Construction des images Docker
- Tests des conteneurs
- Validation de la connectivité
```

### 3. Pipeline de déploiement
```yaml
- Construction des images Docker
- Sauvegarde des images
- Copie vers le serveur de production
- Déploiement via Docker Compose
- Tests de connectivité
- Nettoyage des fichiers temporaires
```

## Configuration

### GitHub Actions
- **Fichier** : `.github/workflows/ci-cd.yml`
- **Triggers** : Push sur master/develop, Pull Requests
- **Environnements** : Ubuntu Latest, Node.js 18

### Tests
- **Backend** : Jest + Supertest
- **Frontend** : Tests d'intégration
- **Docker** : Tests de conteneurs

## Scripts de déploiement

### Script principal (docker/deploy-ci-cd.sh)
- **Sauvegarde automatique** avant chaque déploiement
- **Rollback automatique** en cas d'échec
- **Métriques de déploiement** collectées automatiquement
- **Validation post-déploiement** complète
- **Nettoyage automatique** des ressources

### Script de rollback (docker/rollback.sh)
- **Liste des sauvegardes** disponibles
- **Rollback vers une sauvegarde** spécifique
- **Rollback vers la dernière** sauvegarde
- **Confirmation** avant exécution
- **Validation** du rollback

### Script de monitoring (docker/monitor.sh)
- **Statut des services** en temps réel
- **Métriques système** (CPU, mémoire, disque)
- **Logs des services** (backend, frontend)
- **Tests de santé** des endpoints
- **Monitoring** de la base de données

## Utilisation des scripts

### Déploiement
```bash
# Déploiement production
./docker/deploy-ci-cd.sh production

# Déploiement staging
./docker/deploy-ci-cd.sh staging

# Mode simulation
./docker/deploy-ci-cd.sh production --dry-run

# Mode verbeux
./docker/deploy-ci-cd.sh production --verbose
```

### Rollback
```bash
# Lister les sauvegardes
./docker/rollback.sh --list

# Rollback vers la dernière sauvegarde
./docker/rollback.sh --latest

# Rollback vers une sauvegarde spécifique
./docker/rollback.sh backup-20231201-143022

# Rollback sur environnement spécifique
./docker/rollback.sh --latest --environment staging
```

### Monitoring
```bash
# Statut des services
./docker/monitor.sh --status

# Métriques système
./docker/monitor.sh --metrics

# Logs des services
./docker/monitor.sh --logs

# Tests de santé
./docker/monitor.sh --health

# Monitoring complet
./docker/monitor.sh --status --metrics --health
```

## Utilisation

### Déploiement automatique
```bash
# Push sur master = déploiement production automatique
git push origin master

# Push sur develop = déploiement staging automatique
git push origin develop
```

### Déploiement manuel
```bash
# Déploiement production
./docker/deploy-ci-cd.sh production

# Déploiement staging
./docker/deploy-ci-cd.sh staging
```

### Tests locaux
```bash
# Tests backend
cd backend && npm test

# Tests avec watch
cd backend && npm run test:watch

# Tests Docker
cd docker && docker-compose up -d
curl http://localhost:3000/api/health
docker-compose down
```

## Monitoring

### Logs GitHub Actions
- **URL** : `https://github.com/[repo]/actions`
- **Détails** : Logs complets de chaque étape
- **Notifications** : Email en cas d'échec

### Logs serveur
```bash
# Logs des conteneurs
ssh -p 722 maintenance@192.168.1.26
cd /opt/sedi-tablette
docker-compose logs -f

# État des services
docker-compose ps
```

### Health Checks
- **Backend** : `http://192.168.1.26:3000/api/health`
- **Frontend** : `http://192.168.1.26/health`
- **Admin** : `http://192.168.1.26:3000/api/admin`

## Maintenance

### Mise à jour des dépendances
```bash
# Backend
cd backend && npm update

# Frontend
cd frontend && npm update

# Commit et push
git add .
git commit -m "Update dependencies"
git push origin master
```

### Ajout de nouveaux tests
```bash
# Créer un nouveau test
touch backend/tests/new-feature.test.js

# Exécuter les tests
cd backend && npm test
```

### Configuration des secrets
- **GitHub Secrets** : Variables d'environnement sensibles
- **Serveur** : Clés SSH pour l'accès distant

## Dépannage

### Tests qui échouent
1. Vérifier les logs GitHub Actions
2. Exécuter les tests localement
3. Vérifier les dépendances
4. Corriger le code et recommiter

### Déploiement qui échoue
1. Vérifier la connectivité SSH
2. Vérifier l'espace disque du serveur
3. Vérifier les logs Docker
4. Rollback manuel si nécessaire

### Rollback d'urgence
```bash
# Rollback vers la version précédente
git checkout HEAD~1
git push origin master --force

# Ou rollback manuel sur le serveur
ssh -p 722 maintenance@192.168.1.26
cd /opt/sedi-tablette
docker-compose down
# Restaurer l'image précédente
docker-compose up -d
```

## Améliorations futures

### Phase 2
- [ ] Tests de performance
- [ ] Tests de sécurité
- [ ] Déploiement blue-green
- [ ] Notifications Slack/Teams

### Phase 3
- [ ] Environnements multiples
- [ ] Base de données de test
- [ ] Tests d'intégration complets
- [ ] Monitoring avancé

---

**La CI/CD est maintenant configurée et prête à automatiser vos déploiements !**
