#!/usr/bin/env node

/**
 * Script de test pour les commentaires opérateurs
 * Usage: node scripts/test-comments.js
 */

require('dotenv').config();
const emailService = require('../services/emailService');

async function testEmailConfiguration() {
    console.log('🧪 Test de la configuration email...');
    console.log('Configuration:', {
        EMAIL_DISABLED: process.env.EMAIL_DISABLED,
        EMAIL_USE_HTTP: process.env.EMAIL_USE_HTTP,
        EMAIL_FALLBACK_SERVICE: process.env.EMAIL_FALLBACK_SERVICE,
        FORMSPREE_URL: process.env.FORMSPREE_URL ? 'Configuré' : 'Non configuré'
    });

    try {
        // Test d'envoi d'email via le service
        const testCommentData = {
            operatorCode: 'TEST001',
            operatorName: 'Test Opérateur',
            lancementCode: 'LT2501145',
            comment: 'Test de configuration email - Commentaire automatique',
            timestamp: new Date().toLocaleString('fr-FR', {
                timeZone: 'Europe/Paris',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
        
        const result = await emailService.sendCommentNotification(testCommentData);
        
        if (result.success) {
            console.log('✅ Email de test envoyé:', result.messageId);
            console.log('📧 Destination: boutard@sedi-ati.com');
            console.log('📧 Service: Formspree (sans mot de passe)');
            return true;
        } else {
            throw new Error(result.error || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('❌ Erreur de configuration email:', error.message);
        
        console.log('\n💡 Solutions possibles:');
        console.log('1. Vérifiez la configuration Formspree dans le fichier .env');
        console.log('2. Vérifiez que FORMSPREE_URL est correct');
        console.log('3. Vérifiez que EMAIL_FALLBACK_SERVICE=formspree');
        
        return false;
    }
}

async function testCommentAPI() {
    console.log('\n🧪 Test de l\'API des commentaires...');
    
    const baseUrl = process.env.API_URL || 'http://localhost:3001';
    
    try {
        // Test de santé de l'API
        const healthResponse = await fetch(`${baseUrl}/api/health`);
        if (!healthResponse.ok) {
            throw new Error(`API non accessible: ${healthResponse.status}`);
        }
        console.log('✅ API accessible');
        
        // Test d'ajout de commentaire
        const commentData = {
            operatorCode: 'TEST001',
            operatorName: 'Test Opérateur',
            lancementCode: 'LT2501145',
            comment: 'Commentaire de test automatique'
        };
        
        const commentResponse = await fetch(`${baseUrl}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
        });
        
        if (!commentResponse.ok) {
            const error = await commentResponse.json();
            throw new Error(`Erreur API: ${error.error || commentResponse.statusText}`);
        }
        
        const result = await commentResponse.json();
        console.log('✅ Commentaire ajouté:', result.message);
        
        // Test de récupération des commentaires
        const getResponse = await fetch(`${baseUrl}/api/comments/operator/TEST001`);
        if (getResponse.ok) {
            const comments = await getResponse.json();
            console.log('✅ Commentaires récupérés:', comments.data.length, 'commentaires');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur API:', error.message);
        console.log('\n💡 Solutions possibles:');
        console.log('1. Vérifiez que le serveur backend est démarré');
        console.log('2. Vérifiez l\'URL de l\'API dans API_URL');
        console.log('3. Vérifiez la configuration de la base de données');
        return false;
    }
}

async function main() {
    console.log('🚀 Démarrage des tests des commentaires SEDI\n');
    
    const emailTest = await testEmailConfiguration();
    const apiTest = await testCommentAPI();
    
    console.log('\n📊 Résumé des tests:');
    console.log(`Email: ${emailTest ? '✅ OK' : '❌ ÉCHEC'}`);
    console.log(`API: ${apiTest ? '✅ OK' : '❌ ÉCHEC'}`);
    
    if (emailTest && apiTest) {
        console.log('\n🎉 Tous les tests sont passés avec succès!');
        console.log('Les commentaires opérateurs sont prêts à être utilisés.');
    } else {
        console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Erreur non gérée:', reason);
    process.exit(1);
});

// Exécuter les tests
main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
});
