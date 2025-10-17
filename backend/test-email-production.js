// Script de test pour l'envoi d'email en production
const emailService = require('./services/emailService');

async function testEmail() {
    console.log('🧪 Test de l\'envoi d\'email...');
    
    try {
        // Test d'envoi d'un commentaire
        const commentData = {
            operatorCode: 'TEST001',
            operatorName: 'Test Opérateur',
            lancementCode: 'LT123456',
            comment: 'Test d\'envoi d\'email depuis la production',
            timestamp: new Date().toISOString()
        };

        console.log('📧 Envoi du test email...');
        const result = await emailService.sendCommentNotification(commentData);
        
        if (result.success) {
            console.log('✅ Email envoyé avec succès !');
            console.log('📋 Détails:', result);
        } else {
            console.log('❌ Échec de l\'envoi d\'email');
            console.log('📋 Erreur:', result.error);
        }
        
    } catch (error) {
        console.error('💥 Erreur lors du test email:', error);
    }
    
    process.exit(0);
}

// Lancer le test
testEmail();
