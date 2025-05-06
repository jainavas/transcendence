// Game state variables
let score = 0;
let gameStarted = false;
let gameOver = false;
let gameDuration = 0;
let startTime = 0;
const BACKEND_URL = window.env?.BACKEND_URL || 'http://localhost:3000';

// Game elements
let paddle;
let ball;
let opponentPaddle;
let walls = [];

// Game settings
const paddleSpeed = 10;
const ballSpeed = 6;
let ballDirection;

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
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) throw new Error("Canvas element not found");
  
  // Create Babylon.js engine and scene
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(
      BABYLON.Color3.FromHexString("#1e293b").r,
      BABYLON.Color3.FromHexString("#1e293b").g,
      BABYLON.Color3.FromHexString("#1e293b").b,
      1
  );
  
  // Create camera
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 15, 0), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  
  // Create light
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;
  
  // Create materials
  const paddleMaterial = new BABYLON.StandardMaterial("paddleMaterial", scene);
  paddleMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3b82f6"); // blue
  
  const opponentMaterial = new BABYLON.StandardMaterial("opponentMaterial", scene);
  opponentMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ef4444"); // red
  
  const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", scene);
  ballMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ffffff"); // white
  
  const wallMaterial = new BABYLON.StandardMaterial("wallMaterial", scene);
  wallMaterial.diffuseColor = BABYLON.Color3.FromHexString("#6b7280"); // gray
  
  // Create walls
  const leftWall = BABYLON.MeshBuilder.CreateBox("leftWall", {width: 0.5, height: 1, depth: 10}, scene);
  leftWall.position = new BABYLON.Vector3(-5.25, 0, 0);
  leftWall.material = wallMaterial;
  walls.push(leftWall);
  
  const rightWall = BABYLON.MeshBuilder.CreateBox("rightWall", {width: 0.5, height: 1, depth: 10}, scene);
  rightWall.position = new BABYLON.Vector3(5.25, 0, 0);
  rightWall.material = wallMaterial;
  walls.push(rightWall);
  
  // Create player paddle
  paddle = BABYLON.MeshBuilder.CreateBox("paddle", {width: 2, height: 0.5, depth: 0.5}, scene);
  paddle.position = new BABYLON.Vector3(0, 0, -4.5);
  paddle.material = paddleMaterial;
  
  // Create opponent paddle
  opponentPaddle = BABYLON.MeshBuilder.CreateBox("opponentPaddle", {width: 2, height: 0.5, depth: 0.5}, scene);
  opponentPaddle.position = new BABYLON.Vector3(0, 0, 4.5);
  opponentPaddle.material = opponentMaterial;
  
  // Create ball
  ball = BABYLON.MeshBuilder.CreateSphere("ball", {diameter: 0.5}, scene);
  ball.position = new BABYLON.Vector3(0, 0.5, 0);
  ball.material = ballMaterial;
  
  // Initialize ball direction
  ballDirection = new BABYLON.Vector3(ballSpeed, 0, ballSpeed);
  
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

// Resto del código (setupInput, movePaddle, startGame, etc.)...