# Configuration des environnements GitHub Actions
# SEDI Tablette v2.2

## Environnements configurés

### Staging Environment
- **Nom** : staging
- **Serveur** : 192.168.1.25:722
- **Utilisateur** : staging
- **Chemin** : /opt/sedi-tablette-staging
- **URL** : http://192.168.1.25
- **Protection** : Validation manuelle requise

### Production Environment
- **Nom** : production
- **Serveur** : 192.168.1.26:722
- **Utilisateur** : maintenance
- **Chemin** : /opt/sedi-tablette
- **URL** : http://192.168.1.26
- **Protection** : Validation manuelle + approbation requise

## Configuration des secrets

### Secrets requis par environnement

#### Staging
- `SSH_PRIVATE_KEY` - Clé SSH pour accès serveur staging
- `STAGING_DB_PASSWORD` - Mot de passe base de données staging
- `STAGING_API_KEY` - Clé API pour services externes

#### Production
- `SSH_PRIVATE_KEY` - Clé SSH pour accès serveur production
- `PRODUCTION_DB_PASSWORD` - Mot de passe base de données production
- `PRODUCTION_API_KEY` - Clé API pour services externes
- `SLACK_WEBHOOK_URL` - URL webhook Slack pour notifications
- `TEAMS_WEBHOOK_URL` - URL webhook Teams pour notifications

## Variables d'environnement

### Staging
```env
NODE_ENV=staging
DB_SERVER=192.168.1.25
DB_DATABASE=SEDI_ERP_STAGING
DB_USER=staging_user
DB_PASSWORD=${STAGING_DB_PASSWORD}
FRONTEND_URL=http://192.168.1.25
LOG_LEVEL=debug
```

### Production
```env
NODE_ENV=production
DB_SERVER=192.168.1.26
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=${PRODUCTION_DB_PASSWORD}
FRONTEND_URL=http://192.168.1.26
LOG_LEVEL=info
```

## Règles de déploiement

### Staging
- **Déclenchement** : Push sur branche `develop`
- **Validation** : Tests automatiques + validation manuelle
- **Rollback** : Automatique en cas d'échec
- **Notifications** : Équipe de développement

### Production
- **Déclenchement** : Push sur branche `master` ou tag `v*`
- **Validation** : Tests complets + validation manuelle + approbation
- **Rollback** : Automatique avec confirmation
- **Notifications** : Équipe complète + management

## Configuration des approbations

### Staging
- **Approbateurs** : Équipe de développement
- **Timeout** : 30 minutes
- **Notification** : Slack channel #dev-deployments

### Production
- **Approbateurs** : Lead developer + DevOps
- **Timeout** : 2 heures
- **Notification** : Slack channel #prod-deployments + Teams

## Monitoring des environnements

### Métriques surveillées
- **Uptime** : Disponibilité des services
- **Performance** : Temps de réponse
- **Erreurs** : Taux d'erreur HTTP
- **Ressources** : CPU, mémoire, disque
- **Logs** : Erreurs critiques

### Alertes configurées
- **Downtime** : > 5 minutes
- **Performance** : Temps de réponse > 2s
- **Erreurs** : Taux d'erreur > 5%
- **Ressources** : CPU > 80% ou mémoire > 90%

## Procédures de maintenance

### Mise à jour des environnements
1. **Staging** : Déploiement automatique depuis `develop`
2. **Production** : Déploiement manuel depuis `master`
3. **Validation** : Tests de régression complets
4. **Monitoring** : Surveillance 24h après déploiement

### Rollback d'urgence
1. **Détection** : Monitoring automatique
2. **Notification** : Alerte immédiate équipe
3. **Action** : Rollback automatique ou manuel
4. **Communication** : Notification utilisateurs si nécessaire
