// env-config.js - Configuración automática HTTP/HTTPS

console.log('🔧 Inicializando configuración automática...');

// Detectar protocolo automáticamente
const isHTTPS = window.location.protocol === 'https:';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

console.log('🔍 Detección automática:', {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    isHTTPS: isHTTPS,
    isLocalhost: isLocalhost
});

// Configuración automática basada en el protocolo actual
const config = {
    BACKEND_URL: isHTTPS ? 'https://localhost:3001' : 'http://localhost:3000',
    FRONTEND_URL: isHTTPS ? 'https://localhost:8443' : 'http://localhost:8080',
    GOOGLE_CLIENT_ID: "404879168796-oifuq2pnikf152tq8o1i9vcc48ssivse.apps.googleusercontent.com",
    NODE_ENV: "development"
};

// Configurar variables globales
window.env = config;
window.ENV_CONFIG = {
    BACKEND_URL: config.BACKEND_URL,
    FRONTEND_URL: config.FRONTEND_URL
};

console.log("✅ Configuración automática:", {
    protocol: isHTTPS ? 'HTTPS 🔒' : 'HTTP 📡',
    backend: config.BACKEND_URL,
    frontend: config.FRONTEND_URL
});

// Mensaje informativo
if (isHTTPS) {
    console.log("🔒 Modo HTTPS activado - Conexión segura");
} else {
    console.log("📡 Modo HTTP activado - Para HTTPS accede a https://localhost:8443");
}