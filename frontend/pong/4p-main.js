import { Playground } from "./scene.js";
import { setGameActive } from "./scene.js";

export const canvas = document.getElementById("renderCanvas");

// Configurar opciones del engine para mayor compatibilidad
const engineOptions = {
	antialias: true,
	stencil: true,
	preserveDrawingBuffer: false,
	powerPreference: "high-performance"
};

// Crear engine con manejo de errores
export let engine;
try {
	engine = new BABYLON.Engine(canvas, true, engineOptions);
	console.log("✅ Babylon.js engine inicializado correctamente");
} catch (error) {
	console.error("❌ Error al inicializar Babylon.js engine:", error);
	// Fallback sin opciones avanzadas
	try {
		engine = new BABYLON.Engine(canvas, true);
		console.log("✅ Babylon.js engine inicializado con configuración básica");
	} catch (fallbackError) {
		console.error("❌ Error crítico al inicializar Babylon.js:", fallbackError);
		throw fallbackError;
	}
}

export let scene;
export let scoreP1 = 0;
export let scoreP2 = 0;
export let scoreP3 = 0;
export let scoreP4 = 0;
export const maxScore = 5;

// Función para actualizar el marcador en pantalla
function updateScoreDisplay() {
	console.log('🔍 updateScoreDisplay llamada con scores:', {
		scoreP1, scoreP2, scoreP3, scoreP4
	});
	console.log('🔍 Document readyState:', document.readyState);
	console.log('🔍 Current URL:', window.location.pathname);
	
	// Verificar que el DOM esté listo
	if (document.readyState === 'loading') {
		console.log('⏳ DOM aún cargando, esperando...');
		document.addEventListener('DOMContentLoaded', function() {
			setTimeout(updateScoreDisplay, 100);
		});
		return;
	}
	
	// VERIFICAR SI ESTAMOS EN MODO IA - Si es así, NO ejecutar esta función
	if (window.location.pathname.includes('pong-ia')) {
		console.log('🚫 Función main.js detectó modo IA - NO debe ejecutarse aquí');
		return; // Salir inmediatamente si estamos en modo IA
	}
	
	// Buscar el elemento score
	const scoreElement = document.getElementById('score');
	const scoreDisplayElement = document.getElementById('scoreDisplay');
	const uiContainer = document.getElementById('uiContainer');
	
	console.log('🔍 Elementos encontrados:', {
		score: !!scoreElement,
		scoreDisplay: !!scoreDisplayElement,
		uiContainer: !!uiContainer
	});
	
	if (!scoreElement) {
		console.warn('⚠️ Elemento score no encontrado, verificando estructura DOM...');
		console.log('🔍 Document body children:', document.body ? document.body.children.length : 'No body');
		console.log('🔍 Todos los elementos con ID:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
		
		// Verificar específicamente el scoreDisplay y su contenido
		if (scoreDisplayElement) {
			console.log('✅ scoreDisplay encontrado, contenido:', scoreDisplayElement.innerHTML);
			console.log('🔍 scoreDisplay children:', Array.from(scoreDisplayElement.children).map(el => ({tag: el.tagName, id: el.id, text: el.textContent})));
			
			// Intentar buscar el span directamente
			const spanElement = scoreDisplayElement.querySelector('span');
			if (spanElement) {
				console.log('✅ Span encontrado sin ID, asignando ID "score":', spanElement.textContent);
				spanElement.id = 'score';
				updateScoreDisplay(); // Reintentar ahora que tenemos el ID
				return;
			} else {
				console.log('❌ No se encontró span dentro de scoreDisplay');
				// Crear el span si no existe
				console.log('🛠️ Creando span con ID score...');
				const newSpan = document.createElement('span');
				newSpan.id = 'score';
				newSpan.textContent = '0 - 0';
				scoreDisplayElement.appendChild(newSpan);
				updateScoreDisplay();
				return;
			}
		} else {
			console.log('❌ scoreDisplay tampoco encontrado');
		}
		
		// Reintento una sola vez más después de un delay mayor
		setTimeout(function() {
			const retryElement = document.getElementById('score');
			if (retryElement) {
				console.log('✅ Elemento score encontrado en reintento tardío');
				updateScoreDisplay();
			} else {
				console.error('❌ Elemento score no encontrado después de reintentos');
				console.log('🔍 HTML completo del scoreDisplay:', scoreDisplayElement ? scoreDisplayElement.outerHTML : 'scoreDisplay not found');
			}
		}, 2000);
		return;
	}
	
	console.log('🔍 scoreElement encontrado:', !!scoreElement);
	
	// Detectar si es modo 4 jugadores (solo para modo normal, NO IA)
	const is4PMode = (scoreP3 > 0 || scoreP4 > 0) || 
					 document.querySelector('#changeCameraButton')?.style.display !== 'none';
	
	console.log('🔍 Modo detectado - 4P (main.js):', is4PMode);
		
	let newText;
	if (is4PMode) {
		// Modo 4 jugadores - usar sistema de traducciones con mejor detección
		let blueText, redText, greenText, purpleText;
		
		// Debug detallado del estado del sistema de traducciones
		console.log('🔍 4P Debug: Estado completo del sistema de traducciones:', {
			'window.i18n exists': !!window.i18n,
			'window.i18n.translations exists': !!(window.i18n && window.i18n.translations),
			'window.i18n.currentLanguage': window.i18n ? window.i18n.currentLanguage : 'N/A',
			'typeof window.t': typeof window.t,
			'window.translations exists': !!window.translations,
			'window.currentLanguage': window.currentLanguage,
			'localStorage language': localStorage.getItem('transcendence_language')
		});
		
		// Priorizar el sistema de traducciones del HTML principal
		if (window.i18n && window.i18n.translations && window.i18n.currentLanguage && typeof window.t === 'function') {
			// Usar sistema del HTML principal
			try {
				blueText = window.t('game.blue');
				redText = window.t('game.red');
				greenText = window.t('game.green');
				purpleText = window.t('game.purple');
				console.log('🎨 4P: Usando sistema HTML principal para traducciones');
				console.log('🎨 4P: Colores obtenidos del HTML:', { blueText, redText, greenText, purpleText });
			} catch (error) {
				console.error('🎨 4P: Error usando sistema HTML:', error);
				blueText = redText = greenText = purpleText = null;
			}
		} else if (window.translations && window.currentLanguage && window.translations[window.currentLanguage]) {
			// Usar sistema secundario sincronizado
			const gameTranslations = window.translations[window.currentLanguage].game;
			if (gameTranslations) {
				blueText = gameTranslations.blue || 'Blue';
				redText = gameTranslations.red || 'Red';
				greenText = gameTranslations.green || 'Green';
				purpleText = gameTranslations.purple || 'Purple';
				console.log('🎨 4P: Usando sistema secundario sincronizado');
				console.log('🎨 4P: Colores obtenidos del secundario:', { blueText, redText, greenText, purpleText });
			} else {
				console.warn('🎨 4P: No se encontró sección game en traducciones');
				blueText = redText = greenText = purpleText = null;
			}
		}
		
		// Si no se pudieron obtener traducciones, usar fallback
		if (!blueText || !redText || !greenText || !purpleText) {
			// Fallback basado en el idioma detectado
			const currentLang = window.i18n?.currentLanguage || window.currentLanguage || localStorage.getItem('transcendence_language') || 'es';
			console.log('🎨 4P: Usando fallback para idioma:', currentLang);
			
			switch(currentLang) {
				case 'de':
					blueText = 'Blau';
					redText = 'Rot';
					greenText = 'Grün';
					purpleText = 'Lila';
					break;
				case 'en':
					blueText = 'Blue';
					redText = 'Red';
					greenText = 'Green';
					purpleText = 'Purple';
					break;
				case 'fr':
					blueText = 'Bleu';
					redText = 'Rouge';
					greenText = 'Vert';
					purpleText = 'Violet';
					break;
				case 'pt':
					blueText = 'Azul';
					redText = 'Vermelho';
					greenText = 'Verde';
					purpleText = 'Roxo';
					break;
				default: // 'es'
					blueText = 'Azul';
					redText = 'Rojo';
					greenText = 'Verde';
					purpleText = 'Púrpura';
					break;
			}
			console.log('🎨 4P: Colores obtenidos del fallback:', { blueText, redText, greenText, purpleText });
		}
		
		console.log('🎨 4P: Colores finales:', {
			currentLang: window.i18n?.currentLanguage || window.currentLanguage || 'unknown',
			blue: blueText,
			red: redText,
			green: greenText,
			purple: purpleText
		});
		
		newText = `${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
	} else {
		// Modo 2 jugadores
		newText = `${scoreP1} - ${scoreP2}`;
	}
	
	console.log('🔍 Texto del marcador antes:', scoreElement.textContent);
	scoreElement.textContent = newText;
	console.log('🔍 Texto del marcador después:', scoreElement.textContent);
	console.log('📊 Marcador actualizado:', newText);
}

// Función para actualizar traducciones cuando cambie el idioma
function updateTranslationsOnLanguageChange() {
	console.log('🌍 4P: Idioma cambiado, actualizando marcador');
	
	// Esperar un poco para que las traducciones se carguen
	setTimeout(() => {
		updateScoreDisplay();
	}, 500);
}

// Escuchar cambios de idioma
document.addEventListener('languageChanged', updateTranslationsOnLanguageChange);

// También escuchar cambios en localStorage (por si el cambio viene del HTML)
window.addEventListener('storage', function(e) {
	if (e.key === 'transcendence_language') {
		console.log('🌍 4P: Cambio de idioma detectado en localStorage:', e.newValue);
		window.currentLanguage = e.newValue;
		updateTranslationsOnLanguageChange();
	}
});

// Exponer variables y funciones globalmente para i18n
window.scoreP1 = scoreP1;
window.scoreP2 = scoreP2;
window.scoreP3 = scoreP3;
window.scoreP4 = scoreP4;
window.updateScoreDisplay = updateScoreDisplay;

console.log('🏓 Puntuaciones inicializadas:', {
	scoreP1: window.scoreP1,
	scoreP2: window.scoreP2,
	scoreP3: window.scoreP3,
	scoreP4: window.scoreP4
});

// Inicializar el marcador en pantalla cuando el DOM esté listo
function initializeScoreDisplay() {
	console.log('🚀 Inicializando marcador, DOM state:', document.readyState);
	
	// Verificar que el elemento existe antes de intentar actualizar
	const scoreElement = document.getElementById('score');
	if (scoreElement) {
		console.log('✅ Elemento score encontrado durante inicialización');
		updateScoreDisplay();
	} else {
		console.log('⚠️ Elemento score no encontrado durante inicialización, esperando...');
		// Esperar un poco más y reintentar
		setTimeout(function() {
			const retryElement = document.getElementById('score');
			if (retryElement) {
				console.log('✅ Elemento score encontrado en reintento');
				updateScoreDisplay();
			} else {
				console.log('❌ Elemento score aún no disponible después de esperar');
			}
		}, 1000);
	}
}

// Esperar a que el DOM esté completamente listo
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeScoreDisplay);
} else if (document.readyState === 'interactive') {
	// DOM loaded pero recursos externos pueden estar cargando
	setTimeout(initializeScoreDisplay, 100);
} else {
	// DOM completamente cargado
	initializeScoreDisplay();
}

export function changeScore1() {
	scoreP1++;
	window.scoreP1 = scoreP1; // Sincronizar con variable global
	console.log('🔥 Score P1 actualizado:', scoreP1);
	updateScoreDisplay();
}

export function changeScore2() {
	scoreP2++;
	window.scoreP2 = scoreP2; // Sincronizar con variable global
	console.log('🔥 Score P2 actualizado:', scoreP2);
	updateScoreDisplay();
}

export function changeScore3() {
	scoreP3++;
	window.scoreP3 = scoreP3; // Sincronizar con variable global
	console.log('🔥 Score P3 actualizado:', scoreP3);
	updateScoreDisplay();
}

export function changeScore4() {
	scoreP4++;
	window.scoreP4 = scoreP4; // Sincronizar con variable global
	console.log('🔥 Score P4 actualizado:', scoreP4);
	updateScoreDisplay();
}

// Función para resetear todas las puntuaciones
export function resetAllScores() {
	scoreP1 = 0;
	scoreP2 = 0;
	scoreP3 = 0;
	scoreP4 = 0;
	window.scoreP1 = scoreP1;
	window.scoreP2 = scoreP2;
	window.scoreP3 = scoreP3;
	window.scoreP4 = scoreP4;
	console.log('🔄 Todas las puntuaciones reseteadas');
	updateScoreDisplay();
}

function startRenderLoop(sceneToRender) {
	engine.runRenderLoop(function () {
		if (sceneToRender && sceneToRender.activeCamera) {
			sceneToRender.render();
		}
	});
}

// Función para manejar errores de fetch con mejor información
function handleFetchError(response) {
	if (!response.ok) {
		return response.json().then(errorData => {
			throw new Error(errorData.error || `Error HTTP: ${response.status}`);
		}).catch(jsonError => {
			throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
		});
	}
	return response.json();
}

// Event listeners con manejo de errores mejorado
function setupEventListeners() {
	// Back button
	const backButton = document.getElementById('backButton');
	if (backButton) {
		backButton.addEventListener('click', function (e) {
			e.preventDefault();
			window.location.href = '/dashboard';
		});
	}

	// Return to dashboard button
	const returnToDashboardButton = document.getElementById('returnToDashboardButton');
	if (returnToDashboardButton) {
		returnToDashboardButton.addEventListener('click', function (e) {
			e.preventDefault();
			window.location.href = '/dashboard';
		});
	}

	// Play again button
	const playAgainButton = document.getElementById('playAgainButton');
	if (playAgainButton) {
		playAgainButton.addEventListener('click', function () {
			resetAllScores();
			const gameOverElement = document.getElementById('gameOver');
			if (gameOverElement) {
				gameOverElement.style.display = 'none';
			}
			setGameActive(false);
			engine.stopRenderLoop();
			scene = Playground.CreateScene(engine, canvas);
			startRenderLoop(scene);
		});
	}

	// Save to dashboard button
	const saveToDashboardButton = document.getElementById('saveToDashboardButton');
	if (saveToDashboardButton) {
		saveToDashboardButton.addEventListener('click', function () {
			const playerWon = scoreP1 > scoreP2;

			const scoreData = {
				p1score: scoreP1,
				p2score: scoreP2,
				p2_id: 0, // CPU opponent
				winner: playerWon ? 1 : 0,
				game_duration: Math.floor(performance.now() / 1000)
			};

			console.log('Intentando guardar puntuación:', scoreData);
			
			this.disabled = true;
			this.textContent = "Guardando...";

			fetch('http://localhost:3000/pong/scores', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include', // Importante para enviar cookies de sesión
				body: JSON.stringify(scoreData)
			})
			.then(handleFetchError)
			.then(data => {
				console.log('Puntuación guardada exitosamente', data);
				alert(window.t ? window.t('game.score_saved') : '¡Puntuación guardada exitosamente!');
				this.textContent = window.t ? window.t('game.saved') : "¡Guardado!";
				// Opcional: redirigir al dashboard después de un breve retraso
				setTimeout(() => {
					window.location.href = '/dashboard';
				}, 1500);
			})
			.catch(error => {
				console.error('Error al guardar:', error);
				alert('Error al guardar la puntuación: ' + error.message);
				this.textContent = "Error al guardar";
			})
			.finally(() => {
				// Re-habilitar el botón después de un tiempo
				setTimeout(() => {
					this.disabled = false;
					this.textContent = window.t ? window.t('game.save_score') : "Guardar puntuación";
				}, 2000);
			});
		});
	}

	// Reset camera button
	const resetCameraButton = document.getElementById('resetCameraButton');
	if (resetCameraButton) {
		resetCameraButton.addEventListener('click', function () {
			if (window.resetCamera) {
				window.resetCamera();
			}
		});
	}
}

window.addEventListener("DOMContentLoaded", async () => {
	console.log('🚀 DOM Content Loaded - inicializando sistema optimizado');
	
	// ENFOQUE OPTIMIZADO: Verificar rápidamente el estado actual y decidir estrategia
	const quickCheck = () => {
		const htmlI18nReady = window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length > 0;
		const htmlTFunction = typeof window.t === 'function';
		const hasBasicTranslations = window.translations && Object.keys(window.translations).length > 0;
		
		return {
			htmlSystemReady: htmlI18nReady && htmlTFunction,
			hasBasicSystem: hasBasicTranslations,
			shouldWait: !htmlI18nReady && !hasBasicTranslations && window.i18n // i18n existe pero aún no está cargado
		};
	};
	
	const status = quickCheck();
	console.log('🔍 4P Main: Estado inicial del sistema:', status);
	
	if (status.htmlSystemReady) {
		// Sistema HTML ya está listo
		console.log('✅ 4P Main: Sistema HTML ya disponible, sincronizando...');
		window.translations = window.i18n.translations;
		window.currentLanguage = window.i18n.currentLanguage;
		window.translationsReady = true;
	} else if (status.hasBasicSystem) {
		// Ya tenemos un sistema básico funcionando
		console.log('✅ 4P Main: Sistema básico ya disponible');
	} else if (status.shouldWait) {
		// Solo esperar si hay evidencia de que el sistema HTML se está cargando
		console.log('⏳ 4P Main: Esperando sistema HTML (máximo 3 segundos)...');
		
		let attempts = 0;
		const maxAttempts = 30; // Reducido a 3 segundos máximo
		
		while (attempts < maxAttempts) {
			const recheckStatus = quickCheck();
			
			if (recheckStatus.htmlSystemReady) {
				console.log('✅ 4P Main: Sistema HTML listo después de', attempts + 1, 'intentos');
				window.translations = window.i18n.translations;
				window.currentLanguage = window.i18n.currentLanguage;
				window.translationsReady = true;
				break;
			}
			
			// Solo mostrar log cada 10 intentos para reducir spam
			if (attempts % 10 === 0) {
				console.log(`🔍 4P Main: Esperando HTML - Intento ${attempts + 1}/30`);
			}
			
			await new Promise(resolve => setTimeout(resolve, 100));
			attempts++;
		}
		
		if (attempts >= maxAttempts) {
			console.log('⚠️ 4P Main: Timeout del sistema HTML (3s), usando fallback');
		}
	} else {
		console.log('🌍 4P Main: No hay sistema HTML detectado, usando sistema independiente');
	}
	
	// Si no tenemos traducciones en este punto, cargar fallback básico
	if (!window.translations || Object.keys(window.translations).length === 0) {
		console.log('🛠️ 4P Main: Cargando sistema independiente como fallback');
		
		window.translations = {};
		window.currentLanguage = localStorage.getItem('transcendence_language') || 'es';
		
		try {
			const response = await fetch(`locales/${window.currentLanguage}.json`);
			if (response.ok) {
				window.translations[window.currentLanguage] = await response.json();
				console.log('✅ 4P Main: Sistema independiente cargado para:', window.currentLanguage);
			} else {
				console.warn('⚠️ 4P Main: No se pudo cargar', window.currentLanguage, ', usando español por defecto');
				// Fallback a español si el idioma actual falla
				window.currentLanguage = 'es';
				const esResponse = await fetch('locales/es.json');
				if (esResponse.ok) {
					window.translations.es = await esResponse.json();
				}
			}
		} catch (error) {
			console.error('❌ 4P Main: Error cargando sistema independiente:', error);
			// Sistema mínimo de emergencia
			window.translations[window.currentLanguage] = {
				game: {
					blue: 'Azul',
					red: 'Rojo',
					green: 'Verde',
					purple: 'Púrpura'
				}
			};
		}
	}
	
	console.log('✅ 4P Main: Sistema de traducciones finalizado:', {
		currentLang: window.currentLanguage,
		hasTranslations: !!(window.translations && Object.keys(window.translations).length > 0),
		hasGameSection: !!(window.translations?.[window.currentLanguage]?.game)
	});
	
	// Asegurar que el marcador se muestre inmediatamente
	setTimeout(updateScoreDisplay, 100);
	setTimeout(updateScoreDisplay, 500);
	setTimeout(updateScoreDisplay, 1000);

	scene = Playground.CreateScene4P(engine, canvas);

	scene.executeWhenReady(() => {
		startRenderLoop(scene);

		// Ocultar pantalla de carga
		setTimeout(() => {
			const loadingScreen = document.getElementById('loadingScreen');
			if (loadingScreen && loadingScreen.style.opacity !== "0") {
				loadingScreen.style.opacity = "0";
				setTimeout(() => {
					loadingScreen.style.display = "none";
				}, 500);
			}
		}, 5000);
	});

	// Configurar event listeners
	setupEventListeners();
});

// Redimensionar
window.addEventListener('resize', function () {
	if (engine) {
		engine.resize();
	}
});