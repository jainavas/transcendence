import { maxScore, scoreP1, scoreP2, scoreP3, scoreP4, changeScore1, changeScore2, changeScore3, changeScore4 } from "./main.js";
import { setGameActive, gameActive } from "./scene.js";
import { puntoTexto, anunciarPunto, mensajeInicio } from "./menus.js";

function gameOver(message, bola, pala2, pala1, tableTop, scene) {
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

	// Actualizar puntuaciones
	if (message.includes("jugador 1")) {
		changeScore1();
		anunciarPunto(puntoTexto, window.t ? window.t('game.point_for_player_1') : "¡Punto para el jugador 1!", scene);
	} else if (message.includes("jugador 2")) {
		changeScore2();
		anunciarPunto(puntoTexto, window.t ? window.t('game.point_for_player_2') : "¡Punto para el jugador 2!", scene);
	}

	// Stop ball movement immediately
	bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
	bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

	// Las puntuaciones ya se actualizan automáticamente en changeScore1() y changeScore2()

	// Mostrar Game Over final si llega al límite
	if (scoreP1 >= maxScore || scoreP2 >= maxScore) {
		const gameOverElement = document.getElementById('gameOver');
		const finalScoreElement = document.getElementById('finalScore');
		if (gameOverElement) {
			gameOverElement.style.display = 'block';
		}
		if (finalScoreElement) {
			finalScoreElement.textContent = `${scoreP1} - ${scoreP2}`;
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
	}, 1500);
	return true;
}

function gameOver4P(message, bola, pala2, pala1, pala3, pala4, tableTop, scene) {
	// Actualizar puntuaciones
	if (!gameActive) return true;
	if (message.includes("Jugador 1")) {
		changeScore1();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_1') : "¡Gol al Jugador 1!", scene);
	} else if (message.includes("Jugador 2")) {
		changeScore2();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_2') : "¡Gol al Jugador 2!", scene);
	} else if (message.includes("Jugador 3")) {
		changeScore3();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_3') : "¡Gol al Jugador 3!", scene);
	} else if (message.includes("Jugador 4")) {
		changeScore4();
		anunciarPunto(puntoTexto, window.t ? window.t('game.goal_for_player_4') : "¡Gol al Jugador 4!", scene);
	}
	setGameActive(false);
	// Obtener dirección actual de la bola
	const currentVelocity = bola.physicsImpostor.getLinearVelocity();
	bola.physicsImpostor.setLinearVelocity(currentVelocity.y = -1);

	// Añadir una rotación para que ruede un poco al caer
	bola.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(
		Math.random() * 2,
		Math.random() * 2,
		Math.random()
	));

	// Las puntuaciones ya se actualizan automáticamente en changeScore1(), changeScore2(), etc.

	// Mostrar Game Over final si llega al límite2
	if (scoreP1 >= maxScore || scoreP2 >= maxScore || scoreP3 >= maxScore || scoreP4 >= maxScore) {
		const gameOverElement = document.getElementById('gameOver');
		if (gameOverElement) {
			gameOverElement.style.display = 'block';
		}
		
		let winner = Math.min(scoreP1, scoreP2, scoreP3, scoreP4);
		const finalScoreElement = document.getElementById('finalScore');
		if (finalScoreElement) {
			const blueText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.blue') : 'Azul';
			const redText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.red') : 'Rojo';
			const greenText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.green') : 'Verde';
			const purpleText = (window.t && window.i18n && window.i18n.translations) ? window.t('game.purple') : 'Púrpura';
			
			switch (winner) {
				case scoreP1:
					finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_1_won_blue') : '¡Ganó el Jugador 1, Azul!'} ${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
					break;
				case scoreP2:
					finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_2_won_red') : '¡Ganó el Jugador 2, Rojo!'} ${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
					break;
				case scoreP3:
					finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_3_won_green') : '¡Ganó el Jugador 3, Verde!'} ${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
					break;
				case scoreP4:
					finalScoreElement.textContent = `${(window.t && window.i18n && window.i18n.translations) ? window.t('game.player_4_won_purple') : '¡Ganó el Jugador 4, Púrpura!'} ${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
					break;
				default:
					finalScoreElement.textContent = `${window.t ? window.t('game.tie_game') : '¡Empate!'} ${blueText}:${scoreP1} - ${redText}:${scoreP2} - ${greenText}:${scoreP3} - ${purpleText}:${scoreP4}`;
					break;
			}
		}
		return false;
	}
	// Reiniciar tras 1 segundo
	setTimeout(() => {
		// Reiniciar posiciones
		bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
		bola.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());

		const y = tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y;
		bola.position = new BABYLON.Vector3(0, y, 0);
		bola.physicsImpostor.setDeltaPosition(bola.position); // importante

		pala2.position = new BABYLON.Vector3(0, y, 1.15);
		pala1.position = new BABYLON.Vector3(1.15, y, 0);
		pala3.position = new BABYLON.Vector3(0, y, -1.15);
		pala4.position = new BABYLON.Vector3(-1.15, y, 0);
		pala2.physicsImpostor.setDeltaPosition(pala2.position);
		pala1.physicsImpostor.setDeltaPosition(pala1.position);
		pala3.physicsImpostor.setDeltaPosition(pala3.position);
		pala4.physicsImpostor.setDeltaPosition(pala4.position);

		// NO establecer velocidad inicial automáticamente en modo 4P - esperar entrada del jugador
		// const randomDir = directions[Math.floor(Math.random() * directions.length)];
		// bola.physicsImpostor.setLinearVelocity(randomDir);

		setGameActive(true);
	}, 1500);
	return true;
}


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
	const paddleSpeed = 0.024;
	const paddleZLimit = tableHalfDepth - 0.01;
	const bolaRadio = 0.05;
	const keysPressed = {};

	// AI configuration for player 2 (pala2)
	const aiConfig = {
		enabled: true,
		difficulty: 0.85, // 0.0 to 1.0 - how accurately AI tracks the ball
		reactionSpeed: 0.7, // 0.0 to 1.0 - how quickly AI reacts
		lastUpdateTime: 0,
		updateInterval: 1000, // milliseconds between AI updates (1 second)
		targetZ: 0, // AI's target position
		isMoving: false, // Track if AI is currently moving
		movementDuration: 0, // How long AI should keep moving
		movementStartTime: 0 // When current movement started
	};

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

		// AI for player 2 (pala2) - calculates once per second, then moves briefly
		if (aiConfig.enabled && currentTime - aiConfig.lastUpdateTime > aiConfig.updateInterval) {
			const ballVelForPrediction = bola.physicsImpostor.getLinearVelocity();
			
			// Only react if ball is moving towards AI paddle and has some velocity
			if (ballVelForPrediction && ballVelForPrediction.length() > 0.1 && ballVelForPrediction.x > 0) {
				// Predict where ball will be when it reaches paddle's X position
				let predictedZ = bolaPos.z;
				const timeToReach = Math.abs((pala2Pos.x - bolaPos.x) / ballVelForPrediction.x);
				predictedZ = bolaPos.z + (ballVelForPrediction.z * timeToReach);
				
				// Add some inaccuracy based on difficulty (lower difficulty = more error)
				const error = (1 - aiConfig.difficulty) * (Math.random() - 0.5) * 0.3;
				aiConfig.targetZ = predictedZ + error;
				
				// Limit target to playable area
				aiConfig.targetZ = Math.max(-paddleZLimit, Math.min(paddleZLimit, aiConfig.targetZ));
				
				// Calculate movement duration based on distance and reaction speed
				const distance = Math.abs(aiConfig.targetZ - pala2Pos.z);
				const movementTime = (distance / paddleSpeed) * (2 - aiConfig.reactionSpeed) * 16.67; // Convert to milliseconds
				
				// Start movement if target is significantly different from current position
				if (distance > paddleSpeed * 2) {
					aiConfig.isMoving = true;
					aiConfig.movementStartTime = currentTime;
					aiConfig.movementDuration = Math.min(movementTime, 800); // Max 800ms movement
					console.log(`AI deciding to move to ${aiConfig.targetZ.toFixed(2)}, duration: ${aiConfig.movementDuration}ms`);
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

		// Colisión con pala2 (derecha) - PREVENTIVA para evitar escapes
		const aiUpdateBallVel = bola.physicsImpostor.getLinearVelocity();
		const pala2RightEdge = pala2Pos.x + 0.05; // Right edge of paddle
		const willEscapePala2 = bolaPos.x + (aiUpdateBallVel.x * deltaTime) > pala2RightEdge; // Predictive check
		const nearPala2 = Math.abs(bolaPos.x - pala2Pos.x) < 0.15; // Larger detection area
		const inPaddle2Range = Math.abs(bolaPos.z - pala2Pos.z) < 0.25; // Wider Z range
		const movingTowardsPala2 = aiUpdateBallVel.x > 0;
		
		if ((nearPala2 || willEscapePala2) && 
			inPaddle2Range && 
			Math.abs(bolaPos.y - pala2Pos.y) < 0.1 &&
			movingTowardsPala2 && 
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
			const newVelZ = vel.z + (bolaPos.z - pala2Pos.z) * 0.8; // Spin reducido
			
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Colisión con pala1 (izquierda) - PREVENTIVA para evitar escapes
		const pala1BallVel = bola.physicsImpostor.getLinearVelocity();
		const pala1LeftEdge = pala1Pos.x - 0.05; // Left edge of paddle
		const willEscapePala1 = bolaPos.x + (pala1BallVel.x * deltaTime) < pala1LeftEdge; // Predictive check
		const nearPala1 = Math.abs(bolaPos.x - pala1Pos.x) < 0.15; // Larger detection area
		const inPaddleRange = Math.abs(bolaPos.z - pala1Pos.z) < 0.25; // Wider Z range
		const movingTowardsPala1 = pala1BallVel.x < 0;
		
		if ((nearPala1 || willEscapePala1) && 
			inPaddleRange && 
			Math.abs(bolaPos.y - pala1Pos.y) < 0.1 &&
			movingTowardsPala1 && 
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
			const newVelZ = vel.z + (bolaPos.z - pala1Pos.z) * 0.8; // Spin reducido
			
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
			
			// Reverse Z velocity immediately
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(ballVelForBounds.x, 0, -Math.abs(ballVelForBounds.z) * Math.sign(-bolaPos.z)));
			
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
				if (!gameOver(window.t ? window.t('game.point_for_player_1') : "¡Punto para el jugador 1!", bola, pala2, pala1, tableTop, scene))
					return;
			} 
			// Goal for player 2 (ball goes past left edge - pala1 missed)
			else if (bolaPos.x < -1.1 && Math.abs(ballVelForGoals.x) > 0.1) {
				console.log("Goal detected for player 2 at position:", bolaPos.x);
				lastGoalTime = currentTime;
				if (!gameOver(window.t ? window.t('game.point_for_player_2') : "¡Punto para el jugador 2!", bola, pala2, pala1, tableTop, scene))
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
		// Toggle AI with 'T' key
		if (e.key === "t" || e.key === "T") {
			aiConfig.enabled = !aiConfig.enabled;
			console.log("🤖 AI", aiConfig.enabled ? "activada" : "desactivada");
			// Clear AI inputs when disabled
			if (!aiConfig.enabled) {
				keysPressed["ArrowLeft"] = false;
				keysPressed["ArrowRight"] = false;
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

	// Función para preparar inicio del juego
	function prepararInicioJuego() {
		setGameActive(false);

		// Detener la bola
		bola.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
		bola.position.set(0, pala2.position.y, 0);

		window.currentSpaceHandler = (e) => {
			if (e.code === "Space" && !gameActive) {
				console.log("🚀 Iniciando juego 4P...");
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

				window.removeEventListener("keydown", window.currentSpaceHandler);
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
		// Jugador 1 (Arriba): A/D
		// Jugador 2 (Derecha): ↑/↓  
		// Jugador 3 (Abajo): J/L
		// Jugador 4 (Izquierda): W/S
		if (["a", "d", "ArrowRight", "ArrowLeft", "j", "l", "w", "s"].includes(e.key)) {
			keysPressed[e.key] = true;
			e.preventDefault();
		}
	});

	window.addEventListener("keyup", (e) => {
		if (["a", "d", "ArrowRight", "ArrowLeft", "j", "l", "w", "s"].includes(e.key)) {
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
		if (keysPressed["a"]) {
			const newX = Math.max(pala2.position.x - paddleSpeed, -areaSize + 0.1);
			pala2.position.x = newX;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}
		if (keysPressed["d"]) {
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
		if (keysPressed["j"]) {
			const newX = Math.max(pala3.position.x - paddleSpeed, -areaSize + 0.1);
			pala3.position.x = newX;
			if (pala3.physicsImpostor) {
				pala3.physicsImpostor.setDeltaPosition(pala3.position);
			}
		}
		if (keysPressed["l"]) {
			const newX = Math.min(pala3.position.x + paddleSpeed, areaSize - 0.1);
			pala3.position.x = newX;
			if (pala3.physicsImpostor) {
				pala3.physicsImpostor.setDeltaPosition(pala3.position);
			}
		}

		// Pala 4 (Izquierda) - W/S (movimiento vertical)
		if (keysPressed["w"]) {
			const newZ = Math.min(pala4.position.z + paddleSpeed, areaSize - 0.1);
			pala4.position.z = newZ;
			if (pala4.physicsImpostor) {
				pala4.physicsImpostor.setDeltaPosition(pala4.position);
			}
		}
		if (keysPressed["s"]) {
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
			let ganador = "";
			if (bolaPos.z > margin) ganador = window.t ? window.t('game.player_1_eliminated') : "¡Jugador 1 (Arriba) eliminado!";
			else if (bolaPos.x > margin) ganador = window.t ? window.t('game.player_2_eliminated') : "¡Jugador 2 (Derecha) eliminado!";
			else if (bolaPos.z < -margin) ganador = window.t ? window.t('game.player_3_eliminated') : "¡Jugador 3 (Abajo) eliminado!";
			else if (bolaPos.x < -margin) ganador = window.t ? window.t('game.player_4_eliminated') : "¡Jugador 4 (Izquierda) eliminado!";

			if (!gameOver4P(ganador, bola, pala2, pala1, pala3, pala4, tableTop, scene))
				return;
		}

		// Glow feedback
		if (glow.intensity > 0.3) {
			glow.intensity -= 0.02;
		}
	});

	return { pala2, pala1, pala3, pala4, bola, setGameActive };
}