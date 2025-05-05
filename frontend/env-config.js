// Este script crea variables globales para el frontend desde las variables de entorno
window.env = {
  BACKEND_URL: "${process.env.BACKEND_URL || 'http://localhost:3000'}",
  FRONTEND_URL: "${process.env.FRONTEND_URL || 'http://localhost:8080'}",
  GOOGLE_CLIENT_ID: "${process.env.GOOGLE_CLIENT_ID || ''}",
  NODE_ENV: "${process.env.NODE_ENV || 'development'}"
};

console.log('✅ Variables de entorno cargadas:', window.env);