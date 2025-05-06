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

// Inicializar Google Sign-In con reintento
function initializeGoogleSignIn() {
  console.log("🔄 Intentando inicializar el botón de Google...", googleInitAttempts);
  
  if (window.google && window.google.accounts) {
    try {
      window.google.accounts.id.initialize({
        client_id: window.env?.GOOGLE_CLIENT_ID || "404879168796-oifuq2pnikf152tq8o1i9vcc48ssivse.apps.googleusercontent.com",
        callback: window.handleCredentialResponse
      });
      
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
      isAuthenticated = true;
      updateUI(data);
    } else {
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
    console.log("🔍 Verificando sesión de usuario...");
    const response = await fetch(`${BACKEND_URL}/user/me`, {
      credentials: 'include'
    });
    const data = await response.json();
    console.log('📊 Resultado de verificación de sesión:', data);
    
    if (data.authenticated) {
      isAuthenticated = true;
      // Redirigir a dashboard si ya hay sesión
      window.location.href = '/dashboard';
    } else {
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
