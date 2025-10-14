// Script de test pour vérifier la logique pause/reprise
const fetch = require('node-fetch');

async function testPauseRepriseLogic() {
    try {
        console.log('🧪 Test de la logique pause/reprise...');
        
        // Test avec un lancement spécifique (remplacez par un vrai code de lancement)
        const lancementCode = 'LT2501148'; // Exemple de votre interface
        
        const response = await fetch(`http://localhost:3000/api/admin/debug/pause-reprise/${lancementCode}`);
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Test réussi !');
            console.log('📊 Analyse:', data.analysis);
            
            // Vérifier les paires pause/reprise
            data.analysis.pauseReprisePairs.forEach((pair, index) => {
                console.log(`\n🔍 Paire ${index + 1}:`);
                console.log(`  Pause: ID ${pair.pause.id} à ${pair.pause.heure}`);
                console.log(`  Reprise: ${pair.reprise ? `ID ${pair.reprise.id} à ${pair.reprise.heure}` : 'AUCUNE'}`);
                console.log(`  Statut: ${pair.status}`);
            });
            
        } else {
            console.error('❌ Test échoué:', data.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }
}

// Exécuter le test
testPauseRepriseLogic();






