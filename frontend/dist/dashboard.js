console.log("🔍 dashboard.js siendo cargado...");
// Variables globales
let currentUser = null;
// Función principal que se ejecuta al cargar la página
async function init() {
    console.log("🚀 Dashboard iniciado");
    try {
        console.log("🔍 Verificando sesión de usuario...");
        // Verificar si hay sesión activa
        const userData = await checkUserSession();
        if (userData) {
            console.log("✅ Usuario autenticado:", userData);
            currentUser = userData;
            // Actualizar todos los elementos de la UI
            updateAllUserElements(userData);
            // Cargar datos dinámicos
            loadRecentMessages();
            // Configurar interacciones
            setupMessageForm();
            setupLogoutButton();
        }
    }
    catch (error) {
        console.error("❌ Error al inicializar el dashboard:", error);
        showErrorMessage("Error al inicializar: " + error.message);
    }
}
// Verificar sesión de usuario
async function checkUserSession() {
    try {
        console.log("🔄 Enviando petición a /user/me...");
        const response = await fetch('http://localhost:3000/user/me', {
            method: 'GET',
            credentials: 'include'
        });
        console.log("📢 Respuesta recibida, status:", response.status);
        if (!response.ok) {
            throw new Error(`Error al verificar sesión: ${response.status}`);
        }
        const data = await response.json();
        console.log("📊 Datos de sesión:", data);
        if (!data.authenticated || !data.user) {
            console.warn("⚠️ No autenticado o datos de usuario incompletos");
            window.location.href = "/";
            return null;
        }
        return data.user;
    }
    catch (error) {
        console.error("❌ Error en checkUserSession:", error);
        window.location.href = "/?error=session_error";
        return null;
    }
}
// Actualizar todos los elementos UI del usuario
function updateAllUserElements(user) {
    console.log("🔄 Actualizando elementos UI con datos:", user);
    // Actualizar perfil principal
    updateUserProfile(user);
    // Actualizar barra de navegación
    updateNavProfile(user);
    // Actualizar mensaje de bienvenida
    updateWelcomeMessage(user);
}
// Actualizar el perfil de usuario principal
function updateUserProfile(user) {
    console.log("🖼️ Actualizando perfil con datos:", user.name, user.picture);
    // Actualizar foto
    const profileImage = document.getElementById('userProfileImage');
    if (profileImage) {
        profileImage.innerHTML = `
      <img src="${user.picture}" alt="${user.name}"
           class="h-32 w-32 object-cover rounded-full border-4 border-white"
           onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=128&background=random';">
    `;
    }
    // Actualizar nombre y correo
    const nameElement = document.getElementById('userName');
    if (nameElement)
        nameElement.textContent = user.name;
    const emailElement = document.getElementById('userEmail');
    if (emailElement)
        emailElement.textContent = user.email;
}
// Actualizar el perfil en la barra de navegación
function updateNavProfile(user) {
    const navProfile = document.getElementById('userProfileNav');
    if (navProfile) {
        navProfile.innerHTML = `
      <div class="flex items-center">
        <span class="text-sm mr-2">${user.name}</span>
        <img src="${user.picture}" alt="Avatar" 
             class="w-8 h-8 rounded-full border-2 border-white"
             onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=32&background=random';">
      </div>
    `;
    }
}
// Actualizar mensaje de bienvenida
function updateWelcomeMessage(user) {
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        const hour = new Date().getHours();
        let greeting = "Buenos días";
        if (hour >= 12 && hour < 18) {
            greeting = "Buenas tardes";
        }
        else if (hour >= 18 || hour < 6) {
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
function setupLogoutButton() {
    console.log("🔄 Configurando botón de logout");
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("👆 Click en botón de logout");
            try {
                // Cambiar el estado visual del botón
                logoutButton.textContent = 'Cerrando sesión...';
                logoutButton.disabled = true;
                // Realizar la petición de logout
                const response = await fetch('http://localhost:3000/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ action: 'logout' })
                });
                const data = await response.json();
                console.log("📊 Respuesta del logout:", data);
                // Redirigir al login
                window.location.href = "/?logout=true";
            }
            catch (error) {
                console.error("❌ Error en logout:", error);
                // Restaurar el botón
                logoutButton.textContent = 'Cerrar sesión';
                logoutButton.disabled = false;
                showErrorMessage("Error al cerrar sesión");
            }
        });
    }
    else {
        console.error("❌ No se encontró el elemento logoutButton");
    }
}
// Cargar mensajes recientes
async function loadRecentMessages() {
    try {
        const messagesContainer = document.getElementById('recentMessages');
        if (!messagesContainer)
            return;
        const response = await fetch('http://localhost:3000/mensajes', {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`Error al cargar mensajes: ${response.status}`);
        }
        const messages = await response.json();
        if (messages && messages.length > 0) {
            messagesContainer.innerHTML = '';
            messages.forEach((message) => {
                const messageElement = document.createElement('div');
                messageElement.className = 'p-3 bg-gray-50 rounded-lg border border-gray-100 mb-3';
                messageElement.innerHTML = `
          <p class="text-gray-800">${message.texto}</p>
          <p class="text-xs text-gray-500 mt-2">ID: ${message.id}</p>
        `;
                messagesContainer.appendChild(messageElement);
            });
        }
        else {
            messagesContainer.innerHTML = `
        <div class="text-center py-4">
          <p class="text-gray-600">No hay mensajes recientes.</p>
          <p class="text-sm text-gray-500 mt-2">¡Sé el primero en enviar un mensaje!</p>
        </div>
      `;
        }
    }
    catch (error) {
        console.error("❌ Error al cargar mensajes:", error);
        const messagesContainer = document.getElementById('recentMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
          <p>Error al cargar los mensajes.</p>
          <button id="retryMessages" class="text-sm text-blue-500 mt-2">Reintentar</button>
        </div>
      `;
            const retryButton = document.getElementById('retryMessages');
            if (retryButton) {
                retryButton.addEventListener('click', loadRecentMessages);
            }
        }
    }
}
// Configurar el formulario de mensajes
function setupMessageForm() {
    const form = document.getElementById('messageForm');
    if (!form)
        return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageTextarea = document.getElementById('messageText');
        if (!messageTextarea)
            return;
        const messageText = messageTextarea.value.trim();
        if (!messageText)
            return;
        const submitButton = form.querySelector('button[type="submit"]');
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
        try {
            const response = await fetch('http://localhost:3000/mensajes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ texto: messageText })
            });
            if (!response.ok) {
                throw new Error(`Error al enviar mensaje: ${response.status}`);
            }
            // Limpiar el textarea
            messageTextarea.value = '';
            // Mostrar confirmación
            showSuccessMessage('Mensaje enviado correctamente');
            // Recargar mensajes
            loadRecentMessages();
        }
        catch (error) {
            console.error("❌ Error al enviar mensaje:", error);
            showErrorMessage("Error al enviar mensaje");
        }
        finally {
            // Restaurar el botón
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar mensaje';
            }
        }
    });
}
// Mostrar mensaje de error
function showErrorMessage(message) {
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
function showSuccessMessage(message) {
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
document.addEventListener('DOMContentLoaded', init);
// Confirmar que el script se ejecutó completamente
console.log("✅ dashboard.ts cargado completamente");
export {};
