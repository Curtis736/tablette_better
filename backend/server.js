const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const dbConfig = require('./config/database');
const operatorRoutes = require('./routes/operators');
const lancementRoutes = require('./routes/lancements');
const operationRoutes = require('./routes/operations');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));

// Rate limiting - plus permissif en développement
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 en prod, 1000 en dev
    message: {
        error: 'Trop de requêtes, veuillez patienter',
        retryAfter: Math.ceil(15 * 60 * 1000 / 1000) // en secondes
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting pour les requêtes de santé
        return req.path === '/api/health';
    }
});
app.use(limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Rate limiting spécifique pour les routes admin (plus permissif)
const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 30 : 100, // 30 en prod, 100 en dev
    message: {
        error: 'Trop de requêtes admin, veuillez patienter',
        retryAfter: 60
    },
    skip: (req) => {
        // Skip pour les requêtes de santé
        return req.path === '/api/health';
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/lancements', lancementRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({ 
        message: 'SEDI Tablette API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            operators: '/api/operators',
            lancements: '/api/lancements',
            operations: '/api/operations',
            admin: '/api/admin'
        }
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint non trouvé',
        path: req.originalUrl
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erreur interne du serveur' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur SEDI Tablette démarré sur le port ${PORT}`);
    console.log(`📊 Interface admin: http://localhost:${PORT}/api/admin`);
    console.log(`🔍 Santé: http://localhost:${PORT}/api/health`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

module.exports = app;
