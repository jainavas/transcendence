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
    secure: process.env.COOKIE_SECURE === 'true', 
    httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '86400000')
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
  exposedHeaders: ['Content-Disposition']
});

// Registrar plugin para archivos estáticos (añade esta línea)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../../frontend'),
  prefix: '/', // Opcional: sirve archivos en la ruta raíz
});

// Añadir un middleware para registrar todas las solicitudes y sus sesiones
fastify.addHook('preHandler', (req, reply, done) => {
  if (req.url !== '/user/me') { // Evitar spam de logs
    console.log(`📩 ${req.method} ${req.url} - Sesión: ${req.session && req.session.user ? 'Activa' : 'Inactiva'}`);
  }
  done();
});

// Mejorar el endpoint de mensajes con más información de depuración
fastify.get('/mensajes', async (req, reply) => {
  // Verificar si hay usuario autenticado
  if (!req.session || !req.session.user) {
    console.log("❌ Acceso denegado a /mensajes - No hay sesión de usuario");
    return reply.code(401).send({ error: 'No autenticado' });
  }
  
  // Obtener ID del usuario de la sesión
  const userId = req.session.user.id || req.session.user.sub || req.session.user.email;
  
  if (!userId) {
    console.log("❌ No se pudo determinar el userId del usuario en sesión:", req.session.user);
    return reply.code(400).send({ error: 'No se pudo determinar el ID de usuario' });
  }
  
  console.log(`🔍 Obteniendo mensajes para usuario: ${userId}`);
  
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM mensajes WHERE user_id = ? ORDER BY fecha DESC', [userId], (err, rows) => {
      if (err) {
        console.error("❌ Error al obtener mensajes:", err);
        reject(err);
      } else {
        console.log(`✅ ${rows.length} mensajes encontrados para ${userId}`);
        resolve(rows);
      }
    });
  });
});

// Implementar control de identificadores para mensajes
let lastMessagesByUser = {}; // Para almacenar los últimos mensajes por usuario

// Guardar mensaje asociado al usuario actual
fastify.post('/mensajes', async (req, reply) => {
  // Verificar si hay usuario autenticado
  if (!req.session || !req.session.user) {
    return reply.code(401).send({ error: 'No autenticado' });
  }
  
  const { texto, messageId } = req.body;
  
  // Validar que haya texto
  if (!texto || texto.trim() === '') {
    return reply.code(400).send({ error: 'El mensaje no puede estar vacío' });
  }
  
  // Obtener ID del usuario de la sesión
  const userId = req.session.user.id || req.session.user.sub || req.session.user.email;
  
  // Control de duplicados: verificar si es el mismo mensaje que el último enviado
  const userLastMessage = lastMessagesByUser[userId];
  if (userLastMessage && 
      userLastMessage.texto === texto && 
      Date.now() - userLastMessage.timestamp < 5000) {
    
    console.log(`⚠️ Posible mensaje duplicado detectado para ${userId}: "${texto.substring(0, 20)}..."`);
    return reply.code(200).send({ 
      id: userLastMessage.id,
      texto: texto,
      warning: 'duplicate_suspected',
      user_id: userId
    });
  }
  
  // Control por messageId (evitar procesamiento doble)
  if (messageId && userLastMessage && userLastMessage.messageId === messageId) {
    console.log(`⚠️ Mismo messageId detectado: ${messageId}`);
    return reply.code(200).send({
      id: userLastMessage.id,
      texto: texto,
      warning: 'message_id_duplicate',
      user_id: userId
    });
  }
  
  console.log(`📝 Guardando mensaje para usuario: ${userId}`);
  
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO mensajes (texto, user_id) VALUES (?, ?)', 
      [texto, userId],
      function (err) {
        if (err) {
          console.error("❌ Error al guardar mensaje:", err);
          reject(err);
        } else {
          const nuevoMensaje = { 
            id: this.lastID, 
            texto, 
            user_id: userId,
            fecha: new Date().toISOString()
          };
          
          // Guardar referencia al último mensaje
          lastMessagesByUser[userId] = {
            id: this.lastID,
            texto: texto,
            timestamp: Date.now(),
            messageId: messageId || null
          };
          
          console.log(`✅ Mensaje guardado con ID: ${nuevoMensaje.id}`);
          resolve(nuevoMensaje);
        }
      }
    );
  });
});

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
        
        return { 
            usuario: payload.name, 
            email: payload.email,
            picture: payload.picture 
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

fastify.listen({ port: PORT, host: HOST });

// Check if user exists before inserting
db.get("SELECT id FROM users WHERE username = ?", [DEFAULT_USERNAME], function(err, row) {
  if (err) {
    console.error("Error al verificar usuario:", err.message);
  } else if (!row) {
    // User doesn't exist, insert new user
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [DEFAULT_USERNAME, DEFAULT_PASSWORD], function (err) {
      if (err) {
        console.error("Error al insertar usuario:", err.message);
      } else {
        console.log("Usuario insertado con éxito, ID:", this.lastID);
      }
    });
  } else {
    console.log(`Usuario '${DEFAULT_USERNAME}' ya existe en la base de datos.`);
  }
});
