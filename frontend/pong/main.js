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

// 🏆 Variables de torneo
let isTournamentMode = false;
let tournamentMatchInfo = null;

// 🏆 Verificar modo torneo al cargar
function checkTournamentMode() {
	const urlParams = new URLSearchParams(window.location.search);
	isTournamentMode = urlParams.get('tournament') === 'true';
	
	if (isTournamentMode) {
		console.log("🏆 Modo torneo detectado");
		
		// Obtener info del match
		const matchData = sessionStorage.getItem('tournamentMatch');
		if (matchData) {
			tournamentMatchInfo = JSON.parse(matchData);
			console.log("🎮 Info del match:", tournamentMatchInfo);
			
			// Ocultar botones innecesarios en modo torneo
			hideTournamentUnnecessaryElements();
		}
	}
}

// 🏆 Ocultar elementos innecesarios en modo torneo
function hideTournamentUnnecessaryElements() {
	// Ocultar botones que no son necesarios en torneo
	setTimeout(() => {
		const elementsToHide = [
			'saveToDashboardButton',
			'returnToDashboardButton'
		];
		
		elementsToHide.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.style.display = 'none';
			}
		});
		
		// Agregar botón para volver al torneo
		const gameOverDiv = document.getElementById('gameOver');
		if (gameOverDiv && !document.getElementById('returnToTournamentButton')) {
			const returnBtn = document.createElement('button');
			returnBtn.id = 'returnToTournamentButton';
			returnBtn.className = 'btn-blue';
			returnBtn.textContent = 'Volver al Torneo';
			returnBtn.addEventListener('click', returnToTournament);
			gameOverDiv.appendChild(returnBtn);
		}
	}, 1000);
}

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
	
	// VERIFICAR SI ESTAMOS EN MODO 4P - Si es así, NO ejecutar esta función
	if (window.location.pathname.includes('pong-4p') || window.location.pathname.includes('4p')) {
		console.log('🚫 Función main.js detectó modo 4P - NO debe ejecutarse aquí');
		return; // Salir inmediatamente si estamos en modo 4P
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
	
	let newText;
	
	// 🏆 VERIFICAR SI ESTAMOS EN MODO TORNEO
	if (isTournamentMode && tournamentMatchInfo) {
		console.log('🏆 Modo torneo detectado con info:', tournamentMatchInfo);
		
		// Crear marcador especial para torneo con nombres y ronda
		const player1Name = tournamentMatchInfo.player1 || 'Jugador 1';
		const player2Name = tournamentMatchInfo.player2 || 'Jugador 2';
		const roundName = tournamentMatchInfo.roundName || 'Torneo';
		
		// Usar scoreDisplayElement si existe (mejor para torneo), sino scoreElement
		const targetElement = scoreDisplayElement || scoreElement;
		
		if (scoreDisplayElement) {
			// Formato rico para scoreDisplay (con HTML)
			targetElement.innerHTML = `
				<div style="text-align: center; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; border: 2px solid #00ff88;">
					<div style="font-size: 0.9rem; color: #00ff88; margin-bottom: 8px; font-weight: bold;">
						🏆 ${roundName}
					</div>
					<div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
						<span style="color: #00ff88; font-weight: bold; font-size: 1rem;">${player1Name}</span>
						<span style="color: #fff; font-size: 1.8rem; font-weight: bold;">${scoreP1} - ${scoreP2}</span>
						<span style="color: #ff6b6b; font-weight: bold; font-size: 1rem;">${player2Name}</span>
					</div>
				</div>
			`;
		} else {
			// Formato simple para scoreElement (solo texto)
			newText = `🏆 ${roundName} | ${player1Name}: ${scoreP1} - ${player2Name}: ${scoreP2}`;
			scoreElement.textContent = newText;
		}
		
		console.log('🏆 Marcador de torneo actualizado');
		return;
	}
	
	// Lógica original para otros modos
	
	// Verificar si estamos en modo 4 jugadores
	const is4PlayerMode = window.location.pathname.includes('pong-4p') || 
						 (window.scoreP3 !== undefined && window.scoreP4 !== undefined && 
						  (window.scoreP3 > 0 || window.scoreP4 > 0));
	
	if (is4PlayerMode) {
		// Modo 4 jugadores con i18n
		const blueText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.blue') : 'Azul';
		const redText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.red') : 'Rojo';
		const greenText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.green') : 'Verde';
		const purpleText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.purple') : 'Púrpura';
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
	
	// 🏆 Verificar fin de juego
	checkGameEnd();
}

export function changeScore2() {
	scoreP2++;
	window.scoreP2 = scoreP2; // Sincronizar con variable global
	console.log('🔥 Score P2 actualizado:', scoreP2);
	updateScoreDisplay();
	
	// 🏆 Verificar fin de juego
	checkGameEnd();
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

// 🏆 Nueva función para verificar fin de juego
function checkGameEnd() {
	if (scoreP1 >= maxScore || scoreP2 >= maxScore) {
		console.log('🎯 Fin de juego detectado');
		
		// Determinar ganador
		const winner = scoreP1 >= maxScore ? 'player1' : 'player2';
		const winnerName = scoreP1 >= maxScore ? 
			(tournamentMatchInfo ? tournamentMatchInfo.player1 : 'Jugador 1') : 
			(tournamentMatchInfo ? tournamentMatchInfo.player2 : 'Jugador 2');
		
		// Desactivar juego
		if (typeof setGameActive === 'function') {
			setGameActive(false);
		}
		
		// Si estamos en modo torneo, manejar diferente
		if (isTournamentMode) {
			console.log('🏆 Fin de juego en modo torneo');
			
			// Mostrar mensaje temporal
			showTournamentGameEndMessage(`¡${winnerName} gana el match!`);
			
			// Después de mostrar el mensaje, redirigir al torneo
			setTimeout(() => {
				returnToTournamentWithResult(winner, scoreP1, scoreP2);
			}, 3000);
		} else {
			// Lógica normal de fin de juego
			showNormalGameEnd(winner);
		}
	}
}

// 🏆 Función para mostrar mensaje temporal de fin de juego en torneo
function showTournamentGameEndMessage(message) {
	// Crear o obtener elemento de mensaje
	let messageElement = document.getElementById('tournamentGameEndMessage');
	if (!messageElement) {
		messageElement = document.createElement('div');
		messageElement.id = 'tournamentGameEndMessage';
		messageElement.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: rgba(0, 0, 0, 0.95);
			color: #00ff88;
			padding: 2rem;
			border-radius: 15px;
			font-size: 2.5rem;
			font-weight: bold;
			text-align: center;
			z-index: 1000;
			border: 3px solid #00ff88;
			box-shadow: 0 0 30px rgba(0, 255, 136, 0.6);
			animation: tournamentPulse 1s infinite alternate;
		`;
		
		// Añadir CSS de animación
		if (!document.getElementById('tournamentMessageStyles')) {
			const style = document.createElement('style');
			style.id = 'tournamentMessageStyles';
			style.textContent = `
				@keyframes tournamentPulse {
					0% { transform: translate(-50%, -50%) scale(1); }
					100% { transform: translate(-50%, -50%) scale(1.05); }
				}
			`;
			document.head.appendChild(style);
		}
		
		document.body.appendChild(messageElement);
	}
	
	messageElement.textContent = message;
	messageElement.style.display = 'block';
	
	console.log('🏆 Mostrando mensaje de fin de juego:', message);
}

// 🏆 Función para volver al torneo con resultado
function returnToTournamentWithResult(winner, score1, score2) {
	console.log('🏆 Regresando al torneo con resultado:', { winner, score1, score2 });
	
	// Crear string con el resultado
	const resultString = `winner:${winner},score1:${score1},score2:${score2}`;
	
	// Redirigir al torneo con el resultado
	window.location.href = `pong-tournament.html?result=${encodeURIComponent(resultString)}`;
}

// 🏆 Función para volver al torneo (sin resultado, para botón manual)
function returnToTournament() {
	window.location.href = 'pong-tournament.html';
}

// Mostrar game over normal (modo no-torneo)
function showNormalGameEnd(winner) {
	const gameOverElement = document.getElementById('gameOver');
	const finalScoreElement = document.getElementById('finalScore');
	
	if (gameOverElement) {
		gameOverElement.style.display = 'block';
	}
	
	if (finalScoreElement) {
		const winnerText = winner === 'player1' ? 'Jugador 1' : 'Jugador 2';
		finalScoreElement.textContent = `${winnerText} ganó: ${scoreP1} - ${scoreP2}`;
	}
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
		throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
	}
	return response;
}

// Función genérica para guardar puntuación con reintentos
async function saveScore(player1Score, player2Score, player3Score = null, player4Score = null, winner, gameDuration = 0) {
	const maxRetries = 3;
	let lastError;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`🔄 Intento ${attempt} de guardar puntuación...`);

			const gameData = {
				p1score: player1Score,
				p2score: player2Score,
				winner: winner,
				game_duration: gameDuration
			};

			// Añadir scores de 4 jugadores si están disponibles
			if (player3Score !== null && player4Score !== null) {
				gameData.p3score = player3Score;
				gameData.p4score = player4Score;
			}

			// CORREGIDO: Usar la URL correcta del backend
			const response = await fetch('http://localhost:3000/pong/scores', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(gameData)
			});

			handleFetchError(response);
			const result = await response.json();
			console.log('✅ Puntuación guardada exitosamente:', result);
			return result;

		} catch (error) {
			lastError = error;
			console.error(`❌ Error en intento ${attempt}:`, error);

			if (attempt === maxRetries) {
				throw lastError;
			}

			// Esperar antes del siguiente intento (backoff exponencial)
			const delay = Math.pow(2, attempt) * 1000;
			console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
}

// Configurar event listeners
function setupEventListeners() {
    // Save score button (solo para modo normal)
    const saveButton = document.getElementById('saveScoreButton');
    if (saveButton && !isTournamentMode) {
        saveButton.addEventListener('click', async function () {
            this.disabled = true;
            this.textContent = window.t ? window.t('game.saving') : "Guardando...";

            try {
                // Determinar ganador
                let winner = false; // Por defecto false (perdió)
                let gameDuration = 0; // Duración del juego por defecto

                // Lógica para determinar ganador
                if (scoreP1 > scoreP2) {
                    winner = true; // El jugador 1 (usuario) ganó
                }

                await saveScore(scoreP1, scoreP2, scoreP3, scoreP4, winner, gameDuration);
                this.textContent = window.t ? window.t('game.saved') : "¡Guardado!";
                // Opcional: redirigir al dashboard después de un breve retraso
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } catch (error) {
                console.error('Error al guardar:', error);
                alert('Error al guardar la puntuación: ' + error.message);
                this.textContent = "Error al guardar";
            } finally {
                // Re-habilitar el botón después de un tiempo
                setTimeout(() => {
                    this.disabled = false;
                    this.textContent = window.t ? window.t('game.save_score') : "Guardar puntuación";
                }, 2000);
            }
        });
    }

    // Back to dashboard button - FIXED: usando el ID correcto
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', function() {
            console.log('🔙 Botón volver al dashboard clickeado');
            window.location.href = '/dashboard';
        });
    }

    // Return to dashboard button (desde game over screen)
    const returnToDashboardButton = document.getElementById('returnToDashboardButton');
    if (returnToDashboardButton) {
        returnToDashboardButton.addEventListener('click', function() {
            console.log('🔙 Botón return to dashboard clickeado');
            window.location.href = '/dashboard';
        });
    }

    // Play again button
    const playAgainButton = document.getElementById('playAgainButton');
    if (playAgainButton) {
        playAgainButton.addEventListener('click', function() {
            console.log('🔄 Reiniciando juego');
            window.location.reload();
        });
    }

    // Save to dashboard button (desde game over screen)
    const saveToDashboardButton = document.getElementById('saveToDashboardButton');
    if (saveToDashboardButton && !isTournamentMode) {
        saveToDashboardButton.addEventListener('click', async function () {
            this.disabled = true;
            this.textContent = window.t ? window.t('game.saving') : "Guardando...";

            try {
                // Determinar ganador
                let winner = false;
                let gameDuration = 0;

                if (scoreP1 > scoreP2) {
                    winner = true;
                }

                await saveScore(scoreP1, scoreP2, scoreP3, scoreP4, winner, gameDuration);
                this.textContent = window.t ? window.t('game.saved') : "¡Guardado!";
                
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } catch (error) {
                console.error('Error al guardar:', error);
                alert('Error al guardar la puntuación: ' + error.message);
                this.textContent = "Error al guardar";
            }
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

    // Change camera button
    const changeCameraButton = document.getElementById('changeCameraButton');
    if (changeCameraButton) {
        changeCameraButton.addEventListener('click', function() {
            if (window.changeCamera) {
                window.changeCamera();
            }
        });
    }
}

window.addEventListener("DOMContentLoaded", () => {
	console.log('🚀 DOM Content Loaded - inicializando juego');
	
	// 🏆 Verificar modo torneo
	checkTournamentMode();
	
	// Asegurar que el marcador se muestre inmediatamente
	setTimeout(updateScoreDisplay, 100);
	setTimeout(updateScoreDisplay, 500);
	setTimeout(updateScoreDisplay, 1000);

	scene = Playground.CreateScene(engine, canvas);

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