// Importar tipos de entorno
import './env-types.js';

// Declarar BABYLON como variable global ya que lo cargamos desde CDN
declare var BABYLON: any;

// Variables de entorno
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';

// Game state variables
let score: number = 0;
let gameStarted: boolean = false;
let gameOver: boolean = false;

// Game elements
let canvas: HTMLCanvasElement;
let engine: any;
let scene: any;
let camera: any;
let paddle: any;
let ball: any;
let opponentPaddle: any;
let walls: any[] = [];

// Game settings
const paddleSpeed: number = 10;
const ballSpeed: number = 6;
let ballDirection: any;
let currentUser: any = null;

// Input variables
let leftPressed: boolean = false;
let rightPressed: boolean = false;

/**
 * Verifica si el usuario está autenticado
 */
async function checkSession(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/user/me`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('No autenticado');
    }
    
    const data = await response.json();
    if (!data.authenticated || !data.user) {
      return false;
    }
    
    currentUser = data.user;
    console.log('✅ Usuario verificado:', currentUser.name);
    return true;
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return false;
  }
}

/**
 * Inicializa el motor de juego Babylon.js
 */
async function initGame() {
  // Verificar autenticación
  const isAuthenticated = await checkSession();
  if (!isAuthenticated) {
    alert('Debes iniciar sesión para jugar');
    window.location.href = '/';
    return;
  }

  // Setup canvas y engine
  canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  engine = new BABYLON.Engine(canvas, true);
  
  // Crear escena
  createScene();
  
  // Iniciar renderizado
  engine.runRenderLoop(() => {
    if (gameStarted && !gameOver) {
      updateGame();
    }
    scene.render();
  });
  
  // Manejar redimensionamiento de ventana
  window.addEventListener('resize', () => {
    engine.resize();
  });
  
  // Setup de eventos UI
  setupUIEvents();
}

/**
 * Crea la escena del juego
 */
function createScene() {
  // Crear escena
  scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0.2, 1);
  
  // Crear cámara
  camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 15, -5), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  
  // Crear luz
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;
  
  // Crear materiales
  const paddleMaterial = new BABYLON.StandardMaterial('paddleMaterial', scene);
  paddleMaterial.diffuseColor = BABYLON.Color3.FromHexString('#3b82f6'); // blue
  
  const opponentMaterial = new BABYLON.StandardMaterial('opponentMaterial', scene);
  opponentMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ef4444'); // red
  
  const ballMaterial = new BABYLON.StandardMaterial('ballMaterial', scene);
  ballMaterial.diffuseColor = BABYLON.Color3.FromHexString('#ffffff'); // white
  
  const wallMaterial = new BABYLON.StandardMaterial('wallMaterial', scene);
  wallMaterial.diffuseColor = BABYLON.Color3.FromHexString('#6b7280'); // gray
  
  // Crear paredes
  const leftWall = BABYLON.MeshBuilder.CreateBox('leftWall', {width: 0.5, height: 1, depth: 20}, scene);
  leftWall.position = new BABYLON.Vector3(-10, 0, 0);
  leftWall.material = wallMaterial;
  walls.push(leftWall);
  
  const rightWall = BABYLON.MeshBuilder.CreateBox('rightWall', {width: 0.5, height: 1, depth: 20}, scene);
  rightWall.position = new BABYLON.Vector3(10, 0, 0);
  rightWall.material = wallMaterial;
  walls.push(rightWall);
  
  // Crear paddle del jugador
  paddle = BABYLON.MeshBuilder.CreateBox('paddle', {width: 3, height: 0.5, depth: 1}, scene);
  paddle.position = new BABYLON.Vector3(0, 0, 8);
  paddle.material = paddleMaterial;
  
  // Crear paddle del oponente
  opponentPaddle = BABYLON.MeshBuilder.CreateBox('opponentPaddle', {width: 3, height: 0.5, depth: 1}, scene);
  opponentPaddle.position = new BABYLON.Vector3(0, 0, -8);
  opponentPaddle.material = opponentMaterial;
  
  // Crear pelota
  ball = BABYLON.MeshBuilder.CreateSphere('ball', {diameter: 0.8}, scene);
  ball.position = new BABYLON.Vector3(0, 0.5, 0);
  ball.material = ballMaterial;
  
  // Inicializar dirección de la pelota
  resetBall();
  
  // Setup de input
  setupInput();
  
  // Iniciar juego
  startGame();
}

/**
 * Configura los controles de input
 */
function setupInput() {
  scene.onKeyboardObservable.add((kbInfo) => {
    switch (kbInfo.type) {
      case BABYLON.KeyboardEventTypes.KEYDOWN:
        if (kbInfo.event.key === 'ArrowLeft' || kbInfo.event.key === 'a') {
          leftPressed = true;
        } else if (kbInfo.event.key === 'ArrowRight' || kbInfo.event.key === 'd') {
          rightPressed = true;
        }
        break;
      case BABYLON.KeyboardEventTypes.KEYUP:
        if (kbInfo.event.key === 'ArrowLeft' || kbInfo.event.key === 'a') {
          leftPressed = false;
        } else if (kbInfo.event.key === 'ArrowRight' || kbInfo.event.key === 'd') {
          rightPressed = false;
        }
        break;
    }
  });
}

/**
 * Configura los eventos de UI
 */
function setupUIEvents() {
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }
  
  const playAgainButton = document.getElementById('playAgainButton');
  if (playAgainButton) {
    playAgainButton.addEventListener('click', resetGame);
  }
  
  const saveScoreButton = document.getElementById('saveScoreButton');
  if (saveScoreButton) {
    saveScoreButton.addEventListener('click', saveScore);
  }
  
  const returnToDashboardButton = document.getElementById('returnToDashboardButton');
  if (returnToDashboardButton) {
    returnToDashboardButton.addEventListener('click', () => {
      window.location.href = '/dashboard';
    });
  }
}

/**
 * Inicia el juego
 */
function startGame() {
  gameStarted = true;
  gameOver = false;
  score = 0;
  updateScoreDisplay();
}

/**
 * Reinicia el juego
 */
function resetGame() {
  document.getElementById('gameOver').style.display = 'none';
  resetBall();
  startGame();
}

/**
 * Reinicia la pelota a su posición inicial
 */
function resetBall() {
  ball.position = new BABYLON.Vector3(0, 0.5, 0);
  
  // Dirección aleatoria en X
  const xDir = Math.random() > 0.5 ? ballSpeed : -ballSpeed;
  // Dirección aleatoria en Z
  const zDir = Math.random() > 0.5 ? ballSpeed : -ballSpeed;
  
  ballDirection = new BABYLON.Vector3(xDir, 0, zDir);
}

/**
 * Actualiza la física y la lógica del juego
 */
function updateGame() {
  // Mover paddle basado en input
  if (leftPressed) {
    paddle.position.x -= paddleSpeed * engine.getDeltaTime() / 100;
  }
  if (rightPressed) {
    paddle.position.x += paddleSpeed * engine.getDeltaTime() / 100;
  }
  
  // Limitar posición del paddle
  if (paddle.position.x < -8) paddle.position.x = -8;
  if (paddle.position.x > 8) paddle.position.x = 8;
  
  // Mover pelota
  ball.position.addInPlace(
    ballDirection.scale(engine.getDeltaTime() / 100)
  );
  
  // Mover paddle del oponente (AI simple)
  moveOpponentPaddle();
  
  // Detectar colisiones
  checkCollisions();
}

/**
 * Mueve el paddle oponente con IA simple
 */
function moveOpponentPaddle() {
  const aiSpeed = paddleSpeed * 0.8 * engine.getDeltaTime() / 100;
  if (ball.position.x < opponentPaddle.position.x - 0.5) {
    opponentPaddle.position.x -= aiSpeed;
  } else if (ball.position.x > opponentPaddle.position.x + 0.5) {
    opponentPaddle.position.x += aiSpeed;
  }
  
  // Limitar posición del paddle
  if (opponentPaddle.position.x < -8) opponentPaddle.position.x = -8;
  if (opponentPaddle.position.x > 8) opponentPaddle.position.x = 8;
}

/**
 * Verifica colisiones de la pelota
 */
function checkCollisions() {
  // Colisión con paredes laterales
  if (ball.position.x <= -9.5 || ball.position.x >= 9.5) {
    ballDirection.x = -ballDirection.x;
  }
  
  // Colisión con paddle del jugador
  if (ball.position.z >= 7.5 && ball.position.z <= 8.5 &&
      ball.position.x >= paddle.position.x - 1.5 && 
      ball.position.x <= paddle.position.x + 1.5) {
    ballDirection.z = -ballDirection.z;
    // Aumentar velocidad ligeramente
    ballDirection = ballDirection.scale(1.05);
    score += 10;
    updateScoreDisplay();
  }
  
  // Colisión con paddle del oponente
  if (ball.position.z <= -7.5 && ball.position.z >= -8.5 &&
      ball.position.x >= opponentPaddle.position.x - 1.5 && 
      ball.position.x <= opponentPaddle.position.x + 1.5) {
    ballDirection.z = -ballDirection.z;
    // Aumentar velocidad ligeramente
    ballDirection = ballDirection.scale(1.05);
    score += 5;
    updateScoreDisplay();
  }
  
  // Game over si la pelota pasa el paddle del jugador
  if (ball.position.z > 10) {
    endGame();
  }
}

/**
 * Actualiza el display de puntuación
 */
function updateScoreDisplay() {
  const scoreElement = document.getElementById('score');
  if (scoreElement) {
    scoreElement.textContent = score.toString();
  }
}

/**
 * Finaliza el juego
 */
function endGame() {
  gameOver = true;
  
  // Mostrar panel de game over
  const gameOverPanel = document.getElementById('gameOver');
  const finalScoreElement = document.getElementById('finalScore');
  
  if (gameOverPanel && finalScoreElement) {
    finalScoreElement.textContent = score.toString();
    gameOverPanel.style.display = 'block';
  }
}

/**
 * Guarda la puntuación en el servidor
 */
async function saveScore() {
  try {
    const response = await fetch(`${BACKEND_URL}/pong/scores`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ score })
    });
    
    if (!response.ok) {
      throw new Error('Error al guardar puntuación');
    }
    
    const result = await response.json();
    console.log('✅ Puntuación guardada:', result);
    alert('¡Puntuación guardada con éxito!');
    
    // Redirigir al dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Error al guardar puntuación:', error);
    alert('Error al guardar la puntuación. Inténtalo de nuevo.');
  }
}

// Iniciar el juego cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', initGame);