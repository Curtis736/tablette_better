#!/usr/bin/env node

/**
 * Script de test de sécurité pour l'individualisation des données
 * Usage: node scripts/security-test.js
 */

const axios = require('axios');

class SecurityTester {
    constructor() {
        this.baseUrl = process.env.API_URL || 'http://localhost:3001/api';
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🔒 Début des tests de sécurité...\n');

        try {
            // Test 1: Accès normal autorisé
            await this.testNormalAccess();
            
            // Test 2: Tentative d'accès croisé bloquée
            await this.testCrossOperatorAccess();
            
            // Test 3: Validation des données filtrées
            await this.testDataFiltering();
            
            // Test 4: Test de manipulation d'URL
            await this.testUrlManipulation();
            
            // Test 5: Test de requêtes malveillantes
            await this.testMaliciousQueries();

            this.printResults();

        } catch (error) {
            console.error('❌ Erreur lors des tests:', error.message);
        }
    }

    async testNormalAccess() {
        console.log('🧪 Test 1: Accès normal autorisé...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/operators/929/operations`);
            
            if (response.status === 200) {
                this.addResult('✅ Accès normal autorisé', true);
            } else {
                this.addResult('❌ Accès normal refusé', false);
            }
        } catch (error) {
            this.addResult('❌ Erreur lors de l\'accès normal', false);
        }
    }

    async testCrossOperatorAccess() {
        console.log('🧪 Test 2: Tentative d\'accès croisé...');
        
        try {
            // Essayer d'accéder aux données d'un autre opérateur
            const response = await axios.get(`${this.baseUrl}/operators/929/operations?operatorCode=931`);
            
            if (response.status === 403) {
                this.addResult('✅ Accès croisé correctement bloqué', true);
            } else {
                this.addResult('❌ Accès croisé non bloqué', false);
            }
        } catch (error) {
            if (error.response && error.response.status === 403) {
                this.addResult('✅ Accès croisé correctement bloqué', true);
            } else {
                this.addResult('❌ Erreur lors du test d\'accès croisé', false);
            }
        }
    }

    async testDataFiltering() {
        console.log('🧪 Test 3: Validation du filtrage des données...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/operators/929/operations`);
            
            if (response.data && response.data.success) {
                const operations = response.data.operations || [];
                const invalidOperations = operations.filter(op => 
                    op.operatorCode && op.operatorCode !== '929'
                );
                
                if (invalidOperations.length === 0) {
                    this.addResult('✅ Données correctement filtrées', true);
                } else {
                    this.addResult(`❌ ${invalidOperations.length} données d'autres opérateurs détectées`, false);
                }
            } else {
                this.addResult('❌ Réponse invalide', false);
            }
        } catch (error) {
            this.addResult('❌ Erreur lors du test de filtrage', false);
        }
    }

    async testUrlManipulation() {
        console.log('🧪 Test 4: Test de manipulation d\'URL...');
        
        const maliciousUrls = [
            `${this.baseUrl}/operators/929/operations?operatorCode=931`,
            `${this.baseUrl}/operators/929/operations?operatorCode=ALL`,
            `${this.baseUrl}/operators/929/operations?operatorCode=*`,
            `${this.baseUrl}/operators/929/operations?operatorCode=1' OR '1'='1`
        ];

        let blockedCount = 0;

        for (const url of maliciousUrls) {
            try {
                const response = await axios.get(url);
                if (response.status === 403) {
                    blockedCount++;
                }
            } catch (error) {
                if (error.response && error.response.status === 403) {
                    blockedCount++;
                }
            }
        }

        if (blockedCount === maliciousUrls.length) {
            this.addResult('✅ Toutes les manipulations d\'URL bloquées', true);
        } else {
            this.addResult(`❌ ${maliciousUrls.length - blockedCount} manipulations d'URL non bloquées`, false);
        }
    }

    async testMaliciousQueries() {
        console.log('🧪 Test 5: Test de requêtes malveillantes...');
        
        const maliciousPayloads = [
            { operatorCode: "929'; DROP TABLE ABHISTORIQUE_OPERATEURS; --" },
            { operatorCode: "929 UNION SELECT * FROM RESSOURC" },
            { operatorCode: "929 OR 1=1" }
        ];

        let blockedCount = 0;

        for (const payload of maliciousPayloads) {
            try {
                const response = await axios.post(`${this.baseUrl}/operators/start`, payload);
                if (response.status === 400 || response.status === 403) {
                    blockedCount++;
                }
            } catch (error) {
                if (error.response && (error.response.status === 400 || error.response.status === 403)) {
                    blockedCount++;
                }
            }
        }

        if (blockedCount === maliciousPayloads.length) {
            this.addResult('✅ Toutes les requêtes malveillantes bloquées', true);
        } else {
            this.addResult(`❌ ${maliciousPayloads.length - blockedCount} requêtes malveillantes non bloquées`, false);
        }
    }

    addResult(message, success) {
        this.testResults.push({ message, success });
        console.log(message);
    }

    printResults() {
        console.log('\n📊 RÉSULTATS DES TESTS DE SÉCURITÉ:');
        console.log('=====================================');
        
        const successCount = this.testResults.filter(r => r.success).length;
        const totalCount = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.message}`);
        });
        
        console.log('\n📈 SCORE DE SÉCURITÉ:');
        console.log(`✅ Tests réussis: ${successCount}/${totalCount}`);
        console.log(`❌ Tests échoués: ${totalCount - successCount}/${totalCount}`);
        console.log(`📊 Pourcentage: ${Math.round((successCount / totalCount) * 100)}%`);
        
        if (successCount === totalCount) {
            console.log('\n🎉 TOUS LES TESTS DE SÉCURITÉ SONT PASSÉS !');
        } else {
            console.log('\n⚠️ CERTAINS TESTS DE SÉCURITÉ ONT ÉCHOUÉ !');
        }
    }
}

// Exécuter les tests
if (require.main === module) {
    const tester = new SecurityTester();
    tester.runAllTests();
}

module.exports = SecurityTester;






















