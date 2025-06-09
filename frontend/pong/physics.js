import { maxScore, scoreP1, scoreP2, scoreP3, scoreP4, changeScore1, changeScore2, changeScore3, changeScore4 } from "./main.js";
import { setGameActive, gameActive } from "./scene.js";
import { puntoTexto, anunciarPunto, mensajeInicio } from "./menus.js";

function gameOver(message, bola, pala2, pala1, tableTop, scene) {
	// Actualizar puntuaciones
	if (message.includes("jugador 1") && gameActive) {
		changeScore1();
		anunciarPunto(puntoTexto, "¡Punto para el jugador 1!", scene);
	} else if (message.includes("jugador 2") && gameActive) {
		changeScore2();
		anunciarPunto(puntoTexto, "¡Punto para el jugador 2!", scene);
	}
	setGameActive(false);
	// Lanzar la bola hacia abajo con rotación
	const haciaLaDerecha = bola.position.x > 0;
	const impulse = new BABYLON.Vector3(haciaLaDerecha ? 1 : -1, -1, 0).scale(1.2); // ajusta fuerza
	const contactPoint = bola.getAbsolutePosition(); // centro del mesh

	bola.physicsImpostor.applyImpulse(impulse, contactPoint);

	bola.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(2, 2, 0.5));

	// Actualizar marcador
	document.getElementById('score').textContent = `${scoreP1} - ${scoreP2}`;

	// Mostrar Game Over final si llega al límite
	if (scoreP1 >= maxScore || scoreP2 >= maxScore) {
		document.getElementById('gameOver').style.display = 'block';
		document.getElementById('finalScore').textContent = `${scoreP1} - ${scoreP2}`;
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

		pala2.position = new BABYLON.Vector3(0.95, y, 0);
		pala1.position = new BABYLON.Vector3(-0.95, y, 0);
		pala2.physicsImpostor.setDeltaPosition(pala2.position);
		pala1.physicsImpostor.setDeltaPosition(pala1.position);

		// Dirección inicial alterna
		const direccion = message.includes("jugador 1") ? -1 : 1;
		const velocidadInicial = new BABYLON.Vector3(1.1 * direccion, 0, (Math.random() - 0.5) * 0.1);
		bola.physicsImpostor.setLinearVelocity(velocidadInicial);


		setGameActive(true);
	}, 1000);
	return true;
}

function gameOver4P(message, bola, pala2, pala1, pala3, pala4, tableTop, scene) {
	// Actualizar puntuaciones
	if (!gameActive) return true;
	if (message.includes("Jugador 1")) {
		changeScore1();
		anunciarPunto(puntoTexto, "¡Gol al Jugador 1!", scene);
	} else if (message.includes("Jugador 2")) {
		changeScore2();
		anunciarPunto(puntoTexto, "¡Gol al Jugador 2!", scene);
	} else if (message.includes("Jugador 3")) {
		changeScore3();
		anunciarPunto(puntoTexto, "¡Gol al Jugador 3!", scene);
	} else if (message.includes("Jugador 4")) {
		changeScore4();
		anunciarPunto(puntoTexto, "¡Gol al Jugador 4!", scene);
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

	// Actualizar marcador
	document.getElementById('score').textContent = `Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;

	// Mostrar Game Over final si llega al límite2
	if (scoreP1 >= maxScore || scoreP2 >= maxScore || scoreP3 >= maxScore || scoreP4 >= maxScore) {
		document.getElementById('gameOver').style.display = 'block';
		let winner = Math.min(scoreP1, scoreP2, scoreP3, scoreP4);
		switch (winner) {
			case scoreP1:
				document.getElementById('finalScore').textContent = `¡Ganó el Jugador 1, Azul! Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;
				return false;
			case scoreP2:
				document.getElementById('finalScore').textContent = `¡Ganó el Jugador 2, Rojo! Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;
				return false;
			case scoreP3:
				document.getElementById('finalScore').textContent = `¡Ganó el Jugador 3, Verde! Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;
				return false;
			case scoreP4:
				document.getElementById('finalScore').textContent = `¡Ganó el Jugador 4, Púrpura! Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;
				return false;
			default:
				document.getElementById('finalScore').textContent = `¡Empate! Azul:${scoreP1} - Rojo:${scoreP2} - Verde:${scoreP3} - Púrpura:${scoreP4}`;
				return false;
		}
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

		// Dirección inicial alterna
		const directions = [
			new BABYLON.Vector3(1.5, 0, 0),   // Hacia pala1
			new BABYLON.Vector3(-1.5, 0, 0),  // Hacia pala4
			new BABYLON.Vector3(0, 0, 1.5),   // Hacia pala2
			new BABYLON.Vector3(0, 0, -1.5)   // Hacia pala3
		];
		const randomDir = directions[Math.floor(Math.random() * directions.length)];
		bola.physicsImpostor.setLinearVelocity(randomDir);

		setGameActive(true);
	}, 1500);
	return true;
}


export function createPhysics(scene, engine, camera, tableTop, materiales, glow) {
	// Configurar physics engine
	scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());
	scene.getPhysicsEngine().setTimeStep(1 / 60);

	const tableHalfDepth = 0.5;
	const paddleSpeed = 0.024;
	const paddleZLimit = tableHalfDepth - 0.01;
	const bolaRadio = 0.05;
	const keysPressed = {};

	// Crear palas
	const pala2 = BABYLON.MeshBuilder.CreateBox("pala2", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala2.position.set(0.95, tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y, 0);
	pala2.material = materiales.pala2Mat;

	const pala1 = BABYLON.MeshBuilder.CreateBox("pala1", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala1.position.set(-0.95, pala2.position.y, 0);
	pala1.material = materiales.pala1Mat;

	// Crear bola
	const bola = BABYLON.MeshBuilder.CreateSphere("bola", { diameter: bolaRadio * 2 }, scene);
	bola.position.y = pala2.position.y;
	bola.material = new BABYLON.StandardMaterial("bolaMat", scene);
	bola.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);

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

	function prepararInicioJuego(bola) {
		window.addEventListener("keydown", (e) => {
			if (e.code === "Space" && !gameActive) {
				setGameActive(true);

				// Ocultar mensaje
				if (mensajeInicio) mensajeInicio.alpha = 0;

				// Lanzar bola
				bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(1.2, 0, 0));
			}
		});
	}

	prepararInicioJuego(bola);

	// Velocidad inicial de la bola

	// Variables para tracking de colisiones
	let lastCollisionTime = 0;
	const collisionCooldown = 100; // ms

	// Método alternativo: usar onCollide en lugar de registerOnPhysicsCollide
	scene.registerBeforeRender(() => {
		const currentTime = Date.now();

		// Detectar colisiones manualmente como backup
		const bolaPos = bola.position;
		const pala2Pos = pala2.position;
		const pala1Pos = pala1.position;

		// Colisión con pala2 (derecha)
		if (Math.abs(bolaPos.x - pala2Pos.x) < 0.1 &&
			Math.abs(bolaPos.z - pala2Pos.z) < 0.15 &&
			Math.abs(bolaPos.y - pala2Pos.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión manual con pala2!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = -Math.abs(vel.x) * 1.1; // Acelerar ligeramente
			const newVelZ = vel.z + (bolaPos.z - pala2Pos.z) * 2; // Agregar spin basado en donde golpea
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Colisión con pala1 (izquierda)
		if (Math.abs(bolaPos.x - pala1Pos.x) < 0.1 &&
			Math.abs(bolaPos.z - pala1Pos.z) < 0.15 &&
			Math.abs(bolaPos.y - pala1Pos.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión manual con pala1!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = Math.abs(vel.x) * 1.1; // Acelerar ligeramente
			const newVelZ = vel.z + (bolaPos.z - pala1Pos.z) * 2; // Agregar spin
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Movimiento de palas - método directo sin physics
		if (keysPressed["a"]) {
			const newZ = Math.max(pala1.position.z - paddleSpeed, -paddleZLimit);
			pala1.position.z = newZ;
			// Sincronizar impostor manualmente
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
			}
		}
		if (keysPressed["d"]) {
			const newZ = Math.min(pala1.position.z + paddleSpeed, paddleZLimit);
			pala1.position.z = newZ;
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
			}
		}
		if (keysPressed["ArrowLeft"]) {
			const newZ = Math.max(pala2.position.z - paddleSpeed, -paddleZLimit);
			pala2.position.z = newZ;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}
		if (keysPressed["ArrowRight"]) {
			const newZ = Math.min(pala2.position.z + paddleSpeed, paddleZLimit);
			pala2.position.z = newZ;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}

		// Rebote con bordes laterales
		if (Math.abs(bolaPos.z) + bolaRadio >= tableHalfDepth) {
			const vel = bola.physicsImpostor.getLinearVelocity();
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vel.x, 0, -vel.z));
			// Ajustar posición para evitar que se atasque
			if (bolaPos.z > 0) {
				bola.position.z = tableHalfDepth - bolaRadio - 0.01;
			} else {
				bola.position.z = -tableHalfDepth + bolaRadio + 0.01;
			}
		}

		// Limitar velocidad máxima
		const vel = bola.physicsImpostor.getLinearVelocity();
		const maxSpeed = 6;

		// IMPORTANTE: Forzar velocidad Y a 0 siempre
		if (Math.abs(vel.y) > 0.01 && bola.position.x >= -1 && bola.position.x <= 1) {
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(vel.x, 0, vel.z));
		}

		// Corregir posición Y si se desvía
		const targetY = pala2.position.y;
		if (Math.abs(bolaPos.y - targetY) > 0.05 && bolaPos.x >= -1 && bolaPos.x <= 1) {
			bola.position.y = targetY;
		}

		if (vel.length() > maxSpeed) {
			const normalized = vel.normalize();
			bola.physicsImpostor.setLinearVelocity(normalized.scale(maxSpeed));
		}

		// Game over
		if (bolaPos.x > 1.05) {
			if (!gameOver("¡Punto para el jugador 1!", bola, pala2, pala1, tableTop, scene))
				return;
		} else if (bolaPos.x < -1.05) {
			if (!gameOver("¡Punto para el jugador 2!", bola, pala2, pala1, tableTop, scene))
				return;
		}

		// Glow feedback
		if (glow.intensity > 0.3) {
			glow.intensity -= 0.02;
		}
	});

	// Event listeners para teclado
	window.addEventListener("keydown", (e) => {
		if (["a", "d", "ArrowLeft", "ArrowRight"].includes(e.key)) {
			keysPressed[e.key] = true;
			e.preventDefault();
		}
	});

	window.addEventListener("keyup", (e) => {
		if (["a", "d", "ArrowLeft", "ArrowRight"].includes(e.key)) {
			keysPressed[e.key] = false;
		}
	});

	return { pala2, pala1, bola };
}

export function createPhysics4P(scene, engine, camera, tableTop, materiales, glow) {
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
	bola.material = new BABYLON.StandardMaterial("bolaMat", scene);
	bola.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);

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

		const spaceHandler = (e) => {
			if (e.code === "Space" && !gameActive) {
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

				window.removeEventListener("keydown", spaceHandler);
			}
		};

		window.addEventListener("keydown", spaceHandler);
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
			if (bolaPos.z > margin) ganador = "¡Jugador 1 (Arriba) eliminado!";
			else if (bolaPos.x > margin) ganador = "¡Jugador 2 (Derecha) eliminado!";
			else if (bolaPos.z < -margin) ganador = "¡Jugador 3 (Abajo) eliminado!";
			else if (bolaPos.x < -margin) ganador = "¡Jugador 4 (Izquierda) eliminado!";

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