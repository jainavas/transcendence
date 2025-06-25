FROM node:18-alpine

# Configurar zona horaria en Alpine
RUN apk add --no-cache tzdata
ENV TZ=Europe/Madrid
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

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

# Copiar carpeta de texturas
COPY textures/ ./textures/

# Crear directorio dist
RUN mkdir -p dist

# Compilar TypeScript y CSS (se mantendrá como referencia pero será reemplazado al inicio)
RUN npm run build

# Crear script de inicio con build al iniciar
# Modificar la sección del script de inicio en el Dockerfile
RUN printf '#!/bin/sh\n\
# Crear directorio dist si no existe\n\
mkdir -p dist\n\
\n\
# Limpiar archivos antiguos del directorio dist\n\
echo "🧹 Limpiando archivos antiguos..."\n\
rm -f dist/*.js dist/*.css dist/*.map\n\
\n\
# Ejecutar build al iniciar para asegurar archivos CSS actualizados\n\
echo "🔄 Ejecutando build al iniciar..."\n\
npm run build\n\
echo "✅ Build completado - CSS y JavaScript generados"\n\
\n\
# Crear archivo env-types.js en dist en tiempo de ejecución\n\
echo "// Archivo JavaScript para satisfacer la importación en tiempo de ejecución" > dist/env-types.js\n\
echo "console.log(\\"✅ Tipos de entorno cargados\\");" >> dist/env-types.js\n\
echo "export {};" >> dist/env-types.js\n\
echo "✅ Archivo env-types.js creado en dist/"\n\
\n\
# Copiar env-types.js a la raíz para compatibilidad con importaciones\n\
cp -f dist/env-types.js /app/\n\
echo "✅ Archivo env-types.js copiado a la raíz"\n' > /app/build.sh

# Asegurarnos de que el script de build tenga permisos de ejecución
RUN chmod +x /app/build.sh

# Ejecutar el build durante la construcción de la imagen
RUN /app/build.sh

# Verificar los archivos generados
RUN ls -la dist/
RUN echo "Contenido de main.js:" && cat dist/main.js || echo "⚠️ main.js no existe!"
RUN echo "Contenido de dashboard.js:" && cat dist/dashboard.js || echo "⚠️ dashboard.js no existe!"
RUN echo "Contenido de styles.css:" && cat dist/styles.css || echo "⚠️ styles.css no existe!"

# Instalar servidor http
RUN npm install -g http-server nodemon

# Exponer puerto
EXPOSE 8080

# No usamos CMD aquí - docker-compose lo maneja

# Copiar carpeta de texturas desde el frontend
COPY ./textures /app/textures
