// Script de test de connectivité pour diagnostiquer l'erreur "Failed to fetch"
const fetch = require('node-fetch');

async function testConnection() {
    console.log('🔍 Test de connectivité...\n');
    
    const baseUrls = [
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://192.168.1.14:3001',
        'http://serveurerp.sedi.local:3001'
    ];
    
    for (const baseUrl of baseUrls) {
        console.log(`📡 Test de ${baseUrl}...`);
        
        try {
            // Test de santé
            const healthResponse = await fetch(`${baseUrl}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log(`✅ ${baseUrl} - Santé OK:`, healthData.status);
                
                // Test de l'endpoint opérateur
                try {
                    const operatorResponse = await fetch(`${baseUrl}/api/operators/929`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    });
                    
                    if (operatorResponse.ok) {
                        const operatorData = await operatorResponse.json();
                        console.log(`✅ ${baseUrl} - Opérateur 929 trouvé:`, operatorData.nom);
                    } else {
                        console.log(`❌ ${baseUrl} - Erreur opérateur:`, operatorResponse.status, operatorResponse.statusText);
                    }
                } catch (operatorError) {
                    console.log(`❌ ${baseUrl} - Erreur opérateur:`, operatorError.message);
                }
                
            } else {
                console.log(`❌ ${baseUrl} - Erreur santé:`, healthResponse.status, healthResponse.statusText);
            }
            
        } catch (error) {
            console.log(`❌ ${baseUrl} - Erreur connexion:`, error.message);
        }
        
        console.log('---');
    }
    
    console.log('\n🔍 Test de résolution DNS...');
    const dns = require('dns');
    
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4('serveurerp.sedi.local', (err, addresses) => {
                if (err) reject(err);
                else resolve(addresses);
            });
        });
        console.log('✅ serveurerp.sedi.local résolu vers:', addresses);
    } catch (dnsError) {
        console.log('❌ Erreur résolution DNS:', dnsError.message);
    }
}

// Exécuter le test
testConnection().catch(console.error);
