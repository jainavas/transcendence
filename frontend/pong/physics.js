import { maxScore, scoreP1, scoreP2, changeScore1, changeScore2 } from "./main.js";
import { setGameActive, gameActive } from "./scene.js";
import { puntoTexto, anunciarPunto } from "./menus.js";

function gameOver(message, bola, pala1, pala2, tableTop, scene) {
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
	const impulse = new BABYLON.Vector3(haciaLaDerecha ? 1 : -1, -1, 0).scale(0.5); // ajusta fuerza
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

		pala1.position = new BABYLON.Vector3(0.95, y, 0);
		pala2.position = new BABYLON.Vector3(-0.95, y, 0);
		pala1.physicsImpostor.setDeltaPosition(pala1.position);
		pala2.physicsImpostor.setDeltaPosition(pala2.position);

		// Dirección inicial alterna
		const direccion = message.includes("jugador 1") ? -1 : 1;
		const velocidadInicial = new BABYLON.Vector3(0.5 * direccion, 0, (Math.random() - 0.5) * 0.1);
		bola.physicsImpostor.setLinearVelocity(velocidadInicial);


		setGameActive(true);
	}, 1000);
	return true;
}


export function createPhysics(scene, engine, camera, tableTop, materiales, glow) {
	// Configurar physics engine
	scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), new BABYLON.CannonJSPlugin());
	scene.getPhysicsEngine().setTimeStep(1 / 60); // Más estable que 1/240

	const tableHalfDepth = 0.5;
	const paddleSpeed = 0.024;
	const paddleZLimit = tableHalfDepth - 0.01;
	const bolaRadio = 0.05;
	const keysPressed = {};

	// Crear palas
	const pala1 = BABYLON.MeshBuilder.CreateBox("pala1", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala1.position.set(0.95, tableTop.position.y + 0.05 + tableTop.getBoundingInfo().boundingBox.extendSize.y, 0);
	pala1.material = materiales.pala1Mat;

	const pala2 = BABYLON.MeshBuilder.CreateBox("pala2", { width: 0.1, depth: 0.25, height: 0.05 }, scene);
	pala2.position.set(-0.95, pala1.position.y, 0);
	pala2.material = materiales.pala2Mat;

	// Crear bola
	const bola = BABYLON.MeshBuilder.CreateSphere("bola", { diameter: bolaRadio * 2 }, scene);
	bola.position.y = pala1.position.y;
	bola.material = new BABYLON.StandardMaterial("bolaMat", scene);
	bola.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);

	// IMPORTANTE: Crear los physics impostors DESPUÉS de posicionar los meshes
	pala1.physicsImpostor = new BABYLON.PhysicsImpostor(pala1, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0,
		restitution: 1.2,
		friction: 0
	}, scene);

	pala2.physicsImpostor = new BABYLON.PhysicsImpostor(pala2, BABYLON.PhysicsImpostor.BoxImpostor, {
		mass: 0,
		restitution: 1.2,
		friction: 0
	}, scene);

	bola.physicsImpostor = new BABYLON.PhysicsImpostor(bola, BABYLON.PhysicsImpostor.SphereImpostor, {
		mass: 1,
		restitution: 0.95,
		friction: 0
	}, scene);

	// Velocidad inicial de la bola
	bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0.5, 0, 0));

	// Variables para tracking de colisiones
	let lastCollisionTime = 0;
	const collisionCooldown = 100; // ms

	// Método alternativo: usar onCollide en lugar de registerOnPhysicsCollide
	scene.registerBeforeRender(() => {
		const currentTime = Date.now();

		// Detectar colisiones manualmente como backup
		const bolaPos = bola.position;
		const pala1Pos = pala1.position;
		const pala2Pos = pala2.position;

		// Colisión con pala1 (derecha)
		if (Math.abs(bolaPos.x - pala1Pos.x) < 0.1 &&
			Math.abs(bolaPos.z - pala1Pos.z) < 0.15 &&
			Math.abs(bolaPos.y - pala1Pos.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión manual con pala1!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = -Math.abs(vel.x) * 1.05; // Acelerar ligeramente
			const newVelZ = vel.z + (bolaPos.z - pala1Pos.z) * 2; // Agregar spin basado en donde golpea
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Colisión con pala2 (izquierda)
		if (Math.abs(bolaPos.x - pala2Pos.x) < 0.1 &&
			Math.abs(bolaPos.z - pala2Pos.z) < 0.15 &&
			Math.abs(bolaPos.y - pala2Pos.y) < 0.1 &&
			currentTime - lastCollisionTime > collisionCooldown) {

			console.log("Colisión manual con pala2!");
			const vel = bola.physicsImpostor.getLinearVelocity();
			const newVelX = Math.abs(vel.x) * 1.05; // Acelerar ligeramente
			const newVelZ = vel.z + (bolaPos.z - pala2Pos.z) * 2; // Agregar spin
			bola.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(newVelX, 0, newVelZ));
			glow.intensity = 0.8;
			lastCollisionTime = currentTime;
		}

		// Movimiento de palas - método directo sin physics
		if (keysPressed["a"]) {
			const newZ = Math.max(pala2.position.z - paddleSpeed, -paddleZLimit);
			pala2.position.z = newZ;
			// Sincronizar impostor manualmente
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}
		if (keysPressed["d"]) {
			const newZ = Math.min(pala2.position.z + paddleSpeed, paddleZLimit);
			pala2.position.z = newZ;
			if (pala2.physicsImpostor) {
				pala2.physicsImpostor.setDeltaPosition(pala2.position);
			}
		}
		if (keysPressed["ArrowLeft"]) {
			const newZ = Math.max(pala1.position.z - paddleSpeed, -paddleZLimit);
			pala1.position.z = newZ;
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
			}
		}
		if (keysPressed["ArrowRight"]) {
			const newZ = Math.min(pala1.position.z + paddleSpeed, paddleZLimit);
			pala1.position.z = newZ;
			if (pala1.physicsImpostor) {
				pala1.physicsImpostor.setDeltaPosition(pala1.position);
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
		const maxSpeed = 4;
		if (vel.length() > maxSpeed) {
			const normalized = vel.normalize();
			bola.physicsImpostor.setLinearVelocity(normalized.scale(maxSpeed));
		}

		// Game over
		if (bolaPos.x > 1.2) {
			if (!gameOver("¡Punto para el jugador 2!", bola, pala1, pala2, tableTop, scene))
				return;
		} else if (bolaPos.x < -1.2) {
			if (!gameOver("¡Punto para el jugador 1!", bola, pala1, pala2, tableTop, scene))
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

	// Registrar colisiones como respaldo (puede que funcionen ahora)
	setTimeout(() => {
		if (bola.physicsImpostor && pala1.physicsImpostor && pala2.physicsImpostor) {
			bola.physicsImpostor.registerOnPhysicsCollide([pala1.physicsImpostor, pala2.physicsImpostor], (collider, collidedAgainst) => {
				console.log("Colisión detectada por registerOnPhysicsCollide!");
				const currentTime = Date.now();
				if (currentTime - lastCollisionTime > collisionCooldown) {
					glow.intensity = 0.8;
					lastCollisionTime = currentTime;
				}
			});
		}
	}, 100);

	return { pala1, pala2, bola };
}