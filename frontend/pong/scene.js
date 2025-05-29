import { createMaterials } from "./materials.js";
import { createUI } from "./menus.js";
import { createPhysics } from "./physics.js";


export var gameActive;
export function setGameActive(value) {
	gameActive = value;
}

export var materiales = {};

export class Playground {
	static CreateScene(engine, canvas) {
		var scene = new BABYLON.Scene(engine);
		// Cámara orbital cenital
		var camera = new BABYLON.ArcRotateCamera(
			"camera1",
			-Math.PI / 2,
			Math.PI / 4.5,
			2.3,
			new BABYLON.Vector3(0, 1, 0),
			scene
		);
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 2.3;
		camera.upperRadiusLimit = 2.3;
		canvas.focus();
		var defaultPosition = {
			alpha: -Math.PI / 2,
			beta: Math.PI / 4.5,
			radius: 2.3
		};

		var resetCameraButton = document.getElementById('resetCameraButton');

		// Función para comprobar si la cámara se ha movido
		function checkCameraPosition() {
			var epsilon = 0.05; // Tolerancia para comparaciones

			// Verificar si el usuario ha movido la cámara significativamente
			var alphaDiff = Math.abs(camera.alpha - defaultPosition.alpha);
			var betaDiff = Math.abs(camera.beta - defaultPosition.beta);
			var radiusDiff = Math.abs(camera.radius - defaultPosition.radius);

			// Determinar si la cámara está fuera de posición
			var camaraMovida = (alphaDiff > epsilon || betaDiff > epsilon || radiusDiff > epsilon);

			// Mostrar u ocultar el botón según la posición de la cámara
			resetCameraButton.style.display = camaraMovida ? 'flex' : 'none';
		}

		// Función para resetear la cámara
		function resetCamera() {
			camera.alpha = defaultPosition.alpha;
			camera.beta = defaultPosition.beta;
			camera.radius = defaultPosition.radius;
			// Actualizar visibilidad del botón
			checkCameraPosition();
		}

		// Hacer función resetCamera accesible globalmente
		window.resetCamera = resetCamera;

		// Detectar movimiento de la cámara
		camera.onViewMatrixChangedObservable.add(function () {
			checkCameraPosition();
		});

		// Comprobar posición inicial
		checkCameraPosition();


		const hdrTexture = new BABYLON.HDRCubeTexture("textures/galaxia.hdr", scene, 1024, false, true, false, true);
		scene.environmentTexture = hdrTexture;
		scene.createDefaultSkybox(hdrTexture, true, 1000);
		scene.environmentIntensity = 5;
		const fillLight = new BABYLON.HemisphericLight("fill", new BABYLON.Vector3(0, 1, 0), scene);
		fillLight.intensity = 0.5; // Puedes ajustar entre 0.3–0.7
		fillLight.diffuse = new BABYLON.Color3(1, 1, 1); // Luz blanca suave


		const directionalLight = new BABYLON.DirectionalLight(
			"sunLight",
			new BABYLON.Vector3(-1, -2, -1), // Luz inclinada
			scene
		);
		directionalLight.position = new BABYLON.Vector3(10, 20, 10);
		directionalLight.intensity = 1.0;
		directionalLight.shadowEnabled = true;
		const ambient = new BABYLON.HemisphericLight(
			"ambient",
			new BABYLON.Vector3(0, 1, 0),
			scene
		);
		ambient.diffuse = new BABYLON.Color3(0.3, 0.5, 0.8); // Luz del cielo azulada
		ambient.intensity = 0.4;
		const leftCharLight = new BABYLON.PointLight("leftCharLight", new BABYLON.Vector3(-5, 2, 0), scene);
		leftCharLight.diffuse = new BABYLON.Color3(1, 0.8, 0.6); // Cálida
		leftCharLight.intensity = 0.6;

		const rightCharLight = new BABYLON.PointLight("rightCharLight", new BABYLON.Vector3(5, 2, 0), scene);
		rightCharLight.diffuse = new BABYLON.Color3(0.6, 0.9, 1); // Fría
		rightCharLight.intensity = 0.6;

		// Brillo general
		const glow = new BABYLON.GlowLayer("glow", scene);
		glow.intensity = 0.3;
		// Crear materiales
		createMaterials(scene, materiales);
		const personajesContenedores = {
			izquierda: null,
			derecha: null
		};

		const entornos = {
			"galaxia": new BABYLON.HDRCubeTexture("textures/galaxia.hdr", scene, 1024, false, true, false, true),
			"cielo": new BABYLON.HDRCubeTexture("textures/cielo.hdr", scene, 1024, false, true, false, true)
		};

		let skyboxActual = null;

		const personajes = [
			{
				nombre: "Vaca",
				ruta: "textures/vaca/",
				miniatura: "minivaca.png",
				archivo: "scene.gltf",
				posicion: new BABYLON.Vector3(2.3, 0, 0),
				escala: new BABYLON.Vector3(0.6, 0.6, 0.6),
				rotacion: new BABYLON.Vector3(0, -Math.PI / 2, Math.PI)
			},
			{
				nombre: "Trucha",
				ruta: "textures/pez/",
				miniatura: "minitrucha.png",
				archivo: "pez.gltf",
				posicion: new BABYLON.Vector3(1.5, 0.85, 0),
				escala: new BABYLON.Vector3(0.5, 0.5, 0.5),
				rotacion: new BABYLON.Vector3(0, Math.PI / 2, Math.PI)
			},
			{
				nombre: "Tiburon",
				ruta: "textures/tiburon/",
				miniatura: "minitibu.png",
				archivo: "scene.gltf",
				posicion: new BABYLON.Vector3(1.8, 0.75, 0),
				escala: new BABYLON.Vector3(0.004, 0.004, 0.004),
				rotacion: new BABYLON.Vector3(0, Math.PI / 2, Math.PI)
			}
		];

		createUI(
			scene,
			personajes,
			personajesContenedores,
			entornos,
			skyboxActual
		);
		// Agregar esto cerca del inicio de CreateScene
		scene.audioEnabled = true;

		// Mesa: tablero y patas
		// Definir la nueva altura base de la mesa (más baja)
		const mesaAltura = 0.6; // Reducido de 1.0 a 0.6
		const faceUV = [];
		for (let i = 0; i < 6; i++) {
			if (i === 4 || i === 5) {
				// Cara superior
				faceUV.push(new BABYLON.Vector4(0, 0, 1, 1)); // UVs para la cara superior
			} else if (i === 2 || i === 3) {
				// Cara izquierda
				faceUV.push(new BABYLON.Vector4(0, 0, 0.066, 1)); // UVs para la cara izquierda
			} else {
				// Otras caras (frontal, trasera, inferior, derecha)
				// Usar UVs por defecto o ajustar según sea necesario
				faceUV.push(new BABYLON.Vector4(0, 0, 1, 0.066)); // Default UVs
			}
		}
		// Mesa
		var tableTop = BABYLON.MeshBuilder.CreateBox(
			"tableTop", { width: 2, depth: 1, height: 0.1, faceUV: faceUV }, scene
		);
		tableTop.subMeshes = [];
		const verticesCount = tableTop.getTotalVertices();
		for (let i = 0; i < 6; i++) {
			tableTop.subMeshes.push(new BABYLON.SubMesh(i, 0, verticesCount, i * 6, 6, tableTop));
		}
		const multiMat = new BABYLON.MultiMaterial("multi", scene);
		multiMat.subMaterials.push(materiales.marmolnegroMat);      // Cara 0: frontal
		multiMat.subMaterials.push(materiales.marmolnegroMat);      // Cara 1: trasera
		multiMat.subMaterials.push(materiales.marmolnegroMat);  // Cara 2: lateral
		multiMat.subMaterials.push(materiales.marmolnegroMat);      // Cara 3: lateral
		multiMat.subMaterials.push(materiales.marmolnegroRunasMat);      // Cara 4: superior
		multiMat.subMaterials.push(materiales.marmolnegroMat);      // Cara 5: inferior
		tableTop.position.y = mesaAltura;
		tableTop.material = multiMat;

		// Ajustar las patas para que sean proporcionalmente más cortas
		var legParams = { diameter: 0.1, height: mesaAltura }; // Altura ajustada

		// Calcular correctamente la posición Y de las patas
		// La posición Y debe ser la mitad de la altura de la pata, para que su parte superior
		// coincida exactamente con la parte inferior del tablero
		const legY = legParams.height / 2;

		[[0.9, legY, 0.4], [-0.9, legY, 0.4], [0.9, legY, -0.4], [-0.9, legY, -0.4]]
			.forEach(function (pos, i) {
				var leg = BABYLON.MeshBuilder.CreateCylinder(
					"leg" + i, legParams, scene
				);
				leg.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
				leg.material = materiales.concreteMat;
			});


		// 1. Primero desactivar las teclas de flecha para la cámara
		camera.keysUp = [];    // Tecla arriba (normalmente es 38)
		camera.keysDown = [];  // Tecla abajo (normalmente es 40)
		camera.keysLeft = [];  // Tecla izquierda (normalmente es 37)
		camera.keysRight = []; // Tecla derecha (normalmente es 39)
		gameActive = true; // Activar el juego al inicio

		scene.onBeforeRenderObservable.clear(); // Elimina observadores existentes

		createPhysics(
			scene,
			engine,
			camera,
			tableTop,
			materiales,
			glow
		);

		// Add loading screen functionality
		function showLoadingUI() {
			const loadingScreen = document.getElementById('loadingScreen');
			const loadingText = document.getElementById('loadingText');
			const loadingProgressBar = document.getElementById('loadingProgressBar');

			// Show loading screen
			loadingScreen.style.opacity = "1";
			loadingScreen.style.display = "flex";

			// Track loading progress
			let totalAssets = 0;
			let loadedAssets = 0;

			// Create asset manager to track all asset loading
			const assetsManager = new BABYLON.AssetsManager(scene);

			// Add handler for tracking progress
			assetsManager.onProgress = (remainingCount, totalCount) => {
				loadedAssets = totalCount - remainingCount;
				totalAssets = totalCount;

				const progress = Math.floor((loadedAssets / totalAssets) * 100);
				loadingProgressBar.style.width = progress + "%";
				loadingText.textContent = `Cargando recursos (${progress}%)...`;
			};

			// Add handler for when all assets are loaded
			assetsManager.onFinish = () => {
				// Delay the hiding a bit for smoother transition
				setTimeout(() => {
					loadingScreen.style.opacity = "0";
					setTimeout(() => {
						loadingScreen.style.display = "none";
					}, 800);
				}, 300);
			};

			// Register all textures to be tracked
			Object.values(entornos).forEach(texture => {
				const task = assetsManager.addTextureTask("envTexture", texture.url);
				task.onSuccess = function (task) {
					// Texture loaded
				};
			});

			// Register all material textures
			[materiales.concreteMat, materiales.marbleMat, materiales.metalMat, materiales.marmolnegroMat].forEach(material => {
				if (material.albedoTexture) assetsManager.addTextureTask("texture", material.albedoTexture.url);
				if (material.bumpTexture) assetsManager.addTextureTask("texture", material.bumpTexture.url);
				if (material.ambientTexture) assetsManager.addTextureTask("texture", material.ambientTexture.url);
				if (material.parallaxTexture) assetsManager.addTextureTask("texture", material.parallaxTexture.url);
				if (material.metallicTexture) assetsManager.addTextureTask("texture", material.metallicTexture.url);
			});

			// Add sounds to track
			assetsManager.addBinaryFileTask("soundFile", "textures/metal.mp3");

			// Start loading all assets
			assetsManager.load();
		}

		// Call the function to start tracking and showing load progress
		showLoadingUI();

		return scene;
	}
}