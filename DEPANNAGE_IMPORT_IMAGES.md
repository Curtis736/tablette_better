# 🔧 Dépannage - Import d'images Docker locales

## ❌ Problèmes courants et solutions

### 1. Erreur "No such file or directory"

**Symptôme :**
```bash
docker load -i prometheus-image.tar
open prometheus-image.tar: No such file or directory
```

**Solution :**
```bash
# Vérifier où vous êtes
pwd

# Vérifier que les fichiers existent
ls -lh *.tar
ls -lh *.tar.gz

# Si dans un autre répertoire
cd ~
ls -lh monitoring-images.tar.gz
```

### 2. Erreur lors de l'extraction

**Symptôme :**
```bash
tar xzf monitoring-images.tar.gz
tar: Error is not recoverable: exiting now
```

**Solutions :**

```bash
# Vérifier que le fichier n'est pas corrompu
file monitoring-images.tar.gz

# Vérifier l'intégrité
tar tzf monitoring-images.tar.gz

# Si ça ne marche pas, essayer sans compression
# (si vous avez les fichiers .tar directement)
docker load -i prometheus-image.tar
docker load -i grafana-image.tar
```

### 3. Erreur "image not found" ou "cannot load image"

**Symptôme :**
```bash
docker load -i prometheus-image.tar
Error response from daemon: ...
```

**Solutions :**

```bash
# Vérifier le format du fichier
file prometheus-image.tar

# Vérifier que c'est bien un tar Docker
tar tf prometheus-image.tar | head -5

# Si le fichier est compressé avec gzip
gunzip -c prometheus-image.tar.gz | docker load

# Ou décompresser d'abord
gunzip prometheus-image.tar.gz
docker load -i prometheus-image.tar
```

### 4. Vérifier que les images sont bien importées

```bash
# Lister les images
docker images | grep -E "prometheus|grafana"

# Vérifier les tags
docker images prom/prometheus
docker images grafana/grafana
```

### 5. Script d'import amélioré avec diagnostics

```bash
#!/bin/bash
# Script amélioré avec diagnostics

echo "🔍 Diagnostic avant import..."

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

echo "✅ Docker installé"

# Vérifier les fichiers
cd ~
if [ ! -f "monitoring-images.tar.gz" ]; then
    echo "❌ Fichier monitoring-images.tar.gz introuvable dans ~/"
    echo "   Fichiers présents:"
    ls -lh *.tar* 2>/dev/null || echo "   (aucun fichier .tar trouvé)"
    exit 1
fi

echo "✅ Fichier monitoring-images.tar.gz trouvé"
echo "   Taille: $(du -h monitoring-images.tar.gz | cut -f1)"

# Vérifier l'intégrité de l'archive
echo ""
echo "🔍 Vérification de l'archive..."
if tar tzf monitoring-images.tar.gz > /dev/null 2>&1; then
    echo "✅ Archive valide"
    echo "   Contenu:"
    tar tzf monitoring-images.tar.gz
else
    echo "❌ Archive corrompue ou invalide"
    exit 1
fi

# Extraire
echo ""
echo "📦 Extraction..."
tar xzf monitoring-images.tar.gz

# Vérifier les fichiers extraits
if [ ! -f "prometheus-image.tar" ]; then
    echo "❌ prometheus-image.tar non trouvé après extraction"
    exit 1
fi

if [ ! -f "grafana-image.tar" ]; then
    echo "❌ grafana-image.tar non trouvé après extraction"
    exit 1
fi

echo "✅ Fichiers extraits"
echo "   prometheus-image.tar: $(du -h prometheus-image.tar | cut -f1)"
echo "   grafana-image.tar: $(du -h grafana-image.tar | cut -f1)"

# Importer Prometheus
echo ""
echo "⬆️  Import Prometheus..."
if docker load -i prometheus-image.tar; then
    echo "✅ Prometheus importé"
else
    echo "❌ Erreur lors de l'import Prometheus"
    exit 1
fi

# Importer Grafana
echo ""
echo "⬆️  Import Grafana..."
if docker load -i grafana-image.tar; then
    echo "✅ Grafana importé"
else
    echo "❌ Erreur lors de l'import Grafana"
    exit 1
fi

# Vérifier
echo ""
echo "✅ Vérification finale..."
docker images | grep -E "prometheus|grafana"

echo ""
echo "✅ Import terminé avec succès!"
```

## 📋 Checklist complète

Avant d'importer, vérifiez :

- [ ] Le fichier `monitoring-images.tar.gz` existe dans `~/`
- [ ] Vous êtes dans le bon répertoire (`cd ~`)
- [ ] Docker est installé et fonctionne (`docker --version`)
- [ ] Docker daemon est démarré (`sudo systemctl status docker`)
- [ ] Vous avez les permissions (`sudo` ou être dans le groupe docker)
- [ ] Le fichier n'est pas corrompu (vérifier avec `file`)

## 🔍 Commandes de diagnostic

```bash
# Vérifier Docker
docker --version
sudo systemctl status docker

# Vérifier les fichiers
cd ~
ls -lh monitoring-images.tar.gz
file monitoring-images.tar.gz

# Vérifier l'archive
tar tzf monitoring-images.tar.gz

# Vérifier l'espace disque
df -h

# Vérifier les images existantes
docker images | grep -E "prometheus|grafana"
```

## 💡 Solution alternative : Importer image par image

Si l'archive complète ne fonctionne pas :

```bash
# Si vous avez les fichiers .tar séparés
docker load -i prometheus-image.tar
docker load -i grafana-image.tar

# Si vous avez les fichiers .tar.gz séparés
gunzip -c prometheus-image.tar.gz | docker load
gunzip -c grafana-image.tar.gz | docker load
```

