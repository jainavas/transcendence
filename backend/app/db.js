const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar variable de entorno para la ruta de la base de datos
const dbPath = process.env.DB_PATH || '../data/database.sqlite';

// Crear o abrir la base de datos
const db = new sqlite3.Database(path.join(__dirname, dbPath));

// Crear tablas si no existen
db.serialize(() => {
  // Crear tabla para puntuaciones de pong
  db.run(`CREATE TABLE IF NOT EXISTS pong_scores (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    p1score INTEGER NOT NULL,
    p2score INTEGER NOT NULL,
    opponent TEXT DEFAULT LOCALHUMAN,
    winner BOOLEAN,
    game_duration INTEGER,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error("Error al crear tabla pong_scores:", err);
      return;
    }
    console.log("✅ Tabla pong_scores disponible");
  });

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error("Error al crear la tabla 'users':", err.message);
    } else {
      console.log("Tabla 'users' creada o ya existe.");
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS session_data (
    id TEXT PRIMARY KEY,
    sub TEXT,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error("Error al crear tabla session_data:", err);
      return;
    }
    console.log("✅ Tabla session_data disponible");
  });
});

// Exportar la conexión a la base de datos
module.exports = db;
