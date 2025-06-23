import { Playground, setGameActive } from "./scene.js";

export var canvas = document.getElementById("renderCanvas");

// Configurar opciones del engine para mayor compatibilidad
const engineOptions = {
	antialias: true,
	stencil: true,
	preserveDrawingBuffer: false,
	powerPreference: "high-performance"
};

// Crear engine con manejo de errores
export var engine;
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
export var scene;
export var scoreP1 = 0;
export var scoreP2 = 0;
export var scoreP3 = 0;
export var scoreP4 = 0;
export var maxScore = 5;

// Refactor updateScoreDisplay to ensure proper synchronization and functionality in IA mode
function updateScoreDisplay() {
    console.log('🤖 updateScoreDisplay IA called (2 Players Only):', {
        scoreP1, scoreP2
    });

    const scoreElement = document.getElementById('score');
    if (!scoreElement) {
        console.warn('⚠️ Score element not found in pong-ia');

        // Attempt to find or create the score display
        const scoreDisplayElement = document.getElementById('scoreDisplay');
        if (scoreDisplayElement) {
            let spanElement = scoreDisplayElement.querySelector('span');
            if (!spanElement) {
                spanElement = document.createElement('span');
                spanElement.id = 'score';
                spanElement.textContent = '0 - 0';
                scoreDisplayElement.appendChild(spanElement);
            } else {
                spanElement.id = 'score';
            }
            updateScoreDisplay(); // Retry now that the element exists
            return;
        }

        // Retry after a delay if the element is still not found
        setTimeout(() => {
            const retryElement = document.getElementById('score');
            if (retryElement) {
                updateScoreDisplay();
            } else {
                console.error('❌ Score element not found in pong-ia after retry');
            }
        }, 1000);
        return;
    }

    // Update the score display for 2 players only
    const displayText = `${scoreP1} - ${scoreP2}`;
    scoreElement.textContent = displayText;
    console.log('📊 IA Score updated (2 Players Only):', displayText);
}

// Exponer variables y funciones globalmente para i18n
window.scoreP1 = scoreP1;
window.scoreP2 = scoreP2;
window.scoreP3 = scoreP3;
window.scoreP4 = scoreP4;

// IMPORTANTE: Prevenir que main.js sobrescriba nuestra función
window.addEventListener('DOMContentLoaded', function() {
    console.log('🤖 IA mode: Sobrescribiendo window.updateScoreDisplay definitivamente');
    
    // Función específica para modo IA que NUNCA mostrará 4 jugadores
    window.updateScoreDisplay = function() {
        console.log('🤖🔥 FUNCIÓN IA GLOBAL EJECUTÁNDOSE - SOLO 2 JUGADORES');
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            const displayText = `${window.scoreP1 || 0} - ${window.scoreP2 || 0}`;
            scoreElement.textContent = displayText;
            console.log('🤖✅ Marcador IA forzado a 2 jugadores:', displayText);
        } else {
            console.log('🤖❌ Elemento score no encontrado en función IA global');
        }
    };
    
    // Llamar inmediatamente
    window.updateScoreDisplay();
});

// IMPORTANTE: Sobrescribir completamente la función updateScoreDisplay para modo IA
window.updateScoreDisplay = function() {
    console.log('🤖🔥 FUNCIÓN IA EJECUTÁNDOSE - Forzando modo 2 jugadores');
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        const displayText = `${window.scoreP1 || 0} - ${window.scoreP2 || 0}`;
        scoreElement.textContent = displayText;
        console.log('🤖✅ Marcador IA forzado a 2 jugadores:', displayText);
    } else {
        console.log('🤖❌ Elemento score no encontrado en función IA global');
    }
};

// También mantener la función local para llamadas directas
updateScoreDisplay = window.updateScoreDisplay;

console.log('🤖 Puntuaciones IA inicializadas:', {
	scoreP1: window.scoreP1,
	scoreP2: window.scoreP2,
	scoreP3: window.scoreP3,
	scoreP4: window.scoreP4
});

// Inicializar el marcador en pantalla cuando el DOM esté listo (IA)
function initializeScoreDisplayIA() {
	console.log('🚀 Inicializando marcador IA, DOM state:', document.readyState);
	
	const scoreElement = document.getElementById('score');
	if (scoreElement) {
		console.log('✅ Elemento score encontrado durante inicialización IA');
		updateScoreDisplay();
	} else {
		console.log('⚠️ Elemento score no encontrado durante inicialización IA, esperando...');
		setTimeout(function() {
			const retryElement = document.getElementById('score');
			if (retryElement) {
				console.log('✅ Elemento score encontrado en reintento IA');
				updateScoreDisplay();
			} else {
				console.log('❌ Elemento score aún no disponible después de esperar (IA)');
			}
		}, 1000);
	}
}

// Esperar a que el DOM esté completamente listo (IA)
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeScoreDisplayIA);
} else if (document.readyState === 'interactive') {
	setTimeout(initializeScoreDisplayIA, 100);
} else {
	initializeScoreDisplayIA();
}

export function changeScore1() {
    scoreP1++;
    window.scoreP1 = scoreP1; // Sincronizar con variable global
    console.log('🤖 Score P1 actualizado (IA):', scoreP1);
    updateScoreDisplay();
}
export function changeScore2() {
    scoreP2++;
    window.scoreP2 = scoreP2; // Sincronizar con variable global
    console.log('🤖 Score P2 actualizado (IA):', scoreP2);
    updateScoreDisplay();
}
export function changeScore3() {
    scoreP3++;
    window.scoreP3 = scoreP3; // Sincronizar con variable global
    console.log('🤖 Score P3 actualizado (IA):', scoreP3);
    updateScoreDisplay();
}
export function changeScore4() {
    scoreP4++;
    window.scoreP4 = scoreP4; // Sincronizar con variable global
    console.log('🤖 Score P4 actualizado (IA):', scoreP4);
    updateScoreDisplay();
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
    
    // Asegurar que el juego inicie inactivo para mostrar selectores
    setGameActive(false);

    scene.executeWhenReady(() => {
        startRenderLoop(scene);

        // Add AI status indicator
        const aiIndicator = document.createElement('div');
        aiIndicator.id = 'aiIndicator';
        aiIndicator.style.position = 'fixed';
        aiIndicator.style.top = '10px';
        aiIndicator.style.right = '190px';
        aiIndicator.style.backgroundColor = '#00ff00';
        aiIndicator.style.color = '#000';
        aiIndicator.style.padding = '10px';
        aiIndicator.style.borderRadius = '5px';
        aiIndicator.style.fontFamily = 'Arial, sans-serif';
        aiIndicator.style.fontWeight = 'bold';
        aiIndicator.style.fontSize = '13px';
        aiIndicator.style.zIndex = '900';
        aiIndicator.textContent = 'AI: ON  (Press T to toggle)';
        document.body.appendChild(aiIndicator);

        // Listen for AI toggle events
        window.addEventListener('keydown', (e) => {
            if (e.key === 't' || e.key === 'T') {
                setTimeout(() => {
                    // Update indicator after a short delay to ensure AI state has changed
                    if (scene && scene.metadata && scene.metadata.physics && scene.metadata.physics.aiConfig) {
                        const isEnabled = scene.metadata.physics.aiConfig.enabled;
                        aiIndicator.textContent = `AI: ${isEnabled ? 'ON' : 'OFF'} (Press T to toggle)`;
                        aiIndicator.style.backgroundColor = isEnabled ? '#00ff00' : '#ff0000';
                    }
                }, 100);
            }
        });

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
            p2_id: 0, // CPU opponent SOCORRO :( 
            winner: playerWon ? 1 : 0,
            game_duration: Math.floor(performance.now() / 1000)
        };

        console.log('Intentando guardar puntuación:', scoreData);
        
        this.disabled = true;
        this.textContent = "Guardando...";

        fetch(`${window.env?.BACKEND_URL || 'http://localhost:3000'}/pong/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Importante para enviar cookies de sesión
            body: JSON.stringify(scoreData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    // Extraer detalles del error del servidor si es posible
                    throw new Error(errorData.error || 'Error al guardar la puntuación');
                }).catch(jsonError => {
                    // Si no podemos parsear el JSON, usar el error genérico
                    throw new Error('Error al guardar la puntuación');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Puntuación guardada exitosamente', data);
            alert(window.t ? window.t('game.score_saved') : '¡Puntuación guardada exitosamente!');
            this.textContent = window.t ? window.t('game.saved') : "¡Guardado!";
            // Opcional: redirigir al dashboard después de un breve retraso
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        })
        .catch(error => {
            console.error('Error al guardar:', error);
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