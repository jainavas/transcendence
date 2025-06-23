// env-config.js

// Función para detectar IP del ordenador real
async function getCurrentIP() {
    const hostname = window.location.hostname;
    
    console.log('🔍 Hostname completo:', hostname);
    
    // ARREGLO: Si es nip.io, extraer la IP correctamente
    if (hostname.includes('.nip.io')) {
        // hostname = "10.11.5.100.nip.io"
        const ip = hostname.replace('.nip.io', ''); // Extraer solo la IP
        console.log('✅ IP extraída de nip.io:', ip);
        return ip;
    }
    
    // Si es una IP directa
    if (hostname.match(/^10\.11\.\d+\.\d+$/)) {
        console.log('✅ IP directa:', hostname);
        return hostname;
    }
    
    // Si es localhost, pedir al backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        try {
            const response = await fetch('/api/current-ip');
            const data = await response.json();
            
            if (data.ip && data.ip.startsWith('10.11.')) {
                console.log('✅ IP desde backend:', data.ip);
                return data.ip;
            }
        } catch (error) {
            console.log('⚠️ Error obteniendo IP del backend:', error);
        }
        
        console.log('🏠 Usando localhost como fallback');
        return 'localhost';
    }
    
    console.log('⚠️ Hostname no reconocido:', hostname);
    return 'localhost';
}

// Función para mapear IP real a IP registrada (igual que en backend)
function mapToRegisteredIP(realIP) {
    // Si no es del rango de 42, usar localhost
    if (!realIP.startsWith('10.11.')) {
        return 'localhost';
    }
    
    // Mapear a una de las 3 IPs registradas
    const lastOctet = parseInt(realIP.split('.')[3]);
    const mappedIPs = ['10.11.1.1', '10.11.1.2', '10.11.1.3'];
    
    // Distribuir usando módulo
    const index = lastOctet % 3;
    const mappedIP = mappedIPs[index];
    
    console.log(`🔄 Frontend: Mapeando ${realIP} → ${mappedIP}`);
    return mappedIP;
}

// Función para crear configuración
async function createConfig() {
    const realIP = await getCurrentIP();
    const mappedIP = mapToRegisteredIP(realIP);
    
    const config = {
        REAL_IP: realIP,
        MAPPED_IP: mappedIP,
        BACKEND_URL: mappedIP === 'localhost' 
            ? 'http://localhost:3000' 
            : `http://${mappedIP}.nip.io:3000`,
        
        FRONTEND_URL: mappedIP === 'localhost' 
            ? 'http://localhost:8080' 
            : `http://${mappedIP}.nip.io:8080`,
            
        // Otras configuraciones...
    };
    
    console.log('🔧 Configuración creada:', config);
    return config;
}

// Inicializar configuración
createConfig().then(config => {
    window.ENV_CONFIG = config;
    console.log('✅ ENV_CONFIG listo:', window.ENV_CONFIG);
});

(async function initializeEnvironment() {
    try {
        // Wait for the configuration to be created
        const config = await createConfig();
        window.ENV_CONFIG = config;
        console.log('✅ ENV_CONFIG listo:', window.ENV_CONFIG);

        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

        // Initialize environment variables
        window.env = {
            BACKEND_URL: isLocalhost ? "http://localhost:3000" : config.BACKEND_URL,
            FRONTEND_URL: isLocalhost ? "http://localhost:8080" : config.FRONTEND_URL,
            GOOGLE_CLIENT_ID: "404879168796-oifuq2pnikf152tq8o1i9vcc48ssivse.apps.googleusercontent.com",
            NODE_ENV: "development"
        };

        console.log("✅ Variables de entorno cargadas para:", hostname, window.env);
    } catch (error) {
        console.error("❌ Error al inicializar la configuración:", error);
    }
})();