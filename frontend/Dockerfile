FROM node:18-alpine
WORKDIR /app

# Instalar dependencias primero para aprovechar la caché
COPY package*.json ./
RUN npm install

# Copiar archivos de configuración
COPY tsconfig.json postcss.config.js tailwind.config.js ./

# Copiar archivos fuente
COPY *.ts ./
COPY *.html ./
COPY *.css ./
COPY env-config.js ./
COPY env-types.js ./

# Crear directorio dist
RUN mkdir -p dist

# Compilar TypeScript y CSS
RUN npm run build

# Crear script de inicio con creación dinámica del archivo env-types.js en dist
RUN printf '#!/bin/sh\n\
# Crear archivo env-types.js en dist en tiempo de ejecución\n\
mkdir -p dist\n\
echo "// Archivo JavaScript para satisfacer la importación en tiempo de ejecución" > dist/env-types.js\n\
echo "console.log(\\"✅ Tipos de entorno cargados\\");" >> dist/env-types.js\n\
echo "export {};" >> dist/env-types.js\n\
echo "✅ Archivo env-types.js creado en dist/"\n\
\n\
# Configurar variables de entorno\n\
sed -i "s|\${process.env.BACKEND_URL|$BACKEND_URL|g" /app/env-config.js\n\
sed -i "s|\${process.env.FRONTEND_URL|$FRONTEND_URL|g" /app/env-config.js\n\
sed -i "s|\${process.env.GOOGLE_CLIENT_ID|$GOOGLE_CLIENT_ID|g" /app/env-config.js\n\
sed -i "s|\${process.env.NODE_ENV|$NODE_ENV|g" /app/env-config.js\n\
echo "Entorno configurado con: BACKEND_URL=$BACKEND_URL FRONTEND_URL=$FRONTEND_URL"\n\
\n\
# Iniciar servidor HTTP\n\
http-server . -p 8080 --proxy "http://localhost:8080?" --ext "" --silent\n' > /app/start.sh

# Asegurarnos de que el script tenga permisos de ejecución
RUN chmod +x /app/start.sh

# Verificar que el archivo existe y tiene permisos
RUN ls -la /app/start.sh

# Verificar los archivos generados
RUN ls -la dist/
RUN echo "Contenido de main.js:" && cat dist/main.js || echo "⚠️ main.js no existe!"
RUN echo "Contenido de dashboard.js:" && cat dist/dashboard.js || echo "⚠️ dashboard.js no existe!"
RUN echo "Contenido de styles.css:" && cat dist/styles.css || echo "⚠️ styles.css no existe!"

# Instalar servidor http
RUN npm install -g http-server

# Exponer puerto
EXPOSE 8080

# Iniciar servidor con el script
CMD ["/app/start.sh"]
