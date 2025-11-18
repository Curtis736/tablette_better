/**
 * Configuration pour l'environnement de production
 */

module.exports = {
    // Nettoyage automatique
    cleanup: {
        enabled: true,
        schedule: '0 2 * * *', // Tous les jours à 2h du matin
        maxInconsistentEvents: 100,
        alertThreshold: 50
    },
    
    // Validation des données
    validation: {
        enabled: true,
        validateOnInsert: true,
        validateOnUpdate: true,
        blockInvalidData: true
    },
    
    // Monitoring
    monitoring: {
        enabled: true,
        healthCheckInterval: 300000, // 5 minutes
        logLevel: 'info',
        alertEmail: process.env.ALERT_EMAIL || 'admin@sedi.com'
    },
    
    // Sécurité
    security: {
        maxLoginAttempts: 5,
        lockoutDuration: 900000, // 15 minutes
        sessionTimeout: 3600000, // 1 heure
        requireHttps: true
    },
    
    // Base de données
    database: {
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
            min: 5,
            max: 20,
            idleTimeoutMillis: 30000
        }
    }
};






















