# SEDI Tablette v2 - Analyse SonarQube

## 🔍 Configuration SonarQube

Ce projet est configuré pour utiliser SonarQube pour l'analyse de qualité du code.

### 📋 Prérequis

1. **SonarQube Scanner** installé globalement :
   ```bash
   npm install -g sonar-scanner
   ```

2. **Instance SonarQube** accessible (locale ou distante)

### ⚙️ Configuration

1. **Modifiez `sonar-project.properties`** pour votre instance :
   ```properties
   sonar.host.url=http://localhost:9000
   sonar.login=your-token-here
   ```

2. **Créez un projet** sur votre instance SonarQube avec la clé `sedi-tablette-v2`

### 🚀 Utilisation

#### Scripts npm disponibles :

```bash
# Linting uniquement
npm run lint

# Linting avec correction automatique
npm run lint:fix

# Génération du rapport ESLint pour SonarQube
npm run lint:report

# Analyse SonarQube uniquement
npm run sonar

# Analyse complète (linting + SonarQube)
npm run quality
```

#### Scripts shell :

```bash
# Linux/Mac
./sonar-analysis.sh

# Windows PowerShell
./sonar-analysis.ps1
```

### 📊 Métriques analysées

- **Bugs** : Erreurs dans le code
- **Vulnérabilités** : Problèmes de sécurité
- **Code Smells** : Problèmes de maintenabilité
- **Couverture de code** : Pourcentage de code testé
- **Duplication** : Code dupliqué
- **Complexité** : Complexité cyclomatique

### 🎯 Seuils de qualité

Le projet utilise les seuils par défaut de SonarQube :
- **Couverture** : ≥ 80%
- **Duplication** : ≤ 3%
- **Maintenabilité** : A
- **Fiabilité** : A
- **Sécurité** : A

### 📁 Fichiers exclus

Les fichiers suivants sont exclus de l'analyse :
- `node_modules/`
- `scripts/`
- `sql/`
- `data/`
- `*.env`
- `test-email*.js`

### 🔧 Personnalisation

Pour modifier les règles d'analyse, éditez `.eslintrc.json` dans le dossier `backend/`.

### 📈 Rapports

Les rapports sont disponibles sur votre instance SonarQube à l'adresse configurée dans `sonar-project.properties`.








