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
const DEFAULT_user_name = process.env.DEFAULT_user_name || 'jainavas';
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

fastify.register(require('@fastify/cors'), {
	origin: (origin, cb) => {
		const hostname = new URL(origin || 'http://localhost:8080').hostname;

		// Lista de dominios permitidos
		const allowedDomains = [
			'localhost',
			'127.0.0.1',
			'lh3.googleusercontent.com',
			'lh4.googleusercontent.com',
			'lh5.googleusercontent.com',
			'lh6.googleusercontent.com',
			'ui-avatars.com'
		];

		// Permitir si no hay origin (requests del mismo servidor) o si está en la lista
		if (!origin || allowedDomains.includes(hostname)) {
			cb(null, true);
		} else {
			cb(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'Accept',
		'Origin',
		'X-Requested-With',
		'Cache-Control',
		'Pragma'
	],
	optionsSuccessStatus: 200,
	preflightContinue: false
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
		// Updated query to use p1_id instead of user_id
		db.all('SELECT * FROM pong_scores WHERE p1_id = ? ORDER BY fecha DESC LIMIT 10', [userId], (err, rows) => {
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
	try {
		// Verificar si hay usuario autenticado
		if (!req.session || !req.session.user) {
			return reply.code(401).send({ error: 'No autenticado' });
		}

		const { p1score, p2score, p2_id = 0, winner, game_duration } = req.body;

		// Validar que haya puntuación
		if (typeof p1score !== 'number' || typeof p2score !== 'number') {
			return reply.code(400).send({ error: 'La puntuación debe ser un número' });
		}

		// Obtener ID del usuario de la sesión
		const userId = req.session.user.id || req.session.user.sub || req.session.user.email;

		if (!userId) {
			console.error("❌ No se pudo determinar el ID del usuario");
			return reply.code(400).send({ error: 'No se pudo determinar el ID de usuario' });
		}

		console.log(`🏓 Guardando puntuación para usuario ${userId}:`, {
			p1score,
			p2score,
			p2_id,
			winner,
			game_duration
		});

		// Use promise-based structure
		const nuevaPuntuacion = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO pong_scores (p1_id, p1score, p2score, p2_id, winner, game_duration, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
				[
					userId,
					p1score,
					p2score,
					p2_id || 0, // Default value for p2_id (CPU opponent)
					winner ? 1 : 0, // SQLite uses 1/0 for boolean
					game_duration || 0,
					new Date().toISOString() // Add current date
				],
				function (err) {
					if (err) {
						console.error("❌ Error al guardar puntuación:", err);
						reject(err);
					} else {
						const result = {
							id: this.lastID,
							p1_id: userId,
							p1score: p1score,
							p2score: p2score,
							p2_id: p2_id || 0,
							winner: winner ? 1 : 0,
							game_duration: game_duration || 0,
							fecha: new Date().toISOString()
						};
						console.log("✅ Puntuación guardada:", result);
						resolve(result);
					}
				}
			);
		});

		return nuevaPuntuacion;

	} catch (error) {
		console.error("❌ Error grave al guardar puntuación:", error);
		return reply.code(500).send({ error: 'Error al guardar puntuación', details: error.message });
	}
});

// Replace the existing GET /pong/leaderboard endpoint with this code
fastify.get('/pong/leaderboard', async (req, reply) => {
	try {
		const rows = await new Promise((resolve, reject) => {
			// Consulta simplificada y más robusta
			db.all(`
				SELECT 
					ps.*,
					COALESCE(u1.user_name, 'Usuario Desconocido') as user_name,
					CASE 
						WHEN ps.p2_id = '0' OR ps.p2_id IS NULL THEN 'CPU' 
						ELSE COALESCE(u2.user_name, 'Oponente Desconocido') 
					END as opponent_name,
					u1.user_picture as user_picture,
					CASE 
						WHEN ps.p2_id = '0' OR ps.p2_id IS NULL THEN NULL
						ELSE u2.user_picture
					END as opponent_picture
				FROM pong_scores ps
				LEFT JOIN users u1 ON ps.p1_id = u1.google_id
				LEFT JOIN users u2 ON ps.p2_id = u2.google_id AND ps.p2_id != '0'
				WHERE ps.p1score IS NOT NULL AND ps.p2score IS NOT NULL
				ORDER BY 
					ps.p1score DESC,
					ps.fecha DESC
				LIMIT 10
			`, [], (err, rows) => {
				if (err) {
					console.error("❌ Error al obtener mejores puntuaciones:", err);
					reject(err);
				} else {
					console.log(`✅ ${rows.length} mejores puntuaciones obtenidas`);

					// Procesar las filas para asegurar URLs de imagen válidas
					const processedRows = rows.map(row => ({
						...row,
						user_picture: row.user_picture || null,
						opponent_picture: row.opponent_picture || null
					}));

					resolve(processedRows);
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

// Replace the existing getLastScore function with this code
async function getLastScore(userId) {
	return new Promise((resolve, reject) => {
		// Updated query to use p1_id instead of user_id
		db.get('SELECT * FROM pong_scores WHERE p1_id = ? ORDER BY fecha DESC LIMIT 1', [userId], (err, row) => {
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

		// Verificar existencia en DB y obtener el ID de la base de datos
		try {
			const userResult = await checkUserInDatabase(
				payload.id, // Google ID como identificador primario
				payload.name,
				payload.email,
				payload.picture // Incluir la foto del perfil
			);

			// Guardar en sesión con estructura consistente y el ID de la DB
			req.session.user = {
				id: payload.id, // ID de la base de datos
				name: payload.name,
				email: payload.email,
				picture: payload.picture
			};

			console.log("✅ Usuario guardado en sesión con ID de base de datos:", userResult.userId);

			return {
				usuario: payload.name,
				email: payload.email,
				picture: payload.picture,
				isNewUser: !userResult.exists,
				id: userResult.id // Incluir ID en la respuesta
			};
		} catch (dbError) {
			console.error("⚠️ Error en operación de base de datos:", dbError);

			// Fallback en caso de error de DB
			req.session.user = {
				id: payload.sub, // Usar el ID de Google como fallback
				name: payload.name,
				email: payload.email,
				picture: payload.picture
			};

			return {
				usuario: payload.name,
				email: payload.email,
				picture: payload.picture,
				isNewUser: false, // Asumir usuario existente en caso de error
				id: payload.sub
			};
		}
	} catch (err) {
		console.error("Error en autenticación Google:", err);
		reply.code(401).send({ error: 'Token inválido' });
	}
});

// Reemplaza el endpoint /auth/callback con esta versión mejorada
fastify.get('/auth/callback', async (req, reply) => {
	const { code } = req.query;

	if (!code) {
		console.error("❌ No se recibió código en la redirección.");
		return reply.redirect(`${FRONTEND_URL}/?error=no_code`);
	}

	console.log("🔍 Verificando variables de entorno:");
	console.log(`- CLIENT_ID: ${GOOGLE_CLIENT_ID ? "✅ Configurado" : "❌ No configurado"}`);
	console.log(`- CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? "✅ Configurado" : "❌ No configurado"}`);
	console.log(`- CALLBACK_URL: ${GOOGLE_CALLBACK_URL || "❌ No configurado"}`);

	try {
		console.log("🔁 Código recibido, intentando intercambio de token...");

		// Construir los parámetros de forma explícita para mejor depuración
		const tokenParams = new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: GOOGLE_CALLBACK_URL,
			grant_type: 'authorization_code',
		});

		console.log("📤 Parámetros de solicitud de token:");
		console.log(`- code: ${code.substring(0, 10)}...`); // Solo mostrar parte del código por seguridad
		console.log(`- redirect_uri: ${GOOGLE_CALLBACK_URL}`);

		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: tokenParams
		});

		const tokenData = await tokenResponse.json();

		if (!tokenResponse.ok) {
			console.error("❌ Error en respuesta de token:", tokenData);
			console.error("Código de estado:", tokenResponse.status);
			return reply.redirect(`${FRONTEND_URL}/?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error || "unknown")}`);
		}

		if (!tokenData.access_token) {
			console.error("❌ No se recibió token de acceso:", tokenData);
			return reply.redirect(`${FRONTEND_URL}/?error=no_access_token`);
		}

		console.log("✅ Token recibido, obteniendo información del usuario...");

		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});

		if (!userInfoResponse.ok) {
			console.error("❌ Error al obtener información del usuario:", await userInfoResponse.text());
			return reply.redirect(`${FRONTEND_URL}/?error=userinfo_failed`);
		}

		const userInfo = await userInfoResponse.json();
		console.log("👤 Usuario autenticado:", userInfo.email);

		// Guardar en sesión con estructura consistente
		req.session.user = {
			id: userInfo.id || userInfo.sub,
			name: userInfo.name,
			email: userInfo.email,
			picture: userInfo.picture
		};

		// Verificar existencia en DB con manejo de errores explícito
		try {
			await checkUserInDatabase(userInfo.id, userInfo.name, userInfo.email, userInfo.picture);
		} catch (dbError) {
			console.error("⚠️ Error en operación de base de datos:", dbError);
			// Continuar a pesar del error de DB (no crítico para la autenticación)
		}

		// Asegurar que la sesión se guarde antes de redirigir
		await new Promise((resolve, reject) => {
			req.session.save(err => {
				if (err) {
					console.error("❌ Error al guardar la sesión:", err);
					reject(err);
				} else {
					resolve(true);
				}
			});
		});

		return reply.redirect(`${FRONTEND_URL}/dashboard`);
	} catch (err) {
		console.error("❌ Error en /auth/callback:", err);
		return reply.redirect(`${FRONTEND_URL}/?error=auth_failed&message=${encodeURIComponent(err.message)}`);
	}
});

// Añade esta ruta de diagnóstico para verificar la configuración
fastify.get('/auth/diagnose', async (req, reply) => {
	return {
		environment: {
			GOOGLE_CLIENT_ID_SET: !!GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET_SET: !!GOOGLE_CLIENT_SECRET,
			GOOGLE_CALLBACK_URL: GOOGLE_CALLBACK_URL,
			FRONTEND_URL: FRONTEND_URL,
			BACKEND_URL: BACKEND_URL,
			NODE_ENV: process.env.NODE_ENV
		},
		session: {
			configured: !!SESSION_SECRET,
			cookieSecure: false // Valor actual de tu configuración
		},
		server: {
			port: PORT,
			host: HOST
		}
	};
});

// Endpoint mejorado que prioriza datos de la base de datos
fastify.get('/user/me', async (req, reply) => {
	console.log('Solicitud a /user/me - Datos de sesión:', JSON.stringify(req.session, null, 2));

	if (req.session && req.session.user) {
		const sessionUser = req.session.user;
		let user;

		try {
			// Primero intentar obtener el usuario de la base de datos por email
			const dbUser = await getUserFromDatabase(sessionUser.email);

			if (dbUser) {
				// Usar datos del usuario desde la base de datos
				user = dbUser;
				console.log('✅ Usando datos de usuario desde la base de datos');
			} else {
				// Si no se encuentra en la BD, usar datos de la sesión
				console.log('⚠️ Usuario no encontrado en base de datos, usando datos de sesión');

				// Asegurar que la información está completa
				const userInfo = sessionUser;

				// Corregir: si picture no está definido o está vacío, usar un avatar
				if (!userInfo.picture) {
					const user_name = userInfo.name || userInfo.email?.split('@')[0] || 'Usuario';
					userInfo.picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(user_name)}&background=random&color=fff&size=128`;
				}

				user = {
					name: userInfo.name || userInfo.given_name || userInfo.email?.split('@')[0] || 'Usuario',
					email: userInfo.email || 'sin-email@ejemplo.com',
					picture: userInfo.picture,
					id: userInfo.id || userInfo.sub || Date.now().toString()
				};
			}

			console.log('Enviando datos de usuario:', user);

			return {
				authenticated: true,
				user
			};
		} catch (error) {
			console.error('❌ Error al obtener usuario:', error);

			// En caso de error, seguir usando los datos de sesión como respaldo
			const userInfo = sessionUser;

			// Asegurar campos mínimos
			user = {
				name: userInfo.name || userInfo.given_name || userInfo.email?.split('@')[0] || 'Usuario',
				email: userInfo.email || 'sin-email@ejemplo.com',
				picture: userInfo.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name || 'Usuario')}&background=random&color=fff&size=128`,
				id: userInfo.id || userInfo.sub || Date.now().toString()
			};

			return {
				authenticated: true,
				user,
				fromSession: true // Indicador de que se usaron datos de sesión por error
			};
		}
	}

	console.log('No se encontró usuario en la sesión');
	return { authenticated: false };
});

// Función auxiliar para obtener usuario de la base de datos por email
async function getUserFromDatabase(email) {
	return new Promise((resolve, reject) => {
		if (!email) {
			resolve(null);
			return;
		}

		db.get("SELECT * FROM users WHERE user_email = ?", [email], (err, row) => {
			if (err) {
				console.error("❌ Error al buscar usuario en base de datos:", err.message);
				reject(err);
			} else if (!row) {
				console.log(`⚠️ No se encontró usuario con email ${email} en la base de datos`);
				resolve(null);
			} else {
				console.log(`✅ Usuario encontrado en base de datos: ${row.user_name} (ID: ${row.user_id})`);

				// Transformar fila de base de datos al formato de objeto de usuario
				const user = {
					id: row.google_id || row.user_id.toString(),
					name: row.user_name,
					email: row.user_email,
					picture: row.user_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.user_name)}&background=random&color=fff&size=128`
				};

				resolve(user);
			}
		});
	});
}

fastify.post('/user/aliaspicture', async (req, reply) => {
	if (!req.session || !req.session.user) {
		return reply.code(401).send({ error: 'No autenticado' });
	}

	const { alias, picture } = req.body;

	if (!picture && !alias) {
		return reply.code(400).send({ error: 'Faltan parametros' });
	}

	try {
		const userId = req.session.user.id || req.session.user.sub || req.session.user.email;

		// Actualizar la foto del usuario en la base de datos
		if (picture)
			await changeUserPicture(req.session.user.email, picture);
		if (alias)
			await changeUserAlias(req.session.user.email, alias);

		// Actualizar la sesión con la nueva foto
		if (picture)
			req.session.user.picture = picture;
		if (alias)
			req.session.user.user_name = alias;

		console.log(`✅ Foto de usuario y alias actualizados para ID: ${userId}`);

		return { success: true, message: 'Foto y alias actualizados correctamente', picture };
	} catch (error) {
		console.error('❌ Error al actualizar la foto y alias del usuario:', error);
		return reply.code(500).send({ error: 'Error al actualizar la foto o alias', details: error.message });
	}
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

	// Updated query to use user_id and user_email instead of id and email
	db.get("SELECT user_id FROM users WHERE user_name = ? OR user_email = ?", [user.name, user.email], function (err, row) {
		if (err) {
			console.error("Error al verificar usuario:", err.message);
			return reply.code(500).send({ error: 'Database error' });
		} else if (!row) {
			// User doesn't exist, insert new user with correct field names
			db.run("INSERT INTO users (user_name, user_email) VALUES (?, ?)", [user.name, user.email], function (err) {
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
			return reply.send({ success: true, id: row.user_id, existing: true });
		}
	});
});

async function changeUserPicture(email, newpicture) {
	return new Promise((resolve, reject) => {
		// Primero verifica si el usuario existe
		db.get("SELECT user_id FROM users WHERE user_email = ?", [email], function (err, row) {
			if (err) {
				console.error("Error al verificar usuario:", err.message);
				reject(err);
			} else if (!row) {
				return reject(new Error("Usuario no encontrado"));
			} else {
				// Usuario existe, ACTUALIZAR LA FOTO si se proporciona
				if (newpicture) {
					db.run(
						"UPDATE users SET user_picture = ? WHERE user_id = ?",
						[newpicture, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar foto de usuario:", err.message);
								// No fallar por esto, seguir adelante
							} else {
								console.log("✅ Foto de usuario actualizada para ID:", row.user_id);
							}
						}
					);
				}
				// Retorna el ID del usuario existente
				resolve({ exists: true, userId: row.user_id });
			}
		});
	});
}

async function changeUserAlias(email, newalias) {
	return new Promise((resolve, reject) => {
		// Primero verifica si el usuario existe
		db.get("SELECT user_id FROM users WHERE user_email = ?", [email], function (err, row) {
			if (err) {
				console.error("Error al verificar usuario:", err.message);
				reject(err);
			} else if (!row) {
				return reject(new Error("Usuario no encontrado"));
			} else {
				// Usuario existe, ACTUALIZAR LA FOTO si se proporciona
				if (newalias) {
					db.run(
						"UPDATE users SET user_name = ? WHERE user_id = ?",
						[newalias, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar foto de usuario:", err.message);
								// No fallar por esto, seguir adelante
							} else {
								console.log("✅ Foto de usuario actualizada para ID:", row.user_id);
							}
						}
					);
				}
				// Retorna el ID del usuario existente
				resolve({ exists: true, userId: row.user_id });
			}
		});
	});
}

// Reemplaza la función checkUserInDatabase con esta versión mejorada
async function checkUserInDatabase(id, user_name, email, picture) {
	return new Promise((resolve, reject) => {
		// Primero verifica si el usuario existe
		db.get("SELECT user_id FROM users WHERE user_email = ?", [email], function (err, row) {
			if (err) {
				console.error("Error al verificar usuario:", err.message);
				reject(err);
			} else if (!row) {
				// Usuario no existe, insertarlo CON LA FOTO
				db.run(
					"INSERT INTO users (google_id, user_name, user_email, user_picture) VALUES (?, ?, ?, ?)",
					[id, user_name, email, picture || null],
					function (err) {
						if (err) {
							console.error("Error al insertar usuario:", err.message);
							reject(err);
						} else {
							console.log("✅ Usuario nuevo creado con ID:", this.lastID);
							// Retorna el ID del nuevo usuario
							resolve({ exists: false, userId: this.lastID });
						}
					}
				);
			} else {
				// Usuario existe, ACTUALIZAR LA FOTO si se proporciona
				if (picture && row.user_picture === null) {
					db.run(
						"UPDATE users SET user_picture = ? WHERE user_id = ?",
						[picture, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar foto de usuario:", err.message);
								// No fallar por esto, seguir adelante
							} else {
								console.log("✅ Foto de usuario actualizada para ID:", row.user_id);
							}
						}
					);
				}
				console.log(`✓ Usuario '${user_name}' o '${email}' ya existe en la BD con ID ${row.user_id}`);
				// Retorna el ID del usuario existente
				resolve({ exists: true, userId: row.user_id });
			}
		});
	});
}

fastify.get('/pong/', async (req, reply) => {
	return reply.code(403).send('🚫 Acceso no permitido'), reply.type('text/html').sendFile('pong.html');
});
