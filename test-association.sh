#!/bin/bash

# Script de test pour vérifier l'association opérateur-lancement
# Ce script teste si les lancements sont correctement associés aux opérateurs

echo "🔍 Test de l'association opérateur-lancement"
echo "============================================="

# Vérifier que le backend est en cours d'exécution
echo "1. Vérification du backend..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend accessible"
else
    echo "❌ Backend non accessible - démarrez d'abord le backend"
    exit 1
fi

# Test de récupération des opérations admin
echo ""
echo "2. Test de récupération des opérations admin..."
response=$(curl -s http://localhost:3001/api/admin/operations)
if echo "$response" | grep -q "operations"; then
    echo "✅ API admin opérations accessible"
    operation_count=$(echo "$response" | grep -o '"operations":\[[^]]*\]' | grep -o 'operatorId' | wc -l)
    echo "📊 Nombre d'opérations trouvées: $operation_count"
else
    echo "❌ Erreur lors de la récupération des opérations admin"
    echo "Réponse: $response"
fi

# Test avec un opérateur spécifique (remplacez 929 par un code d'opérateur existant)
echo ""
echo "3. Test avec un opérateur spécifique..."
operator_code="929"
response=$(curl -s http://localhost:3001/api/admin/operators/$operator_code/operations)
if echo "$response" | grep -q "operations"; then
    echo "✅ Opérations de l'opérateur $operator_code récupérées"
    operation_count=$(echo "$response" | grep -o '"operations":\[[^]]*\]' | grep -o 'lancementCode' | wc -l)
    echo "📊 Nombre de lancements pour l'opérateur $operator_code: $operation_count"
else
    echo "❌ Erreur lors de la récupération des opérations de l'opérateur $operator_code"
    echo "Réponse: $response"
fi

echo ""
echo "4. Test de validation d'un lancement..."
lancement_code="LT123456"  # Remplacez par un code de lancement existant
response=$(curl -s http://localhost:3001/api/operators/lancement/$lancement_code)
if echo "$response" | grep -q "success"; then
    echo "✅ Validation de lancement fonctionnelle"
else
    echo "⚠️ Lancement $lancement_code non trouvé (normal si le code n'existe pas)"
fi

echo ""
echo "🎯 Résumé du test:"
echo "- Si vous voyez des opérations associées à des opérateurs, le problème est résolu"
echo "- Si les opérations apparaissent sans nom d'opérateur, il y a encore un problème"
echo "- Redémarrez le backend après les modifications pour que les changements prennent effet"

echo ""
echo "🔄 Pour redémarrer le backend:"
echo "cd ~/tablette_better/backend"
echo "pkill -f 'node server.js'"
echo "NODE_ENV=production PORT=3001 node server.js"







