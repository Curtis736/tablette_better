/**
 * ScannerManager - Gestionnaire de scan de code-barres moderne et optimisé pour tablettes
 * Utilise l'API MediaDevices native du navigateur
 */
class ScannerManager {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.ctx = null;
        this.scanInterval = null;
        this.onCodeScanned = null;
        this.onError = null;
    }

    /**
     * Initialise le scanner avec les callbacks
     * @param {Function} onCodeScanned - Callback appelé quand un code est scanné
     * @param {Function} onError - Callback appelé en cas d'erreur
     */
    init(onCodeScanned, onError) {
        this.onCodeScanned = onCodeScanned;
        this.onError = onError;
    }

    /**
     * Charge ZXing dynamiquement si ce n'est pas déjà fait
     * @returns {Promise<boolean>}
     */
    async loadZXing() {
        // Vérifier si ZXing est déjà chargé
        if (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) {
            console.log('✅ ZXing déjà chargé');
            return true;
        }
        
        // Vérifier si le script est déjà en cours de chargement
        const existingScript = document.querySelector('script[src*="zxing"]');
        if (existingScript) {
            console.log('⏳ Script ZXing déjà présent, attente du chargement...');
            return await this.waitForZXing(30);
        }
        
        // Essayer plusieurs CDNs et versions
        const zxingSources = [
            'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0',
            'https://unpkg.com/@zxing/library@0.20.0',
            'https://cdn.jsdelivr.net/npm/@zxing/library@latest'
        ];
        
        console.log('📦 Chargement dynamique de ZXing...');
        
        for (const src of zxingSources) {
            try {
                const loaded = await this.loadScript(src);
                if (loaded) {
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ Échec chargement depuis ${src}:`, error);
                continue;
            }
        }
        
        console.error('❌ Impossible de charger ZXing depuis tous les CDNs');
        return false;
    }
    
    /**
     * Charge un script dynamiquement
     * @param {string} src - URL du script
     * @returns {Promise<boolean>}
     */
    loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`✅ Script chargé depuis ${src}, vérification...`);
                // Attendre un peu que ZXing soit initialisé
                setTimeout(async () => {
                    const loaded = await this.waitForZXing(15);
                    resolve(loaded);
                }, 1000);
            };
            script.onerror = (error) => {
                console.error(`❌ Erreur lors du chargement depuis ${src}:`, error);
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Vérifie si ZXing est chargé
     * @returns {Promise<boolean>}
     */
    async waitForZXing(maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            // Vérifier différentes façons dont ZXing peut être exposé
            const zxingAvailable = 
                (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) ||
                (typeof window !== 'undefined' && window.ZXing && window.ZXing.BrowserMultiFormatReader);
            
            if (zxingAvailable) {
                console.log(`✅ ZXing disponible après ${i + 1} tentatives`);
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.error('❌ ZXing non disponible après', maxAttempts, 'tentatives');
        return false;
    }

    /**
     * Démarre le scanner avec accès à la caméra
     * @param {HTMLElement} videoElement - Élément video pour afficher le flux caméra
     * @param {HTMLElement} canvasElement - Élément canvas pour l'analyse d'image
     * @returns {Promise<void>}
     */
    async start(videoElement, canvasElement) {
        if (this.isScanning) {
            console.warn('Scanner déjà actif');
            return;
        }

        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        try {
            // Charger ZXing si nécessaire
            const zxingLoaded = await this.loadZXing();
            if (!zxingLoaded) {
                throw new Error('Impossible de charger ZXing-js. Vérifiez votre connexion internet et réessayez.');
            }

            // Détecter quelle API utiliser
            let getUserMediaFunc;
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // API moderne
                getUserMediaFunc = (constraints) => navigator.mediaDevices.getUserMedia(constraints);
            } else if (navigator.getUserMedia) {
                // API legacy standard
                getUserMediaFunc = (constraints) => new Promise((resolve, reject) => {
                    navigator.getUserMedia(constraints, resolve, reject);
                });
            } else if (navigator.webkitGetUserMedia) {
                // API legacy WebKit
                getUserMediaFunc = (constraints) => new Promise((resolve, reject) => {
                    navigator.webkitGetUserMedia(constraints, resolve, reject);
                });
            } else if (navigator.mozGetUserMedia) {
                // API legacy Mozilla
                getUserMediaFunc = (constraints) => new Promise((resolve, reject) => {
                    navigator.mozGetUserMedia(constraints, resolve, reject);
                });
            } else {
                throw new Error('Aucune API d\'accès à la caméra disponible. Vérifiez que vous utilisez un navigateur moderne.');
            }

            // Préparer les contraintes selon l'API utilisée
            let constraints;
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // API moderne - contraintes complètes
                constraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };
            } else {
                // API legacy - contraintes simplifiées
                constraints = {
                    video: true
                };
            }

            this.stream = await getUserMediaFunc(constraints);
            
            // Afficher le flux vidéo
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            this.isScanning = true;
            this.startScanningLoop();

            console.log('✅ Scanner démarré avec succès');
        } catch (error) {
            console.error('Erreur démarrage scanner:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Arrête le scanner et libère les ressources
     */
    stop() {
        if (!this.isScanning) {
            return;
        }

        this.isScanning = false;

        // Arrêter ZXing si actif
        if (this.codeReader) {
            try {
                this.codeReader.reset();
            } catch (error) {
                console.warn('Erreur lors de l\'arrêt de ZXing:', error);
            }
            this.codeReader = null;
        }

        // Arrêter la boucle de scan
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        // Arrêter le flux vidéo
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Réinitialiser les éléments vidéo
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        if (this.canvasElement) {
            this.ctx = null;
        }

        console.log('✅ Scanner arrêté');
    }

    /**
     * Démarre la boucle de scan qui analyse les frames vidéo
     */
    startScanningLoop() {
        // Utiliser ZXing avec sa méthode native si disponible
        if (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) {
            try {
                this.codeReader = new ZXing.BrowserMultiFormatReader();
                
                // Décoder directement depuis la vidéo avec callback
                this.codeReader.decodeFromVideoDevice(null, this.videoElement, (result, error) => {
                    if (result) {
                        this.handleCodeScanned(result.getText());
                    }
                    // Les erreurs sont normales si aucun code n'est détecté
                });
                
                // Ne pas utiliser setInterval si ZXing gère déjà le scan
                return;
            } catch (error) {
                console.warn('Erreur initialisation ZXing, fallback sur canvas:', error);
            }
        }
        
        // Fallback : scan via canvas toutes les 300ms
        this.scanInterval = setInterval(() => {
            if (!this.isScanning || !this.videoElement || !this.canvasElement) {
                return;
            }

            try {
                // Vérifier que la vidéo est prête
                if (this.videoElement.readyState !== this.videoElement.HAVE_ENOUGH_DATA) {
                    return;
                }

                // Dessiner la frame vidéo sur le canvas
                const videoWidth = this.videoElement.videoWidth;
                const videoHeight = this.videoElement.videoHeight;

                if (videoWidth === 0 || videoHeight === 0) {
                    return;
                }

                this.canvasElement.width = videoWidth;
                this.canvasElement.height = videoHeight;
                this.ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

                // Analyser l'image pour détecter un code-barres
                this.scanFrame();
            } catch (error) {
                console.error('Erreur dans la boucle de scan:', error);
            }
        }, 300); // Scan toutes les 300ms
    }

    /**
     * Analyse une frame pour détecter un code-barres (fallback si ZXing direct ne fonctionne pas)
     */
    async scanFrame() {
        if (!this.ctx || !this.canvasElement || !this.videoElement) {
            return;
        }

        // Cette méthode n'est utilisée que si ZXing.decodeFromVideoDevice ne fonctionne pas
        // Pour l'instant, on laisse ZXing gérer directement depuis la vidéo
    }

    /**
     * Gère un code scanné avec succès
     * @param {string} code - Code scanné
     */
    handleCodeScanned(code) {
        if (!code || !this.isScanning) {
            return;
        }

        console.log('✅ Code scanné:', code);
        
        // Arrêter le scanner après un scan réussi
        this.stop();

        // Appeler le callback
        if (this.onCodeScanned) {
            this.onCodeScanned(code);
        }
    }

    /**
     * Gère les erreurs
     * @param {Error} error - Erreur survenue
     */
    handleError(error) {
        let errorMessage = 'Erreur lors du scan';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Permission d\'accès à la caméra refusée. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Aucune caméra détectée sur cet appareil.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'La caméra est déjà utilisée par une autre application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Les paramètres de la caméra ne sont pas supportés.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        if (this.onError) {
            this.onError(errorMessage, error);
        }
    }

    /**
     * Vérifie si le scanner est supporté par le navigateur
     * @returns {boolean}
     */
    static isSupported() {
        console.log('🔍 Vérification support scanner:');
        console.log('  - navigator:', typeof navigator);
        console.log('  - navigator.mediaDevices:', typeof navigator.mediaDevices, navigator.mediaDevices);
        console.log('  - navigator.getUserMedia:', typeof navigator.getUserMedia);
        console.log('  - navigator.webkitGetUserMedia:', typeof navigator.webkitGetUserMedia);
        console.log('  - navigator.mozGetUserMedia:', typeof navigator.mozGetUserMedia);
        console.log('  - navigator.msGetUserMedia:', typeof navigator.msGetUserMedia);
        console.log('  - Protocol:', location.protocol);
        console.log('  - Hostname:', location.hostname);
        console.log('  - User Agent:', navigator.userAgent);
        
        // Vérifier l'API MediaDevices moderne
        const hasModernAPI = !!(
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === 'function'
        );
        
        // Vérifier les APIs legacy
        const hasLegacyAPI = !!(
            (navigator.getUserMedia && typeof navigator.getUserMedia === 'function') ||
            (navigator.webkitGetUserMedia && typeof navigator.webkitGetUserMedia === 'function') ||
            (navigator.mozGetUserMedia && typeof navigator.mozGetUserMedia === 'function') ||
            (navigator.msGetUserMedia && typeof navigator.msGetUserMedia === 'function')
        );
        
        console.log('  - API moderne (MediaDevices):', hasModernAPI);
        console.log('  - API legacy (getUserMedia):', hasLegacyAPI);
        
        // Si au moins une API est disponible, on considère que c'est supporté
        const isSupported = hasModernAPI || hasLegacyAPI;
        
        if (!isSupported) {
            console.warn('⚠️ Aucune API caméra détectée directement');
            console.warn('   Détails:', {
                mediaDevices: !!navigator.mediaDevices,
                getUserMedia: !!navigator.getUserMedia,
                webkit: !!navigator.webkitGetUserMedia,
                moz: !!navigator.mozGetUserMedia,
                ms: !!navigator.msGetUserMedia
            });
            
            // Même si aucune API n'est détectée, on autorise quand même l'essai
            // Le navigateur peut avoir des APIs non standard ou le contexte peut changer
            // On laissera le navigateur gérer l'erreur si vraiment rien n'est disponible
            console.log('⚠️ Autorisation de l\'essai malgré l\'absence de détection - le navigateur gérera l\'erreur si nécessaire');
            return true;
        }
        
        // Toujours retourner true si une API est disponible
        // Le navigateur gérera lui-même les restrictions de sécurité
        console.log('✅ Scanner supporté (API disponible)');
        return true;
    }
}

export default ScannerManager;

