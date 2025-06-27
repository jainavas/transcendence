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
		Chart?: any;
		// Sistema i18n personalizado
		t?: (key: string, params?: any) => string;
		changeLanguage?: (lng: string) => void;
		getCurrentLanguage?: () => string;
		i18n?: {
			isReady: () => boolean;
			getCurrentLanguage: () => string;
			onLanguageChange: (callback: (lang: string) => void) => void;
			changeLanguage: (lng: string) => Promise<boolean>;
			t: (key: string, params?: any) => string;
		};
		// Funciones TypeScript para exportar
		tsChangeLanguage?: (lng: string) => void;
		notifyLanguageChange?: (lng: string) => void;
	}

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

// ============================================================================
// HELPER FUNCTIONS PARA I18N
// ============================================================================

let currentLanguage = 'es';

function setupI18nIntegration(): void {
    console.log('🔗 Configurando integración con i18n.js...');

    const waitForI18n = () => {
        if (window.i18n && typeof window.i18n.isReady === 'function' && window.i18n.isReady()) {
            console.log('✅ Sistema i18n listo, configurando observadores...');

            // Obtener idioma actual del sistema i18n
            if (typeof window.i18n.getCurrentLanguage === 'function') {
                currentLanguage = window.i18n.getCurrentLanguage();
            }

            // Registrarse como observador para cambios de idioma
            if (typeof window.i18n.onLanguageChange === 'function') {
                window.i18n.onLanguageChange((newLang: string) => {
                    console.log('🌍 TS: Cambio de idioma detectado por i18n.js:', newLang);
                    currentLanguage = newLang;
                    
                    // Actualizar contenido dinámico inmediatamente
                    setTimeout(() => {
                        updateDynamicContent();
                        reloadAllDynamicContent();
                    }, 100);
                });
            }

            // Actualizar contenido dinámico inicial
            updateDynamicContent();

        } else {
            console.log('⏳ Esperando que i18n.js esté listo...');
            setTimeout(waitForI18n, 200);
        }
    };

    waitForI18n();
}

// Función helper para traducir - adaptable a diferentes librerías
// Función helper para traducir - usa directamente el sistema i18n existente
function t(key: string, params?: any): string {
	try {
		// Usar directamente la función global del sistema i18n
		if (window.t && typeof window.t === 'function') {
			return window.t(key, params);
		}

		// Fallback básico
		console.warn(`i18n not ready, missing translation for: ${key}`);
		return key.split('.').pop() || key;
	} catch (error) {
		console.error('Error in translation:', error);
		return key;
	}
}

// Función para detectar idioma del navegador
function detectLanguage(): string {
	// Prioridad: 1. localStorage, 2. navegador, 3. español por defecto
	const savedLang = localStorage.getItem('transcendence_language') || localStorage.getItem('language');
	if (savedLang && ['es', 'en', 'fr', 'de', 'pt'].includes(savedLang)) {
		currentLanguage = savedLang;
		return savedLang;
	}

	const browserLang = navigator.language.split('-')[0];
	const supportedLanguages = ['es', 'en', 'fr', 'de', 'pt'];

	const detectedLang = supportedLanguages.includes(browserLang) ? browserLang : 'es';
	currentLanguage = detectedLang;

	// Guardar en ambas claves para sincronización
	localStorage.setItem('transcendence_language', detectedLang);
	localStorage.setItem('language', detectedLang);

	return detectedLang;
}

// Función para cambiar idioma
function changeLanguage(lng: string): void {
	console.log('🌍 TS: Delegando cambio de idioma a i18n.js:', lng);

	// Usar directamente el sistema i18n existente
	if (window.changeLanguage && typeof window.changeLanguage === 'function') {
		window.changeLanguage(lng);
		currentLanguage = lng;
	} else {
		console.error('❌ Sistema i18n no disponible');
	}
}

function setupLanguageIntegration(): void {
	// 1. Configurar integración con i18n.js existente
	setupI18nIntegration();

	// 2. Escuchar cambios desde el selector HTML
	window.addEventListener('htmlLanguageChange', (e: any) => {
		const newLang = e.detail.language;
		console.log('🌍 TS: Recibido cambio desde HTML:', newLang);

		// Delegar al sistema i18n existente
		changeLanguage(newLang);
	});

	console.log('✅ Integración de idiomas configurada con i18n.js');
}

function updateDynamicContent(): void {
    console.log('🔄 Actualizando contenido dinámico inmediato...');

    try {
        const currentUser = getCurrentUser();
        if (currentUser) {
            updateWelcomeMessage(currentUser);
            updateProfileModalTexts();
        }

        updateLoadingTexts();
        updateAllButtonTexts();
        
        console.log('✅ Contenido dinámico inmediato actualizado');
    } catch (error) {
        console.error('❌ Error actualizando contenido dinámico:', error);
    }
}

// Función específica para actualizar textos del modal de perfil
function updateProfileModalTexts(): void {
	try {
		const saveButton = document.getElementById('save-image-btn') as HTMLButtonElement;
		if (saveButton && !saveButton.disabled) {
			saveButton.textContent = t('common.save') || 'Guardar';
		}

		const cancelButton = document.getElementById('cancel-btn') as HTMLButtonElement;
		if (cancelButton) {
			cancelButton.textContent = t('common.cancel') || 'Cancelar';
		}

		const modalTitle = document.querySelector('#edit-modal h3');
		if (modalTitle) {
			modalTitle.textContent = t('profile.modal.title') || 'Cambiar foto de perfil';
		}
	} catch (error) {
		console.error('Error actualizando textos del modal:', error);
	}
}

// Función para actualizar textos de carga dinámicos
function updateLoadingTexts(): void {
	try {
		const loadingTexts = document.querySelectorAll('.loading-text-dynamic');
		loadingTexts.forEach(element => {
			const key = element.getAttribute('data-loading-key');
			if (key) {
				element.textContent = t(key) || 'Cargando...';
			}
		});
	} catch (error) {
		console.error('Error actualizando textos de carga:', error);
	}
}

function reloadAllDynamicContent(): void {
    console.log('🔄 Recargando todo el contenido dinámico...');
    
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
        // Recargar puntuaciones con nuevas traducciones
        console.log('🔄 Recargando puntuaciones...');
        loadPongScores();

        // Recargar leaderboard con nuevas traducciones
        console.log('🔄 Recargando leaderboard...');
        loadGlobalHighScores(currentUser);

        // Recargar gráficas con nuevas traducciones
        console.log('🔄 Recargando gráficas...');
        loadGameStatsChart(currentUser);

        // Actualizar otros elementos dinámicos
        updateAllButtonTexts();
        updateAllStatusMessages();

        console.log('✅ Todo el contenido dinámico recargado');
    } catch (error) {
        console.error('❌ Error recargando contenido dinámico:', error);
    }
}

function updateAllButtonTexts(): void {
	console.log('🔄 Actualizando textos de botones...');
	
	// Actualizar todos los botones de retry
	document.querySelectorAll('#retryScores, #retryHighScores').forEach(button => {
		button.textContent = t('common.retry') || 'Reintentar';
	});

	// Actualizar botón de logout si existe
	const logoutButton = document.getElementById('logoutButton') as HTMLButtonElement;
	if (logoutButton && !logoutButton.disabled) {
		logoutButton.textContent = t('common.logout') || 'Cerrar sesión';
	}
}

function updateAllStatusMessages(): void {
    console.log('🔄 Actualizando mensajes de estado...');
    
    // Actualizar cualquier mensaje de "no hay datos"
    document.querySelectorAll('.no-data-message').forEach(element => {
        const key = element.getAttribute('data-message-key');
        if (key) {
            element.textContent = t(key);
        }
    });
}

// ============================================================================
// CLASE PARA MANEJO DE CACHE DE IMÁGENES CON SOPORTE PARA CORS
// ============================================================================
class ImageCache {
	private cache = new Map<string, string>();
	private loading = new Set<string>();

	async getImage(url: string, fallbackName: string, size: number = 128): Promise<string> {
		// Si ya está en cache, devolverlo
		if (this.cache.has(url)) {
			return this.cache.get(url)!;
		}

		// Si ya se está cargando, esperar
		if (this.loading.has(url)) {
			return new Promise((resolve) => {
				const checkInterval = setInterval(() => {
					if (this.cache.has(url)) {
						clearInterval(checkInterval);
						resolve(this.cache.get(url)!);
					}
				}, 100);

				// Timeout de seguridad para evitar bucles infinitos
				setTimeout(() => {
					clearInterval(checkInterval);
					resolve(this.generateFallbackImage(fallbackName, size));
				}, 10000);
			});
		}

		// Marcar como en carga
		this.loading.add(url);

		try {
			// Detectar si es una imagen externa (no de Google) y usar proxy si es necesario
			const isExternalImage = !this.isGoogleOrLocalImage(url);
			
			if (isExternalImage) {
				console.log('🌐 Imagen externa detectada, intentando cargar con proxy:', url);
				
				// Intentar cargar directamente primero
				const directLoadSuccess = await this.testImageLoad(url);
				if (directLoadSuccess) {
					this.cache.set(url, url);
					this.loading.delete(url);
					return url;
				}
				
				// Si falla, usar el proxy del backend
				try {
					const proxiedUrl = await this.loadImageThroughProxy(url);
					this.cache.set(url, proxiedUrl);
					this.loading.delete(url);
					return proxiedUrl;
				} catch (proxyError) {
					console.warn('⚠️ Proxy falló, usando fallback:', proxyError);
					throw new Error('Proxy failed');
				}
			} else {
				// Para imágenes de Google o locales, intentar cargar directamente
				const isValid = await this.testImageLoad(url);
				if (isValid) {
					this.cache.set(url, url);
					this.loading.delete(url);
					return url;
				} else {
					throw new Error('Image failed to load');
				}
			}
		} catch (error) {
			console.warn('🖼️ Error cargando imagen, usando fallback:', error);
			// Generar fallback y guardarlo en cache
			const fallbackUrl = this.generateFallbackImage(fallbackName, size);
			this.cache.set(url, fallbackUrl);
			this.loading.delete(url);
			return fallbackUrl;
		}
	}

	private isGoogleOrLocalImage(url: string): boolean {
		return url.includes('googleusercontent.com') || 
			   url.includes('lh3.googleusercontent.com') ||
			   url.includes('localhost') ||
			   url.includes('127.0.0.1') ||
			   url.startsWith('/') ||
			   url.startsWith('data:');
	}

	private async loadImageThroughProxy(url: string): Promise<string> {
		try {
			// Crear una nueva imagen usando el backend como proxy
			const proxyUrl = `${BACKEND_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
			
			// Verificar que el proxy funciona
			const isValid = await this.testImageLoad(proxyUrl);
			if (isValid) {
				return proxyUrl;
			} else {
				throw new Error('Proxy image load failed');
			}
		} catch (error) {
			console.error('❌ Error en proxy de imagen:', error);
			throw error;
		}
	}

	private async testImageLoad(url: string): Promise<boolean> {
		// Skip validation for Google profile pictures - trust them
		if (this.isGoogleOrLocalImage(url)) {
			return true;
		}
		
		return new Promise((resolve) => {
			const img = new Image();
			const timeout = setTimeout(() => {
				img.onload = null;
				img.onerror = null;
				console.log('⏱️ Timeout validando imagen:', url);
				resolve(false);
			}, 5000);

			img.onload = () => {
				clearTimeout(timeout);
				console.log('✅ Imagen validada correctamente:', url);
				resolve(true);
			};
			
			img.onerror = (error) => {
				clearTimeout(timeout);
				console.log('❌ Error al validar imagen:', url, error);
				resolve(false);
			};
			
			// Usar crossOrigin para intentar acceso CORS
			img.crossOrigin = 'anonymous';
			img.src = url;
		});
	}

	// MÉTODO PÚBLICO - ahora se puede acceder desde fuera
	public generateFallbackImage(name: string, size: number): string {
		const initial = (name || 'U').charAt(0).toUpperCase();
		const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
		const color = colors[Math.abs(name.length) % colors.length];

		return `data:image/svg+xml;base64,${btoa(`
			<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
				<rect width="100%" height="100%" fill="${color}"/>
				<text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size / 4}" 
					  fill="white" text-anchor="middle" dy=".35em">
					${initial}
				</text>
			</svg>
		`)}`;
	}
}

// Crear instancia global del cache
const imageCache = new ImageCache();

// ============================================================================
// CLASE PROFILE MANAGER CON I18N
// ============================================================================
export class ProfileManager {
	private profileImage: string = null;
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
		aliasInput?.addEventListener('keypress', (e) => {
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
				await this.updateProfileImageUI(user.picture);
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
			this.showError(t('profile.error.url_or_alias_required'));
			return;
		}

		if (newAlias && !newUrl) {
			// Validar alias (opcional, puedes agregar más reglas)
			if (newAlias.length < 3 || newAlias.length > 20) {
				this.showError(t('profile.error.alias_length'));
				return;
			}

			// Aquí podrías enviar el alias al servidor si es necesario
			await this.updateImageOnServer(newAlias, null);
			return;
		}

		if (newUrl && !this.validateImageUrl(newUrl)) {
			this.showError(t('profile.error.invalid_image_url'));
			return;
		}

		if (newUrl) {
			// Verificar si la imagen se puede cargar antes de enviarla al servidor
			const imageExists = await this.testImageLoad(newUrl);
			if (!imageExists) {
				this.showError(t('profile.error.image_load_failed'));
				return;
			}

			// Enviar al servidor
			await this.updateImageOnServer(newAlias, newUrl);
		}
	}

	private async testImageLoad(url: string): Promise<boolean> {
		// Skip validation for Google profile pictures - trust them
		if (url.includes('googleusercontent.com') || url.includes('lh3.googleusercontent.com')) {
			return true;
		}
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
			const response = await authenticatedFetch(`${BACKEND_URL}/user/aliaspicture`, {
				method: 'POST',
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
					await this.updateProfileImageUI(finalImageUrl);
				if (alias) {
					document.getElementById('user_name')!.textContent = alias;
					document.getElementById('userProfileNav')!.querySelector('span')!.textContent = alias;
				}
				this.closeEditModal();
				this.showSuccess(t('profile.success.image_updated'));

			} else {
				// Manejo de errores del servidor
				const errorData = await response.json().catch(() => null);
				const errorMessage = errorData?.message || t('profile.error.server_error', { status: response.status });
				this.showError(errorMessage);
			}

		} catch (error) {
			console.error('Error al actualizar la imagen:', error);
			this.showError(t('profile.error.connection_error'));
		} finally {
			this.setLoadingState(false);
		}
	}

	// ACTUALIZADO: Usar el cache para cargar la imagen
	private async updateProfileImageUI(url: string): Promise<void> {
		try {
			// Usar el cache para cargar la imagen
			const cachedUrl = await imageCache.getImage(url, t('common.user'), 128);

			const profileContainer = document.getElementById('userProfileImage');
			if (profileContainer) {
				profileContainer.innerHTML = `
					<img src="${cachedUrl}" alt="${t('common.user')}"
						 class="h-32 w-32 object-cover rounded-full border-4 border-white"
						 crossorigin="anonymous"
						 referrerpolicy="no-referrer">
				`;
			}

			// Actualizar también la imagen en la barra de navegación
			const navProfileContainer = document.getElementById('userProfileNav');
			if (navProfileContainer) {
				const navProfileImg = navProfileContainer.querySelector('img');
				if (navProfileImg) {
					const navCachedUrl = await imageCache.getImage(url, t('common.user'), 32);
					navProfileImg.src = navCachedUrl;
				}
			}
		} catch (error) {
			console.error('Error al actualizar imagen de perfil:', error);
			// Usar fallback en caso de error
			const fallbackUrl = imageCache.generateFallbackImage(t('common.user'), 128);

			const profileContainer = document.getElementById('userProfileImage');
			if (profileContainer) {
				profileContainer.innerHTML = `
					<img src="${fallbackUrl}" alt="${t('common.user')}"
						 class="h-32 w-32 object-cover rounded-full border-4 border-white"
						 crossorigin="anonymous"
						 referrerpolicy="no-referrer">
				`;
			}
		}
	}

	private setLoadingState(loading: boolean): void {
		this.isLoading = loading;
		const saveButton = document.getElementById('save-image-btn') as HTMLButtonElement;
		const input = document.getElementById('image-url-input') as HTMLInputElement;

		if (saveButton) {
			saveButton.disabled = loading;
			saveButton.textContent = loading ? t('common.saving') : t('common.save');
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

// ============================================================================
// FUNCIONES PRINCIPALES CON I18N
// ============================================================================

// Variable global para almacenar el usuario actual
let currentUser: User | null = null;

// Función principal que se ejecuta al cargar la página
async function init(): Promise<void> {
	console.log("🚀 Dashboard iniciado");

	try {
		// Verificar si hay sesión activa
		const user = await checkUserSession();
		if (user) {
			console.log("✅ Usuario autenticado:", user);

			// Almacenar usuario globalmente para i18n
			currentUser = user;

			// Actualizar todos los elementos de la interfaz (ahora async)
			await updateUserProfile(user);
			await updateNavProfile(user);
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
		showErrorMessage(t('errors.initialization_failed', { error: (error as Error).message }));
	}
}

// Función para obtener usuario actual (implementación)
function getCurrentUser(): User | null {
	return currentUser;
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
				name: t('common.loading'),
				email: t('common.please_wait'),
				picture: ""
			};
		}

		// Guardar timestamp de verificación
		sessionStorage.setItem('lastSessionCheck', now.toString());

		const response = await authenticatedFetch(`${BACKEND_URL}/user/me`, {
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
			throw new Error(t('errors.server_error', { status: response.status }));
		}

		const data = await response.json();
		console.log("📊 Datos de sesión:", data);

		if (!data.authenticated || !data.user) {
			console.warn("⚠️ No autenticado");

			// AÑADIR: Prevenir bucles de redireccionamiento
			const redirectAttempts = parseInt(sessionStorage.getItem('redirectAttempts') || '0');
			if (redirectAttempts > 2) {
				console.error("🛑 Demasiados intentos de redirección, deteniendo");
				showErrorMessage(t('errors.session_error'));
				return null;
			}

			sessionStorage.setItem('redirectAttempts', (redirectAttempts + 1).toString());
			window.location.href = "/";
			return null;
		}

		// Check if user requires 2FA verification
		if (data.requires2FA && !data.isFullyAuthenticated) {
			console.warn("🔐 Usuario requiere verificación 2FA obligatoria");
			console.log("📊 Estado del usuario:", {
				authenticated: data.authenticated,
				authMethod: data.authMethod,
				requires2FA: data.requires2FA,
				isFullyAuthenticated: data.isFullyAuthenticated,
				userEmail: data.user?.email
			});
			
			// Clear session storage to prevent loops
			sessionStorage.removeItem('redirectAttempts');
			
			// Force redirect to 2FA page - no exceptions
			console.log("🚨 REDIRIGIENDO A 2FA - OBLIGATORIO");
			localStorage.setItem('pendingUserEmail', data.user.email);
			localStorage.setItem('pendingSetup', 'false');
			window.location.href = '/2fa?email=' + encodeURIComponent(data.user.email);
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
				name: t('common.test_user'),
				email: "test@example.com",
				picture: "https://ui-avatars.com/api/?name=Test+User"
			};
		}

		// Para producción: agregar parámetros de diagnóstico
		window.location.href = `/?error=session&details=${encodeURIComponent(errorDetails)}`;
		return null;
	}
}

// ACTUALIZADA: Actualizar el perfil de usuario principal
async function updateUserProfile(user: User): Promise<void> {
	console.log("🖼️ Actualizando perfil con datos:", user);

	// Actualizar foto de perfil
	const profileImage = document.getElementById('userProfileImage');
	if (profileImage) {
		// Mostrar loading spinner
		profileImage.innerHTML = `
			<div class="h-32 w-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			</div>
		`;

		try {
			let imageUrl = user.picture;

			// Si hay imagen de usuario, intentar cargarla con cache
			if (imageUrl) {
				imageUrl = await imageCache.getImage(user.picture, user.name, 128);
			} else {
				// Si no hay imagen, generar fallback directamente
				imageUrl = imageCache.generateFallbackImage(user.name, 128);
			}

			profileImage.innerHTML = `
				<img src="${imageUrl}" alt="${user.name}"
					 class="h-32 w-32 object-cover rounded-full border-4 border-white"
					 crossorigin="anonymous"
					 referrerpolicy="no-referrer">
			`;
		} catch (error) {
			console.error('Error al cargar imagen de perfil:', error);
			// Fallback final en caso de error
			const fallbackUrl = imageCache.generateFallbackImage(user.name, 128);
			profileImage.innerHTML = `
				<img src="${fallbackUrl}" alt="${user.name}"
					 class="h-32 w-32 object-cover rounded-full border-4 border-white"
					 crossorigin="anonymous"
					 referrerpolicy="no-referrer">
			`;
		}
	}

	// Actualizar nombre y email (mantener como estaba)
	const nameElement = document.getElementById('user_name');
	if (nameElement) nameElement.textContent = user.name || t('common.user');

	const emailElement = document.getElementById('userEmail');
	if (emailElement) emailElement.textContent = user.email || '';
}

// ACTUALIZADA: Actualizar el perfil en la barra de navegación
async function updateNavProfile(user: User): Promise<void> {
	const navProfile = document.getElementById('userProfileNav');
	if (navProfile) {
		// Crear estructura básica primero
		navProfile.innerHTML = `
			<div class="flex items-center">
				<span class="text-sm mr-3">${user.name}</span>
				<div class="w-8 h-8 rounded-full border-2 border-white bg-gray-200 animate-pulse"></div>
			</div>
		`;

		try {
			let imageUrl = user.picture;

			// Obtener imagen del cache
			if (imageUrl) {
				imageUrl = await imageCache.getImage(user.picture, user.name, 32);
			} else {
				imageUrl = imageCache.generateFallbackImage(user.name, 32);
			}

			// Reemplazar el placeholder con la imagen real
			const imgContainer = navProfile.querySelector('div > div');
			if (imgContainer) {
				imgContainer.outerHTML = `
					<img src="${imageUrl}" alt="${t('common.avatar')}" 
						 class="w-8 h-8 rounded-full border-2 border-white"
						 crossorigin="anonymous"
						 referrerpolicy="no-referrer">
				`;
			}
		} catch (error) {
			console.error('Error al cargar imagen de navegación:', error);
			const fallbackUrl = imageCache.generateFallbackImage(user.name, 32);
			const imgContainer = navProfile.querySelector('div > div');
			if (imgContainer) {
				imgContainer.outerHTML = `
					<img src="${fallbackUrl}" alt="${t('common.avatar')}" 
						 class="w-8 h-8 rounded-full border-2 border-white"
						 crossorigin="anonymous"
						 referrerpolicy="no-referrer">
				`;
			}
		}
	}
}

// ACTUALIZADA: Función de mensaje de bienvenida con i18n
function updateWelcomeMessage(user: User): void {
	const welcomeElement = document.getElementById('welcomeMessage');
	if (welcomeElement && !welcomeElement.hasAttribute('data-i18n')) {
		// Solo actualizar si no tiene data-i18n (para evitar conflictos con i18n.js)
		const hour = new Date().getHours();
		let greetingKey = "greeting.morning";

		if (hour >= 12 && hour < 18) {
			greetingKey = "greeting.afternoon";
		} else if (hour >= 18 || hour < 6) {
			greetingKey = "greeting.evening";
		}

		const greeting = t(greetingKey);
		const welcomeText = t('welcome.logged_in_message');
		const emailLabel = t('common.email');

		welcomeElement.innerHTML = `
            <p class="mb-2">${greeting}, <strong>${user.name}</strong>.</p>
            <p>${welcomeText}</p>
            <p class="text-sm text-gray-500 mt-2">${emailLabel}: ${user.email}</p>
        `;
	}
}

// ACTUALIZADA: Configurar botón de logout con i18n
function setupLogoutButton(): void {
	console.log("🔄 Configurando botón de logout");

	const logoutButton = document.getElementById('logoutButton');
	if (logoutButton) {
		logoutButton.addEventListener('click', async () => {
			console.log("👆 Click en botón de logout");

			try {
				// Cambiar el estado visual del botón
				logoutButton.textContent = t('auth.logging_out');
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
					throw new Error(t('auth.logout_error', { status: response.status }));
				}

				// Clear JWT token on logout
				removeAuthToken();

				// Redirigir al login
				window.location.href = "/?logout=true";
			} catch (error) {
				console.error("❌ Error en logout:", error);

				// Restaurar el botón
				logoutButton.textContent = t('auth.logout');
				(logoutButton as HTMLButtonElement).disabled = false;

				showErrorMessage(t('auth.logout_error_message'));
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

// ============================================================================
// RESTO DE FUNCIONES (loadPongScores, loadGlobalHighScores, etc.)
// Continuaré con el resto del archivo en la siguiente parte...
// ============================================================================

// Mostrar mensaje de error con i18n
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

// Mostrar mensaje de éxito con i18n
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

// ============================================================================
// FUNCIONES DE PUNTUACIONES CON I18N
// ============================================================================

// Flag para controlar si hay una carga de puntuaciones en progreso
let loadingScores = false;

// ACTUALIZADA: Cargar puntuaciones de Pong con i18n
async function loadPongScores(): Promise<void> {
	const scoresContainer = document.getElementById('pongScores');
	if (!scoresContainer) {
		console.error("❌ No se encontró el contenedor de puntuaciones de Pong");
		showErrorMessage(t('pong.errors.container_not_found'));
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
        <p class="text-gray-500 mt-2 loading-text-dynamic" data-loading-key="pong.loading_scores">${t('pong.loading_scores')}</p>
    </div>
	`;

	try {
		console.log("🏓 Cargando puntuaciones... (intento: " + (scoresRetryCount + 1) + ")");
		const response = await authenticatedFetch(`${BACKEND_URL}/pong/scores`, {
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		if (!response.ok) {
			throw new Error(t('pong.errors.load_scores_failed', { status: response.status }));
		}

		const scores = await response.json() as PongScore[];
		console.log("📊 Puntuaciones recibidas:", scores);
		scoresRetryCount = 0; // Reiniciar contador de intentos al tener éxito

		if (scores && scores.length > 0) {
			scoresContainer.innerHTML = '';

			scores.forEach((score) => {
				const date = new Date(score.fecha || '');
				const formattedDate = isNaN(date.getTime())
					? t('common.unknown_date')
					: date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
				const p1score = typeof score.p1score === 'number' ?
					score.p1score : (parseInt(score.p1score) || 0);
				const p2score = typeof score.p2score === 'number' ?
					score.p2score : (parseInt(score.p2score) || 0);
				const opponent = score.p2_id ? 'CPU' : score.opponent_name || t('common.unknown');
				const scoreCard = document.createElement('div');
				scoreCard.className = `p-3 border ${score.winner ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg mb-2`;

				scoreCard.innerHTML = `
					<div class="flex justify-between items-center">
						<div>
							<span class="font-bold text-lg">${p1score} - ${p2score}</span> ${t('pong.points')}
							<p class="text-sm text-gray-600">${t('pong.vs')} ${opponent}</p>
						</div>
						<div class="text-right">
							<span class="text-sm text-gray-500">${formattedDate}</span>
							<p class="text-xs ${score.winner ? 'text-green-600' : 'text-red-600'}">
								${score.winner ? t('pong.victory') : t('pong.defeat')}
							</p>
						</div>
					</div>
				`;

				scoresContainer.appendChild(scoreCard);
			});
		} else {
			scoresContainer.innerHTML = `
				<div class="text-center py-4">
					<p class="text-gray-600">${t('pong.no_games_yet')}</p>
					<p class="text-sm text-gray-500 mt-2">${t('pong.click_to_start')}</p>
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
					<p class="text-gray-500 mt-2">${t('pong.retrying_in_seconds', { seconds: delay / 1000 })}</p>
				</div>
			`;

			console.log(`🔄 Programando reintento ${scoresRetryCount} en ${delay}ms`);
			setTimeout(() => {
				loadPongScores();
			}, delay);
		} else {
			scoresContainer.innerHTML = `
				<div class="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg">
					<p>${t('pong.errors.load_failed_multiple_attempts')}</p>
					<button id="retryScores" class="text-sm text-blue-500 mt-2">${t('common.retry')}</button>
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

// ACTUALIZADA: Cargar mejores puntuaciones globales con i18n
async function loadGlobalHighScores(user: User): Promise<void> {
	const highScoresContainer = document.getElementById('highScoresList');
	if (!highScoresContainer) return;

	try {
		console.log("🏆 Cargando mejores puntuaciones globales...");
		const response = await authenticatedFetch(`${BACKEND_URL}/pong/leaderboard`, {
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		if (!response.ok) {
			throw new Error(t('leaderboard.errors.load_failed', { status: response.status, statusText: response.statusText }));
		}

		const highScores = await response.json();
		console.log("🏆 Mejores puntuaciones recibidas:", highScores);
		console.log("👤 Usuario actual:", user);

		if (highScores && highScores.length > 0) {
			highScoresContainer.innerHTML = '';

			for (let index = 0; index < highScores.length; index++) {
				const score = highScores[index];
				console.log(`🔍 Procesando score ${index}:`, {
					p1_id: score.p1_id,
					user_name: score.user_name,
					opponent_name: score.opponent_name,
					user_id: user.id
				});

				const date = new Date(score.fecha || '');
				const formattedDate = isNaN(date.getTime())
					? t('common.unknown_date')
					: date.toLocaleDateString();

				const row = document.createElement('tr');

				// Mejorar la lógica de identificación del usuario
				let user_name = score.user_name || t('leaderboard.anonymous_player');
				let user_picture = score.user_picture;
				let isCurrentUser = false;

				// Convertir ambos a string para comparación segura
				const currentUserId = String(user.id || '');
				const scorePlayerId = String(score.p1_id || '');

				if (currentUserId && scorePlayerId && currentUserId === scorePlayerId) {
					user_name = user.name + ' ' + t('leaderboard.you');
					user_picture = user.picture || score.user_picture;
					isCurrentUser = true;
					console.log(`✅ Usuario actual encontrado en posición ${index + 1}`);
				}

				// Aplicar clases CSS correctamente sin conflictos
				if (isCurrentUser) {
					row.className = 'bg-blue-100 border-l-4 border-blue-500';
					row.style.backgroundColor = '#dbeafe';
				} else {
					row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-100';
					if (index % 2 !== 0) {
						row.style.backgroundColor = '#f3f4f6';
					}
				}

				// Usar el cache para las imágenes del leaderboard
				let finalUserPicture: string;
				let finalOpponentPicture: string;

				try {
					if (user_picture) {
						finalUserPicture = await imageCache.getImage(user_picture, user_name, 32);
					} else {
						finalUserPicture = imageCache.generateFallbackImage(user_name, 32);
					}

					if (score.opponent_picture && score.opponent_name !== 'CPU') {
						finalOpponentPicture = await imageCache.getImage(score.opponent_picture, score.opponent_name || t('leaderboard.opponent'), 32);
					} else {
						finalOpponentPicture = imageCache.generateFallbackImage(score.opponent_name || 'CPU', 32);
					}
				} catch (error) {
					console.error('Error al cargar imágenes del leaderboard:', error);
					finalUserPicture = imageCache.generateFallbackImage(user_name, 32);
					finalOpponentPicture = imageCache.generateFallbackImage(score.opponent_name || t('leaderboard.opponent'), 32);
				}

				row.innerHTML = `
					<td class="py-3 px-4">${index + 1}</td>
					<td class="py-3 px-4">
						<div class="flex items-center">
							<img src="${finalUserPicture}" 
								 class="h-8 w-8 rounded-full mr-2" 
								 alt="${user_name}"
								 crossorigin="anonymous"
								 referrerpolicy="no-referrer">
							<span>${user_name}</span>
						</div>
					</td>
					<td class="py-3 px-4">
						<div class="flex items-center">
							<img src="${finalOpponentPicture}" 
								 class="h-8 w-8 rounded-full mr-2" 
								 alt="${score.opponent_name || t('leaderboard.opponent')}"
								 crossorigin="anonymous"
								 referrerpolicy="no-referrer">
							<span>${score.opponent_name || t('leaderboard.unknown_opponent')}</span>
						</div>
					</td>
					<td class="py-3 px-4 font-bold">${score.p1score} - ${score.p2score}</td>
					<td class="py-3 px-4 text-gray-500">${formattedDate}</td>
				`;

				highScoresContainer.appendChild(row);
			}
		} else {
			highScoresContainer.innerHTML = `
				<tr>
					<td colspan="5" class="py-4 text-center text-gray-500">
						${t('leaderboard.no_scores_yet')}
					</td>
				</tr>
			`;
		}
	} catch (error) {
		console.error("❌ Error al cargar mejores puntuaciones:", error);
		highScoresContainer.innerHTML = `
			<tr>
				<td colspan="5" class="py-3 text-center text-red-500">
					${t('leaderboard.errors.load_error')}
					<button id="retryHighScores" class="text-blue-500 underline ml-2">${t('common.retry')}</button>
				</td>
			</tr>
		`;

		const retryButton = document.getElementById('retryHighScores');
		if (retryButton) {
			retryButton.addEventListener('click', () => loadGlobalHighScores(user));
		}
	}
}

// ============================================================================
// GRÁFICAS Y ESTADÍSTICAS CON I18N
// ============================================================================

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

// ACTUALIZADA: Función para crear la gráfica de últimas partidas con i18n
async function loadGameStatsChart(user: User): Promise<void> {
	try {
		console.log("📊 Cargando estadísticas de partidas...");

		// Fetch de las últimas partidas del usuario
		const response = await authenticatedFetch(`${BACKEND_URL}/pong/scores`, {
			headers: {
				'Cache-Control': 'no-cache',
				'Pragma': 'no-cache'
			}
		});

		if (!response.ok) {
			throw new Error(t('stats.errors.load_failed', { status: response.status }));
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

// ACTUALIZADA: Crear gráfica de puntuaciones por partida con i18n
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
			ctx.fillText(t('stats.no_games_to_show'), canvas.width / 2, canvas.height / 2);
			return;
		}

		const chartData: ChartData = {
			labels: last10Games.map((game, index) => t('stats.game_number', { number: index + 1 })),
			datasets: [
				{
					label: t('stats.your_score'),
					data: last10Games.map(game => game.p1score),
					borderColor: '#3b82f6',
					backgroundColor: 'rgba(59, 130, 246, 0.1)',
					borderWidth: 3,
					fill: true,
					tension: 0.4
				},
				{
					label: t('stats.opponent'),
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
						text: t('stats.last_10_games_title'),
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
							text: t('stats.score')
						}
					},
					x: {
						title: {
							display: true,
							text: t('stats.games')
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

// ACTUALIZADA: Crear gráfica de ratio de victorias con i18n
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
			ctx.fillText(t('stats.no_games_to_show'), canvas.width / 2, canvas.height / 2);
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
				labels: [t('stats.victories'), t('stats.defeats')],
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
						text: t('stats.win_rate_title', { rate: winRate }),
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

// ACTUALIZADA: Mostrar error si no se pueden cargar las gráficas con i18n
function showChartError(): void {
	const containers = ['gameStatsChart', 'winRateChart'];

	containers.forEach(containerId => {
		const container = document.getElementById(containerId);
		if (container) {
			container.innerHTML = `
				<div class="flex items-center justify-center h-full text-red-500">
					<div class="text-center">
						<p class="text-lg font-semibold">${t('stats.errors.chart_load_error')}</p>
						<button onclick="window.location.reload()" 
								class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
							${t('common.retry')}
						</button>
					</div>
				</div>
			`;
		}
	});
}

// ACTUALIZADA: Función para actualizar las estadísticas del resumen con i18n
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

// ACTUALIZADA: HTML estructura para las gráficas con i18n
function createChartsHTML(): string {
	return `
		<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
			<h2 class="text-2xl font-bold text-gray-800 mb-6">📊 ${t('stats.game_statistics')}</h2>
			
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
					<h3 class="text-lg font-semibold text-gray-800 mb-4">📈 ${t('stats.summary')}</h3>
					<div class="space-y-3">
						<div class="flex justify-between">
							<span class="text-gray-600">${t('stats.games_played')}:</span>
							<span class="font-bold text-blue-600" id="totalGames">-</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">${t('stats.victories')}:</span>
							<span class="font-bold text-green-600" id="totalWins">-</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">${t('stats.best_score')}:</span>
							<span class="font-bold text-purple-600" id="bestScore">-</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">${t('stats.average_points')}:</span>
							<span class="font-bold text-orange-600" id="avgScore">-</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
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

// ============================================================================
// INICIALIZACIÓN CON I18N
// ============================================================================

// Inicializar cuando el DOM esté listo
let initialized = false;

function safeInit() {
    if (initialized) return;
    initialized = true;

    console.log("🔄 Inicializando dashboard con integración i18n...");

    try {
        // 1. Configurar integración con el sistema i18n existente
        setupLanguageIntegration();
        
        // 2. Inicializar dashboard
        init();
        
        // 3. Debug de integración después de un delay
        setTimeout(() => {
            console.log('🐛 Debug integración i18n:', {
                i18nExists: !!window.i18n,
                i18nReady: window.i18n && typeof window.i18n.isReady === 'function' ? window.i18n.isReady() : false,
                currentLanguage: currentLanguage,
                tFunction: !!window.t,
                changeLanguageFunction: !!window.changeLanguage
            });
        }, 2000);
    } catch (error) {
        console.error('❌ Error en safeInit:', error);
    }
}

document.addEventListener('DOMContentLoaded', safeInit);

// Comprobar también si el DOM ya está cargado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
	console.log("🔄 DOM ya está listo, inicializando pronto...");
	setTimeout(safeInit, 100);
}

// Confirmar que el script se ha cargado completamente
console.log("✅ dashboard.ts cargado completamente");

// ============================================================================
// EXPORTAR FUNCIONES PARA USO EXTERNO
// ============================================================================

// Exportar funciones útiles para el cambio de idioma desde HTML
// Exportar funciones para integración con HTML

// Función global para notificación externa de cambios de idioma
window.notifyLanguageChange = (lng: string) => {
    console.log('🌍 Notificación externa de cambio de idioma:', lng);
    if (lng !== currentLanguage) {
        currentLanguage = lng;
        // Forzar actualización inmediata
        setTimeout(() => {
            updateDynamicContent();
            reloadAllDynamicContent();
        }, 50);
    }
};

window.tsChangeLanguage = changeLanguage;
window.getCurrentLanguage = () => currentLanguage;
window.notifyLanguageChange = (lng: string) => {
	console.log('🌍 Notificación externa de cambio de idioma:', lng);
	if (lng !== currentLanguage) {
		changeLanguage(lng);
	}
};

// JWT Token management for dashboard
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

// Enhanced fetch with JWT token for dashboard
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