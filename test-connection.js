// Script de test de connectivité pour diagnostiquer l'erreur "Failed to fetch"
// Utilisation du fetch natif de Node.js (disponible depuis v18+)
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Fonction pour faire des requêtes HTTP/HTTPS
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                } catch (parseError) {
                    reject(new Error(`Erreur parsing JSON: ${parseError.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

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
            const healthData = await makeRequest(`${baseUrl}/api/health`);
            if (healthData) {
                console.log(`✅ ${baseUrl} - Santé OK:`, healthData.status);
                
                // Test de l'endpoint opérateur
                try {
                    const operatorData = await makeRequest(`${baseUrl}/api/operators/929`);
                    if (operatorData) {
                        console.log(`✅ ${baseUrl} - Opérateur 929 trouvé:`, operatorData.nom);
                    } else {
                        console.log(`❌ ${baseUrl} - Opérateur 929 non trouvé`);
                    }
                } catch (operatorError) {
                    console.log(`❌ ${baseUrl} - Erreur opérateur:`, operatorError.message);
                }
            } else {
                console.log(`❌ ${baseUrl} - Erreur santé`);
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
