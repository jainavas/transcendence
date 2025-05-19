const fastify = require('fastify')({ logger: true });
const fetch = require('node-fetch');
const db = require('./db');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

// Cargar variables de entorno
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_SECRET = process.env.SESSION_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME || 'jainavas';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || '1234';

console.log('======================================');
console.log('INICIANDO SERVIDOR TRANSCENDER');
console.log('Fecha y hora:', new Date().toISOString());
console.log('======================================');

// Importa los plugins de sesión
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: SESSION_SECRET,
  cookie: { 
    secure: false, // Cambiar a false mientras usas HTTP
    httpOnly: true,
    sameSite: 'lax',
    domain: 'localhost', // Asegurar que el dominio es correcto
    maxAge: 86400000
  }
});

// Añadir esta línea después de registrar el plugin de sesión
fastify.addHook('onRequest', (request, reply, done) => {
  if (request.session && request.session.user) {
    // Renovar la sesión en cada solicitud
    request.session.touch();
  }
  done();
});

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL
);

// Reemplazar la configuración CORS actual con esta:
fastify.register(require('@fastify/cors'), {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Disposition', 'Set-Cookie'],
});

// Registrar plugin para archivos estáticos (añade esta línea)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../../frontend'),
  prefix: '/', // Opcional: sirve archivos en la ruta raíz
});

// Añadir después de la configuración de fastify/static
// Reescritura de URLs para rutas sin extensión
fastify.get('/pong', (request, reply) => {
  return reply.sendFile('pong.html');
});

fastify.get('/dashboard', (request, reply) => {
  return reply.sendFile('dashboard.html');
});

// Añadir un middleware para registrar todas las solicitudes y sus sesiones
fastify.addHook('preHandler', (req, reply, done) => {
  if (req.url !== '/user/me') { // Evitar spam de logs
    console.log(`📩 ${req.method} ${req.url} - Sesión: ${req.session && req.session.user ? 'Activa' : 'Inactiva'}`);
  }
  done();
});

// Reemplazar los endpoints de mensajes con los endpoints de puntuaciones de pong
fastify.get('/pong/scores', async (req, reply) => {
  // Verificar si hay usuario autenticado
  if (!req.session || !req.session.user) {
    console.log("❌ Acceso denegado a /pong/scores - No hay sesión de usuario");
    return reply.code(401).send({ error: 'No autenticado' });
  }
  
  // Obtener ID del usuario de la sesión
  const userId = req.session.user.id || req.session.user.sub || req.session.user.email;
  
  if (!userId) {
    console.log("❌ No se pudo determinar el userId del usuario en sesión:", req.session.user);
    return reply.code(400).send({ error: 'No se pudo determinar el ID de usuario' });
  }
  
  console.log(`🏓 Obteniendo puntuaciones de Pong para usuario: ${userId}`);
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM pong_scores WHERE user_id = ? ORDER BY fecha DESC LIMIT 10', [userId], (err, rows) => {
      if (err) {
        console.error("❌ Error al obtener puntuaciones:", err);
        reject(err);
      } else {
        console.log(`✅ ${rows.length} puntuaciones encontradas para ${userId}`);
        resolve(rows);
      }
    });
  });
});

// Guardar puntuación de juego 
fastify.post('/pong/scores', async (req, reply) => {
  // Verificar si hay usuario autenticado
  if (!req.session || !req.session.user) {
    return reply.code(401).send({ error: 'No autenticado' });
  }
  
  const { p1score, p2score, opponent, winner, game_duration } = req.body;
  
  // Validar que haya puntuación
  if (typeof p1score !== 'number' || typeof p2score !== 'number') {
    return reply.code(400).send({ error: 'La puntuación debe ser un número' });
  }
  
  // Obtener ID del usuario de la sesión
  const userId = req.session.user.id || req.session.user.sub || req.session.user.email;
  
  console.log(`🏓 Guardando puntuación para usuario ${userId}: ${p1score} puntos`);
  
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO pong_scores (user_id, p1score, p2score, opponent, winner, game_duration) VALUES (?, ?, ?, ?, ?, ?)', 
      [userId, p1score, p2score, opponent || "CPU", winner || false, game_duration || 0],
      function (err) {
        if (err) {
          console.error("❌ Error al guardar puntuación:", err);
          reject(err);
        } else {
            const nuevaPuntuacion = { 
              id: this.lastID, 
              user_id: userId,
              p1score: p1score,
			  p2score: p2score,
              opponent: opponent || "CPU",
              winner: winner || false,
              game_duration: game_duration || 0,
              fecha: new Date().toISOString()
            };
            
            console.log("✅ Puntuación guardada:", nuevaPuntuacion);
            resolve(nuevaPuntuacion);
          }
        }
      );
    });
  });

  // Obtener mejores puntuaciones
  fastify.get('/pong/leaderboard', async (req, reply) => {
    try {
      const rows = await new Promise((resolve, reject) => {
        db.all(`
          SELECT ps.*, u.username as user_name, 'https://ui-avatars.com/api/?name=' || u.username || '&background=random&color=fff' as user_picture
          FROM pong_scores ps
          JOIN (
            SELECT user_id, MAX(p1score) as max_score
            FROM pong_scores
            GROUP BY user_id
          ) top ON ps.user_id = top.user_id AND ps.p1score = top.max_score
          LEFT JOIN users u ON ps.user_id = u.email
          ORDER BY ps.p1score DESC
          LIMIT 10
        `, [], (err, rows) => {
          if (err) {
            console.error("❌ Error al obtener mejores puntuaciones:", err);
            reject(err);
          } else {
            console.log(`✅ ${rows.length} mejores puntuaciones obtenidas`);
            resolve(rows);
          }
        });
      });
      
      return rows;
    } catch (error) {
      console.error("Error al obtener leaderboard:", error);
      return reply.code(500).send({ error: "Error al obtener leaderboard" });
    }
  });

// Endpoint para verificar si el juego de Pong está disponible
fastify.get('/pong/status', async (req, reply) => {
  // Verificar si el usuario está autenticado
  if (!req.session || !req.session.user) {  // Corregido: añadido "!" antes de req.session.user
    return reply.code(401).send({ 
      available: false, 
      reason: 'authentication_required', 
      message: 'Debes iniciar sesión para jugar' 
    });
  }
  
  const userId = req.session.user.id || req.session.user.sub || req.session.user.email;
  
  return {
    available: true,
    user: {
      id: userId,
      name: req.session.user.name || 'Jugador',
      email: req.session.user.email || ''
    },
    lastScore: await getLastScore(userId)
  };
});

// Función para obtener la última puntuación de un usuario
async function getLastScore(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM pong_scores WHERE user_id = ? ORDER BY fecha DESC LIMIT 1', [userId], (err, row) => {
      if (err) {
        console.error('Error al obtener última puntuación:', err);
        resolve(null);
      } else {
        resolve(row || null);
      }
    });
  });
}

// Modificar la verificación del token en el endpoint POST /auth/google
fastify.post('/auth/google', async (req, reply) => {
    try {
        const { credential } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // Guardar la información del usuario en la sesión
        req.session.user = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };
        
        // Verificar si el usuario existe en la base de datos
        const userExists = await checkUserInDatabase(payload.name, payload.email);
        
        return { 
            usuario: payload.name, 
            email: payload.email,
            picture: payload.picture,
            isNewUser: !userExists
        };
    } catch (err) {
        console.error("Error en autenticación Google:", err);
        reply.code(401).send({ error: 'Token inválido' });
    }
});

fastify.get('/auth/callback', async (req, reply) => {
  const { code } = req.query;

  if (!code) {
    console.error("❌ No se recibió código en la redirección.");
    return reply.redirect('http://localhost:8080/?error=no_code');
  }

  try {
    console.log("🔁 Código recibido:", code);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("🔑 Respuesta del token:", tokenData);

    if (!tokenData.access_token) {
      console.error("❌ No se recibió token de acceso:", tokenData);
      return reply.status(400).send({ error: 'Token de acceso inválido' });
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    console.log("👤 Usuario autenticado:", userInfo);

    // Guardar la información del usuario en la sesión
    req.session.user = userInfo;
    
    // Verificar si el usuario existe en la base de datos
    await checkUserInDatabase(userInfo.name, userInfo.email);
    
    // IMPORTANTE: Redirigir directamente a /dashboard sin extensión
    return reply.redirect('http://localhost:8080/dashboard');
  } catch (err) {
    console.error("❌ Error en /auth/callback:", err);
    return reply.redirect('http://localhost:8080/?error=auth_failed');
  }
});

// Mejora el endpoint user/me para asegurar datos completos
fastify.get('/user/me', async (req, reply) => {
  console.log('Solicitud a /user/me - Datos de sesión:', JSON.stringify(req.session, null, 2));
  
  if (req.session && req.session.user) {
    // Asegurar que la información está completa
    const userInfo = req.session.user;
    
    // Corregir: si picture no está definido o está vacío, usar un avatar
    if (!userInfo.picture) {
      const userName = userInfo.name || userInfo.email?.split('@')[0] || 'Usuario';
      userInfo.picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff&size=128`;
    }
    
    // Asegurarse de que todos los campos requeridos estén presentes
    const user = {
      name: userInfo.name || userInfo.given_name || userInfo.email?.split('@')[0] || 'Usuario',
      email: userInfo.email || 'sin-email@ejemplo.com',
      picture: userInfo.picture,
      id: userInfo.sub || userInfo.id || Date.now().toString()
    };
    
    console.log('Enviando datos de usuario:', user);
    
    return { 
      authenticated: true, 
      user
    };
  }
  
  console.log('No se encontró usuario en la sesión');
  return { authenticated: false };
});

// Reemplaza el endpoint de logout con este código
fastify.post('/auth/logout', async (req, reply) => {
  console.log('🚪 Solicitud de cierre de sesión recibida');
  
  try {
    if (req.session) {
      // Dos formas alternativas de destruir la sesión
      if (typeof req.destroySession === 'function') {
        await new Promise((resolve, reject) => {
          req.destroySession(err => {
            if (err) {
              console.error('Error al destruir la sesión (método 1):', err);
              reject(err);
            } else {
              resolve(true);
            }
          });
        });
      } else if (req.session.destroy) {
        await new Promise((resolve, reject) => {
          req.session.destroy(err => {
            if (err) {
              console.error('Error al destruir la sesión (método 2):', err);
              reject(err);
            } else {
              resolve(true);
            }
          });
        });
      } else {
        // Si ninguno de los métodos está disponible, limpiar manualmente
        req.session = null;
      }
      
      // Limpiar la cookie también
      reply.clearCookie('sessionId');
      
      console.log('✅ Sesión destruida correctamente');
    }
    
    return { success: true, message: 'Sesión cerrada correctamente' };
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    return { success: false, message: 'Error al cerrar sesión', error: String(error) };
  }
});

// Añade este código después de las otras rutas de autenticación

// Ruta GET para inicializar el flujo de OAuth
fastify.get('/auth/google', async (req, reply) => {
  // Generar URL de autenticación de Google OAuth2
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    redirect_uri: 'http://localhost:3000/auth/callback'
  });
  
  console.log("🔄 Redirigiendo a:", authUrl);
  
  // Redirigir al usuario a la URL de autenticación de Google
  return reply.redirect(authUrl);
});

// Modifica el manejo de errores de sesión
fastify.setErrorHandler(function (error, request, reply) {
  // Log error
  console.error('❌ ERROR:', error);
  if (error.code === 'FST_ERR_COOKIE_SESSION_UNAVAILABLE') {
    // Este error ocurre cuando hay problemas con la sesión
    console.log('Problema detectado con la sesión. Reseteando cookie...');
    reply.clearCookie('sessionId');
  }
  
  // Enviar respuesta
  reply.status(error.statusCode || 500).send({
    error: error.name,
    message: error.message,
    statusCode: error.statusCode || 500
  });
});

// Endpoint de diagnóstico para sesiones
fastify.get('/debug/session', async (request, reply) => {
  return {
    session: request.session || null,
    cookies: request.headers.cookie || null,
    headers: request.headers,
    timestamp: new Date().toISOString(),
    authenticated: request.session?.user ? true : false
  };
});

fastify.listen({ port: PORT, host: HOST });

// Check if user is authenticated before database operations
fastify.post('/users/check', async (request, reply) => {
	// Verify if user is authenticated
	if (!request.session || !request.session.user) {
		return reply.code(401).send({ error: 'Not authenticated' });
	}

	const user = request.session.user;
	
	db.get("SELECT id FROM users WHERE username = ? OR email = ?", [user.name, user.email], function(err, row) {
		if (err) {
			console.error("Error al verificar usuario:", err.message);
			return reply.code(500).send({ error: 'Database error' });
		} else if (!row) {
			// User doesn't exist, insert new user
			db.run("INSERT INTO users (username, email) VALUES (?, ?)", [user.name, user.email], function(err) {
				if (err) {
					console.error("Error al insertar usuario:", err.message);
					return reply.code(500).send({ error: 'Failed to create user' });
				} else {
					console.log("Usuario insertado con éxito, ID:", this.lastID);
					return reply.send({ success: true, id: this.lastID });
				}
			});
		} else {
			console.log(`Usuario con nombre '${user.name}' o email '${user.email}' ya existe en la base de datos.`);
			return reply.send({ success: true, id: row.id, existing: true });
		}
	});
});

// Función auxiliar para verificar si un usuario existe y crearlo si no existe
async function checkUserInDatabase(username, email) {
  return new Promise((resolve, reject) => {
    db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], function(err, row) {
      if (err) {
        console.error("Error al verificar usuario:", err.message);
        reject(err);
      } else if (!row) {
        // Usuario no existe, insertarlo
        db.run("INSERT INTO users (username, email) VALUES (?, ?)", [username, email], function(err) {
          if (err) {
            console.error("Error al insertar usuario:", err.message);
            reject(err);
          } else {
            console.log("✅ Usuario nuevo creado con ID:", this.lastID);
            resolve(false); // Retorna false porque el usuario no existía
          }
        });
      } else {
        console.log(`✓ Usuario '${username}' o '${email}' ya existe en la BD con ID ${row.id}`);
        resolve(true); // Retorna true porque el usuario ya existía
      }
    });
  });
}
