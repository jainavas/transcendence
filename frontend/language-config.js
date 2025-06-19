// language-config.js - Configuración global de idiomas
window.LANGUAGE_CONFIG = {
    STORAGE_KEY: 'transcendence_language',
    FALLBACK_STORAGE_KEY: 'language',
    DEFAULT_LANGUAGE: 'es',
    SUPPORTED_LANGUAGES: ['es', 'en', 'fr', 'de', 'pt'],
    LOCALES_PATH: '/locales/',
    
    // Función utilitaria para sincronizar localStorage
    syncLanguageStorage: function(lang) {
        localStorage.setItem(this.STORAGE_KEY, lang);
        localStorage.setItem(this.FALLBACK_STORAGE_KEY, lang);
    },
    
    // Función para obtener idioma actual
    getCurrentLanguage: function() {
        return localStorage.getItem(this.STORAGE_KEY) || 
               localStorage.getItem(this.FALLBACK_STORAGE_KEY) || 
               this.DEFAULT_LANGUAGE;
    }
};