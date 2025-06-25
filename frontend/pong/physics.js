// Dynamic imports based on game mode - detect which file is loaded
let scoreModule;
let changeScore1, changeScore2, changeScore3, changeScore4;
let maxScore, scoreP1, scoreP2, scoreP3, scoreP4;

// Check game mode by URL and DOM
const isIAMode = window.location.pathname.includes('pong-ia') || 
                 document.querySelector('script[src*="pong-ia.js"]') !== null;

const is4PMode = window.location.pathname.includes('pong-4p') || 
                 window.location.pathname.includes('4p') ||
                 document.querySelector('script[src*="4p-main.js"]') !== null;

// Simplified score update functions that work directly with global variables
function updateScore1() {
    console.log("🎯 Updating score 1 - before:", window.scoreP1);
    window.scoreP1 = (window.scoreP1 || 0) + 1;
    console.log("🎯 Updating score 1 - after:", window.scoreP1);
    if (window.updateScoreDisplay) {
        window.updateScoreDisplay();
    }
}

function updateScore2() {
    console.log("🎯 Updating score 2 - before:", window.scoreP2);
    window.scoreP2 = (window.scoreP2 || 0) + 1;
    console.log("🎯 Updating score 2 - after:", window.scoreP2);
    if (window.updateScoreDisplay) {
        window.updateScoreDisplay();
    }
}

function updateScore3() {
    console.log("🎯 Updating score 3 - before:", window.scoreP3);
    window.scoreP3 = (window.scoreP3 || 0) + 1;
    console.log("🎯 Updating score 3 - after:", window.scoreP3);
    if (window.updateScoreDisplay) {
        window.updateScoreDisplay();
    }
}

function updateScore4() {
    console.log("🎯 Updating score 4 - before:", window.scoreP4);
    window.scoreP4 = (window.scoreP4 || 0) + 1;
    console.log("🎯 Updating score 4 - after:", window.scoreP4);
    if (window.updateScoreDisplay) {
        window.updateScoreDisplay();
    }
}

// Function to initialize score functions
async function initializeScoreFunctions() {
    try {
        if (isIAMode) {
            console.log("🤖 Physics: Detectado modo IA - importando desde pong-ia.js");
            scoreModule = await import('./pong-ia.js');
        } else if (is4PMode) {
            console.log("🟦 Physics: Detectado modo 4P - importando desde 4p-main.js");
            scoreModule = await import('./4p-main.js');
        } else {
            console.log("🏓 Physics: Detectado modo normal - importando desde main.js");
            scoreModule = await import('./main.js');
        }
        
        // Extract functions and variables from the module
        ({ maxScore, scoreP1, scoreP2, scoreP3, scoreP4, changeScore1, changeScore2, changeScore3, changeScore4 } = scoreModule);
        
        console.log("✅ Physics: Funciones de puntuación importadas correctamente");
        console.log("📊 Physics: Scores iniciales:", { scoreP1, scoreP2, scoreP3, scoreP4, maxScore });
        return true;
    } catch (error) {
        console.error("❌ Physics: Error importando funciones:", error);
        console.log("🔄 Physics: Usando funciones de fallback");
        
        // Use fallback functions that work directly with global variables
        changeScore1 = updateScore1;
        changeScore2 = updateScore2;
        changeScore3 = updateScore3;
        changeScore4 = updateScore4;
        
        // Use global variables as fallback
        maxScore = window.maxScore || 5;
        scoreP1 = window.scoreP1 || 0;
        scoreP2 = window.scoreP2 || 0;
        scoreP3 = window.scoreP3 || 0;
        scoreP4 = window.scoreP4 || 0;
        
        console.log("📊 Physics: Usando scores globales:", { scoreP1, scoreP2, scoreP3, scoreP4, maxScore });
        return false;
    }
}

// Initialize immediately
const scoreInitPromise = initializeScoreFunctions();

import { setGameActive, gameActive } from "./scene.js";
import { puntoTexto, anunciarPunto, mensajeInicio } from "./menus.js";

async function gameOver(message, bola, pala2, pala1, tableTop, scene) {
	// Prevent multiple simultaneous goal triggers
	if (!gameActive) {
		console.log("⚠️ Goal ignored - game already inactive");
		return true;
	}

	console.log("🥅 Processing goal:", message, "- gameActive:", gameActive);

	// Set game inactive IMMEDIATELY to prevent multiple triggers
	setGameActive(false);

	// IMPORTANT: Clear all pressed keys to prevent paddles from moving during inactive state
	const keysPressed = scene.metadata?.physics?.keysPressed;
	if (keysPressed) {
		keysPressed["a"] = false;
		keysPressed["d"] = false;
		keysPressed["ArrowLeft"] = false;
		keysPressed["ArrowRight"] = false;
		console.log("All keys cleared on goal");
	}

	// Wait for score functions to be initialized if needed
	await scoreInitPromise;

	// Actualizar puntuaciones - USAR SOLO CLAVES DE IDENTIFICACIÓN (no texto traducido)
	if (message.includes("PLAYER1_GOAL")) {
		console.log("🎯 Goal for player 1 detected");
		if (changeScore1) {
			console.log("🎯 Calling changeScore1 function");
			changeScore1();
		} else {
			console.log("🎯 changeScore1 not available, using direct update");
			updateScore1();
		}
		anunciarPunto(puntoTexto, window.t ? window.t('game.point_for_player_1') : "¡Punto para el jugador 1!", scene);
	} else if (message.includes("PLAYER2_GOAL")) {
		console.log("🎯 Goal for player 2 detected");
		if (changeScore2) {
			console.log("🎯 Calling changeScore2 function");
			changeScore2();
		} else {
			console.log("🎯 changeScore2 not available, using direct update");
			updateScore2();
		}
		anunciarPunto(puntoTexto, window.t ? window.t('game.point_for_player_2') : "¡Punto para el jugador 2!", scene);
	}

	// Stop ball movement immediately
	bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
	bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

	// Get current scores - SIMPLIFICADO para usar siempre las variables globales
	const getCurrentScores = () => {
		const currentScoreP1 = window.scoreP1 || 0;
		const currentScoreP2 = window.scoreP2 || 0;
		const currentMaxScore = window.maxScore || 5;
		
		console.log("📊 Current scores (from global vars):", { currentScoreP1, currentScoreP2, currentMaxScore });
		return { currentScoreP1, currentScoreP2, currentMaxScore };
	};

	// Wait a bit for score to update, then check game over
	setTimeout(() => {
		const { currentScoreP1, currentScoreP2, currentMaxScore } = getCurrentScores();

		// Mostrar Game Over final si llega al límite
		if (currentScoreP1 >= currentMaxScore || currentScoreP2 >= currentMaxScore) {
			console.log("🏁 Game Over detected:", { currentScoreP1, currentScoreP2, currentMaxScore });
			const gameOverElement = document.getElementById('gameOver');
			const finalScoreElement = document.getElementById('finalScore');
			if (gameOverElement) {
				gameOverElement.style.display = 'block';
			}
			if (finalScoreElement) {
				finalScoreElement.textContent = `${currentScoreP1} - ${currentScoreP2}`;
			}
			return false;
		}

		// Reiniciar tras 1.5 segundos (más tiempo para evitar triggers accidentales)
		setTimeout(() => {
			// Ensure ball and paddles are visible and properly positioned
			const y = tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y;

			// Reset ball position and physics completely
			bola.position.set(0, y, 0);
			bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
			bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

			// Reset paddle positions
			pala2.position.set(0.95, y, 0);
			pala1.position.set(-0.95, y, 0);

			// Ensure ball is visible
			bola.setEnabled(true);
			bola.visibility = 1.0;

			// Clear any stuck keys again
			if (keysPressed) {
				Object.keys(keysPressed).forEach(key => {
					keysPressed[key] = false;
				});
			}

			// Show start message for next round
			if (mensajeInicio) {
				mensajeInicio.alpha = 1;
			}

			// IMPORTANT: Do NOT set game active here - wait for spacebar
			// This prevents automatic goal triggers during reset
			console.log("Round reset complete - waiting for spacebar");
		}, 1000);
	}, 100); // Small delay to allow score update to complete

	return true;
}

function gameOver4P(message, bola, pala2, pala1, pala3, pala4, tableTop, scene) {
	// Prevent multiple simultaneous goal triggers
	if (!gameActive) {
		console.log("⚠️ Goal ignored - game already inactive");
		return true;
	}

	console.log("🥅 Processing goal 4P:", message, "- gameActive:", gameActive);

	// Set game inactive IMMEDIATELY to prevent multiple triggers
	setGameActive(false);

	// IMPORTANT: Clear all pressed keys to prevent paddles from moving during inactive state
	const keysPressed = scene.metadata?.physics?.keysPressed;
	if (keysPressed) {
		// Clear all 4P controls
		keysPressed["q"] = false;
		keysPressed["e"] = false;
		keysPressed["ArrowLeft"] = false;
		keysPressed["ArrowRight"] = false;
		keysPressed["i"] = false;
		keysPressed["p"] = false;
		keysPressed["c"] = false;
		keysPressed["b"] = false;
		console.log("All 4P keys cleared on goal");
	}

	// Actualizar puntuaciones usando identificadores únicos
	if (message.includes("PLAYER_1_ELIMINATED")) {
		changeScore1();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_1') : "¡Gol al Jugador 1!", scene);
	} else if (message.includes("PLAYER_2_ELIMINATED")) {
		changeScore2();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_2') : "¡Gol al Jugador 2!", scene);
	} else if (message.includes("PLAYER_3_ELIMINATED")) {
		changeScore3();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_3') : "¡Gol al Jugador 3!", scene);
	} else if (message.includes("PLAYER_4_ELIMINATED")) {
		changeScore4();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_4') : "¡Gol al Jugador 4!", scene);
	}

	// Stop ball movement immediately
	bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
	bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

	// Wait for score to update, then check game over using GLOBAL variables
	setTimeout(() => {
		// Get current scores from global variables (updated values)
		const currentScoreP1 = window.scoreP1 || 0;
		const currentScoreP2 = window.scoreP2 || 0;
		const currentScoreP3 = window.scoreP3 || 0;
		const currentScoreP4 = window.scoreP4 || 0;
		const currentMaxScore = window.maxScore || 5;

		console.log("🏁 4P Checking game over with updated scores:", { 
			currentScoreP1, currentScoreP2, currentScoreP3, currentScoreP4, currentMaxScore 
		});

		// Mostrar Game Over final si llega al límite
		if (currentScoreP1 >= currentMaxScore || currentScoreP2 >= currentMaxScore || 
			currentScoreP3 >= currentMaxScore || currentScoreP4 >= currentMaxScore) {
			
			console.log("🏆 GAME OVER 4P detected! Final scores:", { 
				currentScoreP1, currentScoreP2, currentScoreP3, currentScoreP4 
			});
			
			const gameOverElement = document.getElementById('gameOver');
			const finalScoreElement = document.getElementById('finalScore');
			if (gameOverElement) {
				gameOverElement.style.display = 'block';
			}
			if (finalScoreElement) {
				const blueText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.blue') : 'Azul';
				const redText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.red') : 'Rojo';
				const greenText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.green') : 'Verde';
				const purpleText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.purple') : 'Púrpura';

				// Find winner (lowest score in elimination mode)
				let winner = Math.min(currentScoreP1, currentScoreP2, currentScoreP3, currentScoreP4);
				console.log("🏆 Winner determined by lowest score:", winner);
				
				switch (winner) {
					case currentScoreP1:
						finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_1_won_blue') : '¡Ganó el Jugador 1, Azul!'} ${blueText}:${currentScoreP1} - ${redText}:${currentScoreP2} - ${greenText}:${currentScoreP3} - ${purpleText}:${currentScoreP4}`;
						break;
					case currentScoreP2:
						finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_2_won_red') : '¡Ganó el Jugador 2, Rojo!'} ${blueText}:${currentScoreP1} - ${redText}:${currentScoreP2} - ${greenText}:${currentScoreP3} - ${purpleText}:${currentScoreP4}`;
						break;
					case currentScoreP3:
						finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_3_won_green') : '¡Ganó el Jugador 3, Verde!'} ${blueText}:${currentScoreP1} - ${redText}:${currentScoreP2} - ${greenText}:${currentScoreP3} - ${purpleText}:${currentScoreP4}`;
						break;
					case currentScoreP4:
						finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_4_won_purple') : '¡Ganó el Jugador 4, Púrpura!'} ${blueText}:${currentScoreP1} - ${redText}:${currentScoreP2} - ${greenText}:${currentScoreP3} - ${purpleText}:${currentScoreP4}`;
						break;
					default:
						finalScoreElement.textContent = `${window.t ? window.t('game.tie_game') : '¡Empate!'} ${blueText}:${currentScoreP1} - ${redText}:${currentScoreP2} - ${greenText}:${currentScoreP3} - ${purpleText}:${currentScoreP4}`;
						break;
				}
			}
			return false; // Game is over, don't continue
		}

		// If game is not over, continue with round reset
		console.log("📊 4P Round continues - scores not at limit yet");
		
		// Reiniciar tras 1.5 segundos (más tiempo para evitar triggers accidentales)
		setTimeout(() => {
			// Ensure ball and paddles are visible and properly positioned
			const y = tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y;

			// Reset ball position and physics completely
			bola.position.set(0, y, 0);
			bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
			bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

			// Reset paddle positions for 4P mode
			pala2.position.set(0, y, 1.15);        // Top paddle
			pala1.position.set(1.15, y, 0);        // Right paddle
			pala3.position.set(0, y, -1.15);       // Bottom paddle
			pala4.position.set(-1.15, y, 0);       // Left paddle

			// Update physics positions
			pala2.physicsImpostor.setDeltaPosition(pala2.position);
			pala1.physicsImpostor.setDeltaPosition(pala1.position);
			pala3.physicsImpostor.setDeltaPosition(pala3.position);
			pala4.physicsImpostor.setDeltaPosition(pala4.position);

			// Ensure ball is visible
			bola.setEnabled(true);
			bola.visibility = 1.0;

			// Clear any stuck keys again
			if (keysPressed) {
				Object.keys(keysPressed).forEach(key => {
					keysPressed[key] = false;
				});
			}

			// Show start message for next round
			if (mensajeInicio) {
				mensajeInicio.alpha = 1;
			}

			// IMPORTANT: Do NOT set game active here - wait for spacebar
			// This prevents automatic goal triggers during reset
			console.log("4P Round reset complete - waiting for spacebar");
		}, 1500);
	}, 100); // Small delay to allow score update to complete
	
	return true;
}


// AI Difficulty System - Define difficulty levels
const aiDifficultyLevels = {
	easy: {
		name: 'Fácil',
		updateInterval: 1500, // 1.5 segundos - más lento
		difficulty: 0.6, // 60% precisión
		reactionSpeed: 0.4, // 40% velocidad de reacción
		maxMovementDuration: 1200, // Máximo 1.2 segundos de movimiento
		errorMultiplier: 0.5, // Más error en predicciones
		description: 'IA lenta y menos precisa'
	},
	medium: {
		name: 'Medio',
		updateInterval: 1000, // 1 segundo - estándar
		difficulty: 0.75, // 75% precisión
		reactionSpeed: 0.6, // 60% velocidad de reacción
		maxMovementDuration: 900, // Máximo 0.9 segundos de movimiento
		errorMultiplier: 0.35, // Error moderado
		description: 'IA equilibrada'
	},
	hard: {
		name: 'Difícil',
		updateInterval: 300, // 0.3 segundos - más rápido
		difficulty: 0.9, // 90% precisión
		reactionSpeed: 0.85, // 85% velocidad de reacción
		maxMovementDuration: 600, // Máximo 0.6 segundos de movimiento
		errorMultiplier: 0.2, // Menos error
		description: 'IA rápida y precisa'
	}
};

// Current AI difficulty - default to medium
let currentAIDifficulty = 'medium';

// Function to get current difficulty settings
const getCurrentDifficultySettings = () => {
	return aiDifficultyLevels[currentAIDifficulty];
};

// Function to change AI difficulty
const changeAIDifficulty = () => {
	const difficulties = Object.keys(aiDifficultyLevels);
	const currentIndex = difficulties.indexOf(currentAIDifficulty);
	const nextIndex = (currentIndex + 1) % difficulties.length;
	currentAIDifficulty = difficulties[nextIndex];
	
	const newSettings = getCurrentDifficultySettings();
	console.log(`🎯 Dificultad IA cambiada a: ${newSettings.name} - ${newSettings.description}`);
	
	// Update AI config with new settings
	if (aiConfig) {
		aiConfig.updateInterval = newSettings.updateInterval;
		aiConfig.difficulty = newSettings.difficulty;
		aiConfig.reactionSpeed = newSettings.reactionSpeed;
		aiConfig.maxMovementDuration = newSettings.maxMovementDuration;
		aiConfig.errorMultiplier = newSettings.errorMultiplier;
		
		// Reset AI state to apply new settings
		aiConfig.isMoving = false;
		aiConfig.lastUpdateTime = 0;
		
		console.log(`🤖 Configuración IA actualizada:`, {
			interval: newSettings.updateInterval + 'ms',
			precision: (newSettings.difficulty * 100) + '%',
			speed: (newSettings.reactionSpeed * 100) + '%'
		});
	}
	
	// Update UI indicator if it exists
	updateAIDifficultyIndicator();
	
	return newSettings;
};

// Function to update AI difficulty indicator in UI
const updateAIDifficultyIndicator = () => {
	const aiIndicator = document.getElementById('aiIndicator');
	if (aiIndicator && isIAMode) {
		const settings = getCurrentDifficultySettings();
		const baseText = aiIndicator.textContent.split(' - ')[0]; // Keep the AI status part
		aiIndicator.textContent = `${baseText} - ${settings.name}`;
		
		// Change color based on difficulty
		switch(currentAIDifficulty) {
			case 'easy':
				aiIndicator.style.backgroundColor = '#4CAF50'; // Green
				break;
			case 'medium':
				aiIndicator.style.backgroundColor = '#FF9800'; // Orange
				break;
			case 'hard':
				aiIndicator.style.backgroundColor = '#F44336'; // Red
				break;
		}
	}
};

// AI configuration for player 2 (pala2) - SOLO HABILITADA EN MODO IA
const aiConfig = {
	enabled: isIAMode, // CORREGIDO: Solo habilitar en modo IA
	difficulty: getCurrentDifficultySettings().difficulty,
	reactionSpeed: getCurrentDifficultySettings().reactionSpeed,
	lastUpdateTime: 0,
	updateInterval: getCurrentDifficultySettings().updateInterval,
	maxMovementDuration: getCurrentDifficultySettings().maxMovementDuration,
	errorMultiplier: getCurrentDifficultySettings().errorMultiplier,
	targetZ: 0, // AI's target position
	isMoving: false, // Track if AI is currently moving
	movementDuration: 0, // How long AI should keep moving
	movementStartTime: 0 // When current movement started
};


export function createPhysics(scene, engine, camera, tableTop, materiales, glow) {
	console.log("🏗️ Creando física del juego");

	// Limpiar listeners anteriores para evitar duplicados
	window.removeEventListener("keydown", window.currentSpaceHandler);
	window.removeEventListener("keydown", window.currentKeydownHandler);
	window.removeEventListener("keyup", window.currentKeyupHandler);

	// Configurar physics engine
	scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());
	scene.getPhysicsEngine().setTimeStep(1 / 60);

	const tableHalfDepth = 0.5;
	const paddleSpeed = 0.014;
	const paddleZLimit = tableHalfDepth - 0.01;
	const bolaRadio = 0.05;
	const keysPressed = {};

	// AI configuration for player 2 (pala2) - SOLO HABILITADA EN MODO IA
	const aiConfig = {
		enabled: isIAMode, // CORREGIDO: Solo habilitar en modo IA
		difficulty: getCurrentDifficultySettings().difficulty,
		reactionSpeed: getCurrentDifficultySettings().reactionSpeed,
		lastUpdateTime: 0,
		updateInterval: getCurrentDifficultySettings().updateInterval,
		maxMovementDuration: getCurrentDifficultySettings().maxMovementDuration,
		errorMultiplier: getCurrentDifficultySettings().errorMultiplier,
		targetZ: 0, // AI's target position
		isMoving: false, // Track if AI is currently moving
		movementDuration: 0, // How long AI should keep moving
		movementStartTime: 0 // When current movement started
	};

	console.log(`🤖 AI Configuration - Mode: ${isIAMode ? 'IA' : 'Normal'}, AI Enabled: ${aiConfig.enabled}`);

	// Crear palas
	const pala2 = BABYLON.MeshBuilder.CreateBox("pala2", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala2.position.set(0.95, tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y, 0);
	pala2.material = materiales.pala2Mat;

	const pala1 = BABYLON.MeshBuilder.CreateBox("pala1", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala1.position.set(-0.95, pala2.position.y, 0);
	pala1.material = materiales.pala1Mat;

	// Crear bola
	const bola = BABYLON.MeshBuilder.CreateSphere("bola", { diameter: bolaRadio * 2 }, scene);
	bola.position = new BABYLON.Vector3(0, pala2.position.y, 0);
	bola.material = new BABYLON.PBRMaterial("bolaMat", scene);
	bola.material.albedoColor = new BABYLON.Color3(1, 1, 1); // Blanco
	bola.material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Muy poco brillo
	bola.material.metallic = 0.1;
	bola.material.roughness = 0.3;

	// Excluir palas y bola del glow layer para mejor visibilidad
	if (glow) {
		glow.addExcludedMesh(pala1);
		glow.addExcludedMesh(pala2);
		glow.addExcludedMesh(bola);
	}

	// IMPORTANTE: Crear los physics impostors DESPUÉS de posicionar los meshes
	pala2.physicsImpostor = new BABYLON.PhysicsImpostor(pala2, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0,
		restitution: 1.2,
		friction: 0
	}, scene);

	pala1.physicsImpostor = new BABYLON.PhysicsImpostor(pala1, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0,
		restitution: 1.2,
		friction: 0
	}, scene);

	bola.physicsImpostor = new BABYLON.PhysicsImpostor(bola, BABYLON.PhysicsImpostor.SphereImpostor, {
		mass: 1,
		restitution: 0.95,
		friction: 0
	}, scene);

	// Store AI config and keysPressed in scene metadata for UI access
	scene.metadata = scene.metadata || {};
	scene.metadata.physics = { aiConfig, keysPressed };

	// NO lanzar la bola inmediatamente - esperar a que se pulse espacio
	// La velocidad inicial se establecerá cuando el jugador presione la barra espaciadora

	// Variables para tracking de colisiones y goles
	let lastCollisionTime = 0;
	let lastGoalTime = 0;
	let gameStartTime = 0; // Track when game/round starts
	const collisionCooldown = 100; // ms
	const goalCooldown = 500; // ms - prevenir goles múltiples
	const gameStartDelay = 500; // ms - prevent goals immediately after start

	// Método alternativo: usar onCollide en lugar de registerOnPhysicsCollide
	let lastStatusLog = 0;
	scene.registerBeforeRender(() => {
		// Log de estado cada 5 segundos para debug
		const currentTime = Date.now();
		if (currentTime - lastStatusLog > 5000) {
			console.log(`🔄 Estado del juego - gameActive: ${gameActive}, bola velocidad: ${bola.physicsImpostor?.getLinearVelocity()?.length()?.toFixed(2) || 'N/A'}`);
			lastStatusLog = currentTime;
		}

		const deltaTime = engine.getDeltaTime() / 1000.0; // Convert from ms to seconds

		// MOVIMIENTO DE PALAS - SIEMPRE ACTIVO (independiente de gameActive)

		// Movimiento manual del jugador 1 (pala1) - SIEMPRE ACTIVO
		if (keysPressed["a"] && pala1.position.z > -paddleZLimit) {
			pala1.position.z -= paddleSpeed;
			pala1.physicsImpostor.setDeltaPosition(pala1.position);
		}
		if (keysPressed["d"] && pala1.position.z < paddleZLimit) {
			pala1.position.z += paddleSpeed;
			pala1.physicsImpostor.setDeltaPosition(pala1.position);
		}

		// Movimiento manual del jugador 2 (pala2) - SIEMPRE ACTIVO (si AI no está habilitada)
		if (!aiConfig.enabled) {
			if (keysPressed["ArrowLeft"] && pala2.position.z > -paddleZLimit) {
				pala2.position.z -= paddleSpeed;
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
			if (keysPressed["ArrowRight"] && pala2.position.z < paddleZLimit) {
				pala2.position.z += paddleSpeed;
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}

		// LÓGICA QUE SOLO SE EJECUTA CUANDO EL JUEGO ESTÁ ACTIVO
		if (!gameActive) return;

		// Detectar colisiones manualmente como backup
		const bolaPos = bola.position;
		const pala2Pos = pala2.position;
		const pala1Pos = pala1.position;

		// Debug: Log ball position if it's moving fast or in suspicious positions
		const currentBallVel = bola.physicsImpostor.getLinearVelocity();
		if (currentBallVel.length() > 0.1 && (bolaPos.x < -1.0 || bolaPos.x > 1.0)) {
			console.log("Ball at suspicious position:", bolaPos.x, "with velocity:", currentBallVel.x, "total speed:", currentBallVel.length());
		}

		// AI for player 2 (pala2) - calculates based on difficulty level, then moves briefly
		if (aiConfig.enabled && currentTime - aiConfig.lastUpdateTime > aiConfig.updateInterval) {
			const ballVelForPrediction = bola.physicsImpostor.getLinearVelocity();

			// Only react if ball is moving towards AI paddle and has some velocity
			if (ballVelForPrediction && ballVelForPrediction.length() > 0.1 && ballVelForPrediction.x > 0) {
				// Predict where ball will be when it reaches paddle's X position
				let predictedZ = bolaPos.z;
				const timeToReach = Math.abs((pala2Pos.x - bolaPos.x) / ballVelForPrediction.x);
				predictedZ = bolaPos.z + (ballVelForPrediction.z * timeToReach);

				// Add inaccuracy based on difficulty and error multiplier
				const baseError = (1 - aiConfig.difficulty) * (Math.random() - 0.5) * 0.4;
				const adjustedError = baseError * aiConfig.errorMultiplier;
				aiConfig.targetZ = predictedZ + adjustedError;

				// Limit target to playable area
				aiConfig.targetZ = Math.max(-paddleZLimit, Math.min(paddleZLimit, aiConfig.targetZ));

				// Calculate movement duration based on distance, reaction speed, and max duration
				const distance = Math.abs(aiConfig.targetZ - pala2Pos.z);
				const baseMovementTime = (distance / paddleSpeed) * (2 - aiConfig.reactionSpeed) * 16.67;
				
				// Apply difficulty-based max movement duration
				const maxDuration = aiConfig.maxMovementDuration || 800;

				// Start movement if target is significantly different from current position
				if (distance > paddleSpeed * 2) {
					aiConfig.isMoving = true;
					aiConfig.movementStartTime = currentTime;
					aiConfig.movementDuration = Math.min(baseMovementTime, maxDuration);
					
					const difficultyName = getCurrentDifficultySettings().name;
					console.log(`AI (${difficultyName}) deciding to move to ${aiConfig.targetZ.toFixed(2)}, duration: ${aiConfig.movementDuration}ms, error: ${adjustedError.toFixed(3)}`);
				} else {
					aiConfig.isMoving = false;
				}
			} else {
				// Ball not moving towards AI, stop any movement
				aiConfig.isMoving = false;
			}

			aiConfig.lastUpdateTime = currentTime;
		}

		// AI movement execution - only move during movement window
		if (aiConfig.enabled) {
			// Clear previous AI inputs first
			if (keysPressed["ArrowLeft"]) keysPressed["ArrowLeft"] = false;
			if (keysPressed["ArrowRight"]) keysPressed["ArrowRight"] = false;

			// Only move if we're in a movement phase
			if (aiConfig.isMoving && (currentTime - aiConfig.movementStartTime) < aiConfig.movementDuration) {
				const paddleDiff = aiConfig.targetZ - pala2Pos.z;
				const threshold = paddleSpeed * 0.5; // Smaller threshold for more precise movement

				// Simulate key press based on target position
				if (Math.abs(paddleDiff) > threshold) {
					if (paddleDiff > 0) {
						keysPressed["ArrowRight"] = true;
					} else {
						keysPressed["ArrowLeft"] = true;
					}
				} else {
					// Close enough to target, stop moving
					aiConfig.isMoving = false;
				}
			} else if (aiConfig.isMoving) {
				// Movement time expired
				aiConfig.isMoving = false;
				console.log("AI movement time expired");
			}
		}

		// Función para calcular rebote mejorado basado en punto de impacto
		function calculateImprovedBounce(ballPos, paddlePos, currentVelZ, paddleSize = 0.3) {
			// Calcular posición relativa (-1 a 1)
			const relativeHitPos = (ballPos.z - paddlePos.z) / (paddleSize / 2);
			const clampedPos = Math.max(-1, Math.min(1, relativeHitPos));

			// Curva no lineal para acentuar efectos en los bordes
			const curvedFactor = Math.pow(Math.abs(clampedPos), 1.5) * Math.sign(clampedPos);

			// Factor de intensidad por zona
			let angleMultiplier;
			if (Math.abs(clampedPos) < 0.2) {
				angleMultiplier = 0.2; // Centro - rebote casi neutro
			} else if (Math.abs(clampedPos) < 0.7) {
				angleMultiplier = 0.8; // Zona media
			} else {
				angleMultiplier = 1.4; // Bordes - máximo ángulo
			}

			// Combinar velocidad actual con nuevo efecto
			const baseEffect = curvedFactor * angleMultiplier;
			const dampedCurrentVel = currentVelZ * 0.3; // Conservar algo de la velocidad anterior

			return dampedCurrentVel + baseEffect;
		}

		// Colisión con pala2 (derecha) - PREVENTIVA para evitar escapes
		const aiUpdateBallVel = bola.physicsImpostor.getLinearVelocity();
		const pala2RightEdge = pala2Pos.x + 0.05; // Right edge of paddle
		const willEscapePala2 = bolaPos.x + (aiUpdateBallVel.x * deltaTime) > pala2RightEdge; // Predictive check
		const nearPala2 = Math.abs(bolaPos.x - pala2Pos.x) < 0.08; // Larger detection area
		const inPaddle2Range = Math.abs(bolaPos.z - pala2Pos.z) < 0.15; // Wider Z range
		const movingTowardsPala2 = aiUpdateBallVel.x > 0;
		const closeEnoughToPala2 = bolaPos.x > (pala2Pos.x - 0.1); // NUEVA CONDICIÓN: Solo si está cerca

		if ((nearPala2 || willEscapePala2) &&
			inPaddle2Range &&
			Math.abs(bolaPos.y - pala2Pos.y) < 0.1 &&
			movingTowardsPala2 &&
			closeEnoughToPala2 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión PREVENTIVA con pala2! Ball pos:", bolaPos.x.toFixed(3), "Paddle pos:", pala2Pos.x.toFixed(3), "Will escape:", willEscapePala2);
			const vel = bola.physicsImpostor.getLinearVelocity();

			// Force ball position to safe side of paddle
			if (bolaPos.x > pala2Pos.x) {
				bola.position.x = pala2Pos.x - 0.06; // Force ball to left side of paddle
				console.log("Ball forced to safe position:", bola.position.x);
			}

			// Accelerate slightly but cap the acceleration
			const currentSpeed = Math.abs(vel.x);
			const baseSpeed = 1.2; // Velocidad base
			const maxSpeed = 2.5; // Velocidad máxima horizontal
			const acceleration = 0.1; // Aceleración fija en lugar de multiplicador

			const newSpeed = Math.min(Math.max(currentSpeed + acceleration, baseSpeed), maxSpeed);
			const newVelX = -newSpeed; // Siempre hacia la izquierda
			const newVelZ = calculateImprovedBounce(bolaPos, pala2Pos, vel.z); // Spin reducido

			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));

			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Colisión con pala1 (izquierda) - PREVENTIVA para evitar escapes
		const pala1BallVel = bola.physicsImpostor.getLinearVelocity();
		const pala1LeftEdge = pala1Pos.x - 0.05; // Left edge of paddle
		const willEscapePala1 = bolaPos.x + (pala1BallVel.x * deltaTime) < pala1LeftEdge; // Predictive check
		const nearPala1 = Math.abs(bolaPos.x - pala1Pos.x) < 0.08; // Larger detection area
		const inPaddleRange = Math.abs(bolaPos.z - pala1Pos.z) < 0.15; // Wider Z range
		const movingTowardsPala1 = pala1BallVel.x < 0;
		const closeEnoughToPala1 = bolaPos.x > (pala1Pos.x - 0.1); // NUEVA CONDICIÓN: Solo si está cerca

		if ((nearPala1 || willEscapePala1) &&
			inPaddleRange &&
			Math.abs(bolaPos.y - pala1Pos.y) < 0.1 &&
			movingTowardsPala1 &&
			closeEnoughToPala1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión PREVENTIVA con pala1! Ball pos:", bolaPos.x.toFixed(3), "Paddle pos:", pala1Pos.x.toFixed(3), "Will escape:", willEscapePala1);
			const vel = bola.physicsImpostor.getLinearVelocity();

			// Force ball position to safe side of paddle
			if (bolaPos.x < pala1Pos.x) {
				bola.position.x = pala1Pos.x + 0.06; // Force ball to right side of paddle
				console.log("Ball forced to safe position:", bola.position.x);
			}

			// Accelerate slightly but cap the acceleration
			const currentSpeed = Math.abs(vel.x);
			const baseSpeed = 1.2; // Velocidad base
			const maxSpeed = 2.5; // Velocidad máxima horizontal
			const acceleration = 0.1; // Aceleración fija en lugar de multiplicador

			const newSpeed = Math.min(Math.max(currentSpeed + acceleration, baseSpeed), maxSpeed);
			const newVelX = newSpeed; // Siempre hacia la derecha
			const newVelZ = calculateImprovedBounce(bolaPos, pala1Pos, vel.z); // Spin reducido

			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));

			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Movimiento de palas - solo cuando el juego está activo
		if (gameActive) {
			if (keysPressed["a"]) {
				const newZ = Math.max(pala1.position.z - paddleSpeed, -paddleZLimit);
				pala1.position.z = newZ;
			}
			if (keysPressed["d"]) {
				const newZ = Math.min(pala1.position.z + paddleSpeed, paddleZLimit);
				pala1.position.z = newZ;
			}
			if (keysPressed["ArrowLeft"]) {
				const newZ = Math.max(pala2.position.z - paddleSpeed, -paddleZLimit);
				pala2.position.z = newZ;
			}
			if (keysPressed["ArrowRight"]) {
				const newZ = Math.min(pala2.position.z + paddleSpeed, paddleZLimit);
				pala2.position.z = newZ;
			}
		}

		// Rebote con bordes laterales - MEJORADO para prevenir escapes
		const ballVelForBounds = bola.physicsImpostor.getLinearVelocity();
		const safeZLimit = tableHalfDepth - bolaRadio - 0.02; // Safe boundary

		// Predictive collision detection - check if ball will escape in next frame
		const nextZ = bolaPos.z + (ballVelForBounds.z * deltaTime);
		const willEscape = Math.abs(nextZ) > safeZLimit;
		const alreadyEscaped = Math.abs(bolaPos.z) > safeZLimit;

		if (willEscape || alreadyEscaped) {
			console.log("Side collision detected - Current Z:", bolaPos.z.toFixed(3), "Next Z:", nextZ.toFixed(3), "Vel Z:", ballVelForBounds.z.toFixed(3));

			// CORRECTED: Simply invert the Z velocity with proper bounce physics
			const newVelZ = -ballVelForBounds.z * 0.9; // Invert and slightly dampen for realism
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(ballVelForBounds.x, 0, newVelZ));

			// Force position back to safe area
			if (bolaPos.z > safeZLimit) {
				bola.position.z = safeZLimit;
				console.log("Ball escaped positive Z, forcing back to:", safeZLimit);
			} else if (bolaPos.z < -safeZLimit) {
				bola.position.z = -safeZLimit;
				console.log("Ball escaped negative Z, forcing back to:", -safeZLimit);
			}
		}

		// Emergency fallback - force ball back if it somehow gets too far
		if (Math.abs(bolaPos.z) > tableHalfDepth) {
			console.log("EMERGENCY: Ball escaped table bounds at Z:", bolaPos.z);
			const emergencyBallVel = bola.physicsImpostor.getLinearVelocity();
			bola.position.z = Math.sign(bolaPos.z) * safeZLimit;
			// CORRECTED: Properly invert Z velocity
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(emergencyBallVel.x, 0, -emergencyBallVel.z * 0.8));
		}

		// Control de velocidad y posición de la bola
		const currentVel = bola.physicsImpostor.getLinearVelocity();
		const maxSpeed = 3.0; // Velocidad máxima total reducida
		const maxHorizontalSpeed = 2.5; // Velocidad máxima horizontal
		const maxVerticalSpeed = 1.5; // Velocidad máxima vertical (Z)
		const minHorizontalSpeed = 0.8; // Velocidad mínima para evitar bola muy lenta
		const targetY = pala2.position.y;

		// IMPORTANTE: Mantener bola en la mesa (Y fijo)
		if (Math.abs(currentVel.y) > 0.01) {
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(currentVel.x, 0, currentVel.z));
		}

		// Corregir posición Y solo si está muy desviada
		if (Math.abs(bolaPos.y - targetY) > 0.1) {
			bola.position.y = targetY;
		}

		// Limitar velocidades por componente para mejor control
		let newVelX = currentVel.x;
		let newVelZ = currentVel.z;
		let velocityChanged = false;

		// Limitar velocidad horizontal
		if (Math.abs(newVelX) > maxHorizontalSpeed) {
			newVelX = Math.sign(newVelX) * maxHorizontalSpeed;
			velocityChanged = true;
		}

		// Asegurar velocidad mínima horizontal para evitar bola muy lenta
		if (Math.abs(newVelX) < minHorizontalSpeed && Math.abs(newVelX) > 0.05) {
			newVelX = Math.sign(newVelX) * minHorizontalSpeed;
			velocityChanged = true;
			console.log("Ball speed too low, enforcing minimum:", newVelX);
		}

		// Limitar velocidad vertical (Z)
		if (Math.abs(newVelZ) > maxVerticalSpeed) {
			newVelZ = Math.sign(newVelZ) * maxVerticalSpeed;
			velocityChanged = true;
		}

		// Limitar velocidad total como backup
		const totalSpeed = Math.sqrt(newVelX * newVelX + newVelZ * newVelZ);
		if (totalSpeed > maxSpeed) {
			const factor = maxSpeed / totalSpeed;
			newVelX *= factor;
			newVelZ *= factor;
			velocityChanged = true;
		}

		// Aplicar cambios de velocidad si es necesario
		if (velocityChanged) {
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
		}

		// Game over - only check for goals when game is active and with proper cooldown
		if (gameActive &&
			currentTime - lastGoalTime > goalCooldown &&
			currentTime - gameStartTime > gameStartDelay) {
			const ballVelForGoals = bola.physicsImpostor.getLinearVelocity();

			// Goal for player 1 (ball goes past right edge - pala2 missed)
			if (bolaPos.x > 1.1 && Math.abs(ballVelForGoals.x) > 0.1) {
				console.log("Goal detected for player 1 at position:", bolaPos.x);
				lastGoalTime = currentTime;
				if (!gameOver("PLAYER1_GOAL", bola, pala2, pala1, tableTop, scene))
					return;
			}
			// Goal for player 2 (ball goes past left edge - pala1 missed)
			else if (bolaPos.x < -1.1 && Math.abs(ballVelForGoals.x) > 0.1) {
				console.log("Goal detected for player 2 at position:", bolaPos.x);
				lastGoalTime = currentTime;
				if (!gameOver("PLAYER2_GOAL", bola, pala2, pala1, tableTop, scene))
					return;
			}
		}

		// Glow feedback
		if (glow.intensity > 0.3) {
			glow.intensity -= 0.02;
		}
	});

	// Function to clear all pressed keys
	const clearAllKeys = () => {
		keysPressed["a"] = false;
		keysPressed["d"] = false;
		keysPressed["ArrowLeft"] = false;
		keysPressed["ArrowRight"] = false;
		console.log("All keys cleared");
	};

	// Event listeners para teclado - usando referencias globales para poder limpiarlas
	window.currentKeydownHandler = (e) => {
		// Toggle AI with 'T' key - SOLO EN MODO IA
		if ((e.key === "t" || e.key === "T") && isIAMode) {
			aiConfig.enabled = !aiConfig.enabled;
			console.log("🤖 AI", aiConfig.enabled ? "activada" : "desactivada");
			// Clear AI inputs when disabled
			if (!aiConfig.enabled) {
				keysPressed["ArrowLeft"] = false;
				keysPressed["ArrowRight"] = false;
			}
			// Update AI indicator
			updateAIDifficultyIndicator();
			e.preventDefault();
			return;
		}

		// Change AI Difficulty with number keys 1, 2, 3 - SOLO EN MODO IA
		if (isIAMode && ["1", "2", "3"].includes(e.key)) {
			let newDifficulty;
			switch(e.key) {
				case "1":
					newDifficulty = 'easy';
					break;
				case "2":
					newDifficulty = 'medium';
					break;
				case "3":
					newDifficulty = 'hard';
					break;
			}
			
			if (newDifficulty !== currentAIDifficulty) {
				currentAIDifficulty = newDifficulty;
				const newSettings = getCurrentDifficultySettings();
				
				// Update AI config with new settings
				if (aiConfig) {
					aiConfig.updateInterval = newSettings.updateInterval;
					aiConfig.difficulty = newSettings.difficulty;
					aiConfig.reactionSpeed = newSettings.reactionSpeed;
					aiConfig.maxMovementDuration = newSettings.maxMovementDuration;
					aiConfig.errorMultiplier = newSettings.errorMultiplier;
					
					// Reset AI state to apply new settings
					aiConfig.isMoving = false;
					aiConfig.lastUpdateTime = 0;
				}
				
				console.log(`🎯 Dificultad IA cambiada a: ${newSettings.name} con tecla ${e.key}`);
				updateAIDifficultyIndicator();
			}
			e.preventDefault();
			return;
		}

		// Space to start game
		if (e.code === "Space") {
			console.log(`🚀 ESPACIO presionado - gameActive: ${gameActive}, velocidad bola: ${bola.physicsImpostor.getLinearVelocity().length()}`);
			if (!gameActive || bola.physicsImpostor.getLinearVelocity().length() < 0.1) {
				console.log("🎯 Iniciando juego...");
				// Clear all keys before starting game to prevent stuck movement
				clearAllKeys();

				setGameActive(true);
				// Ocultar mensaje
				if (mensajeInicio) mensajeInicio.alpha = 0;

				// Ensure ball is at correct position before launching
				const y = tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y;
				bola.position.set(0, y, 0);

				// Reset AI state when starting new round
				aiConfig.isMoving = false;
				aiConfig.lastUpdateTime = 0;

				// Set game start time to prevent immediate goals
				gameStartTime = Date.now();

				// Launch ball with random direction
				const randomDirection = Math.random() > 0.5 ? 1 : -1;
				const startVelocity = new BABYLON.Vector3(1.0 * randomDirection, 0, 0); // Velocidad inicial reducida
				bola.physicsImpostor.setLinearVelocity(startVelocity);

				console.log("Ball launched with velocity:", startVelocity, "at time:", gameStartTime);
			}
			e.preventDefault();
			return;
		}

		// Only allow manual player controls during active game
		if (gameActive) {
			if (["a", "d"].includes(e.key)) {
				keysPressed[e.key] = true;
				e.preventDefault();
			} else if (["ArrowLeft", "ArrowRight"].includes(e.key) && !aiConfig.enabled) {
				keysPressed[e.key] = true;
				e.preventDefault();
			}
		}
	};

	window.addEventListener("keydown", window.currentKeydownHandler);

	// IMPORTANT: KeyUp listener should work regardless of game state
	// This prevents keys from getting stuck when game becomes inactive
	window.currentKeyupHandler = (e) => {
		if (["a", "d"].includes(e.key)) {
			keysPressed[e.key] = false;
		} else if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
			keysPressed[e.key] = false;
		}
	};

	window.addEventListener("keyup", window.currentKeyupHandler);

	// Expose difficulty functions globally for UI access
	window.getCurrentDifficultySettings = getCurrentDifficultySettings;
	window.changeAIDifficulty = changeAIDifficulty;
	window.updateAIDifficultyIndicator = updateAIDifficultyIndicator;
	window.aiDifficultyLevels = aiDifficultyLevels;
	window.currentAIDifficulty = currentAIDifficulty;

	return { pala2, pala1, bola, aiConfig };
}

export function createPhysics4P(scene, engine, camera, tableTop, materiales, glow) {
	console.log("🏗️ Creando física del juego 4P");

	// Limpiar listeners anteriores para evitar duplicados
	window.removeEventListener("keydown", window.currentSpaceHandler);
	window.removeEventListener("keydown", window.currentKeydownHandler);
	window.removeEventListener("keyup", window.currentKeyupHandler);

	scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());
	scene.getPhysicsEngine().setTimeStep(1 / 60);

	const paddleSpeed = 0.024;
	const bolaRadio = 0.05;
	const keysPressed = {};
	const areaSize = 1.0; // Tamaño del área de juego
	const paddleOffset = 0.15; // Distancia de las palas del borde

	// CREAR PALAS EN POSICIONES CORRECTAS (sentido horario desde arriba)
	// Pala 1 - ARRIBA (se mueve horizontalmente)
	const pala2 = BABYLON.MeshBuilder.CreateBox("pala2", { width: 0.25, depth: 0.1, height: 0.05 }, scene);
	pala2.position.set(0, tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y, areaSize + paddleOffset);
	pala2.material = materiales.pala2Mat;

	// Pala 2 - DERECHA (se mueve verticalmente) 
	const pala1 = BABYLON.MeshBuilder.CreateBox("pala1", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala1.position.set(areaSize + paddleOffset, pala2.position.y, 0);
	pala1.material = materiales.pala1Mat;

	// Pala 3 - ABAJO (se mueve horizontalmente)
	const pala3 = BABYLON.MeshBuilder.CreateBox("pala3", { width: 0.25, depth: 0.1, height: 0.05 }, scene);
	pala3.position.set(0, pala2.position.y, -areaSize - paddleOffset);
	pala3.material = materiales.pala3Mat;

	// Pala 4 - IZQUIERDA (se mueve verticalmente)
	const pala4 = BABYLON.MeshBuilder.CreateBox("pala4", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala4.position.set(-areaSize - paddleOffset, pala2.position.y, 0);
	pala4.material = materiales.pala4Mat;

	// Crear bola en el centro
	const bola = BABYLON.MeshBuilder.CreateSphere("bola", { diameter: bolaRadio * 2 }, scene);
	bola.position.set(0, pala2.position.y, 0); // Centro del campo
	bola.material = new BABYLON.PBRMaterial("bolaMat", scene);
	bola.material.albedoColor = new BABYLON.Color3(1, 1, 1); // Blanco
	bola.material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Muy poco brillo
	bola.material.metallic = 0.1;
	bola.material.roughness = 0.3;

	// Excluir palas y bola del glow layer para mejor visibilidad
	if (glow) {
		glow.addExcludedMesh(pala1);
		glow.addExcludedMesh(pala2);
		glow.addExcludedMesh(pala3);
		glow.addExcludedMesh(pala4);
		glow.addExcludedMesh(bola);
	}

	// Crear physics impostors
	pala2.physicsImpostor = new BABYLON.PhysicsImpostor(pala2, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0, restitution: 1.2, friction: 0
	}, scene);
	pala1.physicsImpostor = new BABYLON.PhysicsImpostor(pala1, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0, restitution: 1.2, friction: 0
	}, scene);
	pala3.physicsImpostor = new BABYLON.PhysicsImpostor(pala3, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0, restitution: 1.2, friction: 0
	}, scene);
	pala4.physicsImpostor = new BABYLON.PhysicsImpostor(pala4, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0, restitution: 1.2, friction: 0
	}, scene);
	bola.physicsImpostor = new BABYLON.PhysicsImpostor(bola, BABYLON.PhysicsImpostor.SphereImpostor, {
		mass: 1, restitution: 0.95, friction: 0
	}, scene);

	// IMPORTANTE: Almacenar keysPressed en metadatos para acceso desde gameOver4P
	scene.metadata = scene.metadata || {};
	scene.metadata.physics = { keysPressed };

	// Función para preparar inicio del juego
	function prepararInicioJuego() {
		setGameActive(false);

		// Detener la bola
		bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
		bola.position.set(0, pala2.position.y, 0);

		window.currentSpaceHandler = (e) => {
			if (e.code === "Space" && !gameActive) {
				console.log("🚀 Iniciando juego 4P...");
				
				// LIMPIAR TODAS LAS TECLAS ANTES DE INICIAR
				Object.keys(keysPressed).forEach(key => {
					keysPressed[key] = false;
				});
				console.log("🧹 4P: Todas las teclas limpiadas antes de iniciar");
				
				setGameActive(true);
				if (mensajeInicio)
					mensajeInicio.alpha = 0;

				// Lanzar bola en dirección aleatoria
				const directions = [
					new BABYLON.Vector3(1.5, 0, 0),   // Hacia pala1
					new BABYLON.Vector3(-1.5, 0, 0),  // Hacia pala4
					new BABYLON.Vector3(0, 0, 1.5),   // Hacia pala2
					new BABYLON.Vector3(0, 0, -1.5)   // Hacia pala3
				];
				const randomDir = directions[Math.floor(Math.random() * directions.length)];
				bola.physicsImpostor.setLinearVelocity(randomDir);
			}
		};

		window.addEventListener("keydown", window.currentSpaceHandler);
	}

	// Inicializar juego
	prepararInicioJuego();

	// Variables para colisiones
	let lastCollisionTime = 0;
	const collisionCooldown = 100;

	// CONTROLES DE TECLADO
	window.addEventListener("keydown", (e) => {
		// Jugador 1 (Arriba): Q/E
		// Jugador 2 (Derecha): <-/-> (izquierda/derecha)
		// Jugador 3 (Abajo): I/P
		// Jugador 4 (Izquierda): C/B
		if (["q", "e", "ArrowRight", "ArrowLeft", "i", "p", "c", "b"].includes(e.key)) {
			keysPressed[e.key] = true;
			e.preventDefault();
		}
	});

	window.addEventListener("keyup", (e) => {
		if (["q", "e", "ArrowRight", "ArrowLeft", "i", "p", "c", "b"].includes(e.key)) {
			keysPressed[e.key] = false;
		}
	});

	// LOOP PRINCIPAL
	scene.registerBeforeRender(() => {
		if (!gameActive) return;

		const currentTime = Date.now();
		const bolaPos = bola.position;

		// MOVIMIENTO DE PALAS
		// Pala 1 (Arriba) - A/D (movimiento horizontal)
		if (keysPressed["q"]) {
			const newX = Math.max(pala2.position.x - paddleSpeed, -areaSize + 0.1);
			pala2.position.x = newX;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}
		if (keysPressed["e"]) {
			const newX = Math.min(pala2.position.x + paddleSpeed, areaSize - 0.1);
			pala2.position.x = newX;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}

		// Pala 2 (Derecha) - ↑/↓ (movimiento vertical)
		if (keysPressed["ArrowRight"]) {
			const newZ = Math.min(pala1.position.z + paddleSpeed, areaSize - 0.1);
			pala1.position.z = newZ;
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
			}
		}
		if (keysPressed["ArrowLeft"]) {
			const newZ = Math.max(pala1.position.z - paddleSpeed, -areaSize + 0.1);
			pala1.position.z = newZ;
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
			}
		}

		// Pala 3 (Abajo) - J/L (movimiento horizontal)
		if (keysPressed["i"]) {
			const newX = Math.max(pala3.position.x - paddleSpeed, -areaSize + 0.1);
			pala3.position.x = newX;
			if (pala3.physicsImpostor) {
				pala3.physicsImpostor.setDeltaPosition(pala3.position);
			}
		}
		if (keysPressed["p"]) {
			const newX = Math.min(pala3.position.x + paddleSpeed, areaSize - 0.1);
			pala3.position.x = newX;
			if (pala3.physicsImpostor) {
				pala3.physicsImpostor.setDeltaPosition(pala3.position);
			}
		}

		// Pala 4 (Izquierda) - W/S (movimiento vertical)
		if (keysPressed["c"]) {
			const newZ = Math.min(pala4.position.z + paddleSpeed, areaSize - 0.1);
			pala4.position.z = newZ;
			if (pala4.physicsImpostor) {
				pala4.physicsImpostor.setDeltaPosition(pala4.position);
			}
		}
		if (keysPressed["b"]) {
			const newZ = Math.max(pala4.position.z - paddleSpeed, -areaSize + 0.1);
			pala4.position.z = newZ;
			if (pala4.physicsImpostor) {
				pala4.physicsImpostor.setDeltaPosition(pala4.position);
			}
		}

		// DETECCIÓN DE COLISIONES CORREGIDA
		// Pala 1 (Arriba) - colisión desde abajo
		if (Math.abs(bolaPos.x - pala2.position.x) < 0.15 &&
			Math.abs(bolaPos.z - pala2.position.z) < 0.08 &&
			Math.abs(bolaPos.y - pala2.position.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión con pala2 (Arriba)!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelZ = -Math.abs(vel.z) * 1.05; // Rebotar hacia abajo
			const newVelX = vel.x + (bolaPos.x - pala2.position.x) * 3; // Spin lateral
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			bola.position.y = pala2.position.y;
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Pala 2 (Derecha) - colisión desde la izquierda
		if (Math.abs(bolaPos.x - pala1.position.x) < 0.08 &&
			Math.abs(bolaPos.z - pala1.position.z) < 0.15 &&
			Math.abs(bolaPos.y - pala1.position.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión con pala1 (Derecha)!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = -Math.abs(vel.x) * 1.05; // Rebotar hacia la izquierda
			const newVelZ = vel.z + (bolaPos.z - pala1.position.z) * 3; // Spin
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			bola.position.y = pala1.position.y;
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Pala 3 (Abajo) - colisión desde arriba
		if (Math.abs(bolaPos.x - pala3.position.x) < 0.15 &&
			Math.abs(bolaPos.z - pala3.position.z) < 0.08 &&
			Math.abs(bolaPos.y - pala3.position.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión con pala3 (Abajo)!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelZ = Math.abs(vel.z) * 1.05; // Rebotar hacia arriba
			const newVelX = vel.x + (bolaPos.x - pala3.position.x) * 3; // Spin lateral
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			bola.position.y = pala3.position.y;
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Pala 4 (Izquierda) - colisión desde la derecha
		if (Math.abs(bolaPos.x - pala4.position.x) < 0.08 &&
			Math.abs(bolaPos.z - pala4.position.z) < 0.15 &&
			Math.abs(bolaPos.y - pala4.position.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión con pala4 (Izquierda)!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = Math.abs(vel.x) * 1.05; // Rebotar hacia la derecha
			const newVelZ = vel.z + (bolaPos.z - pala4.position.z) * 3; // Spin
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			bola.position.y = pala4.position.y;
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Limitar velocidad máxima
		const correctedVel = bola.physicsImpostor.getLinearVelocity();
		const maxSpeed = 4;
		if (correctedVel.length() > maxSpeed) {
			const normalized = correctedVel.normalize();
			bola.physicsImpostor.setLinearVelocity(normalized.scale(maxSpeed));
		}

		// GAME OVER - cuando la bola sale del área
		const margin = 1.5;
		if (Math.abs(bolaPos.x) > margin || Math.abs(bolaPos.z) > margin) {
			let playerEliminated = "";
			// Usar identificadores únicos en lugar de texto traducido
			if (bolaPos.z > margin) playerEliminated = "PLAYER_1_ELIMINATED";
			else if (bolaPos.x > margin) playerEliminated = "PLAYER_2_ELIMINATED";
			else if (bolaPos.z < -margin) playerEliminated = "PLAYER_3_ELIMINATED";
			else if (bolaPos.x < -margin) playerEliminated = "PLAYER_4_ELIMINATED";

			console.log('🎯 4P Goal detected:', playerEliminated, 'at position:', {x: bolaPos.x, z: bolaPos.z});
			
			if (!gameOver4P(playerEliminated, bola, pala2, pala1, pala3, pala4, tableTop, scene))
				return;
		}

		// Glow feedback
		if (glow.intensity > 0.3) {
			glow.intensity -= 0.02;
		}
	});

	return { pala2, pala1, pala3, pala4, bola, setGameActive };
}