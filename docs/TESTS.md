# Tests SEDI Tablette

## Vue d'ensemble

Suite de tests complète pour SEDI Tablette incluant tests de santé, intégration, sécurité et performance.

## Structure des tests

```
backend/tests/
├── health.test.js          # Tests de santé de base
├── integration.test.js      # Tests d'intégration
├── security.test.js        # Tests de sécurité
├── performance.test.js     # Tests de performance
├── setup.js               # Configuration Jest
└── testSequencer.js       # Séquenceur de tests
```

## Types de tests

### Tests de santé (health.test.js)
- **Objectif** : Vérifier que l'API répond correctement
- **Durée** : < 1 seconde
- **Fréquence** : À chaque commit

**Tests inclus :**
- Health check endpoint
- API routes de base
- Headers de sécurité
- Gestion des erreurs 404
- Performance de base (< 1s)

### Tests d'intégration (integration.test.js)
- **Objectif** : Vérifier l'intégration entre composants
- **Durée** : 5-10 secondes
- **Fréquence** : À chaque push

**Tests inclus :**
- Connectivité base de données
- Intégration endpoints admin
- Intégration endpoints opérateur
- Gestion des erreurs
- Rate limiting
- Validation des données

### Tests de sécurité (security.test.js)
- **Objectif** : Vérifier la sécurité de l'application
- **Durée** : 10-15 secondes
- **Fréquence** : Avant déploiement production

**Tests inclus :**
- Protection contre SQL injection
- Protection contre XSS
- Validation des types de données
- Gestion de l'authentification
- Rate limiting
- Headers de sécurité
- Exposition de données sensibles
- Limites de taille des requêtes
- Gestion des erreurs sécurisée

### Tests de performance (performance.test.js)
- **Objectif** : Vérifier les performances de l'application
- **Durée** : 30-60 secondes
- **Fréquence** : Tests de charge réguliers

**Tests inclus :**
- Temps de réponse des endpoints
- Tests de charge concurrente
- Tests de mémoire
- Tests de charge soutenue
- Performance base de données
- Récupération après erreurs

## Configuration Jest

### Fichier de configuration (jest.config.js)
```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  detectOpenHandles: true,
  detectLeaks: true
}
```

### Séquenceur de tests (testSequencer.js)
Optimise l'ordre d'exécution :
1. Tests de santé (rapides)
2. Tests d'intégration (moyens)
3. Tests de sécurité (lents)
4. Tests de performance (très lents)

## Scripts de test

### Scripts npm disponibles
```bash
# Tests individuels
npm run test:health        # Tests de santé uniquement
npm run test:integration   # Tests d'intégration uniquement
npm run test:security      # Tests de sécurité uniquement
npm run test:performance   # Tests de performance uniquement

# Tests combinés
npm run test              # Tous les tests
npm run test:coverage     # Tests avec couverture
npm run test:ci           # Tests optimisés pour CI
npm run test:all          # Exécution séquentielle de tous les tests
```

### Script de validation (scripts/validate.sh)
```bash
# Validation rapide
./scripts/validate.sh --quick

# Validation complète
./scripts/validate.sh --full

# Tests spécifiques
./scripts/validate.sh --security
./scripts/validate.sh --performance
```

## Intégration CI/CD

### GitHub Actions
Les tests sont exécutés automatiquement :
- **Tests de santé** : À chaque commit
- **Tests d'intégration** : À chaque push
- **Tests de sécurité** : Avant déploiement production
- **Tests de performance** : Tests de charge réguliers

### Pipeline de tests
```yaml
1. Installation des dépendances
2. Tests de santé (rapides)
3. Tests d'intégration
4. Tests de sécurité
5. Tests de performance
6. Génération de couverture
7. Tests Docker
8. Validation finale
```

## Métriques de qualité

### Couverture de code
- **Minimum requis** : 80%
- **Branches** : 80%
- **Fonctions** : 80%
- **Lignes** : 80%
- **Statements** : 80%

### Performance
- **Health endpoint** : < 100ms
- **Admin stats** : < 500ms
- **Operations list** : < 1s
- **Concurrent requests** : < 2s pour 10 requêtes

### Sécurité
- **SQL injection** : 100% bloqué
- **XSS** : 100% bloqué
- **Rate limiting** : Activé
- **Headers sécurisés** : Présents

## Dépannage

### Tests qui échouent
1. Vérifier les logs détaillés
2. Exécuter les tests individuellement
3. Vérifier la connectivité base de données
4. Vérifier les dépendances

### Tests de performance lents
1. Vérifier la charge système
2. Vérifier la connectivité réseau
3. Vérifier les ressources Docker
4. Ajuster les timeouts si nécessaire

### Tests de sécurité qui échouent
1. Vérifier la configuration de sécurité
2. Vérifier les headers HTTP
3. Vérifier la validation des entrées
4. Vérifier la configuration CORS

## Maintenance

### Ajout de nouveaux tests
1. Créer le fichier de test dans `backend/tests/`
2. Suivre la convention de nommage `*.test.js`
3. Ajouter les tests appropriés selon le type
4. Mettre à jour la documentation

### Mise à jour des seuils
1. Modifier `jest.config.js` pour les seuils de couverture
2. Modifier les timeouts dans les tests de performance
3. Ajuster les limites de sécurité si nécessaire
4. Tester les modifications

---

**Les tests sont maintenant optimisés et prêts pour un environnement de production !**




