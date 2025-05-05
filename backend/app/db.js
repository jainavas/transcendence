const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar variable de entorno para la ruta de la base de datos
const dbPath = process.env.DB_PATH || '../data/database.sqlite';

// Crear o abrir la base de datos
const db = new sqlite3.Database(path.join(__dirname, dbPath));

// Crear tablas si no existen
db.serialize(() => {
  // Verificar si la tabla mensajes existe y tiene la columna user_id
  db.get("PRAGMA table_info(mensajes)", (err, row) => {
    if (err) {
      console.error("Error al verificar estructura de tabla:", err);
      return;
    }
    
    // Si la tabla no existe o necesita modificación
    db.run(`CREATE TABLE IF NOT EXISTS mensajes_new (
      id INTEGER PRIMARY KEY,
      texto TEXT,
      user_id TEXT NOT NULL,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error("Error al crear tabla mensajes_new:", err);
        return;
      }
      
      // Verificar si existe la tabla original
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='mensajes'", (err, row) => {
        if (err) {
          console.error("Error al verificar existencia de tabla:", err);
          return;
        }
        
        if (row) {
          // La tabla existe, migrar datos
          db.run("BEGIN TRANSACTION");
          
          // Intentar migrar datos si es posible
          db.all("SELECT * FROM mensajes", [], (err, rows) => {
            if (!err && rows) {
              console.log(`Migrando ${rows.length} mensajes antiguos...`);
              
              // Insertar mensajes antiguos con un user_id default
              rows.forEach((row) => {
                db.run("INSERT INTO mensajes_new (id, texto, user_id) VALUES (?, ?, 'sistema')", 
                  [row.id, row.texto]);
              });
            }
            
            // Reemplazar tabla anterior
            db.run("DROP TABLE IF EXISTS mensajes", (err) => {
              if (err) {
                db.run("ROLLBACK");
                console.error("Error al eliminar tabla antigua:", err);
                return;
              }
              
              db.run("ALTER TABLE mensajes_new RENAME TO mensajes", (err) => {
                if (err) {
                  db.run("ROLLBACK");
                  console.error("Error al renombrar tabla:", err);
                  return;
                }
                
                db.run("COMMIT");
                console.log("✅ Migración de tabla mensajes completada");
              });
            });
          });
        } else {
          // Si no existe la tabla original, renombrar la nueva
          db.run("ALTER TABLE mensajes_new RENAME TO mensajes", (err) => {
            if (err) {
              console.error("Error al renombrar tabla:", err);
              return;
            }
            console.log("✅ Tabla mensajes creada correctamente");
          });
        }
      });
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL
  )`, (err) => {
    if (err) {
      console.error("Error al crear la tabla 'users':", err.message);
    } else {
      console.log("Tabla 'users' creada o ya existe.");
    }
  });
});

// Exportar la conexión a la base de datos
module.exports = db;
