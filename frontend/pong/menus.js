export function cambiarEntorno(nombre, scene, entornos, skyboxActual) {
	const nuevoHDR = entornos[nombre];
	scene.environmentTexture = nuevoHDR;

	if (skyboxActual)
		skyboxActual.dispose();

	skyboxActual = scene.createDefaultSkybox(nuevoHDR, true, 1000);
}

export function cargarPersonajeEnLado({
	personajeConfig,
	lado = "izquierda",
	escena,
	personajesContenedores,
	callback
}) {
	if (personajesContenedores[lado]) {
		personajesContenedores[lado].dispose();
		personajesContenedores[lado] = null;
	}
	const nombreContenedor = `${personajeConfig.nombre}_${lado}`;
	BABYLON.SceneLoader.ImportMesh(
		null,
		personajeConfig.ruta,
		personajeConfig.archivo,
		escena,
		function (meshes, particleSystems, skeletons, animationGroups) {
			// Eliminar contenedor anterior si existe
			const anterior = escena.getNodeByName(nombreContenedor);
			if (anterior) anterior.dispose();

			const contenedor = new BABYLON.TransformNode(nombreContenedor, escena);
			personajesContenedores[lado] = contenedor;

			meshes.forEach(mesh => {
				mesh.setParent(contenedor);
				if (mesh.rotationQuaternion) mesh.rotationQuaternion = null;
			});

			contenedor.scaling = personajeConfig.escala.clone();

			// Crear posición correctamente según el lado
			let posicion = personajeConfig.posicion.clone();
			if (lado === "izquierda") {
				posicion.x = posicion.x * -1; // Invertir X para el lado izquierdo
			}
			contenedor.position = posicion; // Asignar la posición modificada

			// Configurar rotación según el lado
			let rotacion = personajeConfig.rotacion.clone();
			if (lado === "derecha") {
				rotacion.y = Math.PI * 2 - rotacion.y; // Invertir rotación Y para el lado derecho
			}
			contenedor.rotation = rotacion;

			if (callback) {
				callback({ contenedor, meshes, skeletons, animationGroups });
			}
		}
	);
}

export function createUI(scene, personajes, personajesContenedores, entornos, skyboxActual) {
	const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	const panelIzquierda = new BABYLON.GUI.StackPanel();
	panelIzquierda.isVertical = true;
	panelIzquierda.height = "300px";
	panelIzquierda.width = "120px";
	panelIzquierda.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
	panelIzquierda.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelIzquierda.top = "70px";
	panelIzquierda.left = "-15px";
	advancedTexture.addControl(panelIzquierda);

	const panelDerecha = new BABYLON.GUI.StackPanel();
	panelDerecha.isVertical = true;
	panelDerecha.height = "300px";
	panelDerecha.width = "120px";
	panelDerecha.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
	panelDerecha.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelDerecha.top = "70px";
	panelDerecha.left = "15px";  // para separarlo del borde derecho
	advancedTexture.addControl(panelDerecha);

	// Luego rellenas cada panel con sus botones correspondientes
	personajes.forEach((p, index) => {
		const btnIzq = BABYLON.GUI.Button.CreateImageOnlyButton("izq_" + p.nombre, (p.ruta + "izq" + p.miniatura));
		btnIzq.width = "100px";
		btnIzq.height = "100px";
		btnIzq.cornerRadius = 20;
		btnIzq.thickness = 0;
		btnIzq.paddingRight = "0px";
		btnIzq.background = "transparent";
		btnIzq.onPointerUpObservable.add(() => {
			cargarPersonajeEnLado({
				personajeConfig: personajes[index], lado: "izquierda", escena: scene, personajesContenedores: personajesContenedores, callback: function ({ animationGroups }) {
					const idle = animationGroups[0];
					if (idle) idle.start(true);
				}
			});
		});
		panelIzquierda.addControl(btnIzq);

		const btnDer = BABYLON.GUI.Button.CreateImageOnlyButton("der_" + p.nombre, (p.ruta + p.miniatura));
		btnDer.width = "100px";
		btnDer.height = "100px";
		btnDer.cornerRadius = 20;
		btnDer.thickness = 0;
		btnDer.paddingLeft = "0px";
		btnDer.background = "transparent";
		btnDer.onPointerUpObservable.add(() => {
			cargarPersonajeEnLado({
				personajeConfig: personajes[index], lado: "derecha", escena: scene, personajesContenedores: personajesContenedores, callback: function ({ animationGroups }) {
					const idle = animationGroups[0];
					if (idle) idle.start(true);
				}
			});
		});
		panelDerecha.addControl(btnDer);
	});

	const panelCentro = new BABYLON.GUI.StackPanel();
	panelCentro.isVertical = false;
	panelCentro.height = "100px";
	panelCentro.width = "200px";
	panelCentro.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	panelCentro.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelCentro.top = "20px";
	panelCentro.left = "0px";
	advancedTexture.addControl(panelCentro);

	Object.keys(entornos).forEach(nombre => {
		const boton = BABYLON.GUI.Button.CreateImageOnlyButton("btn_" + nombre, "textures/mini" + nombre + ".png");
		boton.width = "100px";
		boton.height = "60px";
		boton.cornerRadius = 6;
		boton.background = "transparent";
		boton.thickness = 0;
		boton.paddingLeft = "10px";
		boton.onPointerUpObservable.add(() => {
			if (nombre === "cielo") scene.environmentIntensity = 0.5;
			else scene.environmentIntensity = 5;
			cambiarEntorno(nombre, scene, entornos, skyboxActual);
		});

		panelCentro.addControl(boton);
	});

	cargarPersonajeEnLado({
		personajeConfig: personajes[1],
		lado: "derecha",
		escena: scene,
		personajesContenedores: personajesContenedores,
		callback: function ({ animationGroups }) {
			const idle = animationGroups[0];
			if (idle) idle.start(true);
		}
	});

	cargarPersonajeEnLado({
		personajeConfig: personajes[2],
		lado: "izquierda",
		escena: scene,
		personajesContenedores: personajesContenedores,
		callback: function ({ animationGroups }) {
			const idle = animationGroups[0];
			if (idle) idle.start(true);
		}
	});
}