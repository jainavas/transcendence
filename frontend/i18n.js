/**
 * Sistema de Internacionalización (i18n) para Transcendence
 * Soporte para múltiples idiomas con detección automática
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'es'; // Idioma por defecto
        this.fallbackLanguage = 'es';
        this.translations = {};
        this.supportedLanguages = ['es', 'en', 'fr', 'de', 'pt'];
        this.languageNames = {
            'es': 'Español',
            'en': 'English',
            'fr': 'Français', 
            'de': 'Deutsch',
            'pt': 'Português'
        };
        this.isLoaded = false;
        this.loadPromise = null;
        this.observers = []; // Para notificar cambios de idioma
    }

    /**
     * Inicializa el sistema de i18n
     */
    async init() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._performInit();
        return this.loadPromise;
    }

    async _performInit() {
        try {
            // Detectar idioma del navegador o cargar desde localStorage
            this.currentLanguage = this.detectLanguage();
            
            // Cargar traducciones
            await this.loadTranslations(this.currentLanguage);
            
            // Aplicar traducciones a la página
            this.applyTranslations();
            
            this.isLoaded = true;
            console.log(`🌍 i18n inicializado en idioma: ${this.currentLanguage}`);
            
            // Notificar a los observadores
            this.notifyObservers();
            
        } catch (error) {
            console.error('❌ Error inicializando i18n:', error);
            // Fallback al idioma por defecto
            if (this.currentLanguage !== this.fallbackLanguage) {
                this.currentLanguage = this.fallbackLanguage;
                await this.loadTranslations(this.currentLanguage);
                this.applyTranslations();
            }
        }
    }

    /**
     * Detecta el idioma preferido del usuario
     */
    detectLanguage() {
        // 1. Verificar localStorage
        const saved = localStorage.getItem('transcendence_language');
        if (saved && this.supportedLanguages.includes(saved)) {
            return saved;
        }

        // 2. Detectar del navegador
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.substring(0, 2).toLowerCase();
        
        if (this.supportedLanguages.includes(langCode)) {
            return langCode;
        }

        // 3. Fallback al idioma por defecto
        return this.fallbackLanguage;
    }

    /**
     * Carga las traducciones para un idioma específico
     */
    async loadTranslations(lang) {
        try {
            console.log(`🌍 Intentando cargar traducciones para ${lang}...`);
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Error cargando idioma ${lang}: ${response.status}`);
            }
            
            this.translations[lang] = await response.json();
            console.log(`✅ Traducciones cargadas para ${lang}:`, Object.keys(this.translations[lang]));
            
        } catch (error) {
            console.error(`❌ Error cargando traducciones para ${lang}:`, error);
            
            // Si falla el idioma actual, usar fallback
            if (lang !== this.fallbackLanguage) {
                console.log(`🔄 Cargando idioma fallback: ${this.fallbackLanguage}`);
                await this.loadTranslations(this.fallbackLanguage);
            } else {
                // Si hasta el fallback falla, crear traducciones básicas
                console.warn('⚠️ Creando traducciones básicas de emergencia...');
                this.translations[lang] = {
                    "common": { "loading": "Cargando...", "error": "Error" },
                    "dashboard": { "welcome": "Bienvenido", "title": "Dashboard" },
                    "game": { "score": "Puntuación", "game_over": "Juego terminado" }
                };
            }
        }
    }

    /**
     * Obtiene una traducción por clave
     */
    t(key, params = {}) {
        const lang = this.currentLanguage;
        let translation = this.getNestedValue(this.translations[lang], key);
        
        // Fallback al idioma por defecto si no existe la traducción
        if (!translation && lang !== this.fallbackLanguage) {
            translation = this.getNestedValue(this.translations[this.fallbackLanguage], key);
        }
        
        // Si aún no existe, devolver la clave
        if (!translation) {
            console.warn(`🔍 Traducción no encontrada: ${key}`);
            return key;
        }

        // Reemplazar parámetros en la traducción
        return this.interpolate(translation, params);
    }

    /**
     * Obtiene valor anidado de un objeto usando notación de puntos
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * Interpola parámetros en una cadena de traducción
     */
    interpolate(template, params) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Cambia el idioma actual
     */
    async changeLanguage(newLang) {
        if (!this.supportedLanguages.includes(newLang)) {
            console.error(`❌ Idioma no soportado: ${newLang}`);
            return false;
        }

        if (newLang === this.currentLanguage) {
            return true; // Ya está en ese idioma
        }

        try {
            // Cargar traducciones del nuevo idioma si no están cargadas
            if (!this.translations[newLang]) {
                await this.loadTranslations(newLang);
            }

            this.currentLanguage = newLang;
            localStorage.setItem('transcendence_language', newLang);
            
            this.applyTranslations();
            this.notifyObservers();
            
            console.log(`🌍 Idioma cambiado a: ${newLang}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error cambiando idioma a ${newLang}:`, error);
            return false;
        }
    }

    /**
     * Aplica las traducciones a todos los elementos con data-i18n
     */
    applyTranslations() {
        // Traducir elementos con data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Decidir si es texto o atributo
            if (element.hasAttribute('data-i18n-attr')) {
                const attr = element.getAttribute('data-i18n-attr');
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }
        });

        // Traducir placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Traducir títulos
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // Actualizar textos dinámicos del juego
        this.updateGameTexts();
    }

    /**
     * Registra un observador para cambios de idioma
     */
    onLanguageChange(callback) {
        this.observers.push(callback);
    }

    /**
     * Notifica a todos los observadores sobre cambios de idioma
     */
    notifyObservers() {
        this.observers.forEach(callback => {
            try {
                callback(this.currentLanguage);
            } catch (error) {
                console.error('❌ Error en observador de idioma:', error);
            }
        });
    }

    /**
     * Obtiene la lista de idiomas soportados
     */
    getSupportedLanguages() {
        return this.supportedLanguages.map(code => ({
            code,
            name: this.languageNames[code]
        }));
    }

    /**
     * Obtiene el idioma actual
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Verifica si el sistema está listo
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Actualiza textos dinámicos en los juegos de Pong
     */
    updateGameTexts() {
        // Actualizar el mensaje de inicio si existe
        if (window.mensajeInicio) {
            window.mensajeInicio.text = this.t('game.choose_character_and_environment');
        }
        
        // Actualizar marcador usando la función especializada si existe
        if (window.updateScoreDisplay) {
            window.updateScoreDisplay();
        } else {
            // Fallback: actualizar manualmente
            const scoreElement = document.getElementById('score');
            if (scoreElement && window.scoreP1 !== undefined) {
                // Detectar modo de juego basado en si hay 4 jugadores activos
                const is4PlayerMode = window.scoreP3 !== undefined && window.scoreP4 !== undefined;
                
                if (is4PlayerMode) {
                    // Modo 4 jugadores
                    const blueText = this.t('game.blue');
                    const redText = this.t('game.red');
                    const greenText = this.t('game.green');
                    const purpleText = this.t('game.purple');
                    scoreElement.textContent = `${blueText}:${window.scoreP1} - ${redText}:${window.scoreP2} - ${greenText}:${window.scoreP3} - ${purpleText}:${window.scoreP4}`;
                } else {
                    // Modo 2 jugadores
                    scoreElement.textContent = `${window.scoreP1} - ${window.scoreP2}`;
                }
            }
        }
        
        console.log('✅ Textos del juego actualizados al idioma:', this.currentLanguage);
    }
}

// Crear instancia global
window.i18n = new I18nManager();

// Funciones de conveniencia globales
window.t = (key, params) => window.i18n.t(key, params);
window.changeLanguage = (lang) => window.i18n.changeLanguage(lang);

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌍 DOM cargado, inicializando i18n...');
        window.i18n.init();
    });
} else {
    console.log('🌍 DOM ya cargado, inicializando i18n inmediatamente...');
    window.i18n.init();
}

// Debug: verificar que todo esté disponible
console.log('🔧 i18n.js cargado, funciones disponibles:', {
    i18n: !!window.i18n,
    t: !!window.t,
    changeLanguage: !!window.changeLanguage
});
