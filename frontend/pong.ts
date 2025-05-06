import { 
    Engine, Scene, Vector3, MeshBuilder, StandardMaterial, 
    Color3, Color4, HemisphericLight, FreeCamera, ActionManager, 
    ExecuteCodeAction, Animation, KeyboardEventTypes
} from "@babylonjs/core";
import './env-types.js';

// Add env interface declaration
declare global {
  interface Window {
    env: {
      BACKEND_URL?: string;
      FRONTEND_URL?: string;
      GOOGLE_CLIENT_ID?: string;
      NODE_ENV?: string;
    };
  }
}

// Game state variables
let score = 0;
let gameStarted = false;
let gameOver = false;
let gameDuration = 0;
let startTime = 0;
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';

// Game elements
let paddle: any;
let ball: any;
let opponentPaddle: any;
let walls: any[] = [];

// Game settings
const paddleSpeed = 10;
const ballSpeed = 6;
let ballDirection = new Vector3(ballSpeed, 0, ballSpeed);

// Añadir después de las variables globales

// Verificar sesión antes de iniciar el juego
async function checkSession() {
  try {
    const response = await fetch(`${BACKEND_URL}/pong/status`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('No autorizado');
    }
    
    const data = await response.json();
    
    if (!data.available) {
      console.error('El juego no está disponible:', data.reason);
      alert('Debes iniciar sesión para jugar.');
      window.location.href = '/';
      return false;
    }
    
    console.log('✅ Sesión verificada, jugador:', data.user.name);
    return true;
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    alert('Error al verificar tu sesión. Volviendo al inicio...');
    window.location.href = '/';
    return false;
  }
}

// Initialize game
async function initGame() {
  const sessionValid = await checkSession();
  if (!sessionValid) return;
  
    // Get canvas element
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (!canvas) throw new Error("Canvas element not found");
    
    // Create Babylon.js engine and scene
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(
        Color3.FromHexString("#1e293b").r,
        Color3.FromHexString("#1e293b").g,
        Color3.FromHexString("#1e293b").b,
        1
    );
    
    // Create camera
    const camera = new FreeCamera("camera", new Vector3(0, 15, 0), scene);
    camera.setTarget(Vector3.Zero());
    
    // Create light
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    // Create materials
    const paddleMaterial = new StandardMaterial("paddleMaterial", scene);
    paddleMaterial.diffuseColor = Color3.FromHexString("#3b82f6"); // blue
    
    const opponentMaterial = new StandardMaterial("opponentMaterial", scene);
    opponentMaterial.diffuseColor = Color3.FromHexString("#ef4444"); // red
    
    const ballMaterial = new StandardMaterial("ballMaterial", scene);
    ballMaterial.diffuseColor = Color3.FromHexString("#ffffff"); // white
    
    const wallMaterial = new StandardMaterial("wallMaterial", scene);
    wallMaterial.diffuseColor = Color3.FromHexString("#6b7280"); // gray
    
    // Create game board (10x10 units)
    
    // Create walls
    const leftWall = MeshBuilder.CreateBox("leftWall", {width: 0.5, height: 1, depth: 10}, scene);
    leftWall.position = new Vector3(-5.25, 0, 0);
    leftWall.material = wallMaterial;
    walls.push(leftWall);
    
    const rightWall = MeshBuilder.CreateBox("rightWall", {width: 0.5, height: 1, depth: 10}, scene);
    rightWall.position = new Vector3(5.25, 0, 0);
    rightWall.material = wallMaterial;
    walls.push(rightWall);
    
    // Create player paddle
    paddle = MeshBuilder.CreateBox("paddle", {width: 2, height: 0.5, depth: 0.5}, scene);
    paddle.position = new Vector3(0, 0, -4.5);
    paddle.material = paddleMaterial;
    
    // Create opponent paddle
    opponentPaddle = MeshBuilder.CreateBox("opponentPaddle", {width: 2, height: 0.5, depth: 0.5}, scene);
    opponentPaddle.position = new Vector3(0, 0, 4.5);
    opponentPaddle.material = opponentMaterial;
    
    // Create ball
    ball = MeshBuilder.CreateSphere("ball", {diameter: 0.5}, scene);
    ball.position = new Vector3(0, 0.5, 0);
    ball.material = ballMaterial;
    
    // Setup input
    setupInput(scene);
    
    // Game loop
    engine.runRenderLoop(() => {
        if (gameStarted && !gameOver) {
            updateGame();
            gameDuration = (Date.now() - startTime) / 1000;
        }
        scene.render();
    });
    
    // Handle window resize
    window.addEventListener("resize", () => {
        engine.resize();
    });
}

// Setup user input
function setupInput(scene: Scene) {
    // Keyboard controls
    scene.onKeyboardObservable.add((kbInfo) => {
        if (gameOver) return;
        
        if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
            switch (kbInfo.event.code) {
                case "Space":
                    if (!gameStarted) {
                        startGame();
                    }
                    break;
                case "ArrowLeft":
                    movePaddle(-paddleSpeed / 60);
                    break;
                case "ArrowRight":
                    movePaddle(paddleSpeed / 60);
                    break;
            }
        }
    });
    
    // Mouse/touch controls for paddle
    scene.onPointerObservable.add((pointerInfo) => {
        if (gameOver) return;
        
        if (!gameStarted) {
            startGame();
            return;
        }
        
        // Convert pointer x position to game coordinates
        const canvas = scene.getEngine().getRenderingCanvas();
        if (!canvas) return;
        
        const normalizedX = (pointerInfo.event.offsetX / canvas.width) * 2 - 1;
        const targetX = normalizedX * 4; // Scale to game coordinates
        
        // Move towards target position
        const diff = targetX - paddle.position.x;
        if (Math.abs(diff) > 0.1) {
            movePaddle(diff / 10);
        }
    });
    
    // Button controls
    document.getElementById("backButton")?.addEventListener("click", () => {
        window.location.href = "/dashboard";
    });
    
    document.getElementById("playAgainButton")?.addEventListener("click", () => {
        resetGame();
    });
    
    document.getElementById("saveToDashboardButton")?.addEventListener("click", async () => {
        await saveScore();
        document.getElementById("saveToDashboardButton")!.textContent = "¡Guardado!";
        document.getElementById("saveToDashboardButton")!.setAttribute("disabled", "true");
    });
    
    document.getElementById("returnToDashboardButton")?.addEventListener("click", () => {
        window.location.href = "/dashboard";
    });
}

// Move the player paddle
function movePaddle(amount: number) {
    paddle.position.x += amount;
    
    // Clamp within walls
    if (paddle.position.x < -4) {
        paddle.position.x = -4;
    } else if (paddle.position.x > 4) {
        paddle.position.x = 4;
    }
}

// Start the game
function startGame() {
    gameStarted = true;
    startTime = Date.now();
    
    // Reset ball position
    ball.position = new Vector3(0, 0.5, 0);
    
    // Set random initial ball direction
    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    ballDirection = new Vector3(
        Math.sin(angle) * ballSpeed, 
        0, 
        ballSpeed
    );
}

// Update game state
function updateGame() {
    // Move ball
    ball.position.addInPlace(ballDirection.scale(1/60));
    
    // Ball collision with walls
    if (ball.position.x < -4.5 || ball.position.x > 4.5) {
        ballDirection.x *= -1;
    }
    
    // Ball collision with paddles
    if (ball.position.z <= -4.25 && 
        ball.position.x >= paddle.position.x - 1 &&
        ball.position.x <= paddle.position.x + 1) {
        
        ballDirection.z *= -1;
        
        // Adjust x direction based on where the ball hit the paddle
        const hitPos = ball.position.x - paddle.position.x;
        ballDirection.x = hitPos * 2; // Adjust multiplier for different bounce angles
        
        // Normalize ball speed
        const magnitude = Math.sqrt(ballDirection.x * ballDirection.x + ballDirection.z * ballDirection.z);
        ballDirection = ballDirection.scale(ballSpeed / magnitude);
        
        // Increase score
        updateScore(10);
    }
    
    // Simple AI for opponent paddle
    const targetX = ball.position.x * 0.8; // Not perfect tracking
    const diff = targetX - opponentPaddle.position.x;
    opponentPaddle.position.x += diff * 0.05; // Adjust for difficulty
    
    // Collision with opponent paddle
    if (ball.position.z >= 4.25 && 
        ball.position.x >= opponentPaddle.position.x - 1 &&
        ball.position.x <= opponentPaddle.position.x + 1) {
        
        ballDirection.z *= -1;
        
        // Adjust x direction based on where the ball hit the paddle
        const hitPos = ball.position.x - opponentPaddle.position.x;
        ballDirection.x = hitPos * 2;
        
        // Normalize ball speed
        const magnitude = Math.sqrt(ballDirection.x * ballDirection.x + ballDirection.z * ballDirection.z);
        ballDirection = ballDirection.scale(ballSpeed / magnitude);
    }
    
    // Game over conditions
    if (ball.position.z < -5 || ball.position.z > 5) {
        endGame(ball.position.z < -5);
    }
}

// Update the score display
function updateScore(points: number) {
    score += points;
    const scoreDisplay = document.getElementById("score");
    if (scoreDisplay) {
        scoreDisplay.textContent = score.toString();
    }
}

// End the game
function endGame(playerLost: boolean) {
    gameOver = true;
    
    const gameOverScreen = document.getElementById("gameOver");
    const finalScoreDisplay = document.getElementById("finalScore");
    
    if (gameOverScreen && finalScoreDisplay) {
        gameOverScreen.style.display = "block";
        finalScoreDisplay.textContent = score.toString();
    }
}

// Reset the game
function resetGame() {
    score = 0;
    updateScore(0);
    gameOver = false;
    gameStarted = false;
    
    // Hide game over screen
    const gameOverScreen = document.getElementById("gameOver");
    if (gameOverScreen) {
        gameOverScreen.style.display = "none";
    }
    
    // Reset button states
    const saveButton = document.getElementById("saveToDashboardButton");
    if (saveButton) {
        saveButton.textContent = "Guardar puntuación";
        saveButton.removeAttribute("disabled");
    }
    
    // Reset positions
    ball.position = new Vector3(0, 0.5, 0);
    paddle.position = new Vector3(0, 0, -4.5);
    opponentPaddle.position = new Vector3(0, 0, 4.5);
}

// Save score to the backend
async function saveScore() {
    try {
        const response = await fetch(`${BACKEND_URL}/pong/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                score: score,
                opponent: 'CPU',
                winner: ball.position.z > 5, // Win if the ball passed the opponent
                game_duration: Math.round(gameDuration)
            })
        });
        
        if (!response.ok) {
            throw new Error("Error al guardar puntuación");
        }
        
        console.log("Puntuación guardada con éxito");
        return await response.json();
    } catch (error) {
        console.error("Error guardando puntuación:", error);
        alert("Error al guardar la puntuación. Por favor, inténtalo de nuevo.");
    }
}

// Initialize the game when the page loads
window.addEventListener("DOMContentLoaded", initGame);