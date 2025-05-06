// Dashboard functionality
console.log("🚀 dashboard.ts cargando...");
import './env-types.js'; // Import the type definitions
export {};

// Extend window interface to include custom properties
declare global {
  interface Window {
    userSessionId?: string;
    env: {
		BACKEND_URL?: string;
		FRONTEND_URL?: string;
		GOOGLE_CLIENT_ID?: string;
		NODE_ENV?: string;
	};
  }
}

// Variables globales
interface User {
  name: string;
  email: string;
  picture: string;
  id?: string;
}

interface Message {
  id: number;
  texto: string;
  user_id?: string;
  fecha?: string;
}

interface PongScore {
  id: number;
  score: number;
  opponent: string;
  winner: boolean;
  game_duration: number;
  user_id?: string;
  fecha?: string;
}

// Añadir esta variable global
let messageRetryCount = 0;
const MAX_MESSAGE_RETRIES = 3;

// Añadir esta variable global
let scoresRetryCount = 0;
const MAX_SCORES_RETRIES = 3;

// Definir las URLs como constantes
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = window.env?.FRONTEND_URL || 'http://localhost:8080';

// Función principal que se ejecuta al cargar la página
async function init(): Promise<void> {
  console.log("🚀 Dashboard iniciado");
  
  try {
    // Verificar si hay sesión activa
    const user = await checkUserSession();
    if (user) {
      console.log("✅ Usuario autenticado:", user);
      
      // Actualizar todos los elementos de la interfaz
      updateUserProfile(user);
      updateNavProfile(user);
      updateWelcomeMessage(user);
      
      // Añadir un retraso para dar tiempo a que la sesión se establezca completamente
      console.log("⏳ Esperando 1 segundo antes de cargar mensajes...");
      setTimeout(async () => {
        await loadRecentMessages();
        await loadPongScores();
        await loadGlobalHighScores();
      }, 1000);
      
      setupMessageForm();
      setupLogoutButton();
      setupPongButton();
    }
  } catch (error) {
    console.error("❌ Error al inicializar el dashboard:", error);
    showErrorMessage(`Error al inicializar: ${(error as Error).message}`);
  }
}

// Verificar sesión de usuario
async function checkUserSession(): Promise<User | null> {
  // SOLUCIÓN INMEDIATA: Verificar modo debug al inicio
  if (window.location.search.includes('debug=true')) {
    console.warn("⚠️ MODO DEPURACIÓN: Usando usuario ficticio");
    return {
      name: "Usuario Debug",
      email: "debug@example.com",
      picture: "https://ui-avatars.com/api/?name=Debug+User&background=random&color=fff"
    };
  }

  try {
    console.log("🔍 Verificando sesión...");
    
    // Inspeccionar cookies disponibles
    console.log("🍪 Cookies disponibles:", document.cookie);
    
    // AÑADIR: Verificar si estamos en un bucle de recarga
    const lastCheckTime = sessionStorage.getItem('lastSessionCheck');
    const now = Date.now();
    
    if (lastCheckTime && (now - parseInt(lastCheckTime)) < 2000) {
      console.warn("⚠️ Posible bucle de recarga detectado, omitiendo verificación");
      // Retornar un usuario dummy para prevenir redireccionamiento
      return {
        name: "Cargando...",
        email: "Por favor espere...",
        picture: ""
      };
    }
    
    // Guardar timestamp de verificación
    sessionStorage.setItem('lastSessionCheck', now.toString());
    
    const response = await fetch(`${BACKEND_URL}/user/me`, {
      credentials: 'include',
      headers: {
        // Añadir cabeceras para evitar caché
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log("📩 Respuesta recibida:", response.status, response.statusText);
    console.log("📤 Cabeceras:", Array.from(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Error de servidor: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("📊 Datos de sesión:", data);
    
    if (!data.authenticated || !data.user) {
      console.warn("⚠️ No autenticado");
      
      // AÑADIR: Prevenir bucles de redireccionamiento
      const redirectAttempts = parseInt(sessionStorage.getItem('redirectAttempts') || '0');
      if (redirectAttempts > 2) {
        console.error("🛑 Demasiados intentos de redirección, deteniendo");
        showErrorMessage("Error de sesión. Por favor, accede nuevamente desde la página principal.");
        return null;
      }
      
      sessionStorage.setItem('redirectAttempts', (redirectAttempts + 1).toString());
      window.location.href = "/";
      return null;
    }
    
    // Si llegamos aquí, la autenticación fue exitosa, resetear contadores
    sessionStorage.removeItem('redirectAttempts');
    return data.user as User;
  } catch (error) {
    // Mostrar más detalles sobre el error
    console.error("❌ Error detallado en checkUserSession:", error);
    const errorDetails = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    
    // SOLUCIÓN TEMPORAL MEJORADA: Para entorno de desarrollo
    if (window.env?.NODE_ENV === 'development' || window.location.search.includes('debug=true')) {
      console.warn("⚠️ Usando usuario de prueba (SOLO PARA DESARROLLO)");
      return {
        name: "Usuario de prueba",
        email: "test@example.com",
        picture: "https://ui-avatars.com/api/?name=Test+User"
      };
    }
    
    // Para producción: agregar parámetros de diagnóstico
    window.location.href = `/?error=session&details=${encodeURIComponent(errorDetails)}`;
    return null;
  }
}

// Actualizar el perfil de usuario principal
function updateUserProfile(user: User): void {
  console.log("🖼️ Actualizando perfil con datos:", user);
  
  // Actualizar foto de perfil
  const profileImage = document.getElementById('userProfileImage');
  if (profileImage) {
    profileImage.innerHTML = `
      <img src="${user.picture}" alt="${user.name}"
           class="h-32 w-32 object-cover rounded-full border-4 border-white"
           onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=128&background=random';">
    `;
  }
  
  // Actualizar nombre y email
  const nameElement = document.getElementById('userName');
  if (nameElement) nameElement.textContent = user.name || 'Usuario';
  
  const emailElement = document.getElementById('userEmail');
  if (emailElement) emailElement.textContent = user.email || '';
}

// Actualizar el perfil en la barra de navegación
function updateNavProfile(user: User): void {
  const navProfile = document.getElementById('userProfileNav');
  if (navProfile) {
    navProfile.innerHTML = `
      <div class="flex items-center">
        <span class="text-sm mr-3">${user.name}</span>
        <img src="${user.picture}" alt="Avatar" 
             class="w-8 h-8 rounded-full border-2 border-white"
             onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=32&background=random';">
      </div>
    `;
  }
}

// Actualizar mensaje de bienvenida
function updateWelcomeMessage(user: User): void {
  const welcomeElement = document.getElementById('welcomeMessage');
  if (welcomeElement) {
    const hour = new Date().getHours();
    let greeting = "Buenos días";
    
    if (hour >= 12 && hour < 18) {
      greeting = "Buenas tardes";
    } else if (hour >= 18 || hour < 6) {
      greeting = "Buenas noches";
    }
    
    welcomeElement.innerHTML = `
      <p class="mb-2">${greeting}, <strong>${user.name}</strong>.</p>
      <p>Has iniciado sesión correctamente en Transcender.</p>
      <p class="text-sm text-gray-500 mt-2">Email: ${user.email}</p>
    `;
  }
}

// Configurar botón de logout
function setupLogoutButton(): void {
  console.log("🔄 Configurando botón de logout");
  
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      console.log("👆 Click en botón de logout");
      
      try {
        // Cambiar el estado visual del botón
        logoutButton.textContent = 'Cerrando sesión...';
        (logoutButton as HTMLButtonElement).disabled = true;
        
        // Realizar la petición de logout
        const response = await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ action: 'logout' })
        });
        
        if (!response.ok) {
          throw new Error(`Error en logout: ${response.status}`);
        }
        
        // Redirigir al login
        window.location.href = "/?logout=true";
      } catch (error) {
        console.error("❌ Error en logout:", error);
        
        // Restaurar el botón
        logoutButton.textContent = 'Cerrar sesión';
        (logoutButton as HTMLButtonElement).disabled = false;
        
        showErrorMessage("Error al cerrar sesión");
      }
    });
  } else {
    console.error("❌ No se encontró el elemento logoutButton");
  }
}

// Flag para controlar si hay una carga de mensajes en progreso
let loadingMessages = false;

// Cargar mensajes recientes con sistema de reintentos
async function loadRecentMessages(): Promise<void> {
  const messagesContainer = document.getElementById('recentMessages');
  if (!messagesContainer) return;
  
  // Evitar cargas múltiples simultáneas
  if (loadingMessages) {
    console.log("⚠️ Ya hay una carga de mensajes en progreso, ignorando llamada");
    return;
  }
  
  loadingMessages = true;
  
  // Mostrar indicador de carga
  messagesContainer.innerHTML = `
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="text-gray-500 mt-2">Cargando mensajes...</p>
    </div>
  `;
  
  try {
    console.log("📝 Cargando mensajes... (intento: " + (messageRetryCount + 1) + ")");
    const response = await fetch(`${BACKEND_URL}/mensajes`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al cargar mensajes: ${response.status}`);
    }
    
    const messages = await response.json() as Message[];
    console.log("📩 Mensajes recibidos:", messages);
    messageRetryCount = 0; // Reiniciar contador de intentos al tener éxito
    
    if (messages && messages.length > 0) {
      messagesContainer.innerHTML = '';
      
      messages.forEach((message) => {
        // Formatear fecha si existe
        const fecha = message.fecha 
          ? new Date(message.fecha).toLocaleString()
          : 'Fecha desconocida';
        
        const messageElement = document.createElement('div');
        messageElement.className = 'p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3';
        messageElement.innerHTML = `
          <p class="text-gray-800">${message.texto}</p>
          <div class="flex justify-between mt-2 text-xs text-gray-500">
            <span>ID: ${message.id}</span>
            <span>${fecha}</span>
          </div>
        `;
        messagesContainer.appendChild(messageElement);
      });
    } else {
      messagesContainer.innerHTML = `
        <div class="text-center py-4">
          <p class="text-gray-600">No hay mensajes recientes.</p>
          <p class="text-sm text-gray-500 mt-2">¡Sé el primero en enviar un mensaje!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error al cargar mensajes:", error);
    
    // Sistema de reintentos automático
    if (messageRetryCount < MAX_MESSAGE_RETRIES) {
      messageRetryCount++;
      const delay = messageRetryCount * 1000; // Incremento gradual del tiempo de espera
      
      messagesContainer.innerHTML = `
        <div class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="text-gray-500 mt-2">Reintentando en ${delay/1000} segundos...</p>
        </div>
      `;
      
      console.log(`🔄 Programando reintento ${messageRetryCount} en ${delay}ms`);
      setTimeout(() => {
        loadingMessages = false; // Liberar el flag para permitir nuevo intento
        loadRecentMessages();
      }, delay);
    } else {
      messagesContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          <p>Error al cargar los mensajes después de varios intentos.</p>
          <button id="retryMessages" class="text-sm text-blue-500 mt-2">Reintentar</button>
        </div>
      `;
      
      const retryButton = document.getElementById('retryMessages');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          messageRetryCount = 0; // Resetear contador al reintentar manualmente
          loadingMessages = false;
          loadRecentMessages();
        });
      }
    }
  } finally {
    // Siempre liberar el flag si no estamos en reintento automático
    if (messageRetryCount === 0) {
      setTimeout(() => {
        loadingMessages = false;
      }, 500);
    }
  }
}

// Actualiza la función de envío de formulario con identificadores únicos y control de duplicados

// Configurar el formulario de mensajes
function setupMessageForm(): void {
  const form = document.getElementById('messageForm') as HTMLFormElement | null;
  if (!form) return;
  
  // Variable para controlar si hay un envío en progreso
  let enviandoMensaje = false;
  // Almacenar el último texto enviado y su timestamp
  let lastSentMessage = { text: '', timestamp: 0 };
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Evitar envíos múltiples
    if (enviandoMensaje) {
      console.log("⚠️ Ya hay un envío en progreso, ignorando click");
      return;
    }
    
    const messageTextarea = document.getElementById('messageText') as HTMLTextAreaElement | null;
    if (!messageTextarea || messageTextarea.value.trim() === '') return;
    
    const messageText = messageTextarea.value.trim();
    
    // Control de duplicados rápidos (mismo mensaje en menos de 3 segundos)
    const now = Date.now();
    if (messageText === lastSentMessage.text && now - lastSentMessage.timestamp < 3000) {
      console.log("⚠️ Posible doble envío detectado, ignorando");
      showErrorMessage("Por favor, espera antes de enviar el mismo mensaje de nuevo");
      return;
    }
    
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    
    try {
      // Marcar que hay un envío en progreso
      enviandoMensaje = true;
      lastSentMessage = { text: messageText, timestamp: now };
      
      // Crear un identificador único para este mensaje
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Enviando...
        `;
      }
      
      console.log("📤 Enviando mensaje:", messageText.substring(0, 20) + "...", messageId);
      const response = await fetch(`${BACKEND_URL}/mensajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          texto: messageText,
          messageId: messageId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error al enviar mensaje: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Verificar si el servidor detectó un posible duplicado
      if (responseData.warning) {
        console.warn(`⚠️ Advertencia del servidor: ${responseData.warning}`);
        if (responseData.warning === 'duplicate_suspected') {
          // No recargar mensajes si fue un duplicado
          showSuccessMessage('Mensaje procesado');
        } else {
          // Mensaje normal
          // Limpiar el textarea
          messageTextarea.value = '';
          
          // Mostrar confirmación
          showSuccessMessage('Mensaje enviado correctamente');
          
          // Recargar mensajes después de un pequeño retardo
          setTimeout(() => loadRecentMessages(), 300);
        }
      } else {
        // Mensaje normal
        // Limpiar el textarea
        messageTextarea.value = '';
        
        // Mostrar confirmación
        showSuccessMessage('Mensaje enviado correctamente');
        
        // Recargar mensajes después de un pequeño retardo
        setTimeout(() => loadRecentMessages(), 300);
      }
      
    } catch (error) {
      console.error("❌ Error al enviar mensaje:", error);
      showErrorMessage(`Error al enviar mensaje: ${(error as Error).message}`);
    } finally {
      // Restaurar el botón y permitir nuevos envíos
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar mensaje';
      }
      
      // Pequeño retardo antes de permitir nuevo envío
      setTimeout(() => {
        enviandoMensaje = false;
      }, 500);
    }
  });
}

// Configurar botón para jugar Pong
function setupPongButton(): void {
  const pongButton = document.getElementById('playPongButton');
  if (pongButton) {
    pongButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("🏓 Iniciando juego de Pong...");
      window.location.href = "/pong";
    });
  }
}

// Flag para controlar si hay una carga de puntuaciones en progreso
let loadingScores = false;

// Cargar puntuaciones de Pong con sistema de reintentos
async function loadPongScores(): Promise<void> {
  const scoresContainer = document.getElementById('pongScores');
  if (!scoresContainer)
	{
		console.error("❌ No se encontró el contenedor de puntuaciones de Pong");
		showErrorMessage("Error al cargar puntuaciones de Pong");
		return;
	}
  
  // Evitar cargas múltiples simultáneas
  if (loadingScores) {
    console.log("⚠️ Ya hay una carga de puntuaciones en progreso, ignorando llamada");
    return;
  }
  
  loadingScores = true;
  
  // Mostrar indicador de carga
  scoresContainer.innerHTML = `
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="text-gray-500 mt-2">Cargando puntuaciones...</p>
    </div>
  `;
  
  try {
    console.log("🏓 Cargando puntuaciones... (intento: " + (scoresRetryCount + 1) + ")");
    const response = await fetch(`${BACKEND_URL}/pong/scores`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al cargar puntuaciones: ${response.status}`);
    }
    
    const scores = await response.json() as PongScore[];
    console.log("📊 Puntuaciones recibidas:", scores);
    scoresRetryCount = 0; // Reiniciar contador de intentos al tener éxito
    
    if (scores && scores.length > 0) {
      scoresContainer.innerHTML = '';
      
      scores.forEach((score) => {
        const date = new Date(score.fecha || '');
        const formattedDate = isNaN(date.getTime()) 
          ? 'Fecha desconocida' 
          : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
        const scoreCard = document.createElement('div');
        scoreCard.className = `p-3 border ${score.winner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} rounded-lg mb-2`;
        
        scoreCard.innerHTML = `
          <div class="flex justify-between items-center">
            <div>
              <span class="font-bold text-lg">${score.score}</span> puntos
              <p class="text-sm text-gray-600">vs ${score.opponent}</p>
            </div>
            <div class="text-right">
              <span class="text-sm text-gray-500">${formattedDate}</span>
              <p class="text-xs ${score.winner ? 'text-green-600' : 'text-red-600'}">
                ${score.winner ? '¡Victoria!' : 'Derrota'}
              </p>
            </div>
          </div>
        `;
        
        scoresContainer.appendChild(scoreCard);
      });
    } else {
      scoresContainer.innerHTML = `
        <div class="text-center py-4">
          <p class="text-gray-600">No has jugado ninguna partida aún.</p>
          <p class="text-sm text-gray-500 mt-2">¡Haz clic en "Jugar Pong" para comenzar!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("❌ Error al cargar puntuaciones:", error);
    
    // Sistema de reintentos automático
    if (scoresRetryCount < MAX_SCORES_RETRIES) {
      scoresRetryCount++;
      const delay = scoresRetryCount * 1000;      
      scoresContainer.innerHTML = `
        <div class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="text-gray-500 mt-2">Reintentando en ${delay/1000} segundos...</p>
        </div>
      `;
      
      console.log(`🔄 Programando reintento ${scoresRetryCount} en ${delay}ms`);
      setTimeout(() => {
        loadPongScores();
      }, delay);
    } else {
      scoresContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          <p>Error al cargar las puntuaciones después de varios intentos.</p>
          <button id="retryScores" class="text-sm text-blue-500 mt-2">Reintentar</button>
        </div>
      `;
      
      const retryButton = document.getElementById('retryScores');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          scoresRetryCount = 0;
          loadPongScores();
        });
      }
    }
  } finally {
    // Siempre liberar el flag si no estamos en reintento automático
    setTimeout(() => {
      loadingScores = false;
    }, 500);
  }
}

// Cargar mejores puntuaciones globales
async function loadGlobalHighScores(): Promise<void> {
  const highScoresContainer = document.getElementById('highScoresList');
  if (!highScoresContainer) return;
  
  try {
    console.log("🏆 Cargando mejores puntuaciones globales...");
    const response = await fetch(`${BACKEND_URL}/pong/highscores`, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al cargar mejores puntuaciones: ${response.status}`);
    }
    
    const highScores = await response.json();
    console.log("🏆 Mejores puntuaciones recibidas:", highScores);
    
    if (highScores && highScores.length > 0) {
      highScoresContainer.innerHTML = '';
      
      highScores.forEach((score: any, index: number) => {
        const date = new Date(score.fecha || '');
        const formattedDate = isNaN(date.getTime()) 
          ? 'Fecha desconocida' 
          : date.toLocaleDateString();
          
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        let userName = score.user_name || 'Jugador anónimo';
        if (score.user_id === (window.userSessionId || '')) {
          userName += ' (Tú)';
          row.className += ' bg-blue-50';
        }
        
        row.innerHTML = `
          <td class="py-3 px-4">${index + 1}</td>
          <td class="py-3 px-4">
            <div class="flex items-center">
              <img src="${score.user_picture || 'https://ui-avatars.com/api/?name=User&size=32&background=random'}" 
                   class="h-8 w-8 rounded-full mr-2" alt="${userName}">
              <span>${userName}</span>
            </div>
          </td>
          <td class="py-3 px-4 font-bold">${score.score}</td>
          <td class="py-3 px-4 text-gray-500">${formattedDate}</td>
        `;
        
        highScoresContainer.appendChild(row);
      });
    } else {
      highScoresContainer.innerHTML = `
        <tr>
          <td colspan="4" class="py-4 text-center text-gray-500">
            No hay puntuaciones registradas todavía.
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("❌ Error al cargar mejores puntuaciones:", error);
    highScoresContainer.innerHTML = `
      <tr>
        <td colspan="4" class="py-3 text-center text-red-500">
          Error al cargar mejores puntuaciones.
          <button id="retryHighScores" class="text-blue-500 underline ml-2">Reintentar</button>
        </td>
      </tr>
    `;
    
    const retryButton = document.getElementById('retryHighScores');
    if (retryButton) {
      retryButton.addEventListener('click', loadGlobalHighScores);
    }
  }
}

// Mostrar mensaje de error
function showErrorMessage(message: string): void {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
}

// Mostrar mensaje de éxito
function showSuccessMessage(message: string): void {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
  successDiv.textContent = message;
  
  document.body.appendChild(successDiv);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Inicializar cuando el DOM esté listo
let initialized = false;

function safeInit() {
  if (initialized) return;
  initialized = true;
  
  console.log("🔄 Inicializando dashboard (seguro)...");
  init();
}

document.addEventListener('DOMContentLoaded', safeInit);

// Comprobar también si el DOM ya está cargado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log("🔄 DOM ya está listo, inicializando pronto...");
  setTimeout(safeInit, 100);
}

// Confirmar que el script se ha cargado completamente
console.log("✅ dashboard.ts cargado completamente");