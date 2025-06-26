const fs = require('fs');
const fetch = require('node-fetch');
const db = require('./db');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// Verificar certificados SSL
const certsPath = path.join(__dirname, 'certs');
const keyPath = path.join(certsPath, 'localhost.key');
const certPath = path.join(certsPath, 'localhost.crt');
const isHTTPS = fs.existsSync(keyPath) && fs.existsSync(certPath);

// Configuración de Fastify con HTTPS automático
let fastifyOptions = { logger: true };
if (isHTTPS) {
    console.log('🔒 Certificados SSL encontrados - Iniciando con HTTPS');
    fastifyOptions.https = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
} else {
    console.log('📡 Certificados SSL no encontrados - Iniciando con HTTP');
}

const fastify = require('fastify')(fastifyOptions);

// Cargar variables de entorno
const PORT = process.env.PORT || (isHTTPS ? 3001 : 3000);
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_SECRET = process.env.SESSION_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';
const APP_NAME = process.env.APP_NAME || 'Transcendence';

// URLs que se adaptan automáticamente a HTTP/HTTPS
const BACKEND_URL = isHTTPS ? 'https://localhost:3001' : 'http://localhost:3000';
const FRONTEND_URL = isHTTPS ? 'https://localhost:8443' : 'http://localhost:8080';
const CALLBACK_URL = isHTTPS ? 'https://localhost:3001/auth/callback' : 'http://localhost:3000/auth/callback';

console.log('======================================');
console.log('INICIANDO SERVIDOR TRANSCENDER');
console.log('Fecha y hora:', new Date().toISOString());
console.log('Protocolo:', isHTTPS ? 'HTTPS 🔒' : 'HTTP 📡');
console.log('URLs configuradas:');
console.log('- Backend:', BACKEND_URL);
console.log('- Frontend:', FRONTEND_URL);
console.log('- Callback:', CALLBACK_URL);
console.log('======================================');

console.log('🔧 Debug configuración:');
console.log('- Puerto configurado:', PORT);
console.log('- Host configurado:', HOST);
console.log('- Certificados detectados:', isHTTPS);
console.log('- Ruta certificados:', certsPath);

if (isHTTPS) {
    try {
        const keyContent = fs.readFileSync(keyPath);
        const certContent = fs.readFileSync(certPath);
        console.log('- Key size:', keyContent.length, 'bytes');
        console.log('- Cert size:', certContent.length, 'bytes');
    } catch (error) {
        console.error('❌ Error leyendo certificados:', error.message);
    }
}

// Plugins de sesión
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
	secret: SESSION_SECRET,
	cookie: {
		secure: false, // HTTP para desarrollo
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 86400000
	}
});

fastify.addHook('onRequest', (request, reply, done) => {
	if (request.session && request.session.user) {
		request.session.touch();
	}
	done();
});

const client = new OAuth2Client(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	CALLBACK_URL
);

// JWT plugin
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
		
		if (!request.user.isTwoFactorAuthenticated) {
			throw new Error('Two-factor authentication required');
		}
	} catch (err) {
		reply.code(401).send({ error: 'Authentication required', message: err.message });
	}
});

// Optional JWT auth middleware
fastify.decorate('optionalAuthenticate', async function (request, reply) {
	try {
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
		console.log('JWT optional auth failed (ignored):', err.message);
	}
});

// CORS dinámico (adapta automáticamente HTTP/HTTPS)
fastify.register(require('@fastify/cors'), {
	origin: (origin, cb) => {
		const allowedOrigins = [
			FRONTEND_URL,                    // Se adapta automáticamente
			FRONTEND_URL.replace('https://', 'http://'),  // Fallback HTTP
			'http://localhost:8080',         // Desarrollo HTTP
			'http://127.0.0.1:8080',
			undefined // Para requests del mismo servidor
		];

		if (allowedOrigins.includes(origin)) {
			cb(null, true);
		} else {
			console.warn('CORS blocked origin:', origin);
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
	]
});

// Archivos estáticos
fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '../../frontend'),
	prefix: '/'
});

// Rutas de páginas
fastify.get('/pong', (request, reply) => {
	return reply.sendFile('pong.html');
});

fastify.get('/dashboard', (request, reply) => {
	return reply.sendFile('dashboard.html');
});

// Middleware de logs simplificado
fastify.addHook('preHandler', (req, reply, done) => {
	if (req.url !== '/user/me') {
		console.log(`📩 ${req.method} ${req.url} - Usuario: ${req.session?.user?.email || 'no auth'}`);
	}
	done();
});

// OAuth simplificado
fastify.get('/auth/google', async (req, reply) => {
	const authUrl = client.generateAuthUrl({
		access_type: 'offline',
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email'
		],
		redirect_uri: CALLBACK_URL
	});

	console.log("🔄 Redirigiendo a OAuth:", authUrl);
	return reply.redirect(authUrl);
});

// Callback de OAuth simplificado
fastify.get('/auth/callback', async (req, reply) => {
	const { code } = req.query;

	if (!code) {
		console.error("❌ No se recibió código en la redirección.");
		return reply.redirect(`${FRONTEND_URL}/?error=no_code`);
	}

	try {
		console.log("🔁 Intercambiando código por token...");

		const tokenParams = new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: CALLBACK_URL,
			grant_type: 'authorization_code',
		});

		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: tokenParams
		});

		const tokenData = await tokenResponse.json();

		if (!tokenResponse.ok) {
			console.error("❌ Error en respuesta de token:", tokenData);
			return reply.redirect(`${FRONTEND_URL}/?error=token_exchange_failed`);
		}

		if (!tokenData.access_token) {
			console.error("❌ No se recibió token de acceso");
			return reply.redirect(`${FRONTEND_URL}/?error=no_access_token`);
		}

		console.log("✅ Token recibido, obteniendo información del usuario...");

		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});

		if (!userInfoResponse.ok) {
			console.error("❌ Error al obtener información del usuario");
			return reply.redirect(`${FRONTEND_URL}/?error=userinfo_failed`);
		}

		const userInfo = await userInfoResponse.json();
		console.log("👤 Usuario autenticado:", userInfo.email);

		// Guardar en sesión
		req.session.user = {
			id: userInfo.id || userInfo.sub,
			name: userInfo.name,
			email: userInfo.email,
			picture: userInfo.picture
		};

		// Verificar/crear usuario en base de datos
		try {
			await checkUserInDatabase(userInfo.id, userInfo.name, userInfo.email, userInfo.picture);
		} catch (dbError) {
			console.error("⚠️ Error en operación de base de datos:", dbError);
		}

		// Guardar sesión
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

		// Verificar estado 2FA
		try {
			const user = await getUserFromDatabaseByEmail(userInfo.email);
			
			if (!user || !user.totp_secret || user.totp_secret === '' || user.totp_secret === null) {
				console.log("🆕 Usuario requiere configuración 2FA inicial:", userInfo.email);
				return reply.redirect(`${FRONTEND_URL}/2fa?setup=true&email=${encodeURIComponent(userInfo.email)}`);
			} else {
				console.log("🔐 Usuario requiere verificación 2FA:", userInfo.email);
				return reply.redirect(`${FRONTEND_URL}/2fa?email=${encodeURIComponent(userInfo.email)}`);
			}
		} catch (error) {
			console.error("❌ Error verificando estado 2FA:", error);
			return reply.redirect(`${FRONTEND_URL}/2fa?setup=true&email=${encodeURIComponent(userInfo.email)}`);
		}
	} catch (err) {
		console.error("❌ Error en /auth/callback:", err);
		return reply.redirect(`${FRONTEND_URL}/?error=auth_failed&message=${encodeURIComponent(err.message)}`);
	}
});

// Endpoint /user/me simplificado
fastify.get('/user/me', async (req, reply) => {
	console.log('Solicitud a /user/me');

	// Verificar JWT válido con 2FA
	try {
		await req.jwtVerify();
		if (req.user && req.user.isTwoFactorAuthenticated) {
			console.log('✅ Usuario completamente autenticado via JWT:', req.user.email);
			
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

	// Verificar sesión sin JWT válido
	if (req.session && req.session.user) {
		const sessionUser = req.session.user;
		console.log('⚠️ Usuario con sesión pero sin JWT válido:', sessionUser.email, '- REQUIERE 2FA OBLIGATORIO');

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
			
			user = {
				name: sessionUser.name || 'Usuario',
				email: sessionUser.email || 'sin-email@ejemplo.com',
				picture: sessionUser.picture || '',
				id: sessionUser.id || sessionUser.sub || Date.now().toString()
			};
		}
		
		return {
			authenticated: true,
			user,
			authMethod: 'session',
			requires2FA: true,
			isFullyAuthenticated: false
		};
	}

	console.log('❌ No se encontró usuario autenticado');
	return { 
		authenticated: false,
		requires2FA: false,
		isFullyAuthenticated: false
	};
});

// 2FA verification endpoint
fastify.post('/auth/2fa/verify', async (req, reply) => {
	try {
		const { email, totpCode } = req.body;
		
		console.log("🔐 2FA verification attempt:", {
			email: email,
			totpCodeLength: totpCode ? totpCode.length : 0
		});
		
		if (!email || !totpCode) {
			return reply.code(400).send({ error: 'Email and TOTP code required' });
		}
		
		const user = await getUserFromDatabaseByEmail(email);
		if (!user) {
			console.log("❌ User not found for 2FA verification:", email);
			return reply.code(404).send({ error: 'User not found' });
		}
		
		if (!user.totp_secret) {
			console.log("❌ No TOTP secret found for user:", email);
			return reply.code(400).send({ error: 'TOTP not configured for this user' });
		}
		
		const isValid = authenticator.verify({
			token: totpCode,
			secret: user.totp_secret
		});
		
		console.log("🔐 TOTP verification result:", {
			email,
			providedCode: totpCode,
			isValid,
			hasSecret: !!user.totp_secret,
			currentTime: Math.floor(Date.now() / 1000),
			generatedCode: user.totp_secret ? authenticator.generate(user.totp_secret) : 'NO_SECRET'
		});
		
		if (!isValid) {
			console.log("❌ Invalid TOTP code for user:", email);
			return reply.code(400).send({ error: 'Invalid TOTP code. Please try again.' });
		}
		
		// Enable 2FA if this is first verification
		if (!user.is_2fa_enabled) {
			await enableUserTwoFactor(email);
			console.log("✅ 2FA enabled for user:", email);
		}
		
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
		
		// Set user in session
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

// 2FA setup endpoint
fastify.post('/auth/2fa/setup', async (req, reply) => {
	try {
		const { email } = req.body;
		console.log("🆕 2FA setup request for:", email);
		
		if (!email) {
			return reply.code(400).send({ error: 'Email required' });
		}
		
		// Verify user has valid session
		if (!req.session || !req.session.user || req.session.user.email !== email) {
			return reply.code(401).send({ error: 'Invalid session' });
		}
		
		const user = await getUserFromDatabaseByEmail(email);
		
		if (!user || !user.totp_secret || user.totp_secret === '' || user.totp_secret === null || !user.is_2fa_enabled) {
			const secret = authenticator.generateSecret();
			const otpauth = authenticator.keyuri(email, APP_NAME, secret);
			
			const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
			
			await updateUserTotpSecret(email, secret);
			
			console.log("🆕 2FA setup required for user:", email);
			
			return {
				status: '2fa_setup_required',
				message: '2FA setup required - Please scan QR code',
				qrCode: qrCodeDataUrl,
				user: {
					name: req.session.user.name,
					email: req.session.user.email,
					picture: req.session.user.picture
				}
			};
		} else {
			console.log("✅ 2FA verification required for existing user:", email);
			
			req.session.pendingUser = {
				id: req.session.user.id,
				name: req.session.user.name,
				email: req.session.user.email,
				picture: req.session.user.picture,
				googleId: req.session.user.id
			};
			
			return {
				status: '2fa_verification_required',
				message: '2FA verification required - Enter your 6-digit code',
				user: {
					name: req.session.user.name,
					email: req.session.user.email,
					picture: req.session.user.picture
				}
			};
		}
	} catch (dbError) {
		console.error("⚠️ Error en operación de base de datos:", dbError);
		reply.code(500).send({ error: 'Database error', details: dbError.message });
	}
});

// Logout
fastify.post('/auth/logout', async (req, reply) => {
	console.log('🚪 Solicitud de cierre de sesión recibida');

	try {
		if (req.session) {
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
				req.session = null;
			}

			reply.clearCookie('sessionId');
			console.log('✅ Sesión destruida correctamente');
		}

		return { success: true, message: 'Sesión cerrada correctamente' };
	} catch (error) {
		console.error('❌ Error al cerrar sesión:', error);
		return { success: false, message: 'Error al cerrar sesión', error: String(error) };
	}
});

// Refresh JWT token
fastify.post('/auth/refresh', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	try {
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

// Diagnóstico
fastify.get('/auth/diagnose', async (req, reply) => {
	return {
		environment: {
			GOOGLE_CLIENT_ID_SET: !!GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET_SET: !!GOOGLE_CLIENT_SECRET,
			GOOGLE_CALLBACK_URL: CALLBACK_URL,
			FRONTEND_URL: FRONTEND_URL,
			BACKEND_URL: BACKEND_URL,
			NODE_ENV: process.env.NODE_ENV
		},
		session: {
			configured: !!SESSION_SECRET,
			cookieSecure: false
		},
		server: {
			port: PORT,
			host: HOST
		}
	};
});

// Update user profile
fastify.post('/user/aliaspicture', { preHandler: [fastify.authenticate] }, async (req, reply) => {
	const { alias, picture } = req.body;

	if (!picture && !alias) {
		return reply.code(400).send({ error: 'Faltan parametros' });
	}

	try {
		const userEmail = req.user.email;

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

// Error handler
fastify.setErrorHandler(function (error, request, reply) {
	console.error('❌ ERROR:', error);
	if (error.code === 'FST_ERR_COOKIE_SESSION_UNAVAILABLE') {
		console.log('Problema detectado con la sesión. Reseteando cookie...');
		reply.clearCookie('sessionId');
	}

	reply.status(error.statusCode || 500).send({
		error: error.name,
		message: error.message,
		statusCode: error.statusCode || 500
	});
});

// Debug session
fastify.get('/debug/session', async (request, reply) => {
	return {
		session: request.session || null,
		cookies: request.headers.cookie || null,
		headers: request.headers,
		timestamp: new Date().toISOString(),
		authenticated: request.session?.user ? true : false
	};
});

// User check (compatibilidad)
fastify.post('/users/check', async (request, reply) => {
	if (!request.session || !request.session.user) {
		return reply.code(401).send({ error: 'Not authenticated' });
	}

	const user = request.session.user;

	db.get("SELECT user_id FROM users WHERE user_name = ? OR user_email = ?", [user.name, user.email], function (err, row) {
		if (err) {
			console.error("Error al verificar usuario:", err.message);
			return reply.code(500).send({ error: 'Database error' });
		} else if (!row) {
			db.run("INSERT INTO users (user_name, user_email) VALUES (?, ?)", [user.name, user.email], function (err) {
				if (err) {
					console.error("Error al insertar usuario:", err.message);
					return reply.code(500).send({ error: 'Database error' });
				} else {
					console.log(`✓ Usuario creado: ${user.name} con ID ${this.lastID}`);
					return reply.send({ user: { id: this.lastID, name: user.name, email: user.email } });
				}
			});
		} else {
			console.log(`✓ Usuario '${user.name}' ya existe en la BD con ID ${row.user_id}`);
			return reply.send({ user: { id: row.user_id, name: user.name, email: user.email } });
		}
	});
});

// Endpoints para pong scores y leaderboard
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

// Start server
fastify.listen({ port: PORT, host: HOST });

// Helper functions
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

async function changeUserPicture(email, picture) {
	return new Promise((resolve, reject) => {
		db.run(
			"UPDATE users SET user_picture = ? WHERE user_email = ?",
			[picture, email],
			function (err) {
				if (err) {
					console.error("❌ Error updating user picture:", err.message);
					reject(err);
				} else {
					console.log("✅ User picture updated for:", email);
					resolve(true);
				}
			}
		);
	});
}

async function changeUserAlias(email, alias) {
	return new Promise((resolve, reject) => {
		db.run(
			"UPDATE users SET user_name = ? WHERE user_email = ?",
			[alias, email],
			function (err) {
				if (err) {
					console.error("❌ Error updating user alias:", err.message);
					reject(err);
				} else {
					console.log("✅ User alias updated for:", email);
					resolve(true);
				}
			}
		);
	});
}

async function checkUserInDatabase(id, user_name, email, picture) {
	return new Promise((resolve, reject) => {
		console.log(`🔍 Verificando usuario: ${user_name} (${email})`);

		db.get("SELECT user_id FROM users WHERE user_name = ? OR user_email = ?", [user_name, email], function (err, row) {
			if (err) {
				console.error("Error al verificar usuario:", err.message);
				reject(err);
			} else if (!row) {
				db.run("INSERT INTO users (user_name, user_email, google_id, user_picture) VALUES (?, ?, ?, ?)", [user_name, email, id, picture], function (err) {
					if (err) {
						console.error("Error al insertar usuario:", err.message);
						reject(err);
					} else {
						console.log(`✓ Usuario creado: ${user_name} con ID ${this.lastID}`);
						resolve({ exists: false, userId: this.lastID });
					}
				});
			} else {
				if (picture) {
					db.run(
						"UPDATE users SET user_picture = ?, google_id = ? WHERE user_id = ?",
						[picture, id, row.user_id],
						function (err) {
							if (err) {
								console.error("Error al actualizar usuario:", err.message);
							} else {
								console.log("✅ Usuario actualizado para ID:", row.user_id);
							}
						}
					);
				} else {
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
				resolve({ exists: true, userId: row.user_id });
			}
		});
	});
}