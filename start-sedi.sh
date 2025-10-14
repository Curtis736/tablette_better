#!/bin/bash
# Script de démarrage SEDI Tablette (sans Docker)

echo "🚀 Démarrage SEDI Tablette..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Aller dans le répertoire du projet
cd ~/Sedi_ati/tablette_better

# Installer les dépendances si nécessaire
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installation des dépendances backend..."
    cd backend && npm install --production && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installation des dépendances frontend..."
    cd frontend && npm install --production && cd ..
fi

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pkill -f "node.*server.js" || true
pkill -f "http-server" || true

# Démarrer le backend
echo "🔧 Démarrage du backend..."
cd backend
nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Attendre que le backend démarre
sleep 5

# Démarrer le frontend
echo "🌐 Démarrage du frontend..."
cd ../frontend
nohup npx http-server . -p 8080 --cors > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Créer le répertoire logs s'il n'existe pas
mkdir -p ../logs

# Sauvegarder les PIDs
echo $BACKEND_PID > ../logs/backend.pid
echo $FRONTEND_PID > ../logs/frontend.pid

echo "✅ SEDI Tablette démarré!"
echo "📊 Backend: http://localhost:3001"
echo "🌐 Frontend: http://localhost:8080"
echo "📝 Logs: ~/Sedi_ati/tablette_better/logs/"


