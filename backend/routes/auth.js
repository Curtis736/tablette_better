// Routes d'authentification
const express = require('express');
const router = express.Router();

// POST /api/auth/login - Connexion admin
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Vérification simple des identifiants admin
        if (username === 'admin' && password === 'admin') {
            res.json({
                success: true,
                user: {
                    id: 'admin',
                    username: 'admin',
                    role: 'admin',
                    name: 'Administrateur SEDI'
                },
                message: 'Connexion administrateur réussie'
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Identifiants invalides'
            });
        }
        
    } catch (error) {
        console.error('Erreur lors de la connexion admin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

// POST /api/auth/logout - Déconnexion admin
router.post('/logout', async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

// GET /api/auth/verify - Vérifier la session admin
router.get('/verify', async (req, res) => {
    try {
        // Pour l'instant, on considère que si la requête arrive ici, l'admin est connecté
        // Dans une vraie application, on vérifierait le token JWT ou la session
        res.json({
            success: true,
            user: {
                id: 'admin',
                username: 'admin',
                role: 'admin',
                name: 'Administrateur SEDI'
            }
        });
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur interne du serveur'
        });
    }
});

module.exports = router;
