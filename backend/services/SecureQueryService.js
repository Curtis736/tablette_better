/**
 * Service pour exécuter des requêtes sécurisées avec isolation des données
 */

const { executeQuery } = require('../config/database');

class SecureQueryService {
    constructor() {
        this.auditLog = [];
    }

    /**
     * Exécuter une requête avec isolation automatique par opérateur
     */
    async executeSecureQuery(query, params, operatorCode, operation) {
        try {
            // Ajouter automatiquement le filtre d'opérateur
            const secureQuery = this.addOperatorFilter(query, operatorCode);
            const secureParams = { ...params, operatorCode };

            // Log de sécurité
            this.logQuery(operatorCode, operation, secureQuery, secureParams);

            // Exécuter la requête
            const result = await executeQuery(secureQuery, secureParams);

            // Valider que les résultats appartiennent bien à l'opérateur
            this.validateResults(result, operatorCode, operation);

            return result;

        } catch (error) {
            console.error(`❌ Erreur requête sécurisée pour ${operatorCode}:`, error);
            throw error;
        }
    }

    /**
     * Ajouter automatiquement le filtre d'opérateur à une requête
     */
    addOperatorFilter(query, operatorCode) {
        // Vérifier si la requête contient déjà un filtre d'opérateur
        if (query.includes('WHERE h.OperatorCode = @operatorCode') || 
            query.includes('WHERE OperatorCode = @operatorCode')) {
            return query;
        }

        // Ajouter le filtre d'opérateur
        let secureQuery = query;
        
        if (query.includes('WHERE')) {
            // Ajouter à la clause WHERE existante
            secureQuery = query.replace(
                /WHERE\s+(.+)/i,
                `WHERE $1 AND h.OperatorCode = @operatorCode`
            );
        } else if (query.includes('FROM')) {
            // Ajouter une clause WHERE
            secureQuery = query.replace(
                /FROM\s+([^\s]+)/i,
                `FROM $1 WHERE h.OperatorCode = @operatorCode`
            );
        }

        return secureQuery;
    }

    /**
     * Valider que les résultats appartiennent bien à l'opérateur
     */
    validateResults(results, operatorCode, operation) {
        if (!Array.isArray(results)) return;

        const invalidResults = results.filter(result => 
            result.OperatorCode && result.OperatorCode !== operatorCode
        );

        if (invalidResults.length > 0) {
            console.log(`🚨 VIOLATION DE SÉCURITÉ: ${invalidResults.length} résultats n'appartiennent pas à l'opérateur ${operatorCode}`);
            console.log(`🚨 Opération: ${operation}`);
            console.log(`🚨 Résultats invalides:`, invalidResults.map(r => ({
                OperatorCode: r.OperatorCode,
                CodeLanctImprod: r.CodeLanctImprod
            })));
            
            throw new Error('Violation de sécurité: données d\'un autre opérateur détectées');
        }
    }

    /**
     * Requête sécurisée pour récupérer l'historique d'un opérateur
     */
    async getOperatorHistory(operatorCode, limit = 50) {
        const query = `
            SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                h.Phase,
                h.OperatorCode,
                h.Statut,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation,
                l.DesignationLct1 as Article,
                l.DesignationLct2 as ArticleDetail
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            ORDER BY h.DateCreation DESC
        `;

        return this.executeSecureQuery(query, { limit }, operatorCode, 'getOperatorHistory');
    }

    /**
     * Requête sécurisée pour récupérer les lancements d'un opérateur
     */
    async getOperatorLancements(operatorCode, status = null) {
        let query = `
            SELECT DISTINCT
                h.CodeLanctImprod,
                l.DesignationLct1 as Article,
                l.DesignationLct2 as ArticleDetail,
                MAX(h.DateCreation) as LastActivity
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            GROUP BY h.CodeLanctImprod, l.DesignationLct1, l.DesignationLct2
        `;

        const params = {};
        if (status) {
            query += ` HAVING MAX(CASE WHEN h.Ident = 'FIN' THEN 1 ELSE 0 END) = @statusFilter`;
            params.statusFilter = status === 'TERMINE' ? 1 : 0;
        }

        return this.executeSecureQuery(query, params, operatorCode, 'getOperatorLancements');
    }

    /**
     * Requête sécurisée pour valider la propriété d'un lancement
     */
    async validateLancementOwnership(lancementCode, operatorCode) {
        const query = `
            SELECT TOP 1 
                h.OperatorCode,
                h.Ident,
                h.DateCreation
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            WHERE h.CodeLanctImprod = @lancementCode
            ORDER BY h.DateCreation ASC
        `;

        const result = await this.executeSecureQuery(query, { lancementCode }, operatorCode, 'validateLancementOwnership');
        
        return result.length > 0 && result[0].OperatorCode === operatorCode;
    }

    /**
     * Log des requêtes pour audit
     */
    logQuery(operatorCode, operation, query, params) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operatorCode,
            operation,
            query: query.substring(0, 200) + '...', // Tronquer pour les logs
            params: Object.keys(params),
            ip: 'N/A' // Sera rempli par le middleware
        };

        this.auditLog.push(logEntry);

        // Garder seulement les 1000 dernières entrées
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
    }

    /**
     * Obtenir les logs d'audit
     */
    getAuditLog(operatorCode = null) {
        if (operatorCode) {
            return this.auditLog.filter(log => log.operatorCode === operatorCode);
        }
        return this.auditLog;
    }

    /**
     * Nettoyer les logs d'audit
     */
    clearAuditLog() {
        this.auditLog = [];
    }
}

module.exports = new SecureQueryService();





















