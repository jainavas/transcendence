# 🌍 Sistema de Internacionalización (i18n) - Transcendence

## 📖 Resumen

Este proyecto implementa un sistema completo de internacionalización que permite soportar múltiples idiomas de forma eficiente y escalable.

## 🚀 Características

- ✅ **5 idiomas soportados**: Español (es), Inglés (en), Francés (fr), Alemán (de), Portugués (pt)
- ✅ **Detección automática** del idioma del navegador
- ✅ **Persistencia** de la selección del usuario en localStorage
- ✅ **Selector visual** con banderas y nombres de idiomas
- ✅ **Fallback robusto** a español si falla la carga de traducciones
- ✅ **Sistema de interpolación** para parámetros dinámicos
- ✅ **Observadores** para reactividad en cambios de idioma
- ✅ **Accesibilidad** completa con soporte de teclado
- ✅ **Traducciones dinámicas** en JavaScript
- ✅ **API simple** y fácil de usar

## 📁 Estructura de Archivos

```
frontend/
├── i18n.js                    # Motor principal de i18n
├── language-selector.js       # Componente selector de idioma
└── locales/                   # Archivos de traducción
    ├── es.json               # Español (idioma base)
    ├── en.json               # Inglés
    ├── fr.json               # Francés
    ├── de.json               # Alemán
    └── pt.json               # Portugués
```

## 🛠️ Uso Básico

### En HTML
```html
<!-- Incluir los scripts -->
<script src="/i18n.js"></script>
<script src="/language-selector.js"></script>

<!-- Usar etiquetas data-i18n -->
<h1 data-i18n="dashboard.welcome">Bienvenido</h1>
<button data-i18n="common.save">Guardar</button>

<!-- Selector de idioma -->
<div id="language-selector-container"></div>
```

### En JavaScript
```javascript
// Usar traducciones
const message = window.t('game.game_over');
const messageWithParams = window.t('game.score_display', { score: 100 });

// Cambiar idioma
await window.changeLanguage('en');

// Observar cambios de idioma
window.i18n.onLanguageChange((newLang) => {
    console.log('Idioma cambiado a:', newLang);
});
```

## 📝 Agregar Nuevas Traducciones

### 1. Agregar clave en todos los archivos de idioma

**es.json:**
```json
{
  "menu": {
    "new_option": "Nueva Opción"
  }
}
```

**en.json:**
```json
{
  "menu": {
    "new_option": "New Option"
  }
}
```

### 2. Usar en HTML
```html
<button data-i18n="menu.new_option">Nueva Opción</button>
```

### 3. Usar en JavaScript
```javascript
const text = window.t('menu.new_option');
```

## 🎨 Personalizar el Selector de Idioma

```javascript
// Crear selector personalizado
window.createLanguageSelector('mi-container', {
    showFlags: true,
    showNames: true,
    theme: 'dark', // 'dark' o 'light'
    position: 'top-right'
});
```

## 🔧 API Avanzada

### Interpolación de Parámetros
```javascript
// En el archivo de traducción
{
  "welcome": "Hola {{name}}, tienes {{count}} mensajes"
}

// En JavaScript
const msg = window.t('welcome', { name: 'Juan', count: 5 });
// Resultado: "Hola Juan, tienes 5 mensajes"
```

### Atributos Especiales
```html
<!-- Traducir placeholder -->
<input data-i18n-placeholder="common.search" placeholder="Buscar">

<!-- Traducir title -->
<button data-i18n-title="common.help" title="Ayuda">?</button>

<!-- Traducir atributo personalizado -->
<img data-i18n="common.logo" data-i18n-attr="alt" alt="Logo">
```

## 🌐 Agregar Nuevo Idioma

### 1. Crear archivo de traducción
```bash
# Crear nuevo archivo
cp locales/es.json locales/it.json
```

### 2. Actualizar i18n.js
```javascript
this.supportedLanguages = ['es', 'en', 'fr', 'de', 'pt', 'it'];
this.languageNames = {
    // ...existentes...
    'it': 'Italiano'
};
```

### 3. Agregar bandera en language-selector.js
```javascript
this.flags = {
    // ...existentes...
    'it': '🇮🇹'
};
```

## 🎯 Mejores Prácticas

### 1. Organización de Claves
```json
{
  "common": { "save": "Guardar", "cancel": "Cancelar" },
  "navigation": { "home": "Inicio", "about": "Acerca de" },
  "game": { "score": "Puntuación", "level": "Nivel" }
}
```

### 2. Nombres de Claves Descriptivos
```javascript
// ✅ Bueno
window.t('dashboard.welcome_message')
window.t('game.player_eliminated')

// ❌ Evitar
window.t('msg1')
window.t('text')
```

### 3. Fallbacks en JavaScript
```javascript
// Siempre incluir fallback
const message = window.t ? window.t('game.score') : 'Puntuación';
```

## 🚨 Solución de Problemas

### Traducciones no aparecen
1. Verificar que los archivos JSON estén bien formados
2. Comprobar que las claves existan en todos los idiomas
3. Verificar que i18n.js se cargue antes que otros scripts

### Selector no aparece
1. Verificar que existe el contenedor: `#language-selector-container`
2. Comprobar que no hay errores de JavaScript en la consola
3. Verificar que language-selector.js se carga después de i18n.js

### Idioma no persiste
1. Verificar que localStorage esté habilitado
2. Comprobar que no hay errores al guardar la preferencia

## 📊 Estado de Traducciones

| Sección | ES | EN | FR | DE | PT |
|---------|----|----|----|----|---- |
| Common | ✅ | ✅ | ✅ | ✅ | ✅ |
| Navigation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Game | ✅ | ✅ | ✅ | ✅ | ✅ |
| Controls | ✅ | ✅ | ✅ | ✅ | ✅ |
| UI | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🔮 Futuras Mejoras

- [ ] Detección automática de idioma por geolocalización IP
- [ ] Carga perezosa de traducciones (lazy loading)
- [ ] Pluralización inteligente
- [ ] Formateo de números y fechas por idioma
- [ ] Sistema de traducción en tiempo real con APIs
- [ ] Herramientas de validación de traducciones
- [ ] Modo de desarrollo con claves faltantes resaltadas

---

## 💻 Implementación Técnica

El sistema usa:
- **Fetch API** para cargar traducciones asíncronamente
- **localStorage** para persistir preferencias
- **MutationObserver** potencial para detectar cambios DOM
- **CSS Grid/Flexbox** para el selector visual
- **Event delegation** para eventos eficientes
- **Promesas** para manejo asíncrono robusto

¡El sistema está listo para escalar y soportar las necesidades futuras del proyecto! 🚀
