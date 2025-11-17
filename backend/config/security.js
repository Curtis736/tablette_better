/**
 * Configuration de sécurité pour l'individualisation des données
 */

module.exports = {
    // Isolation des données
    dataIsolation: {
        enabled: true,
        strictMode: true, // Mode strict : bloquer toute tentative d'accès croisé
        auditAllQueries: true,
        cacheTimeout: 300000, // 5 minutes
        maxCacheSize: 1000
    },

    // Validation des accès
    accessValidation: {
        enabled: true,
        validateOnEveryRequest: true,
        blockSuspiciousActivity: true,
        maxFailedAttempts: 5,
        lockoutDuration: 900000 // 15 minutes
    },

    // Audit et logging
    audit: {
        enabled: true,
        logLevel: 'info',
        logAllDataAccess: true,
        logSuspiciousActivity: true,
        retentionDays: 90,
        alertThreshold: 10 // Alertes après 10 tentatives suspectes
    },

    // Sécurité des requêtes
    querySecurity: {
        enabled: true,
        validateResults: true,
        blockCrossOperatorAccess: true,
        sanitizeInputs: true,
        maxQueryLength: 10000
    },

    // Monitoring
    monitoring: {
        enabled: true,
        healthCheckInterval: 60000, // 1 minute
        alertOnSecurityViolation: true,
        alertOnDataLeak: true,
        metricsRetention: 7 // jours
    },

    // Environnement
    environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        isTest: process.env.NODE_ENV === 'test'
    }
};





















