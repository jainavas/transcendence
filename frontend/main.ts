// Google Identity Services integration
import './env-types.js';

// No need to redeclare window.google, etc. as they're already in env-types.ts
declare global {
  interface Window {
    google: any;
    handleCredentialResponse: (response: any) => void;
    // env is already defined in env-types.ts
  }
}

// Estado global para la UI
let isAuthenticated = false;
let googleInitAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';

// JWT Token management
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

// Enhanced fetch with JWT token
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}

// Función para actualizar la interfaz de usuario
function updateUI(userData: any) {
  const userInfo = document.getElementById("userInfo");
  const googleButton = document.getElementById("googleSignInButton");
  
  if (userInfo) {
    userInfo.innerHTML = `
      <div class="bg-gray-50 p-4 rounded-lg shadow-sm mb-4">
        <p class="text-lg font-semibold">Hola, ${userData.usuario || (userData.user && userData.user.name) || ''}</p>
        <p class="text-sm text-gray-600">${userData.email || (userData.user && userData.user.email) || ''}</p>
        <img src="${userData.picture || (userData.user && userData.user.picture) || ''}" 
             class="mx-auto mt-4 rounded-full w-24 h-24 border-2 border-blue-500 shadow" 
             alt="Foto de perfil" />
        <button id="logoutButton" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          Cerrar sesión
        </button>
      </div>
    `;
    
    // Ocultar el botón de Google después del inicio de sesión
    if (googleButton) {
      googleButton.style.display = 'none';
    }
    
    // Agregar manejador para el botón de logout
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
      logoutButton.addEventListener('click', handleLogout);
    }
  }
}

// Función para cerrar sesión
async function handleLogout() {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    isAuthenticated = false;
    
    // Clear JWT token
    removeAuthToken();
    
    // Clear any pending 2FA data
    localStorage.removeItem('pendingUserEmail');
    localStorage.removeItem('pendingQrCode');
    localStorage.removeItem('pendingSetup');
    
    const userInfo = document.getElementById("userInfo");
    const googleButton = document.getElementById("googleSignInButton");
    
    if (userInfo) userInfo.innerHTML = "";
    if (googleButton) googleButton.style.display = 'flex';
    
    // Reiniciar el botón de Google
    initializeGoogleSignIn();
    
    console.log("Sesión cerrada");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

// Mejora la función para inicializar Google Sign-In
function initializeGoogleSignIn() {
  console.log("🔄 Intentando inicializar el botón de Google...", googleInitAttempts);
  
  // Verificar si hay un error en la URL y mostrarlo
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorMessage = urlParams.get('message') || urlParams.get('details');
  
  if (error) {
    console.error(`❌ Error detectado: ${error}${errorMessage ? ` - ${errorMessage}` : ''}`);
    const userInfo = document.getElementById("userInfo");
    if (userInfo) {
      userInfo.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p class="font-bold">Error de autenticación</p>
          <p>${error}${errorMessage ? `: ${errorMessage}` : ''}</p>
          <p class="mt-2 text-sm">
            <a href="${BACKEND_URL}/auth/diagnose" target="_blank" class="underline">
              Ver diagnóstico
            </a>
          </p>
        </div>
      `;
    }
  }
  
  if (window.google && window.google.accounts) {
    try {
      window.google.accounts.id.initialize({
        client_id: window.env?.GOOGLE_CLIENT_ID || "404879168796-oifuq2pnikf152tq8o1i9vcc48ssivse.apps.googleusercontent.com",
        callback: window.handleCredentialResponse
      });
      
      // Agregar diagnóstico al botón
      const diagLink = document.createElement('a');
      diagLink.href = '#';
      diagLink.className = 'text-xs text-gray-500 mt-2 block';
      diagLink.textContent = '¿Problemas? Ver diagnóstico';
      diagLink.onclick = (e) => {
        e.preventDefault();
        window.open(`${BACKEND_URL}/auth/diagnose`, '_blank');
      };
      
      const buttonElement = document.getElementById("googleSignInButton");
      if (buttonElement) {
        buttonElement.innerHTML = ''; // Limpia el contenedor primero
        window.google.accounts.id.renderButton(buttonElement, {
          theme: "outline",
          size: "large",
          width: 250,
          type: "standard",
          shape: "rectangular",
          text: "signin_with",
          logo_alignment: "left"
        });
        
        buttonElement.appendChild(diagLink);
        
        console.log("✅ Botón de Google inicializado correctamente");
      } else {
        console.error("❌ Contenedor del botón no encontrado");
      }
    } catch (error) {
      console.error("❌ Error al inicializar botón de Google:", error);
    }
  } else {
    // Si Google no está disponible, mostrar botón de respaldo
    googleInitAttempts++;
    if (googleInitAttempts < MAX_INIT_ATTEMPTS) {
      console.log("⏳ Google no disponible aún, reintentando...", googleInitAttempts);
      setTimeout(initializeGoogleSignIn, 1000);
    } else {
      console.error("❌ No se pudo cargar Google Identity Services después de varios intentos");
      
      // Mostrar botón alternativo después de los reintentos
      showFallbackButton();
    }
  }
}

// Mostrar un botón alternativo
function showFallbackButton() {
  const buttonElement = document.getElementById("googleSignInButton");
  if (buttonElement) {
    buttonElement.innerHTML = `
      <a href="${BACKEND_URL}/auth/google" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Iniciar sesión con Google
      </a>
    `;
    console.log("⚠️ Mostrando botón alternativo con redirección OAuth");
  }
}

// Callback de Google
window.handleCredentialResponse = async (response: any) => {
  console.log("🎯 Google credential response received");
  const userInfo = document.getElementById("userInfo");
  if (!userInfo) return;
  
  userInfo.innerHTML = "<p class='text-gray-600'>Verificando...</p>";

  try {
    // Enviar el token al backend para verificarlo
    const res = await fetch(`${BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
      credentials: 'include'
    });

    const data = await res.json();
    console.log("📡 Respuesta del backend:", data);

    if (res.ok) {
      if (data.status === '2fa_setup_required') {
        // Redirect to 2FA setup page with QR code
        console.log("🔐 2FA setup required - redirecting to setup page");
        
        // Store data for 2FA page
        localStorage.setItem('pendingUserEmail', data.user.email);
        localStorage.setItem('pendingQrCode', data.qrCode);
        localStorage.setItem('pendingSetup', 'true');
        
        // Redirect to 2FA page
        window.location.href = '/2fa?setup=true&email=' + encodeURIComponent(data.user.email);
        return;
      } else if (data.status === '2fa_verification_required') {
        // Redirect to 2FA verification page
        console.log("🔐 2FA verification required - redirecting to verification page");
        
        // Store data for 2FA page
        localStorage.setItem('pendingUserEmail', data.user.email);
        localStorage.setItem('pendingSetup', 'false');
        
        // Redirect to 2FA page
        window.location.href = '/2fa?email=' + encodeURIComponent(data.user.email);
        return;
      } else {
        // This should not happen with mandatory 2FA
        console.warn("⚠️ Unexpected response status:", data.status);
        userInfo.innerHTML = `<p class='text-yellow-500'>Unexpected response. Please try again.</p>`;
      }
    } else {
      console.error("❌ Authentication failed:", data);
      userInfo.innerHTML = `<p class='text-red-500'>Error: ${data.error || 'Error desconocido'}</p>`;
    }
  } catch (err) {
    console.error("❌ Error de red:", err);
    userInfo.innerHTML = `<p class='text-red-500'>Error de red. Por favor, inténtalo de nuevo.</p>`;
  }
};

// Verificar sesión al cargar la página
async function checkUserSession() {
  try {
    console.log("🔍 Verificando autenticación de usuario...");
    
    // Try JWT authentication first
    const token = getAuthToken();
    let response;
    
    if (token) {
      console.log("🎯 JWT token found, verifying...");
      response = await authenticatedFetch(`${BACKEND_URL}/user/me`);
    } else {
      console.log("⚠️ No JWT token found, checking session...");
      response = await fetch(`${BACKEND_URL}/user/me`, {
        credentials: 'include'
      });
    }
    
    const data = await response.json();
    console.log('📊 Resultado de verificación:', data);
    
    if (data.authenticated) {
      // Check authentication method
      if (data.authMethod === 'jwt' && !data.requires2FA) {
        // User is fully authenticated with JWT
        console.log("✅ Usuario autenticado con JWT válido");
        isAuthenticated = true;
        window.location.href = '/dashboard';
        return;
      } else if (data.authMethod === 'session' && data.requires2FA) {
        // User has session but needs 2FA - MANDATORY
        console.log("🔐 Usuario con sesión pero requiere verificación 2FA OBLIGATORIA");
        console.log("📊 Estado del usuario:", {
          authenticated: data.authenticated,
          authMethod: data.authMethod,
          requires2FA: data.requires2FA,
          isFullyAuthenticated: data.isFullyAuthenticated,
          userEmail: data.user?.email
        });
        
        localStorage.setItem('pendingUserEmail', data.user.email);
        localStorage.setItem('pendingSetup', 'false');
        console.log("🚨 REDIRIGIENDO A 2FA - SIN JWT VÁLIDO");
        window.location.href = '/2fa?email=' + encodeURIComponent(data.user.email);
        return;
      } else {
        // Other case - redirect to dashboard
        console.log("✅ Usuario autenticado, redirigiendo a dashboard");
        isAuthenticated = true;
        window.location.href = '/dashboard';
        return;
      }
    } else {
      // Clear any stale token
      console.log("❌ Usuario no autenticado");
      removeAuthToken();
      
      // Inicializar el botón de Google solo si no hay sesión activa
      initializeGoogleSignIn();
    }
  } catch (error) {
    console.error('❌ Error al verificar sesión:', error);
    // En caso de error, mostrar el botón de inicio de sesión
    initializeGoogleSignIn();
  }
}

// Modifica la función init para asegurar que se detecte el parámetro success y se realice la redirección

function init() {
  console.log("🚀 Aplicación iniciada");
  
  // Verificar parámetros en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const error = urlParams.get('error');
  
  console.log("Parámetros URL:", { success, error });
  
  if (success === 'true') {
    console.log("✅ Autenticación exitosa por redirección, redirigiendo a dashboard...");
    // Usar window.location.replace para forzar la redirección
    window.location.replace('/dashboard');
    return;
  }
  
  if (error) {
    console.error(`❌ Error en autenticación: ${error}`);
    const userInfo = document.getElementById("userInfo");
    if (userInfo) {
      userInfo.innerHTML = `<p class="text-red-500">Error de autenticación: ${error}</p>`;
    }
  }
  
  // Verificar si hay sesión activa
  checkUserSession();
  
  // Monitorear la disponibilidad de Google
  const checkGoogleInterval = setInterval(() => {
    if (window.google && window.google.accounts) {
      console.log("📱 Google Identity Services detectado");
      if (!isAuthenticated) {
        initializeGoogleSignIn();
      }
      clearInterval(checkGoogleInterval);
    }
  }, 500);
  
  // Si después de 5 segundos Google no está disponible, mostrar botón alternativo
  setTimeout(() => {
    clearInterval(checkGoogleInterval);
    if (!window.google || !window.google.accounts) {
      console.error("⏱️ Tiempo de espera agotado para Google Identity Services");
      showFallbackButton();
    }
  }, 5000);
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// En caso de que el script se cargue después del evento DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
