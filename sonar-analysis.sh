#!/bin/bash
# Script d'analyse SonarQube pour SEDI Tablette v2

echo "🔍 Démarrage de l'analyse SonarQube pour SEDI Tablette v2..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier que SonarQube Scanner est installé
if ! command -v sonar-scanner &> /dev/null; then
    echo -e "${RED}❌ SonarQube Scanner n'est pas installé${NC}"
    echo -e "${YELLOW}📦 Installation: npm install -g sonar-scanner${NC}"
    exit 1
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "sonar-project.properties" ]; then
    echo -e "${RED}❌ Fichier sonar-project.properties non trouvé${NC}"
    echo -e "${YELLOW}📍 Assurez-vous d'être dans le répertoire racine du projet${NC}"
    exit 1
fi

# Nettoyer les anciens rapports
echo -e "${BLUE}🧹 Nettoyage des anciens rapports...${NC}"
rm -rf backend/coverage/
rm -f backend/eslint-report.json

# Exécuter ESLint
echo -e "${BLUE}🔍 Exécution d'ESLint...${NC}"
cd backend
if npx eslint . --ext .js --format json --output-file eslint-report.json; then
    echo -e "${GREEN}✅ ESLint terminé avec succès${NC}"
else
    echo -e "${YELLOW}⚠️ ESLint terminé avec des avertissements${NC}"
fi

# Retour au répertoire racine
cd ..

# Vérifier la configuration SonarQube
echo -e "${BLUE}🔧 Vérification de la configuration SonarQube...${NC}"
if grep -q "sonar.host.url" sonar-project.properties; then
    echo -e "${GREEN}✅ Configuration SonarQube trouvée${NC}"
else
    echo -e "${YELLOW}⚠️ Configuration SonarQube manquante${NC}"
    echo -e "${YELLOW}📝 Ajoutez sonar.host.url et sonar.login dans sonar-project.properties${NC}"
fi

# Exécuter SonarQube Scanner
echo -e "${BLUE}📊 Lancement de l'analyse SonarQube...${NC}"
if sonar-scanner; then
    echo -e "${GREEN}✅ Analyse SonarQube terminée avec succès!${NC}"
    echo -e "${GREEN}🌐 Consultez les résultats sur votre instance SonarQube${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'analyse SonarQube${NC}"
    echo -e "${YELLOW}💡 Vérifiez votre configuration et votre connexion à SonarQube${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Analyse terminée!${NC}"








