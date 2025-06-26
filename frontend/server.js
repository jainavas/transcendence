const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parse } = require('url');

const PORT = 8443;
const HTTP_PORT = 8080;

// Tipos MIME para archivos estáticos
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Función para servir archivos estáticos
function serveStatic(req, res) {
  const parsedUrl = parse(req.url);
  let pathname = `.${parsedUrl.pathname}`;
  
  // Si es la raíz, servir index.html
  if (pathname === './') {
    pathname = './index.html';
  }
  
  // Prevenir acceso a directorios padre
  if (pathname.includes('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.parse(pathname).ext;
  const mimeType = mimeTypes[ext] || 'text/plain';
  
  fs.readFile(pathname, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Si no encuentra el archivo, intentar con .html
        if (!ext) {
          fs.readFile(pathname + '.html', (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
              });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    }
  });
}

// Verificar certificados y crear servidor
const keyPath = '/app/certs/localhost.key';
const certPath = '/app/certs/localhost.crt';

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('🔒 Iniciando servidor HTTPS en puerto', PORT);
  
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  
  const httpsServer = https.createServer(options, serveStatic);
  
  httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor HTTPS corriendo en https://localhost:${PORT}`);
    console.log('📁 Sirviendo archivos desde:', process.cwd());
  });
  
  httpsServer.on('error', (err) => {
    console.error('❌ Error en servidor HTTPS:', err);
  });
  
} else {
  console.log('📡 Certificados no encontrados, iniciando servidor HTTP en puerto', HTTP_PORT);
  
  const httpServer = http.createServer(serveStatic);
  
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor HTTP corriendo en http://localhost:${HTTP_PORT}`);
    console.log('📁 Sirviendo archivos desde:', process.cwd());
  });
}