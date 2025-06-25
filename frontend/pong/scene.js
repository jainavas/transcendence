import { createMaterials } from "./materials.js";
import { advancedTexture, cambiarEntorno, createUI, createUI4P } from "./menus.js";
import { createPhysics, createPhysics4P } from "./physics.js";


export var gameActive = false; // Inicializar como false para mostrar selectores
export function setGameActive(value) {
	console.log(`🎮 gameActive cambiado: ${gameActive} → ${value}`);
	gameActive = value;
}

export var materiales = {};

// Helper function to load HDR texture with error handling
function loadHDRTexture(path, scene, onSuccess, onError) {
	try {
		const hdrTexture = new BABYLON.HDRCubeTexture(path, scene, 1024, false, true, false, true);
		
		hdrTexture.onError = function(message, exception) {
			console.warn("HDR texture failed to load:", path, message, exception);
			if (onError) onError();
		};
		
		hdrTexture.onLoad = function() {
			console.log("HDR texture loaded successfully:", path);
			if (onSuccess) onSuccess(hdrTexture);
		};
		
		return hdrTexture;
	} catch (error) {
		console.warn("Error creating HDR texture:", path, error);
		if (onError) onError();
		return null;
	}
}

export class Playground {
	static CreateScene(engine, canvas) {
		console.log("🏓 Iniciando creación de escena Pong IA");
		console.log("🎮 Estado inicial gameActive:", gameActive);
		var scene = new BABYLON.Scene(engine);
		// Cámara orbital cenital
		document.getElementById('changeCameraButton').style.display = 'none';
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
		
		// Asegurar que la cámara pueda ver todas las capas incluyendo GUI
		camera.layerMask = 0x0FFFFFFF;
		
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

		// HDR environment setup with error handling
		loadHDRTexture("textures/galaxia.hdr", scene, 
			function(hdrTexture) {
				// Success callback
				scene.environmentTexture = hdrTexture;
				scene.createDefaultSkybox(hdrTexture, true, 1000);
				scene.environmentIntensity = 0.5;
				console.log("✅ HDR environment loaded successfully");
			},
			function() {
				// Error callback - fallback to default environment
				console.log("⚠️ Using fallback environment due to HDR error");
				scene.createDefaultEnvironment({
					environmentTexture: null,
					createSkybox: true,
					skyboxSize: 1000,
					groundColor: new BABYLON.Color3(0.2, 0.2, 0.3)
				});
			}
		);
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
		glow.intensity = 0.15; // Reducido para mejor visibilidad de palas
		// Crear materiales
		createMaterials(scene, materiales);
		const personajesContenedores = {
			izquierda: null,
			derecha: null
		};

		// Environment textures with error handling
		const entornos = {};
		
		// Load environment textures safely
		function setupEnvironments() {
			const envPaths = {
				"galaxia": "textures/galaxia.hdr",
				"cielo": "textures/cielo.hdr", 
				"city": "textures/city.hdr"
			};
			
			Object.keys(envPaths).forEach(name => {
				try {
					const hdrTexture = new BABYLON.HDRCubeTexture(envPaths[name], scene, 1024, false, true, false, true);
					hdrTexture.onError = function(message, exception) {
						console.warn(`Environment texture ${name} failed to load:`, message, exception);
						// Create a simple color instead
						entornos[name] = null;
					};
					hdrTexture.onLoad = function() {
						console.log(`Environment texture ${name} loaded successfully`);
						entornos[name] = hdrTexture;
					};
					entornos[name] = hdrTexture; // Set it initially
				} catch (error) {
					console.warn(`Error creating environment texture ${name}:`, error);
					entornos[name] = null;
				}
			});
		}
		
		setupEnvironments();

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
				nombre: "Pez Payaso",
				ruta: "textures/pezpayaso/",
				miniatura: "minipezpayaso.png",
				archivo: "scene.gltf",
				posicion: new BABYLON.Vector3(1.2, 0.85, 0),
				escala: new BABYLON.Vector3(2.5, 2.5, 2.5),
				rotacion: new BABYLON.Vector3(0, Math.PI / 2, Math.PI)
			}
		];

		// Función para crear UI cuando las traducciones estén listas
		async function createUIWhenReady() {
			console.log('🎮 IA: Esperando a que las traducciones estén listas...');
			
			// Esperar a que las traducciones estén disponibles
			let attempts = 0;
			const maxAttempts = 100; // 10 segundos máximo
			
			while (attempts < maxAttempts) {
				if (window.t && window.translations && window.translations[window.currentLanguage]) {
					console.log('✅ IA: Traducciones listas, creando UI');
					break;
				}
				
				await new Promise(resolve => setTimeout(resolve, 100));
				attempts++;
			}
			
			if (attempts >= maxAttempts) {
				console.warn('⚠️ IA: Timeout esperando traducciones, creando UI con fallback');
			}
			
			// Crear UI
			createUI(
				null, // No necesitamos pasar advancedTexture porque se crea internamente
				scene,
				personajes,
				personajesContenedores,
				entornos,
				skyboxActual
			);
		}
		
		// Llamar la función asíncrona
		createUIWhenReady();
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
		scene.onBeforeRenderObservable.clear(); // Elimina observadores existentes

		// NO crear física automáticamente - esperar a que el usuario presione ESPACIO
		// Pero sí marcar que la física necesita inicializarse
		scene.metadata = scene.metadata || {};
		scene.metadata.physicsInitialized = false;
		
		// Crear la física inmediatamente para que esté disponible
		// pero sin activar el juego (gameActive permanece false)
		cambiarEntorno("galaxia", scene, entornos, skyboxActual);

		createPhysics(
			scene,
			engine,
			camera,
			tableTop,
			materiales,
			glow
		);
		
		scene.metadata.physicsInitialized = true;

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

	static CreateScene4P(engine, canvas) {
		var scene = new BABYLON.Scene(engine);
		// Cámara orbital cenital
		const camerapov = new BABYLON.FreeCamera(
			"playerCamera",
			new BABYLON.Vector3(0, 2, -2.5), // Posición: lado derecho (jugador 1)
			scene
		);
		camerapov.setTarget(new BABYLON.Vector3(0, 0.4, 0));
		var camera = new BABYLON.ArcRotateCamera(
			"camera1",
			-Math.PI / 2,
			Math.PI / 4,
			3.5,
			new BABYLON.Vector3(0, 1, 0),
			scene
		);
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 3.5;
		camera.upperRadiusLimit = 3.5;
		
		// Asegurar que la cámara pueda ver todas las capas incluyendo GUI
		camera.layerMask = 0x0FFFFFFF;
		
		canvas.focus();
		var defaultPosition = {
			alpha: -Math.PI / 2,
			beta: Math.PI / 4,
			radius: 3.5
		};

		var resetCameraButton = document.getElementById('resetCameraButton');
		var changeCameraButton = document.getElementById('changeCameraButton');
		changeCameraButton.style.display = 'flex'; // Mostrar botón de cambio de cámara
		changeCameraButton.addEventListener('click', function () {
			if (camerapov.isEnabled) {
				camerapov.detachControl(canvas);
				scene.activeCamera = camera; // Cambiar la cámara activa
				camera.attachControl(canvas, true);
				camerapov.isEnabled = false;
				camera.isEnabled = true;
			} else {
				checkCameraPosition(); // Comprobar posición antes de cambiar
				camera.detachControl(canvas);
				scene.activeCamera = camerapov; // Cambiar la cámara activa
				camerapov.isEnabled = true;
				camera.isEnabled = false;
			}
		});
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
			if (camerapov.isEnabled) {
				resetCameraButton.style.display = 'none'; // Ocultar botón si se usa cámara POV
			}
			else
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

		// HDR environment setup with error handling for 4P
		loadHDRTexture("textures/galaxia.hdr", scene, 
			function(hdrTexture) {
				// Success callback
				scene.environmentTexture = hdrTexture;
				scene.createDefaultSkybox(hdrTexture, true, 1000);
				scene.environmentIntensity = 0.5;
			},
			function() {
				// Error callback - fallback to default environment
				console.log("Using fallback environment in 4P mode");
				scene.createDefaultEnvironment({
					environmentTexture: null,
					createSkybox: true,
					skyboxSize: 1000,
					groundColor: new BABYLON.Color3(0.2, 0.2, 0.3)
				});
			}
		);
		
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
		glow.intensity = 0.15; // Reducido para mejor visibilidad de palas
		// Crear materiales
		createMaterials(scene, materiales);
		const personajesContenedores = {
			izquierda: null,
			derecha: null,
			abajo: null,
			arriba: null
		};

		// Environment textures with error handling for 4P
		const entornos = {};
		
		// Load environment textures safely
		function setupEnvironments4P() {
			const envPaths = {
				"galaxia": "textures/galaxia.hdr",
				"cielo": "textures/cielo.hdr", 
				"city": "textures/city.hdr"
			};
			
			Object.keys(envPaths).forEach(name => {
				try {
					const hdrTexture = new BABYLON.HDRCubeTexture(envPaths[name], scene, 1024, false, true, false, true);
					hdrTexture.onError = function(message, exception) {
						console.warn(`Environment texture ${name} failed to load in 4P:`, message, exception);
						// Create a simple color instead
						entornos[name] = null;
					};
					hdrTexture.onLoad = function() {
						console.log(`Environment texture ${name} loaded successfully in 4P`);
						entornos[name] = hdrTexture;
					};
					entornos[name] = hdrTexture; // Set it initially
				} catch (error) {
					console.warn(`Error creating environment texture ${name} in 4P:`, error);
					entornos[name] = null;
				}
			});
		}
		
		setupEnvironments4P();

		let skyboxActual = null;

		const personajes = [
			{
				nombre: "Vaca",
				ruta: "textures/vaca/",
				miniatura: "minivaca.png",
				archivo: "scene.gltf",
				posicion: new BABYLON.Vector3(2.6, 0, 0),
				escala: new BABYLON.Vector3(0.6, 0.6, 0.6),
				rotacion: new BABYLON.Vector3(0, -Math.PI / 2, Math.PI)
			},
			{
				nombre: "Trucha",
				ruta: "textures/pez/",
				miniatura: "minitrucha.png",
				archivo: "pez.gltf",
				posicion: new BABYLON.Vector3(1.8, 0.85, 0),
				escala: new BABYLON.Vector3(0.5, 0.5, 0.5),
				rotacion: new BABYLON.Vector3(0, Math.PI / 2, Math.PI)
			},
			{
				nombre: "Pez Payaso",
				ruta: "textures/pezpayaso/",
				miniatura: "minipezpayaso.png",
				archivo: "scene.gltf",
				posicion: new BABYLON.Vector3(1.4, 0.85, 0),
				escala: new BABYLON.Vector3(2.5, 2.5, 2.5),
				rotacion: new BABYLON.Vector3(0, Math.PI / 2, Math.PI)
			}
		];

		// Función para crear UI cuando las traducciones estén listas (4P)
		async function createUI4PWhenReady() {
			console.log('🎮 4P: Iniciando creación de UI con sistema robusto');
			
			// Esperar un momento para que el módulo 4p-main.js termine de inicializar
			let attempts = 0;
			const maxAttempts = 50; // 5 segundos máximo
			
			while (attempts < maxAttempts) {
				// Verificar si el sistema de traducciones está listo (interno o externo)
				const hasTranslations = window.translations && Object.keys(window.translations).length > 0;
				const hasCurrentLang = window.currentLanguage && window.currentLanguage !== 'undefined';
				const hasWindowT = typeof window.t === 'function';
				const isReady = window.translationsReady === true;
				
				console.log(`🔍 4P: Verificando sistema - Intento ${attempts + 1}:`, {
					hasTranslations,
					hasCurrentLang,
					hasWindowT,
					isReady,
					currentLang: window.currentLanguage,
					availableTranslations: Object.keys(window.translations || {})
				});
				
				// Si tenemos al menos las funciones básicas, continuar
				if (hasWindowT && hasCurrentLang && (hasTranslations || isReady)) {
					console.log('✅ 4P: Sistema básico listo, creando UI');
					break;
				}
				
				await new Promise(resolve => setTimeout(resolve, 100));
				attempts++;
			}
			
			if (attempts >= maxAttempts) {
				console.warn('⚠️ 4P: Timeout, creando UI con sistema básico disponible');
			}
			
			// Crear UI 4P con cualquier sistema disponible
			createUI4P(
				advancedTexture,
				scene,
				personajes,
				personajesContenedores,
				entornos,
				skyboxActual
			);
		}
		
		// Llamar la función asíncrona para 4P
		createUI4PWhenReady();
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
			"tableTop", { width: 2.5, depth: 2.5, height: 0.1, faceUV: faceUV }, scene
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

		[[1.2, legY, 1.2], [-1.2, legY, 1.2], [1.2, legY, -1.2], [-1.2, legY, -1.2]]
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
		scene.onBeforeRenderObservable.clear(); // Elimina observadores existentes

		gameActive = false; // Inicializar como inactivo para mostrar selectores
		cambiarEntorno("galaxia", scene, entornos, skyboxActual);
		createPhysics4P(
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