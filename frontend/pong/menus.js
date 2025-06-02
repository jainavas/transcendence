export function cambiarEntorno(nombre, scene, entornos, skyboxActual) {
	const nuevoHDR = entornos[nombre];
	scene.environmentTexture = nuevoHDR;

	if (skyboxActual)
		skyboxActual.dispose();

	skyboxActual = scene.createDefaultSkybox(nuevoHDR, true, 1000);
}
export var mensajeInicio = null;

export var puntoTexto = null;
export function anunciarPunto(puntoTexto, message, scene) {
	puntoTexto.text = message; // "¡Punto para el jugador 1!"
	puntoTexto.alpha = 1;
	puntoTexto.scaleX = 0.5;
	puntoTexto.scaleY = 0.5;

	// Animación de escala y fade-in
	const animScaleX = new BABYLON.Animation("scaleX", "scaleX", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const animScaleY = new BABYLON.Animation("scaleY", "scaleY", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
	const animAlpha = new BABYLON.Animation("alpha", "alpha", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT);

	animScaleX.setKeys([
		{ frame: 0, value: 0.5 },
		{ frame: 10, value: 1.2 },
		{ frame: 20, value: 1.0 }
	]);

	animScaleY.setKeys([
		{ frame: 0, value: 0.5 },
		{ frame: 10, value: 1.2 },
		{ frame: 20, value: 1.0 }
	]);

	animAlpha.setKeys([
		{ frame: 0, value: 0 },
		{ frame: 5, value: 1 },
		{ frame: 60, value: 1 },
		{ frame: 90, value: 0 }
	]);

	scene.beginDirectAnimation(puntoTexto, [animScaleX, animScaleY, animAlpha], 0, 90, false);

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

			let posicion = personajeConfig.posicion.clone();
			let rotacion = personajeConfig.rotacion.clone();

			// Ajustar posición y rotación según el lado
			switch (lado) {
				case "izquierda":
					// Invertir X para el lado izquierdo
					posicion.x = posicion.x * -1;
					break;

				case "derecha":
					// Usar posición X original
					// Invertir rotación Y para el lado derecho
					rotacion.y = Math.PI * 2 - rotacion.y;
					break;
				case "abajo":
					// Intercambiar X y Z para el lado superior
					const tempX = posicion.x;
					posicion.x = posicion.z;
					posicion.z = -tempX;
					// Rotar 90 grados desde la posición normal
					rotacion.y -= Math.PI / 2;
					break;

				case "arriba":
					// Intercambiar X y Z para el lado inferior
					const tempX2 = posicion.x;
					posicion.x = -posicion.z;
					posicion.z = tempX2;
					// Rotar -90 grados desde la posición normal
					rotacion.y += Math.PI / 2;
					break;
			}

			// Asignar posición y rotación
			contenedor.position = posicion;
			contenedor.rotation = rotacion;

			if (callback) {
				callback({ contenedor, meshes, skeletons, animationGroups });
			}
		}
	);
}

export var advancedTexture = null;
export function createUI(advancedTexture, scene, personajes, personajesContenedores, entornos, skyboxActual) {
	advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	const panelIzquierda = new BABYLON.GUI.StackPanel();
	panelIzquierda.isVertical = true;
	panelIzquierda.height = "400px";
	panelIzquierda.width = "120px";
	panelIzquierda.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
	panelIzquierda.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelIzquierda.top = "70px";
	panelIzquierda.left = "-15px";
	advancedTexture.addControl(panelIzquierda);

	const panelDerecha = new BABYLON.GUI.StackPanel();
	panelDerecha.isVertical = true;
	panelDerecha.height = "400px";
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
	panelCentro.width = "300px";
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
			if (nombre === "cielo" || nombre === "city") scene.environmentIntensity = 0.5;
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

	puntoTexto = new BABYLON.GUI.TextBlock("puntoTexto");
	puntoTexto.text = "";
	puntoTexto.color = "#FFD700"; // dorado
	puntoTexto.fontSize = 60;
	puntoTexto.fontStyle = "bold";
	puntoTexto.fontFamily = "Arial";
	puntoTexto.outlineColor = "black";
	puntoTexto.outlineWidth = 8;
	puntoTexto.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	puntoTexto.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
	puntoTexto.alpha = 0;
	puntoTexto.top = "-200px"; // Ajusta la posición vertical
	puntoTexto.isHitTestVisible = false;
	advancedTexture.addControl(puntoTexto);

	mensajeInicio = new BABYLON.GUI.TextBlock("mensajeInicio");
	mensajeInicio.text = "Elige tu personaje y entorno\nPresiona ESPACIO para iniciar";
	mensajeInicio.color = "#FFFFFF";
	mensajeInicio.fontSize = 48;
	mensajeInicio.fontStyle = "bold";
	mensajeInicio.fontFamily = "Arial";
	mensajeInicio.outlineColor = "black";
	mensajeInicio.outlineWidth = 6;
	mensajeInicio.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	mensajeInicio.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	mensajeInicio.alpha = 1;
	mensajeInicio.top = "-50px"; // Ajusta la posición vertical
	mensajeInicio.isHitTestVisible = false;
	advancedTexture.addControl(mensajeInicio);
}

export function createUI4P(advancedTexture, scene, personajes, personajesContenedores, entornos, skyboxActual) {
	advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	const panelIzquierda = new BABYLON.GUI.StackPanel();
	panelIzquierda.isVertical = true;
	panelIzquierda.height = "400px";
	panelIzquierda.width = "120px";
	panelIzquierda.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
	panelIzquierda.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelIzquierda.top = "70px";
	panelIzquierda.left = "-15px";
	advancedTexture.addControl(panelIzquierda);

	const panelDerecha = new BABYLON.GUI.StackPanel();
	panelDerecha.isVertical = true;
	panelDerecha.height = "400px";
	panelDerecha.width = "120px";
	panelDerecha.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
	panelDerecha.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelDerecha.top = "70px";
	panelDerecha.left = "15px";  // para separarlo del borde derecho
	advancedTexture.addControl(panelDerecha);

	const panelAbajo = new BABYLON.GUI.StackPanel();
	panelAbajo.isVertical = false;
	panelAbajo.height = "120px";
	panelAbajo.width = "400px";
	panelAbajo.top = "20px";
	panelAbajo.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	panelAbajo.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	advancedTexture.addControl(panelAbajo);

	const panelArriba = new BABYLON.GUI.StackPanel();
	panelArriba.isVertical = false;
	panelArriba.height = "120px";
	panelArriba.width = "400px";
	panelArriba.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	panelArriba.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelArriba.top = "-10px";
	advancedTexture.addControl(panelArriba);
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

		const btnabj = BABYLON.GUI.Button.CreateImageOnlyButton("abj_" + p.nombre, (p.ruta + "abj" + p.miniatura));
		btnabj.width = "100px";
		btnabj.height = "100px";
		btnabj.cornerRadius = 20;
		btnabj.thickness = 0;
		btnabj.paddingRight = "0px";
		btnabj.background = "transparent";
		btnabj.onPointerUpObservable.add(() => {
			cargarPersonajeEnLado({
				personajeConfig: personajes[index], lado: "abajo", escena: scene, personajesContenedores: personajesContenedores, callback: function ({ animationGroups }) {
					const idle = animationGroups[0];
					if (idle) idle.start(true);
				}
			});
		});
		panelAbajo.addControl(btnabj);

		const btnarr = BABYLON.GUI.Button.CreateImageOnlyButton("arr_" + p.nombre, (p.ruta + "arr" + p.miniatura));
		btnarr.width = "100px";
		btnarr.height = "100px";
		btnarr.cornerRadius = 20;
		btnarr.thickness = 0;
		btnarr.paddingRight = "0px";
		btnarr.background = "transparent";
		btnarr.onPointerUpObservable.add(() => {
			cargarPersonajeEnLado({
				personajeConfig: personajes[index], lado: "arriba", escena: scene, personajesContenedores: personajesContenedores, callback: function ({ animationGroups }) {
					const idle = animationGroups[0];
					if (idle) idle.start(true);
				}
			});
		});
		panelArriba.addControl(btnarr);

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
	panelCentro.width = "300px";
	panelCentro.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	panelCentro.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
	panelCentro.top = "80px";
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
			if (nombre === "cielo" || nombre === "city") scene.environmentIntensity = 0.5;
			else scene.environmentIntensity = 5;
			cambiarEntorno(nombre, scene, entornos, skyboxActual);
		});

		panelCentro.addControl(boton);
	});

	cargarPersonajeEnLado({
		personajeConfig: personajes[0],
		lado: "derecha",
		escena: scene,
		personajesContenedores: personajesContenedores,
		callback: function ({ animationGroups }) {
			const idle = animationGroups[0];
			if (idle) idle.start(true);
		}
	});

	cargarPersonajeEnLado({
		personajeConfig: personajes[1],
		lado: "abajo",
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

	cargarPersonajeEnLado({
		personajeConfig: personajes[3],
		lado: "arriba",
		escena: scene,
		personajesContenedores: personajesContenedores,
		callback: function ({ animationGroups }) {
			const idle = animationGroups[0];
			if (idle) idle.start(true);
		}
	});

	puntoTexto = new BABYLON.GUI.TextBlock("puntoTexto");
	puntoTexto.text = "";
	puntoTexto.color = "#FFD700"; // dorado
	puntoTexto.fontSize = 60;
	puntoTexto.fontStyle = "bold";
	puntoTexto.fontFamily = "Arial";
	puntoTexto.outlineColor = "black";
	puntoTexto.outlineWidth = 8;
	puntoTexto.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	puntoTexto.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
	puntoTexto.alpha = 0;
	puntoTexto.top = "-200px"; // Ajusta la posición vertical
	puntoTexto.isHitTestVisible = false;
	advancedTexture.addControl(puntoTexto);

	mensajeInicio = new BABYLON.GUI.TextBlock("mensajeInicio");
	mensajeInicio.text = "Elige tu personaje y entorno\nPresiona ESPACIO para iniciar";
	mensajeInicio.color = "#FFFFFF";
	mensajeInicio.fontSize = 48;
	mensajeInicio.fontStyle = "bold";
	mensajeInicio.fontFamily = "Arial";
	mensajeInicio.outlineColor = "black";
	mensajeInicio.outlineWidth = 6;
	mensajeInicio.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	mensajeInicio.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	mensajeInicio.alpha = 1;
	mensajeInicio.top = "-150px"; // Ajusta la posición vertical
	mensajeInicio.isHitTestVisible = false;
	advancedTexture.addControl(mensajeInicio);
}