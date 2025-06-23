// Variables de entorno para el frontend - Configuración adaptable
(function() {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // Usar localhost para OAuth (más compatible con Google) y la IP real para acceso directo
  window.env = {
    BACKEND_URL: isLocalhost ? "http://localhost:3000" : "http://10.11.12.5:3000",
    FRONTEND_URL: isLocalhost ? "http://localhost:8080" : "http://10.11.12.5:8080",
    GOOGLE_CLIENT_ID: "404879168796-oifuq2pnikf152tq8o1i9vcc48ssivse.apps.googleusercontent.com",
    NODE_ENV: "development"
  };

  console.log("✅ Variables de entorno cargadas para:", hostname, window.env);
})();
