const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar variable de entorno para la ruta de la base de datos
const dbPath = process.env.DB_PATH || '../data/database.sqlite';

// Crear o abrir la base de datos
const db = new sqlite3.Database(path.join(__dirname, dbPath));

// Crear tablas si no existen
db.serialize(() => {
	// Crear tabla para puntuaciones de pong
	db.run(`-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  google_id TEXT UNIQUE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL UNIQUE,
  user_picture TEXT
);`, (err) => {
		if (err) {
			console.error("Error al crear tabla users:", err);
			return;
		}
		console.log("✅ Tabla users disponible");
	});
	db.run(`-- Tabla de sesiones (puede estar ligada a users.email si lo deseas)
CREATE TABLE IF NOT EXISTS session_data (
  id TEXT PRIMARY KEY, -- UUID
  sub TEXT,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email) REFERENCES users(user_email) ON DELETE SET NULL
);
`, (err) => {
		if (err) {
			console.error("Error al crear tabla session_data:", err);
			return;
		}
		console.log("✅ Tabla session_data disponible");
	});
});
db.run(`
-- Tabla de puntuaciones de Pong
CREATE TABLE IF NOT EXISTS pong_scores (
  id INTEGER PRIMARY KEY,
  p1_id TEXT NOT NULL,
  p1score INTEGER NOT NULL,
  p2score INTEGER NOT NULL,
  p2_id TEXT DEFAULT 0,
  winner BOOLEAN,
  game_duration INTEGER,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Clave foránea
  FOREIGN KEY (p1_id) REFERENCES users(google_id) ON DELETE SET NULL,
  FOREIGN KEY (p2_id) REFERENCES users(google_id) ON DELETE SET NULL
);
`, (err) => {
	if (err) {
		console.error("Error al crear tabla pong_scores:", err);
		return;
	}
	console.log("✅ Tabla pong_scores disponible");
}
);
db.run(`
CREATE INDEX IF NOT EXISTS idx_pong_scores_user_id ON pong_scores(p1_id);
`, (err) => {
	if (err) {
		console.error("Error al crear indice pong_scores:", err);
		return;
	}
	console.log("✅ Indice pong_scores disponible");
}
);
// Exportar la conexión a la base de datos
module.exports = db;
