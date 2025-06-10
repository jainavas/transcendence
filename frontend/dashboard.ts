// Dashboard functionality
console.log("🚀 dashboard.ts cargando...");
import './env-types.js'; // Import the type definitions
export { };

declare global {
	interface Window {
		userSessionId?: string;
		env: {
			BACKEND_URL?: string;
			FRONTEND_URL?: string;
			GOOGLE_CLIENT_ID?: string;
			NODE_ENV?: string;
		};
		Chart?: any; // Para soporte a versiones antiguas
	}

	// Estas definiciones permiten usar Chart.getChart estático
	namespace Chart {
		function getChart(ctx: CanvasRenderingContext2D): Chart | undefined;
	}
}
// Variables globales
interface User {
	name: string;
	email: string;
	picture: string;
	id?: string;
}

interface PongScore {
	id: number;
	p1score: number;
	p2score: number;
	p1_id: string;
	p2_id?: string;
	winner: boolean;
	game_duration: number;
	fecha?: string | number;
	user_name?: string;
	user_picture?: string;
	opponent_name?: string;
	opponent_picture?: string;
}


// Añadir esta variable global
let scoresRetryCount = 0;
const MAX_SCORES_RETRIES = 3;

// Definir las URLs como constantes
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = window.env?.FRONTEND_URL || 'http://localhost:8080';


// profile-manager.ts

// profile-manager.ts
export class ProfileManager {
	private profileImage: string = 'assets/default-avatar.jpg';
	private isEditing: boolean = false;
	private isLoading: boolean = false;

	constructor(user: User) {
		this.initializeElements();
		this.loadCurrentImage(user);
	}

	private initializeElements(): void {
		const editButton = document.getElementById('edit-profile-btn') as HTMLButtonElement;
		const saveButton = document.getElementById('save-image-btn') as HTMLButtonElement;
		const cancelButton = document.getElementById('cancel-btn') as HTMLButtonElement;
		const imageInput = document.getElementById('image-url-input') as HTMLInputElement;
		const aliasInput = document.getElementById('alias-input') as HTMLInputElement;
		const modal = document.getElementById('edit-modal') as HTMLDivElement;

		editButton?.addEventListener('click', () => this.openEditModal());
		saveButton?.addEventListener('click', () => this.handleImageUpdate());
		cancelButton?.addEventListener('click', () => this.closeEditModal());
		modal?.addEventListener('click', (e) => this.handleModalClick(e));

		imageInput?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') this.handleImageUpdate();
		});
	}

	private validateImageUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	// Cargar la imagen actual del usuario desde el servidor
	private async loadCurrentImage(user: User): Promise<void> {
		try {
			if (user.picture) {
				this.updateProfileImageUI(user.picture);
			}
		} catch (error) {
			console.error('Error al cargar la imagen del perfil:', error);
			// Mantener imagen por defecto
		}
	}

	private openEditModal(): void {
		const modal = document.getElementById('edit-modal') as HTMLDivElement;
		modal.classList.remove('hidden');
		modal.classList.add('flex');
		this.isEditing = true;

		const input = document.getElementById('image-url-input') as HTMLInputElement;
		setTimeout(() => input?.focus(), 100);
	}

	private closeEditModal(): void {
		const modal = document.getElementById('edit-modal') as HTMLDivElement;
		const input = document.getElementById('image-url-input') as HTMLInputElement;

		modal.classList.add('hidden');
		modal.classList.remove('flex');
		input.value = '';
		this.isEditing = false;
	}

	private handleModalClick(e: Event): void {
		const modal = document.getElementById('edit-modal') as HTMLDivElement;
		if (e.target === modal) {
			this.closeEditModal();
		}
	}

	private async handleImageUpdate(): Promise<void> {
		const input = document.getElementById('image-url-input') as HTMLInputElement;
		const input2 = document.getElementById('alias-input') as HTMLInputElement;
		const newUrl = input.value.trim();
		const newAlias = input2.value.trim();

		if (!newUrl && !newAlias) {
			this.showError('Por favor, ingresa una URL o un alias');
			return;
		}

		if (newAlias && !newUrl) {
			// Validar alias (opcional, puedes agregar más reglas)
			if (newAlias.length < 3 || newAlias.length > 20) {
				this.showError('El alias debe tener entre 3 y 20 caracteres');
				return;
			}

			// Aquí podrías enviar el alias al servidor si es necesario
			await this.updateImageOnServer(newAlias, null);
		}

		if (!this.validateImageUrl(newUrl) && !newAlias) {
			this.showError('Por favor, ingresa una URL válida de imagen');
			return;
		}

		// Verificar si la imagen se puede cargar antes de enviarla al servidor
		const imageExists = await this.testImageLoad(newUrl);
		if (!imageExists) {
			this.showError('No se pudo cargar la imagen. Verifica la URL');
			return;
		}

		// Enviar al servidor
		if (!newAlias)
			await this.updateImageOnServer(null, newUrl);
	}

	private testImageLoad(url: string): Promise<boolean> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(true);
			img.onerror = () => resolve(false);
			img.src = url;
		});
	}

	private async updateImageOnServer(alias: string, imageUrl: string): Promise<void> {
		if (this.isLoading) return;

		this.setLoadingState(true);

		try {
			const response = await fetch(`${BACKEND_URL}/user/aliaspicture`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					alias: alias,
					picture: imageUrl
				})
			});

			if (response.ok) {
				const data = await response.json();

				// Si tu servidor devuelve la URL actualizada
				const finalImageUrl = data.picture || imageUrl;

				if (imageUrl)
					this.updateProfileImageUI(finalImageUrl);
				if (alias)
				{
					document.getElementById('user_name')!.textContent = alias;
					document.getElementById('userProfileNav')!.querySelector('span')!.textContent = alias;
				}
				this.closeEditModal();
				this.showSuccess('Imagen actualizada correctamente');

			} else {
				// Manejo de errores del servidor
				const errorData = await response.json().catch(() => null);
				const errorMessage = errorData?.message || `Error del servidor: ${response.status}`;
				this.showError(errorMessage);
			}

		} catch (error) {
			console.error('Error al actualizar la imagen:', error);
			this.showError('Error de conexión. Inténtalo de nuevo');
		} finally {
			this.setLoadingState(false);
		}
	}

	private updateProfileImageUI(url: string): void {
		const profileContainer = document.getElementById('userProfileImage');
		if (profileContainer) {
			profileContainer.innerHTML = `
                    <img src="${url}" alt="${'Usuario'}"
                         class="h-32 w-32 object-cover rounded-full border-4 border-white"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent('Usuario')}&size=128&background=random';">
                `;
		}

		// Actualizar también la imagen en la barra de navegación
		const navProfileContainer = document.getElementById('userProfileNav');
		if (navProfileContainer) {
			const navProfileImg = navProfileContainer.querySelector('img');
			if (navProfileImg) {
				navProfileImg.src = url;
			}
		}
	}

	private setLoadingState(loading: boolean): void {
		this.isLoading = loading;
		const saveButton = document.getElementById('save-image-btn') as HTMLButtonElement;
		const input = document.getElementById('image-url-input') as HTMLInputElement;

		if (saveButton) {
			saveButton.disabled = loading;
			saveButton.textContent = loading ? 'Guardando...' : 'Guardar';
		}

		if (input) {
			input.disabled = loading;
		}
	}

	private showError(message: string): void {
		const errorDiv = document.getElementById('error-message');
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.classList.remove('hidden');
			setTimeout(() => errorDiv.classList.add('hidden'), 5000);
		} else {
			alert(message);
		}
	}

	private showSuccess(message: string): void {
		const successDiv = document.getElementById('success-message');
		if (successDiv) {
			successDiv.textContent = message;
			successDiv.classList.remove('hidden');
			setTimeout(() => successDiv.classList.add('hidden'), 3000);
		}
	}
}

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
			new ProfileManager(user);

			// Añadir un retraso para dar tiempo a que la sesión se establezca completamente
			console.log("⏳ Esperando 1 segundo antes de cargar mensajes...");
			setTimeout(async () => {
				await loadPongScores();
				await loadGlobalHighScores(user);
				await loadGameStatsChart(user);
			}, 1000);

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
	const nameElement = document.getElementById('user_name');
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

// Configurar botón para jugar Pong
function setupPongButton(): void {
	const pongButton = document.getElementById('playPongButton');
	if (pongButton) {
		pongButton.addEventListener('click', (e) => {
			e.preventDefault();
			console.log("🏓 Iniciando juego de Pong...");
			window.location.href = "/pong.html";
		});
	}
}

// Flag para controlar si hay una carga de puntuaciones en progreso
let loadingScores = false;

// Cargar puntuaciones de Pong con sistema de reintentos
async function loadPongScores(): Promise<void> {
	const scoresContainer = document.getElementById('pongScores');
	if (!scoresContainer) {
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
				const p1score = typeof score.p1score === 'number' ?
					score.p1score : (parseInt(score.p1score) || 0);
				const p2score = typeof score.p2score === 'number' ?
					score.p2score : (parseInt(score.p2score) || 0);
				const opponent = score.p2_id ? 'CPU' : score.opponent_name || 'Desconocido';
				const scoreCard = document.createElement('div');
				scoreCard.className = `p-3 border ${score.winner ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg mb-2`;

				scoreCard.innerHTML = `
          <div class="flex justify-between items-center">
            <div>
              <span class="font-bold text-lg">${p1score} - ${p2score}</span> puntos
              <p class="text-sm text-gray-600">vs ${opponent}</p>
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
          <p class="text-gray-500 mt-2">Reintentando en ${delay / 1000} segundos...</p>
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
async function loadGlobalHighScores(user: User): Promise<void> {
	const highScoresContainer = document.getElementById('highScoresList');
	if (!highScoresContainer) return;

	try {
		console.log("🏆 Cargando mejores puntuaciones globales...");
		const response = await fetch(`${BACKEND_URL}/pong/leaderboard`, {
			credentials: 'include',
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		if (!response.ok) {
			throw new Error(`Error al cargar mejores puntuaciones: ${response.status} ${response.statusText}`);
		}

		const highScores = await response.json();
		console.log("🏆 Mejores puntuaciones recibidas:", highScores);
		console.log("👤 Usuario actual:", user); // Debug

		if (highScores && highScores.length > 0) {
			highScoresContainer.innerHTML = '';
			highScores.forEach((score: PongScore, index: number) => {
				console.log(`🔍 Procesando score ${index}:`, {
					p1_id: score.p1_id,
					user_name: score.user_name,
					opponent_name: score.opponent_name,
					user_id: user.id
				}); // Debug

				const date = new Date(score.fecha || '');
				const formattedDate = isNaN(date.getTime())
					? 'Fecha desconocida'
					: date.toLocaleDateString();

				const row = document.createElement('tr');

				// Mejorar la lógica de identificación del usuario
				let user_name = score.user_name || 'Jugador anónimo';
				let user_picture = score.user_picture;
				let isCurrentUser = false;

				// Convertir ambos a string para comparación segura
				const currentUserId = String(user.id || '');
				const scorePlayerId = String(score.p1_id || '');

				if (currentUserId && scorePlayerId && currentUserId === scorePlayerId) {
					user_name = user.name + ' (Tú)';
					user_picture = user.picture || score.user_picture;
					isCurrentUser = true;
					console.log(`✅ Usuario actual encontrado en posición ${index + 1}`); // Debug
				}

				// Aplicar clases CSS correctamente sin conflictos
				if (isCurrentUser) {
					row.className = 'bg-blue-100 border-l-4 border-blue-500';
					row.style.backgroundColor = '#dbeafe'; // Fallback con CSS inline
				} else {
					row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
					if (index % 2 !== 0) {
						row.style.backgroundColor = '#f3f4f6'; // Fallback con CSS inline para filas impares
					}
				}

				// Validar que tenemos los datos necesarios y crear URLs seguras
				const finalUserPicture = user_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user_name)}&size=32&background=random`;
				const finalOpponentPicture = score.opponent_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(score.opponent_name || 'Opponent')}&size=32&background=random`;

				row.innerHTML = `
          <td class="py-3 px-4">${index + 1}</td>
          <td class="py-3 px-4">
            <div class="flex items-center">
              <img src="${finalUserPicture}" 
                   class="h-8 w-8 rounded-full mr-2" 
                   alt="${user_name}"
                   onerror="this.src='https://ui-avatars.com/api/?name=User&size=32&background=random'">
              <span>${user_name}</span>
            </div>
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center">
              <img src="${finalOpponentPicture}" 
                   class="h-8 w-8 rounded-full mr-2" 
                   alt="${score.opponent_name || 'Oponente'}"
                   onerror="this.src='https://ui-avatars.com/api/?name=Opponent&size=32&background=random'">
              <span>${score.opponent_name || 'Oponente desconocido'}</span>
            </div>
          </td>
          <td class="py-3 px-4 font-bold">${score.p1score} - ${score.p2score}</td>
          <td class="py-3 px-4 text-gray-500">${formattedDate}</td>
        `;

				highScoresContainer.appendChild(row);
			});
		} else {
			highScoresContainer.innerHTML = `
        <tr>
          <td colspan="5" class="py-4 text-center text-gray-500">
            No hay puntuaciones registradas todavía.
          </td>
        </tr>
      `;
		}
	} catch (error) {
		console.error("❌ Error al cargar mejores puntuaciones:", error);
		highScoresContainer.innerHTML = `
      <tr>
        <td colspan="5" class="py-3 text-center text-red-500">
          Error al cargar mejores puntuaciones.
          <button id="retryHighScores" class="text-blue-500 underline ml-2">Reintentar</button>
        </td>
      </tr>
    `;

		const retryButton = document.getElementById('retryHighScores');
		if (retryButton) {
			retryButton.addEventListener('click', () => loadGlobalHighScores(user));
		}
	}
}

// Declaración de tipos para Chart.js
interface ChartConfiguration {
	type: string;
	data: ChartData;
	options?: any;
}

declare class Chart {
	constructor(ctx: CanvasRenderingContext2D, config: ChartConfiguration);
	update(): void;
	destroy(): void;
	static register(...items: any[]): void;
	static getChart(ctx: CanvasRenderingContext2D): Chart | undefined;
}

// Interfaces para los datos
interface GameStats {
	date: string;
	score: number;
	opponentScore: number;
	won: boolean;
	opponent: string;
	duration: number;
}

interface ChartData {
	labels: string[];
	datasets: any[];
}

// Función para crear la gráfica de últimas partidas
async function loadGameStatsChart(user: User): Promise<void> {
	try {
		console.log("📊 Cargando estadísticas de partidas...");

		// Fetch de las últimas partidas del usuario
		const response = await fetch(`${BACKEND_URL}/pong/scores`, {
			credentials: 'include',
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		if (!response.ok) {
			throw new Error(`Error al cargar estadísticas: ${response.status}`);
		}

		const userGames = await response.json();
		console.log("📊 Partidas del usuario:", userGames);

		createStatsChart(userGames);
		createWinRateChart(userGames);
		updateStatsNumbers(userGames);

	} catch (error) {
		console.error("❌ Error al cargar estadísticas:", error);
		showChartError();
	}
}

// Crear gráfica de puntuaciones por partida
function createStatsChart(games: PongScore[]): void {
	try {
		const canvas = document.getElementById('gameStatsChart') as HTMLCanvasElement;
		if (!canvas) {
			console.error("❌ No se encontró el elemento canvas 'gameStatsChart'");
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error("❌ No se pudo obtener el contexto 2D del canvas");
			return;
		}

		// Verificar que Chart.js esté cargado
		if (typeof Chart === 'undefined') {
			console.error("❌ Chart.js no está cargado. Asegúrate de incluir la biblioteca en tu HTML");
			showChartError();
			return;
		}

		// Preparar datos para la gráfica
		const last10Games = games.slice(-10); // Últimas 10 partidas

		if (last10Games.length === 0) {
			console.warn("⚠️ No hay datos para mostrar en la gráfica");
			// Mostrar mensaje en el canvas
			ctx.font = '14px Arial';
			ctx.fillStyle = '#666';
			ctx.textAlign = 'center';
			ctx.fillText('No hay partidas para mostrar', canvas.width / 2, canvas.height / 2);
			return;
		}

		const chartData: ChartData = {
			labels: last10Games.map((game, index) => `Partida ${index + 1}`),
			datasets: [
				{
					label: 'Tu Puntuación',
					data: last10Games.map(game => game.p1score),
					borderColor: '#3b82f6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					borderWidth: 3,
					fill: true,
					tension: 0.4
				},
				{
					label: 'Oponente',
					data: last10Games.map(game => game.p2score),
					borderColor: '#ef4444',
					backgroundColor: 'rgba(239, 68, 68, 0.1)',
					borderWidth: 3,
					fill: true,
					tension: 0.4
				}
			]
		};

		// Destruir gráfico anterior si existe
		const chartStatus = Chart.getChart(ctx);
		if (chartStatus !== undefined) {
			chartStatus.destroy();
		}

		new Chart(ctx, {
			type: 'line',
			data: chartData,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: 'Últimas 10 Partidas - Puntuaciones',
						font: {
							size: 16,
							weight: 'bold'
						}
					},
					legend: {
						display: true,
						position: 'top'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Puntuación'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Partidas'
						}
					}
				},
				elements: {
					point: {
						radius: 6,
						hoverRadius: 8
					}
				}
			}
		});

		console.log("✅ Gráfica de estadísticas creada exitosamente");
	} catch (error) {
		console.error("❌ Error al crear la gráfica de estadísticas:", error);
		showChartError();
	}
}

// Crear gráfica de ratio de victorias
function createWinRateChart(games: PongScore[]): void {
	try {
		const canvas = document.getElementById('winRateChart') as HTMLCanvasElement;
		if (!canvas) {
			console.error("❌ No se encontró el elemento canvas 'winRateChart'");
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error("❌ No se pudo obtener el contexto 2D del canvas");
			return;
		}

		// Verificar que Chart.js esté cargado
		if (typeof Chart === 'undefined') {
			console.error("❌ Chart.js no está cargado. Asegúrate de incluir la biblioteca en tu HTML");
			showChartError();
			return;
		}

		// Calcular estadísticas
		const totalGames = games.length;

		if (totalGames === 0) {
			console.warn("⚠️ No hay datos para mostrar en la gráfica de ratio de victorias");
			// Mostrar mensaje en el canvas
			ctx.font = '14px Arial';
			ctx.fillStyle = '#666';
			ctx.textAlign = 'center';
			ctx.fillText('No hay partidas para mostrar', canvas.width / 2, canvas.height / 2);
			return;
		}

		const wins = games.filter(game => game.winner).length;
		const losses = totalGames - wins;
		const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';

		// Destruir gráfico anterior si existe
		const chartStatus = Chart.getChart(ctx);
		if (chartStatus !== undefined) {
			chartStatus.destroy();
		}

		new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: ['Victorias', 'Derrotas'],
				datasets: [{
					data: [wins, losses],
					backgroundColor: [
						'#10b981', // Verde para victorias
						'#ef4444'  // Rojo para derrotas
					],
					borderWidth: 3,
					borderColor: '#ffffff'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: `Ratio de Victorias: ${winRate}%`,
						font: {
							size: 16,
							weight: 'bold'
						}
					},
					legend: {
						display: true,
						position: 'bottom'
					}
				}
			}
		});

		console.log("✅ Gráfica de ratio de victorias creada exitosamente");
	} catch (error) {
		console.error("❌ Error al crear la gráfica de ratio de victorias:", error);
		showChartError();
	}
}

// Mostrar error si no se pueden cargar las gráficas
function showChartError(): void {
	const containers = ['gameStatsChart', 'winRateChart'];

	containers.forEach(containerId => {
		const container = document.getElementById(containerId);
		if (container) {
			container.innerHTML = `
        <div class="flex items-center justify-center h-full text-red-500">
          <div class="text-center">
            <p class="text-lg font-semibold">Error al cargar gráfica</p>
            <button onclick="loadGameStatsChart(user)" 
                    class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Reintentar
            </button>
          </div>
        </div>
      `;
		}
	});
}

// HTML estructura para las gráficas (agregar donde necesites)
function createChartsHTML(): string {
	return `
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">📊 Estadísticas de Partidas</h2>
      
      <!-- Gráfica de puntuaciones -->
      <div class="mb-8">
        <div class="bg-gray-50 rounded-lg p-4" style="height: 400px;">
          <canvas id="gameStatsChart" class="w-full h-full"></canvas>
        </div>
      </div>
      
      <!-- Gráfica de ratio de victorias -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-50 rounded-lg p-4" style="height: 300px;">
          <canvas id="winRateChart" class="w-full h-full"></canvas>
        </div>
        
        <!-- Estadísticas adicionales -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 Resumen</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">Partidas jugadas:</span>
              <span class="font-bold text-blue-600" id="totalGames">-</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Victorias:</span>
              <span class="font-bold text-green-600" id="totalWins">-</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Mejor puntuación:</span>
              <span class="font-bold text-purple-600" id="bestScore">-</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Promedio puntos:</span>
              <span class="font-bold text-orange-600" id="avgScore">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función para actualizar las estadísticas del resumen
function updateStatsNumbers(games: PongScore[]): void {
	const totalGamesEl = document.getElementById('totalGames');
	const totalWinsEl = document.getElementById('totalWins');
	const bestScoreEl = document.getElementById('bestScore');
	const avgScoreEl = document.getElementById('avgScore');

	if (games.length === 0) return;

	const totalGames = games.length;
	const wins = games.filter(game => game.winner).length;
	const bestScore = Math.max(...games.map(game => game.p1score));
	const avgScore = (games.reduce((sum, game) => sum + game.p1score, 0) / totalGames).toFixed(1);

	if (totalGamesEl) totalGamesEl.textContent = totalGames.toString();
	if (totalWinsEl) totalWinsEl.textContent = wins.toString();
	if (bestScoreEl) bestScoreEl.textContent = bestScore.toString();
	if (avgScoreEl) avgScoreEl.textContent = avgScore;
}

// Función principal que combina todo
async function initializeGameStats(user: User): Promise<void> {
	// Insertar HTML en tu página
	const statsContainer = document.getElementById('statsContainer');
	if (statsContainer) {
		statsContainer.innerHTML = createChartsHTML();
	}

	// Cargar las gráficas
	await loadGameStatsChart(user);
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