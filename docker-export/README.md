# Export SEDI Tablette - 17/10/2025  8:31:44,61

## Fichiers inclus

- `docker-sedi-backend.tar` - Image Docker du backend
- `docker-sedi-frontend.tar` - Image Docker du frontend
- `import-config.env` - Configuration pour l'import
- `deploy-sedi.sh` - Script de déploiement automatique
- `README.md` - Cette documentation

## Instructions de déploiement

### 1. Copier les fichiers sur le serveur de destination

```bash
# Copier tous les fichiers du dossier docker-export
scp -r docker-export/ user@serveur:/path/to/destination/
```

### 2. Sur le serveur de destination

```bash
# Rendre le script exécutable
chmod +x deploy-sedi.sh

# Exécuter le déploiement
./deploy-sedi.sh
```

### 3. Vérification

```bash
# Vérifier que les containers tournent
docker ps

# Vérifier les logs
docker logs sedi-tablette-backend
docker logs sedi-tablette-frontend

# Tester l'accès
curl http://localhost:3001/api/health
curl http://localhost:8080
```

## Configuration

Les variables d'environnement sont définies dans `import-config.env`.
Modifiez ce fichier selon vos besoins avant de lancer le déploiement.

## Dépannage

- Si les containers ne démarrent pas, vérifiez les logs avec `docker logs <container-name>`
- Vérifiez que les ports 3001 et 8080 sont disponibles
- Assurez-vous que Docker est installé et en cours d'exécution
