// Middleware de sécurité pour les opérateurs
const { executeQuery } = require('../config/database');

/**
 * Middleware pour valider qu'un opérateur est connecté et autorisé
 */
async function validateOperatorSession(req, res, next) {
    try {
        const { operatorId } = req.body;
        
        if (!operatorId) {
            return res.status(400).json({
                success: false,
                error: 'Code opérateur requis',
                security: 'OPERATOR_ID_REQUIRED'
            });
        }

        // Vérifier que l'opérateur existe dans RESSOURC
        const operatorQuery = `
            SELECT TOP 1 Coderessource, Designation1, Typeressource
            FROM [SEDI_ERP].[dbo].[RESSOURC]
            WHERE Coderessource = @operatorId
        `;
        
        const operators = await executeQuery(operatorQuery, { operatorId });
        
        if (operators.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Opérateur non trouvé dans la base de données',
                security: 'OPERATOR_NOT_FOUND'
            });
        }

        // Vérifier que l'opérateur a une session active
        const sessionQuery = `
            SELECT TOP 1 SessionId, LoginTime, SessionStatus, DeviceInfo
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            WHERE OperatorCode = @operatorId 
            AND SessionStatus = 'ACTIVE'
            AND CAST(DateCreation AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY DateCreation DESC
        `;
        
        const activeSessions = await executeQuery(sessionQuery, { operatorId });
        
        if (activeSessions.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Opérateur non connecté ou session expirée',
                security: 'SESSION_REQUIRED'
            });
        }

        // Ajouter les informations de sécurité à la requête
        req.security = {
            operatorId: operatorId,
            operatorInfo: operators[0],
            sessionInfo: activeSessions[0],
            timestamp: new Date().toISOString(),
            validated: true
        };

        console.log(`🔒 Sécurité validée pour l'opérateur ${operatorId}`);
        next();

    } catch (error) {
        console.error('❌ Erreur lors de la validation de sécurité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur de sécurité lors de la validation',
            security: 'VALIDATION_ERROR'
        });
    }
}

/**
 * Middleware pour valider qu'un opérateur ne peut pas modifier les données d'un autre
 */
async function validateDataOwnership(req, res, next) {
    try {
        const { operatorId } = req.body;
        const { operatorCode } = req.params;
        
        // Si on a un operatorCode dans les paramètres, vérifier la cohérence
        if (operatorCode && operatorCode !== operatorId) {
            console.log(`🚨 TENTATIVE D'ACCÈS NON AUTORISÉ: ${operatorId} essaie d'accéder aux données de ${operatorCode}`);
            
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé aux données d\'un autre opérateur',
                security: 'DATA_OWNERSHIP_VIOLATION'
            });
        }

        next();

    } catch (error) {
        console.error('❌ Erreur lors de la validation de propriété des données:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur de sécurité lors de la validation de propriété',
            security: 'OWNERSHIP_VALIDATION_ERROR'
        });
    }
}

/**
 * Middleware pour logger les actions sensibles
 */
function logSecurityAction(req, res, next) {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Logger les actions sensibles
        if (req.security && req.security.validated) {
            console.log(`🔍 Action sécurisée: ${req.method} ${req.path} par opérateur ${req.security.operatorId}`);
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}

module.exports = {
    validateOperatorSession,
    validateDataOwnership,
    logSecurityAction
};





















