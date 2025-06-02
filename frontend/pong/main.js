import { Playground } from "./scene.js";
import { setGameActive } from "./scene.js";

export var canvas = document.getElementById("renderCanvas");
export var engine = new BABYLON.Engine(canvas, true);
export var scene;
export var scoreP1 = 0;
export var scoreP2 = 0;
export var scoreP3 = 0;
export var scoreP4 = 0;
export var maxScore = 5;

export function changeScore1() {
	scoreP1++;
}
export function changeScore2() {
	scoreP2++;
}
export function changeScore3() {
	scoreP3++;
}
export function changeScore4() {
	scoreP4++;
}

var startRenderLoop = function (sceneToRender) {
	engine.runRenderLoop(function () {
		if (sceneToRender && sceneToRender.activeCamera) {
			sceneToRender.render();
		}
	});
};

window.addEventListener("DOMContentLoaded", () => {

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
	document.getElementById('backButton').addEventListener('click', function (e) {
		e.preventDefault(); window.location.href = '/dashboard';
	});
	document.getElementById('returnToDashboardButton').addEventListener('click', function (e) {
		e.preventDefault(); window.location.href = '/dashboard';
	});
	document.getElementById('playAgainButton').addEventListener('click', function () {
		scoreP1 = 0;
		scoreP2 = 0;
		scoreP3 = 0;
		scoreP4 = 0;
		document.getElementById('score').textContent = `${scoreP1} - ${scoreP2}`;
		document.getElementById('gameOver').style.display = 'none';
		setGameActive(false);
		engine.stopRenderLoop();
		scene = Playground.CreateScene(engine, canvas);
		startRenderLoop(scene);
	});
	document.getElementById('saveToDashboardButton').addEventListener('click', function () {
		const playerWon = scoreP1 > scoreP2;

		const scoreData = {

			p1score: scoreP1,
			p2score: scoreP2,
			opponent: "Human Player",
			winner: playerWon ? 1 : 0,
			game_duration: Math.floor(performance.now() / 1000) // Tiempo aproximado en segundos
		};

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
			.then(response => {
				if (!response.ok) {
					throw new Error('Error al guardar la puntuación');
				}
				return response.json();
			})
			.then(data => {
				console.log('Puntuación guardada exitosamente', data);
				alert('¡Puntuación guardada exitosamente!');
				this.textContent = "¡Guardado!";
				// Opcional: redirigir al dashboard después de un breve retraso
				setTimeout(() => {
					window.location.href = '/dashboard';
				}, 1500);
			})
			.catch(error => {
				console.error('Error:', error);
				alert('Error al guardar la puntuación: ' + error.message);
				this.textContent = "Error al guardar";
			})
			.finally(() => {
				// Re-habilitar el botón después de un tiempo
				setTimeout(() => {
					this.disabled = false;
					this.textContent = "Guardar puntuación";
				}, 2000);
			});
	});
	document.getElementById('resetCameraButton').addEventListener('click', function () {
		if (window.resetCamera) {
			window.resetCamera();
		}
	});
});
// Redimensionar
window.addEventListener('resize', function () {
	engine.resize();
});