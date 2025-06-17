/**
 * Componente Selector de Idioma para Transcendence
 * Crea un dropdown elegante para cambiar idiomas
 */

class LanguageSelector {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            showFlags: true,
            showNames: true,
            position: 'top-right',
            theme: 'dark',
            ...options
        };
        
        this.flags = {
            'es': '🇪🇸',
            'en': '🇺🇸', 
            'fr': '🇫🇷',
            'de': '🇩🇪',
            'pt': '🇵🇹'
        };
        
        this.isOpen = false;
        this.selector = null;
        
        this.init();
    }

    init() {
        console.log('🎌 Inicializando LanguageSelector...');
        
        // Verificar que i18n existe
        if (!window.i18n) {
            console.error('❌ window.i18n no encontrado. Reintentando en 1 segundo...');
            setTimeout(() => this.init(), 1000);
            return;
        }
        
        // Esperar a que i18n esté listo
        if (window.i18n.isReady()) {
            console.log('✅ i18n listo, renderizando selector...');
            this.render();
        } else {
            console.log('⏳ Esperando a que i18n esté listo...');
            window.i18n.onLanguageChange(() => {
                if (!this.selector) {
                    console.log('🎨 i18n listo, renderizando selector...');
                    this.render();
                } else {
                    this.updateSelection();
                }
            });
            
            // Fallback: intentar renderizar después de 3 segundos aunque no esté listo
            setTimeout(() => {
                if (!this.selector) {
                    console.log('⚠️ Renderizando selector sin esperar a i18n...');
                    this.render();
                }
            }, 3000);
        }
    }

    render() {
        console.log('🎨 Renderizando selector de idioma...');
        
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`❌ Container ${this.containerId} no encontrado`);
            return;
        }

        // Verificar que i18n existe, si no, usar valores por defecto
        if (!window.i18n) {
            console.warn('⚠️ i18n no disponible, usando selector básico...');
            container.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer;">
                    🌐 ES (i18n no disponible)
                </div>
            `;
            return;
        }

        // Crear estructura HTML
        this.selector = document.createElement('div');
        this.selector.className = `language-selector ${this.options.theme}`;
        this.selector.innerHTML = this.getHTML();
        
        container.appendChild(this.selector);
        
        // Agregar estilos CSS
        this.injectStyles();
        
        // Configurar eventos
        this.setupEvents();
        
        console.log('✅ Selector de idioma renderizado correctamente');
    }

    getHTML() {
        // Valores por defecto si i18n no está disponible
        let currentLang = 'es';
        let currentFlag = '🇪🇸';
        let currentName = 'Español';
        let supportedLanguages = [
            { code: 'en', name: 'English' },
            { code: 'fr', name: 'Français' },
            { code: 'de', name: 'Deutsch' },
            { code: 'pt', name: 'Português' }
        ];
        
        // Si i18n está disponible, usar sus valores
        if (window.i18n) {
            currentLang = window.i18n.getCurrentLanguage();
            currentFlag = this.flags[currentLang] || '🌐';
            currentName = window.i18n.languageNames[currentLang] || currentLang;
            supportedLanguages = window.i18n.getSupportedLanguages()
                .filter(lang => lang.code !== currentLang);
        }
        
        const languages = supportedLanguages
            .map(lang => {
                const flag = this.flags[lang.code] || '🌐';
                return `
                    <div class="lang-option" data-lang="${lang.code}">
                        ${this.options.showFlags ? `<span class="lang-flag">${flag}</span>` : ''}
                        ${this.options.showNames ? `<span class="lang-name">${lang.name}</span>` : ''}
                    </div>
                `;
            }).join('');

        const ariaLabel = window.t ? window.t('language.select_language') : 'Seleccionar idioma';

        return `
            <div class="lang-current" role="button" tabindex="0" aria-label="${ariaLabel}">
                ${this.options.showFlags ? `<span class="lang-flag">${currentFlag}</span>` : ''}
                ${this.options.showNames ? `<span class="lang-name">${currentName}</span>` : ''}
                <span class="lang-arrow">▼</span>
            </div>
            <div class="lang-dropdown">
                ${languages}
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('language-selector-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'language-selector-styles';
        styles.textContent = `
            .language-selector {
                position: relative;
                display: inline-block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: 1000;
            }

            .language-selector.dark {
                --bg-color: rgba(30, 30, 30, 0.95);
                --text-color: #ffffff;
                --border-color: rgba(255, 255, 255, 0.2);
                --hover-bg: rgba(255, 255, 255, 0.1);
                --shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            }

            .language-selector.light {
                --bg-color: rgba(255, 255, 255, 0.95);
                --text-color: #333333;
                --border-color: rgba(0, 0, 0, 0.2);
                --hover-bg: rgba(0, 0, 0, 0.05);
                --shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }

            .lang-current {
                background: var(--bg-color);
                color: var(--text-color);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 120px;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                user-select: none;
            }

            .lang-current:hover {
                background: var(--hover-bg);
                border-color: var(--text-color);
                transform: translateY(-1px);
                box-shadow: var(--shadow);
            }

            .lang-current:focus {
                outline: none;
                box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.5);
            }

            .lang-flag {
                font-size: 1.2em;
                line-height: 1;
            }

            .lang-name {
                flex: 1;
                font-size: 0.9em;
                font-weight: 500;
            }

            .lang-arrow {
                font-size: 0.8em;
                transition: transform 0.2s ease;
            }

            .language-selector.open .lang-arrow {
                transform: rotate(180deg);
            }

            .lang-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--bg-color);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                margin-top: 4px;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                box-shadow: var(--shadow);
                overflow: hidden;
            }

            .language-selector.open .lang-dropdown {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .lang-option {
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--text-color);
                transition: background-color 0.1s ease;
            }

            .lang-option:hover {
                background: var(--hover-bg);
            }

            .lang-option:active {
                background: rgba(66, 153, 225, 0.2);
            }

            /* Responsive */
            @media (max-width: 768px) {
                .lang-dropdown {
                    right: 0;
                    left: auto;
                    min-width: 150px;
                }
            }

            /* Animación de entrada */
            @keyframes fadeInDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .language-selector.open .lang-dropdown {
                animation: fadeInDown 0.2s ease;
            }
        `;
        
        document.head.appendChild(styles);
    }

    setupEvents() {
        const current = this.selector.querySelector('.lang-current');
        const dropdown = this.selector.querySelector('.lang-dropdown');
        const options = this.selector.querySelectorAll('.lang-option');

        // Toggle dropdown
        current.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Teclado para accesibilidad
        current.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Seleccionar idioma
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.currentTarget.getAttribute('data-lang');
                this.changeLanguage(lang);
            });
        });

        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!this.selector.contains(e.target)) {
                this.close();
            }
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.selector.classList.add('open');
        this.isOpen = true;
    }

    close() {
        this.selector.classList.remove('open');
        this.isOpen = false;
    }

    async changeLanguage(langCode) {
        console.log(`🔄 Cambiando idioma a: ${langCode}`);
        
        if (!window.i18n) {
            console.error('❌ Sistema i18n no disponible');
            // Guardar la selección en localStorage para cuando esté disponible
            localStorage.setItem('transcendence_language', langCode);
            window.location.reload(); // Recargar la página
            return false;
        }
        
        try {
            const success = await window.i18n.changeLanguage(langCode);
            if (success) {
                this.updateSelection();
                this.close();
                
                // Actualizar textos específicos del juego si existen
                if (window.i18n.updateGameTexts) {
                    window.i18n.updateGameTexts();
                }
                
                // Opcional: mostrar notificación
                const message = window.t ? window.t('language.change_language') : 'Idioma cambiado';
                this.showNotification(message);
                
                console.log(`✅ Idioma cambiado exitosamente a: ${langCode}`);
            }
            return success;
        } catch (error) {
            console.error('❌ Error cambiando idioma:', error);
            return false;
        }
    }

    updateSelection() {
        if (!this.selector) return;
        
        // Re-renderizar el componente
        this.selector.innerHTML = this.getHTML();
        this.setupEvents();
    }

    showNotification(message) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(30, 30, 30, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 0.9em;
            z-index: 10000;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
}

// Función de conveniencia para crear selector de idioma
window.createLanguageSelector = (containerId, options) => {
    return new LanguageSelector(containerId, options);
};

// Auto-crear selector si existe el container
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 DOM cargado, buscando selector de idioma...');
    const container = document.getElementById('language-selector-container');
    if (container) {
        console.log('✅ Container encontrado, creando selector...');
        window.createLanguageSelector('language-selector-container');
    } else {
        console.warn('❌ Container language-selector-container no encontrado');
        // Crear un selector temporal visible para debug
        createDebugSelector();
    }
});

// Función de debug para crear un selector simple y visible
function createDebugSelector() {
    console.log('🔧 Creando selector de debug...');
    
    // Buscar cualquier contenedor disponible
    let container = document.getElementById('language-selector-container');
    if (!container) {
        // Crear contenedor si no existe
        container = document.createElement('div');
        container.id = 'language-selector-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(container);
    }
    
    // Crear selector simple
    container.innerHTML = `
        <div style="display: flex; gap: 5px; align-items: center;">
            <span>🌍</span>
            <select id="simple-lang-selector" style="padding: 5px; border-radius: 4px;">
                <option value="es">🇪🇸 Español</option>
                <option value="en">🇺🇸 English</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
                <option value="pt">🇵🇹 Português</option>
            </select>
        </div>
    `;
    
    // Configurar evento
    const selector = document.getElementById('simple-lang-selector');
    if (selector) {
        // Establecer valor actual
        if (window.i18n && window.i18n.getCurrentLanguage) {
            selector.value = window.i18n.getCurrentLanguage();
        }
        
        selector.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            console.log(`🌍 Cambiando idioma a: ${newLang}`);
            
            if (window.changeLanguage) {
                await window.changeLanguage(newLang);
                console.log('✅ Idioma cambiado exitosamente');
            } else {
                console.error('❌ window.changeLanguage no disponible');
            }
        });
        
        console.log('✅ Selector de debug creado exitosamente');
    }
}
