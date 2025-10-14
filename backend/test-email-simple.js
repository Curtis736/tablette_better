#!/usr/bin/env node

/**
 * Test simple pour les commentaires SEDI (sans mot de passe)
 * Usage: node test-email-simple.js
 */

// Charger la configuration
require('dotenv').config({ path: './config-email-simple.env' });

const emailService = require('./services/emailService');

async function testCommentEmail() {
    console.log('🧪 Test d\'envoi d\'email de commentaire (sans mot de passe)');
    console.log('Configuration:', {
        EMAIL_DISABLED: process.env.EMAIL_DISABLED,
        EMAIL_USE_HTTP: process.env.EMAIL_USE_HTTP,
        EMAIL_FALLBACK_SERVICE: process.env.EMAIL_FALLBACK_SERVICE
    });

    try {
        // Simuler un commentaire d'opérateur
        const commentData = {
            operatorCode: 'OP001',
            operatorName: 'Jean Dupont',
            lancementCode: 'LT2501145',
            comment: 'Test de commentaire - Problème de qualité détecté sur la pièce #123. Vérification nécessaire avant continuation de la production.',
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

        console.log('\n📝 Envoi du commentaire...');
        const result = await emailService.sendCommentNotification(commentData);

        if (result.success) {
            console.log('✅ Commentaire envoyé avec succès!');
            console.log('Message ID:', result.messageId);
            console.log('\n📧 L\'email a été envoyé à: boutard@sedi-ati.com');
            console.log('📧 Sujet: [SEDI] Nouveau commentaire - Opérateur OP001');
        } else {
            console.error('❌ Erreur lors de l\'envoi:', result.error);
        }

    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
    }
}

// Exécuter le test
testCommentEmail();

