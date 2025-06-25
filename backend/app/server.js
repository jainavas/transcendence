const fastify = require('fastify')({ logger: true });
const fetch = require('node-fetch');
const db = require('./db');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const { request } = require('http');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

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
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const APP_NAME = process.env.APP_NAME || 'Transcendence';

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
		// Remover domain para permitir cualquier IP local
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

// Register JWT plugin
fastify.register(require('@fastify/jwt'), {
	secret: JWT_SECRET,
	sign: {
		expiresIn: '24h'
	}
});

// JWT authentication hook
fastify.decorate('authenticate', async function (request, reply) {
	try {
		await request.jwtVerify();
		
		// Verify that the user has completed 2FA
		if (!request.user.isTwoFactorAuthenticated) {
			throw new Error('Two-factor authentication required');
		}
	} catch (err) {
		reply.code(401).send({ error: 'Authentication required', message: err.message });
	}
});

// Optional JWT auth middleware (doesn't throw, just adds user if token is valid)
fastify.decorate('optionalAuthenticate', async function (request, reply) {
	try {
		// Check for Authorization header
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.slice(7);
			const payload = fastify.jwt.verify(token);
			
			if (payload.isTwoFactorAuthenticated) {
				request.user = payload;
				console.log('✅ JWT authentication successful for:', payload.email);
			}
		}
	} catch (err) {
		// Ignore JWT errors for optional auth
		console.log('JWT optional auth failed (ignored):', err.message);
	}
});

// Endpoint to refresh JWT token
fastify.post('/auth/refresh', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	try {
		// Issue a new token with the same payload
		const newToken = fastify.jwt.sign({
			userId: req.user.userId,
			email: req.user.email,
			name: req.user.name,
			isTwoFactorAuthenticated: req.user.isTwoFactorAuthenticated
		});
		
		return {
			success: true,
			token: newToken
		};
	} catch (error) {
		console.error("❌ Error refreshing token:", error);
		return reply.code(500).send({ error: 'Failed to refresh token' });
	}
});

fastify.register(require('@fastify/cors'), {
	origin: (origin, cb) => {
		const hostname = new URL(origin || 'http://localhost:8080').hostname;

		// Lista de dominios permitidos - incluyendo tanto localhost como IP local
		const allowedDomains = [
			'localhost',
			'127.0.0.1',
			detectHostIP(),
			'lh3.googleusercontent.com',
			'lh4.googleusercontent.com',
			'lh5.googleusercontent.com',
			'lh6.googleusercontent.com',
			'ui-avatars.com'
		];

		// Permitir cualquier IP local 10.x.x.x o 192.168.x.x para mayor flexibilidad
		const isLocalNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
		
		// Permitir dominios nip.io
		const isNipIo = hostname.endsWith('.nip.io');

		// Permitir si no hay origin (requests del mismo servidor), está en la lista, es red local, o es nip.io
		if (!origin || allowedDomains.includes(hostname) || isLocalNetwork || isNipIo) {
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
fastify.get('/pong/scores', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	// Get user ID from JWT token
	const userId = req.user.userId || req.user.email;

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
fastify.post('/pong/scores', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	try {
		const { p1score, p2score, p2_id = 0, winner, game_duration } = req.body;

		// Validar que haya puntuación
		if (typeof p1score !== 'number' || typeof p2score !== 'number') {
			return reply.code(400).send({ error: 'La puntuación debe ser un número' });
		}

		// Get user ID from JWT token
		const userId = req.user.userId || req.user.email;

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
fastify.get('/pong/status', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	// User is authenticated via JWT with 2FA completed
	const userId = req.user.userId || req.user.email;
	const user = {
		id: userId,
		name: req.user.name || 'Jugador',
		email: req.user.email || ''
	};

	return {
		available: true,
		user,
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
				payload.sub, // Google ID como identificador primario
				payload.name,
				payload.email,
				payload.picture // Incluir la foto del perfil
			);

			// Check if user needs 2FA setup or verification - ALWAYS require 2FA
			const user = await getUserFromDatabaseByEmail(payload.email);
			
			console.log("🔍 Estado del usuario en BD:", {
				email: payload.email,
				userExists: !!user,
				hasSecret: user && !!user.totp_secret,
				secretValue: user && user.totp_secret ? '[CONFIGURADO]' : '[NO CONFIGURADO]',
				is2faEnabled: user && user.is_2fa_enabled
			});
			
			if (!user || !user.totp_secret || user.totp_secret === '' || user.totp_secret === null || !user.is_2fa_enabled) {
				// First time login OR existing user without proper 2FA setup - setup 2FA
				const secret = authenticator.generateSecret();
				const otpauth = authenticator.keyuri(payload.email, APP_NAME, secret);
				
				// Generate QR code as base64 image
				const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
				
				// Store secret temporarily (not enabled yet)
				await updateUserTotpSecret(payload.email, secret);
				
				console.log("🆕 2FA setup required for user:", payload.email, "- Generando nuevo QR code");
				
				return {
					status: '2fa_setup_required',
					message: '2FA setup required - Please scan QR code',
					qrCode: qrCodeDataUrl,
					user: {
						name: payload.name,
						email: payload.email,
						picture: payload.picture
					}
				};
			} else {
				// User has 2FA properly configured - require verification only
				console.log("✅ 2FA verification required for existing user:", payload.email);
				
				// Store user info temporarily in session for 2FA verification
				req.session.pendingUser = {
					id: payload.sub,
					name: payload.name,
					email: payload.email,
					picture: payload.picture,
					googleId: payload.sub
				};
				
				return {
					status: '2fa_verification_required',
					message: '2FA verification required - Enter your 6-digit code',
					user: {
						name: payload.name,
						email: payload.email,
						picture: payload.picture
					}
				};
			}
		} catch (dbError) {
			console.error("⚠️ Error en operación de base de datos:", dbError);
			reply.code(500).send({ error: 'Database error', details: dbError.message });
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
		const frontendUrl = getFrontendUrlFromRequest(req);
		return reply.redirect(`${frontendUrl}/?error=no_code`);
	}

	// Detectar la URL de callback que se usó originalmente
	const dynamicCallbackUrl = getCallbackUrlFromRequest(req);

	console.log("🔍 Verificando variables de entorno:");
	console.log(`- CLIENT_ID: ${GOOGLE_CLIENT_ID ? "✅ Configurado" : "❌ No configurado"}`);
	console.log(`- CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? "✅ Configurado" : "❌ No configurado"}`);
	console.log(`- CALLBACK_URL dinámico: ${dynamicCallbackUrl}`);

	try {
		console.log("🔁 Código recibido, intentando intercambio de token...");

		// Construir los parámetros usando la URL de callback dinámica
		const tokenParams = new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: dynamicCallbackUrl,
			grant_type: 'authorization_code',
		});

		console.log("📤 Parámetros de solicitud de token:");
		console.log(`- code: ${code.substring(0, 10)}...`); // Solo mostrar parte del código por seguridad
		console.log(`- redirect_uri: ${dynamicCallbackUrl}`);

		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: tokenParams
		});

		const tokenData = await tokenResponse.json();

		if (!tokenResponse.ok) {
			console.error("❌ Error en respuesta de token:", tokenData);
			console.error("Código de estado:", tokenResponse.status);
			const frontendUrl = getFrontendUrlFromRequest(req);
			return reply.redirect(`${frontendUrl}/?error=token_exchange_failed&details=${encodeURIComponent(tokenData.error || "unknown")}`);
		}

		if (!tokenData.access_token) {
			console.error("❌ No se recibió token de acceso:", tokenData);
			const frontendUrl = getFrontendUrlFromRequest(req);
			return reply.redirect(`${frontendUrl}/?error=no_access_token`);
		}

		console.log("✅ Token recibido, obteniendo información del usuario...");

		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});

		if (!userInfoResponse.ok) {
			console.error("❌ Error al obtener información del usuario:", await userInfoResponse.text());
			const frontendUrl = getFrontendUrlFromRequest(req);
			return reply.redirect(`${frontendUrl}/?error=userinfo_failed`);
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

		// *** MODIFICACIÓN IMPORTANTE: SIEMPRE VERIFICAR 2FA ANTES DE IR AL DASHBOARD ***
		// No redirigir directamente al dashboard - forzar verificación 2FA
		const frontendUrl = getFrontendUrlFromRequest(req);
		
		// Check if user needs 2FA setup or verification
		try {
			const user = await getUserFromDatabaseByEmail(userInfo.email);
			
			if (!user || !user.totp_secret || user.totp_secret === '' || user.totp_secret === null) {
				console.log("� Usuario requiere configuración 2FA inicial:", userInfo.email);
				// Redirect to 2FA setup
				return reply.redirect(`${frontendUrl}/2fa?setup=true&email=${encodeURIComponent(userInfo.email)}`);
			} else {
				console.log("🔐 Usuario requiere verificación 2FA:", userInfo.email);
				// Redirect to 2FA verification
				return reply.redirect(`${frontendUrl}/2fa?email=${encodeURIComponent(userInfo.email)}`);
			}
		} catch (error) {
			console.error("❌ Error verificando estado 2FA:", error);
			// En caso de error, redirigir a 2FA setup por seguridad
			return reply.redirect(`${frontendUrl}/2fa?setup=true&email=${encodeURIComponent(userInfo.email)}`);
		}
	} catch (err) {
		console.error("❌ Error en /auth/callback:", err);
		const frontendUrl = getFrontendUrlFromRequest(req);
		return reply.redirect(`${frontendUrl}/?error=auth_failed&message=${encodeURIComponent(err.message)}`);
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

// Endpoint mejorado que prioriza datos de la base de datos y soporta JWT
fastify.get('/user/me', async (req, reply) => {
	console.log('Solicitud a /user/me');

	// ENFOQUE ESTRICTO: Solo JWT válido con 2FA es considerado completamente autenticado
	try {
		await req.jwtVerify();
		if (req.user && req.user.isTwoFactorAuthenticated) {
			console.log('✅ Usuario completamente autenticado via JWT:', req.user.email);
			
			// Get fresh user data from database
			const dbUser = await getUserFromDatabaseByEmail(req.user.email);
			let user;
			
			if (dbUser) {
				user = {
					id: dbUser.google_id,
					name: dbUser.user_name,
					email: dbUser.user_email,
					picture: dbUser.user_picture
				};
			} else {
				// Fallback to JWT data
				user = {
					id: req.user.userId,
					name: req.user.name,
					email: req.user.email,
					picture: null
				};
			}
			
			return {
				authenticated: true,
				user,
				authMethod: 'jwt',
				requires2FA: false,
				isFullyAuthenticated: true
			};
		}
	} catch (jwtError) {
		console.log('❌ JWT verification failed:', jwtError.message);
	}

	// CUALQUIER OTRO CASO (incluyendo sesión sin JWT) REQUIERE 2FA OBLIGATORIAMENTE
	if (req.session && req.session.user) {
		const sessionUser = req.session.user;
		console.log('⚠️ Usuario con sesión pero sin JWT válido:', sessionUser.email, '- REQUIERE 2FA OBLIGATORIO');

		// Get user data for display but ALWAYS mark as requiring 2FA
		let user;
		try {
			const dbUser = await getUserFromDatabaseByEmail(sessionUser.email);

			if (dbUser) {
				user = {
					id: dbUser.google_id,
					name: dbUser.user_name,
					email: dbUser.user_email,
					picture: dbUser.user_picture
				};
			} else {
				// Fallback user data
				const userInfo = sessionUser;
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
		} catch (error) {
			console.error('❌ Error al obtener usuario de BD:', error);
			
			// Return minimal user data from session
			user = {
				name: sessionUser.name || 'Usuario',
				email: sessionUser.email || 'sin-email@ejemplo.com',
				picture: sessionUser.picture || '',
				id: sessionUser.id || sessionUser.sub || Date.now().toString()
			};
		}
		
		// SIEMPRE requiere 2FA si no hay JWT válido
		return {
			authenticated: true,
			user,
			authMethod: 'session',
			requires2FA: true, // SIEMPRE true sin JWT válido
			isFullyAuthenticated: false // NUNCA completamente autenticado sin JWT
		};
	}

	console.log('❌ No se encontró usuario autenticado (ni JWT ni sesión)');
	return { 
		authenticated: false,
		requires2FA: false,
		isFullyAuthenticated: false
	};
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

// Helper function to get user from database by email with 2FA info
async function getUserFromDatabaseByEmail(email) {
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
				resolve(row);
			}
		});
	});
}

// Helper function to update user's TOTP secret
async function updateUserTotpSecret(email, secret) {
	return new Promise((resolve, reject) => {
		db.run(
			"UPDATE users SET totp_secret = ? WHERE user_email = ?",
			[secret, email],
			function (err) {
				if (err) {
					console.error("❌ Error updating TOTP secret:", err.message);
					reject(err);
				} else {
					console.log("✅ TOTP secret updated for user:", email);
					resolve(true);
				}
			}
		);
	});
}

// Helper function to enable 2FA for user
async function enableUserTwoFactor(email) {
	return new Promise((resolve, reject) => {
		db.run(
			"UPDATE users SET is_2fa_enabled = 1 WHERE user_email = ?",
			[email],
			function (err) {
				if (err) {
					console.error("❌ Error enabling 2FA:", err.message);
					reject(err);
				} else {
					console.log("✅ 2FA enabled for user:", email);
					resolve(true);
				}
			}
		);
	});
}

// Helper function to disable 2FA for user
async function disableUserTwoFactor(email) {
	return new Promise((resolve, reject) => {
		db.run(
			"UPDATE users SET is_2fa_enabled = 0 WHERE user_email = ?",
			[email],
			function (err) {
				if (err) {
					console.error("❌ Error disabling 2FA:", err.message);
					reject(err);
				} else {
					console.log("✅ 2FA disabled for user:", email);
					resolve(true);
				}
			}
		);
	});
}

fastify.post('/user/aliaspicture', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	const { alias, picture } = req.body;

	if (!picture && !alias) {
		return reply.code(400).send({ error: 'Faltan parametros' });
	}

	try {
		// Get user email from JWT
		const userEmail = req.user.email;

		// Actualizar la foto del usuario en la base de datos
		if (picture)
			await changeUserPicture(userEmail, picture);
		if (alias)
			await changeUserAlias(userEmail, alias);

		console.log(`✅ Foto de usuario y alias actualizados para: ${userEmail}`);

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

// Ruta GET para inicializar el flujo de OAuth - ACTUALIZADA
fastify.get('/auth/google', async (req, reply) => {
    // Usar la nueva función de mapeo dual
    const authUrl = generateDualMappedAuthUrl(req);

    console.log("🔄 Redirigiendo a OAuth con estrategia dual:", authUrl);

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
				// Usuario no existe, insertarlo CON LA FOTO y campos de 2FA
				db.run(
					"INSERT INTO users (google_id, user_name, user_email, user_picture, totp_secret, is_2fa_enabled) VALUES (?, ?, ?, ?, ?, ?)",
					[id, user_name, email, picture || null, null, 0],
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
				// Usuario existe, ACTUALIZAR LA FOTO si se proporciona y actualizar google_id
				if (picture && row.user_picture === null) {
					db.run(
						"UPDATE users SET user_picture = ?, google_id = ? WHERE user_id = ?",
						[picture, id, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar usuario:", err.message);
								// No fallar por esto, seguir adelante
							} else {
								console.log("✅ Usuario actualizado para ID:", row.user_id);
							}
						}
					);
				} else {
					// Solo actualizar google_id si no se actualiza la foto
					db.run(
						"UPDATE users SET google_id = ? WHERE user_id = ?",
						[id, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar google_id:", err.message);
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

fastify.get('/api/current-ip', async (req, reply) => {
    const realIP = getHostIPFromRequest(req);
    
    console.log('📍 Frontend pidiendo IP actual:', realIP);
    
    return {
        ip: realIP,
        mapped: mapToRegisteredIP(realIP),
        headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer
        }
    };
});

// Debug OAuth - ACTUALIZADO para mostrar estrategia dual
fastify.get('/debug/oauth', async (req, reply) => {
    const realIP = getHostIPFromRequest(req);
    const mappedIP = mapToRegisteredIP(realIP);
    
    // Callback siempre a IP real
    const callbackUrl = realIP === '127.0.0.1'
        ? 'http://localhost:3000/auth/callback'
        : `http://${realIP}.nip.io:3000/auth/callback`;
    
    const authUrl = generateDualMappedAuthUrl(req);
    
    return {
        strategy: "DUAL_MAPPING",
        headers: req.headers,
        detected_real_ip: realIP,
        mapped_ip_for_oauth: mappedIP,
        callback_url_to_real_server: callbackUrl,
        frontend_url: `http://${realIP}.nip.io:8080`,
        google_auth_url: authUrl,
        client_id: GOOGLE_CLIENT_ID,
        explanation: {
            oauth_sees: `${mappedIP}.nip.io (registered in Google)`,
            callback_goes_to: `${realIP}.nip.io (actual server)`,
            why: "Google accepts mapped IP, but callback works because real server exists"
        }
    };
});

// === FUNCIONES MODIFICADAS PARA NIP.IO CON MAPEO ===

// Función que mapea cualquier IP de 42 a una de las 3 registradas
function mapToRegisteredIP(realIP) {
    // Si no es del rango de 42, usar localhost
    if (!realIP.startsWith('10.11.')) {
        return '127.0.0.1';
    }
    
    // Mapear a una de las 3 IPs registradas usando hash simple
    const lastOctet = parseInt(realIP.split('.')[3]);
    const mappedIPs = ['10.11.1.1', '10.11.1.2', '10.11.1.3'];
    
    // Distribuir usando módulo para balancear
    const index = lastOctet % 3;
    
    console.log(`🔄 Mapeando ${realIP} → ${mappedIPs[index]}`);
    return mappedIPs[index];
}

// Función para detectar la IP desde la petición HTTP
function getHostIPFromRequest(request) {
    const host = request.headers.host;
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    
    console.log("🔍 Headers recibidos:", { host, origin, referer });
    
    // NUEVO: Detectar IP desde el header 'host' (acceso directo por IP)
    if (host) {
        const hostIP = host.split(':')[0]; // Quitar puerto
        if (hostIP.match(/^10\.11\.\d+\.\d+$/)) {
            console.log(`✅ IP detectada desde host header: ${hostIP}`);
            return hostIP;
        }
    }
    
    // Intentar extraer IP de los headers
    if (origin) {
        try {
            const url = new URL(origin);
            const hostname = url.hostname;
            // Si es una IP en el rango de 42, usarla
            if (hostname.match(/^10\.11\.\d+\.\d+$/)) {
                console.log(`✅ IP detectada desde origin: ${hostname}`);
                return hostname;
            }
        } catch (e) {}
    }
    
    if (referer) {
        try {
            const url = new URL(referer);
            const hostname = url.hostname;
            if (hostname.match(/^10\.11\.\d+\.\d+$/)) {
                console.log(`✅ IP detectada desde referer: ${hostname}`);
                return hostname;
            }
        } catch (e) {}
    }
    
    // Fallback: usar variable de entorno o localhost
    const fallbackIP = process.env.HOST_IP || detectHostIP() || '127.0.0.1';
    console.log(`⚠️ Usando IP fallback: ${fallbackIP}`);
    return fallbackIP;
}

// Función para detectar IP cuando no hay headers disponibles
function detectHostIP() {
    try {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        
        // Buscar IP en rango de 42
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.address.startsWith('10.11.') && !iface.internal) {
                    console.log(`✅ IP detectada automáticamente: ${iface.address}`);
                    return iface.address;
                }
            }
        }
        
        console.log("⚠️ No se encontró IP en rango 10.11.x.x");
    } catch (error) {
        console.log("⚠️ Error detectando IP:", error.message);
    }
    
    return null;
}

// Función mejorada para frontend con mapeo
function getFrontendUrlFromRequest(request) {
    const referer = request.headers.referer;
    const origin = request.headers.origin;
    
    console.log("🔍 Detectando URL del frontend:", {
        referer,
        origin,
        host: request.headers.host
    });
    
    // Si viene de nip.io, mantener el formato
    if (referer && referer.includes('.nip.io')) {
        try {
            const url = new URL(referer);
            const frontendUrl = `${url.protocol}//${url.host}`;
            console.log("✅ URL del frontend detectada desde referer nip.io:", frontendUrl);
            return frontendUrl;
        } catch (error) {
            console.warn("⚠️ Error al parsear referer nip.io:", error);
        }
    }
    
    if (origin && origin.includes('.nip.io')) {
        console.log("✅ URL del frontend detectada desde origin nip.io:", origin);
        return origin;
    }
    
    // Para construcción nueva, usar IP mapeada
    const realIP = getHostIPFromRequest(request);
    const mappedIP = mapToRegisteredIP(realIP);
    const frontendUrl = mappedIP === '127.0.0.1' 
        ? 'http://localhost:8080'
        : `http://${mappedIP}.nip.io:8080`;
    
    console.log("✅ URL del frontend mapeada:", frontendUrl);
    return frontendUrl;
}

// Función mejorada para callback con proxy bidireccional
function getCallbackUrlFromRequest(request) {
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const host = request.headers.host;
    
    console.log("🔍 Detectando URL de callback:", {
        origin,
        referer,
        host
    });
    
    // Si viene de nip.io, adaptar para backend
    if (origin && origin.includes('.nip.io')) {
        try {
            const url = new URL(origin);
            const ip = url.hostname.split('.')[0]; // Extraer IP del dominio nip.io
            const callbackUrl = `http://${ip}.nip.io:3000/auth/callback`;
            console.log("✅ URL de callback detectada desde origin nip.io:", callbackUrl);
            return callbackUrl;
        } catch (error) {
            console.warn("⚠️ Error al parsear origin nip.io:", error);
        }
    }
    
    if (referer && referer.includes('.nip.io')) {
        try {
            const url = new URL(referer);
            const ip = url.hostname.split('.')[0];
            const callbackUrl = `http://${ip}.nip.io:3000/auth/callback`;
            console.log("✅ URL de callback detectada desde referer nip.io:", callbackUrl);
            return callbackUrl;
        } catch (error) {
            console.warn("⚠️ Error al parsear referer nip.io:", error);
        }
    }
    
    // PROXY BIDIRECCIONAL: usar IP REAL para callback (no mapeada)
    const realIP = getHostIPFromRequest(request);
    const callbackUrl = realIP === '127.0.0.1'
        ? 'http://localhost:3000/auth/callback'
        : `http://${realIP}.nip.io:3000/auth/callback`;  // IP REAL donde está el servidor
    
    console.log("✅ URL de callback con IP REAL:", callbackUrl);
    return callbackUrl;
}

// Nueva función para generar URL de autorización con mapeo dual
function generateDualMappedAuthUrl(request) {
    const realIP = getHostIPFromRequest(request);
    const mappedIP = mapToRegisteredIP(realIP);
    
    // CALLBACK usa IP real (donde está el servidor)
    const callbackUrl = realIP === '127.0.0.1'
        ? 'http://localhost:3000/auth/callback'
        : `http://${realIP}.nip.io:3000/auth/callback`;
    
    console.log(`🔄 Estrategia proxy: OAuth con IP mapeada ${mappedIP}, callback a IP real ${realIP}`);
    
    // Generar URL de autorización
    const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        redirect_uri: callbackUrl  // Callback a IP real
    });
    
    return authUrl;
}

// 2FA verification endpoint
fastify.post('/auth/2fa/verify', async (req, reply) => {
	try {
		const { email, totpCode } = req.body;
		
		console.log("🔐 2FA verification attempt:", {
			email: email,
			totpCodeLength: totpCode ? totpCode.length : 0,
			totpCodeType: typeof totpCode,
			timestamp: new Date().toISOString()
		});
		
		if (!email || !totpCode) {
			console.log("❌ Missing email or TOTP code");
			return reply.code(400).send({ error: 'Email and TOTP code are required' });
		}
		
		// Validate TOTP code format
		if (!/^\d{6}$/.test(totpCode)) {
			console.log("❌ Invalid TOTP code format:", totpCode);
			return reply.code(400).send({ error: 'TOTP code must be 6 digits' });
		}
		
		// Get user from database
		const user = await getUserFromDatabaseByEmail(email);
		if (!user || !user.totp_secret) {
			console.log("❌ User not found or no 2FA secret:", {
				userExists: !!user,
				hasSecret: user && !!user.totp_secret
			});
			return reply.code(400).send({ error: 'User not found or 2FA not set up' });
		}
		
		console.log("🔍 User 2FA status:", {
			email: user.user_email,
			hasSecret: !!user.totp_secret,
			secretLength: user.totp_secret ? user.totp_secret.length : 0,
			is2faEnabled: user.is_2fa_enabled,
			userId: user.user_id
		});
		
		// Verify TOTP code with enhanced logging
		console.log("🔍 Attempting TOTP verification...");
		const isValid = authenticator.verify({
			token: totpCode,
			secret: user.totp_secret,
			window: 2  // Allow 2 steps tolerance for time drift
		});
		
		console.log("🔍 TOTP verification result:", {
			isValid: isValid,
			providedCode: totpCode,
			secretExists: !!user.totp_secret,
			currentTime: Math.floor(Date.now() / 1000),
			generatedCode: user.totp_secret ? authenticator.generate(user.totp_secret) : 'NO_SECRET'
		});
		
		if (!isValid) {
			console.log("❌ Invalid TOTP code for user:", email);
			console.log("🕒 Time-based debug:", {
				serverTime: new Date().toISOString(),
				unixTime: Math.floor(Date.now() / 1000),
				expectedCode: user.totp_secret ? authenticator.generate(user.totp_secret) : 'NO_SECRET'
			});
			return reply.code(400).send({ error: 'Invalid TOTP code. Please try again.' });
		}
		
		// Enable 2FA if this is first verification
		if (!user.is_2fa_enabled) {
			await enableUserTwoFactor(email);
			console.log("✅ 2FA enabled for user:", email);
		}
		
		// Get pending user info from session or use user from DB
		const userInfo = req.session?.pendingUser || {
			id: user.google_id,
			name: user.user_name,
			email: user.user_email,
			picture: user.user_picture
		};
		
		// Issue JWT token
		const token = fastify.jwt.sign({
			userId: user.google_id,
			email: user.user_email,
			name: user.user_name,
			isTwoFactorAuthenticated: true
		});
		
		// Clear pending user from session
		if (req.session?.pendingUser) {
			delete req.session.pendingUser;
		}
		
		// Set user in session for compatibility with existing code
		req.session.user = {
			id: user.google_id,
			name: user.user_name,
			email: user.user_email,
			picture: user.user_picture
		};
		
		console.log("✅ 2FA verification successful for:", email);
		
		return {
			success: true,
			token,
			user: {
				id: user.google_id,
				name: user.user_name,
				email: user.user_email,
				picture: user.user_picture
			}
		};
		
	} catch (error) {
		console.error("❌ Error in 2FA verification:", error);
		return reply.code(500).send({ error: 'Internal server error', details: error.message });
	}
});

// Endpoint to validate JWT token
fastify.get('/auth/validate-jwt', async (req, reply) => {
	try {
		await req.jwtVerify();
		
		if (req.user && req.user.isTwoFactorAuthenticated) {
			return {
				valid: true,
				user: {
					userId: req.user.userId,
					email: req.user.email,
					name: req.user.name,
					isTwoFactorAuthenticated: req.user.isTwoFactorAuthenticated
				}
			};
		} else {
			return { valid: false, reason: '2FA not completed' };
		}
	} catch (err) {
		return { valid: false, reason: 'Invalid or expired token' };
	}
});

// 2FA setup endpoint - generates QR code for existing users who need setup
fastify.post('/auth/2fa/setup', async (req, reply) => {
	try {
		const { email } = req.body;
		
		if (!email) {
			return reply.code(400).send({ error: 'Email is required' });
		}
		
		console.log("🔐 Generando 2FA setup for user:", email);
		
		// Get user from database
		const user = await getUserFromDatabaseByEmail(email);
		if (!user) {
			return reply.code(400).send({ error: 'User not found' });
		}
		
		// Check if user already has valid 2FA setup
		if (user.totp_secret && user.is_2fa_enabled) {
			console.log("⚠️ User already has 2FA enabled:", email);
			return reply.code(400).send({ error: 'User already has 2FA enabled' });
		}
		
		// Generate new secret regardless of existing one (force fresh setup)
		const secret = authenticator.generateSecret();
		const otpauth = authenticator.keyuri(email, APP_NAME, secret);
		
		// Generate QR code as base64 image
		const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
		
		// Store secret (not enabled yet until first verification)
		await updateUserTotpSecret(email, secret);
		// Explicitly disable 2FA until verification completes
		await disableUserTwoFactor(email);
		
		console.log("✅ New 2FA setup generated for user:", email);
		
		return {
			success: true,
			qrCode: qrCodeDataUrl,
			message: 'Scan QR code with your authenticator app'
		};
		
	} catch (error) {
		console.error("❌ Error in 2FA setup:", error);
		return reply.code(500).send({ error: 'Failed to generate 2FA setup' });
	}
});

// Debug endpoint to check 2FA status
fastify.get('/auth/2fa/debug/:email', async (req, reply) => {
	try {
		const { email } = req.params;
		
		if (!email) {
			return reply.code(400).send({ error: 'Email is required' });
		}
		
		const user = await getUserFromDatabaseByEmail(email);
		
		if (!user) {
			return reply.send({
				email: email,
				userExists: false,
				error: 'User not found'
			});
		}
		
		const currentToken = user.totp_secret ? authenticator.generate(user.totp_secret) : null;
		
		return reply.send({
			email: user.user_email,
			userExists: true,
			hasSecret: !!user.totp_secret,
			secretLength: user.totp_secret ? user.totp_secret.length : 0,
			is2faEnabled: user.is_2fa_enabled,
			userId: user.user_id,
			currentTime: new Date().toISOString(),
			unixTime: Math.floor(Date.now() / 1000),
			expectedCurrentCode: currentToken,
			debug: {
				secretFirst10: user.totp_secret ? user.totp_secret.substring(0, 10) + '...' : null,
				totpLibVersion: 'otplib'
			}
		});
		
	} catch (error) {
		console.error("❌ Error in 2FA debug:", error);
		return reply.code(500).send({ error: 'Debug failed', details: error.message });
	}
});