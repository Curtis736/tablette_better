module.exports = {
    // Configuration de l'application
    NODE_ENV: 'production',
    PORT: 3001,
    FRONTEND_URL: 'http://192.168.1.26:8080',

    // Configuration de la base de données SQL Server
    DB_SERVER: '192.168.1.26',
    DB_DATABASE: 'SEDI_APP_INDEPENDANTE',
    DB_USER: 'QUALITE',
    DB_PASSWORD: 'QUALITE',
    DB_ENCRYPT: false,
    DB_TRUST_CERT: true,

    // Configuration de la base ERP (pour les données de référence)
    DB_ERP_SERVER: '192.168.1.26',
    DB_ERP_DATABASE: 'SEDI_ERP',
    DB_ERP_USER: 'QUALITE',
    DB_ERP_PASSWORD: 'QUALITE',
    DB_ERP_ENCRYPT: false,
    DB_ERP_TRUST_CERT: true,

    // Configuration de l'API
    API_TIMEOUT: 30000,
    API_RETRY_ATTEMPTS: 3,

    // Configuration du cache
    CACHE_ENABLED: true,
    CACHE_TTL: 300000,

    // Configuration des logs
    LOG_LEVEL: 'info',
    LOG_FILE: 'logs/app.log',

    // Configuration de sécurité
    JWT_SECRET: 'sedi-tablette-production-secret-key',
    SESSION_SECRET: 'sedi-tablette-production-session-secret',

    // Configuration des notifications
    NOTIFICATION_EMAIL_ENABLED: true,
    NOTIFICATION_EMAIL_HOST: 'smtp.gmail.com',
    NOTIFICATION_EMAIL_PORT: 587,
    NOTIFICATION_EMAIL_USER: 'methode@sedi-ati.com',
    NOTIFICATION_EMAIL_PASS: 'your-app-password-here',

    // Configuration email pour les commentaires
    EMAIL_DISABLED: false,
    EMAIL_USE_HTTP: true
};
