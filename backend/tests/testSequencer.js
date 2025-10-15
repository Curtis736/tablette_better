// Séquenceur de tests pour optimiser l'ordre d'exécution
class TestSequencer {
  sort(tests) {
    // Ordre d'exécution optimisé :
    // 1. Tests de santé (rapides)
    // 2. Tests d'intégration (moyens)
    // 3. Tests de sécurité (lents)
    // 4. Tests de performance (très lents)
    
    const testOrder = {
      'health.test.js': 1,
      'integration.test.js': 2,
      'security.test.js': 3,
      'performance.test.js': 4
    };
    
    return tests.sort((testA, testB) => {
      const orderA = testOrder[testA.path.split('/').pop()] || 999;
      const orderB = testOrder[testB.path.split('/').pop()] || 999;
      
      return orderA - orderB;
    });
  }
}

module.exports = TestSequencer;




