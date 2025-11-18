#!/bin/bash
# Script pour identifier et arrêter le processus qui utilise le port 3001

echo "🔍 Recherche du processus utilisant le port 3001..."

# Trouver le processus qui utilise le port 3001
PID=$(sudo lsof -ti:3001 2>/dev/null || sudo netstat -tulpn 2>/dev/null | grep :3001 | awk '{print $7}' | cut -d'/' -f1 | head -1)

if [ -z "$PID" ]; then
    echo "❌ Aucun processus trouvé avec lsof ou netstat"
    echo "🔄 Tentative avec ss..."
    PID=$(sudo ss -tulpn | grep :3001 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
fi

if [ -n "$PID" ]; then
    echo "✅ Processus trouvé: PID=$PID"
    echo "📋 Informations du processus:"
    ps -p $PID -f 2>/dev/null || echo "   Impossible d'obtenir les informations"
    
    echo ""
    echo "⚠️  Arrêt du processus PID=$PID..."
    sudo kill -9 $PID 2>/dev/null && echo "✅ Processus arrêté" || echo "❌ Impossible d'arrêter le processus"
else
    echo "⚠️  Aucun processus trouvé avec PID, vérification des conteneurs Docker..."
    
    # Vérifier les conteneurs Docker qui pourraient utiliser le port
    CONTAINER=$(docker ps -a --filter "publish=3001" --format "{{.ID}}")
    if [ -n "$CONTAINER" ]; then
        echo "🐳 Conteneur Docker trouvé: $CONTAINER"
        docker stop $CONTAINER 2>/dev/null && echo "✅ Conteneur arrêté" || echo "❌ Impossible d'arrêter le conteneur"
        docker rm $CONTAINER 2>/dev/null && echo "✅ Conteneur supprimé" || echo "❌ Impossible de supprimer le conteneur"
    else
        echo "❌ Aucun conteneur Docker trouvé non plus"
        echo ""
        echo "💡 Vérifications manuelles:"
        echo "   - sudo lsof -i:3001"
        echo "   - sudo netstat -tulpn | grep 3001"
        echo "   - docker ps -a | grep 3001"
        echo "   - ps aux | grep node"
    fi
fi

echo ""
echo "🔄 Vérification finale du port 3001..."
if sudo lsof -ti:3001 >/dev/null 2>&1 || sudo netstat -tulpn 2>/dev/null | grep -q :3001; then
    echo "❌ Le port 3001 est toujours utilisé"
else
    echo "✅ Le port 3001 est maintenant libre"
fi










