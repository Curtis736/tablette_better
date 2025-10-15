#!/bin/bash
# Script de build Docker en mode offline pour SEDI Tablette

echo "🚀 Build Docker en mode offline pour SEDI Tablette"
echo "=================================================="

# Vérifier si Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

# Vérifier si les images Alpine sont disponibles localement
echo "🔍 Vérification des images de base..."

# Essayer de télécharger Alpine si pas disponible
if ! docker image inspect alpine:3.18 &> /dev/null; then
    echo "📥 Téléchargement de l'image Alpine 3.18..."
    if ! docker pull alpine:3.18; then
        echo "❌ Impossible de télécharger Alpine 3.18"
        echo "💡 Essayez de configurer DNS ou utilisez un proxy"
        exit 1
    fi
fi

echo "✅ Image Alpine 3.18 disponible"

# Build du backend
echo "🔨 Build du backend..."
if docker build -f Dockerfile.backend -t sedi-backend:latest .; then
    echo "✅ Backend construit avec succès"
else
    echo "❌ Erreur lors du build du backend"
    exit 1
fi

# Build du frontend
echo "🔨 Build du frontend..."
if docker build -f Dockerfile.frontend -t sedi-frontend:latest .; then
    echo "✅ Frontend construit avec succès"
else
    echo "❌ Erreur lors du build du frontend"
    exit 1
fi

echo "🎉 Build terminé avec succès !"
echo "📦 Images créées :"
echo "   - sedi-backend:latest"
echo "   - sedi-frontend:latest"

# Afficher les images
docker images | grep sedi
