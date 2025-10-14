#!/bin/bash
# Script d'arrêt SEDI Tablette

echo "🛑 Arrêt de SEDI Tablette..."

# Lire les PIDs depuis les fichiers
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    echo "Arrêt du backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
    rm -f logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    echo "Arrêt du frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
    rm -f logs/frontend.pid
fi

# Arrêter tous les processus Node.js liés au projet
pkill -f "node.*server.js" || true
pkill -f "http-server" || true

echo "✅ SEDI Tablette arrêté!"

