// Utilitaires pour la gestion du temps local français
const moment = require('moment');

class TimeUtils {
    /**
     * Obtenir l'heure actuelle en format français (Europe/Paris)
     * @returns {string} Heure au format HH:mm
     */
    static getCurrentTime() {
        const now = new Date();
        // Convertir en heure française (UTC+1 ou UTC+2 selon la saison)
        const frenchTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
        
        const hours = frenchTime.getHours().toString().padStart(2, '0');
        const minutes = frenchTime.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }

    /**
     * Obtenir la date actuelle en format français
     * @returns {string} Date au format YYYY-MM-DD
     */
    static getCurrentDate() {
        const now = new Date();
        const frenchDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
        
        const year = frenchDate.getFullYear();
        const month = (frenchDate.getMonth() + 1).toString().padStart(2, '0');
        const day = frenchDate.getDate().toString().padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Obtenir la date et l'heure actuelles en format français
     * @returns {object} {time: string, date: string, datetime: string}
     */
    static getCurrentDateTime() {
        const time = this.getCurrentTime();
        const date = this.getCurrentDate();
        const datetime = `${date} ${time}`;
        
        return { time, date, datetime };
    }

    /**
     * Logger avec timestamp français
     * @param {string} message 
     */
    static log(message) {
        const { datetime } = this.getCurrentDateTime();
        console.log(`[${datetime}] ${message}`);
    }
}

module.exports = TimeUtils;

