.PHONY: all help up start down stop clean re logs frontend backend setup certs

# Variables
PROJECT_NAME=transcender

# Comando predeterminado - ahora incluye setup automático
all up start: setup
	@echo "Iniciando contenedores..."
	COMPOSE_BAKE=true docker compose build --no-cache
	docker compose up --force-recreate

# Setup automático del proyecto
setup:
	@echo "🔧 Ejecutando setup del proyecto..."
	@chmod +x scripts/setup.sh scripts/generate-certs.sh
	@./scripts/setup.sh

# Generar/verificar certificados SSL
certs:
	@echo "🔒 Verificando certificados SSL..."
	@chmod +x scripts/generate-certs.sh
	@./scripts/generate-certs.sh

# Comando de ayuda
help:
	@echo "Uso del Makefile para Transcender:"
	@echo ""
	@echo "Comandos principales:"
	@echo "  make up|start    - Setup automático + levantar contenedores"
	@echo "  make down|stop   - Detener todos los contenedores"
	@echo "  make setup       - Configurar proyecto (certificados, .env, etc.)"
	@echo "  make certs       - Generar/verificar certificados SSL"
	@echo ""
	@echo "Comandos de desarrollo:"
	@echo "  make frontend    - Levantar solo el contenedor frontend"
	@echo "  make backend     - Levantar solo el contenedor backend"
	@echo "  make logs        - Ver logs de todos los contenedores"
	@echo ""
	@echo "Comandos de limpieza:"
	@echo "  make clean       - Detener y eliminar contenedores, redes, imágenes y volúmenes"
	@echo "  make re          - Reconstruir imágenes y reiniciar contenedores"
	@echo ""
	@echo "  make help        - Mostrar esta ayuda"

# Detener todos los contenedores
down stop:
	@echo "Deteniendo contenedores..."
	docker compose down

# Levantar solo el frontend
frontend: setup
	@echo "Iniciando contenedor frontend..."
	docker compose up -d frontend
	@echo "Frontend disponible en:"
	@echo "  - HTTP:  http://localhost:8080"
	@echo "  - HTTPS: https://localhost:8443"

# Levantar solo el backend
backend: setup
	@echo "Iniciando contenedor backend..."
	docker compose up -d backend
	@echo "Backend disponible en:"
	@echo "  - HTTP:  http://localhost:3000"
	@echo "  - HTTPS: https://localhost:3001"

# Ver logs
logs:
	docker compose logs -f

# Limpiar recursos
clean:
	@echo "Deteniendo contenedores y limpiando recursos..."
	docker compose down --rmi all --volumes --remove-orphans
	docker system prune -a --volumes
	@echo "Limpieza completada."
	@echo ""
	@echo "NOTA: Los certificados SSL se mantienen en backend/certs/"
	@echo "Para regenerarlos ejecuta: make certs"

# Reconstruir imágenes y reiniciar contenedores
re: setup
	@echo "Deteniendo contenedores..."
	make down
	@echo "Reconstruyendo imágenes..."
	COMPOSE_BAKE=true docker compose build --no-cache
	@echo "Reiniciando contenedores..."
	docker compose up -d
	@echo "Reconstrucción completada."

# Target que no hace nada si no existe el setup
%:
	@if [ -f scripts/setup.sh ]; then \
		echo "🤔 Comando no reconocido. Ejecuta 'make help' para ver comandos disponibles."; \
	else \
		echo "⚠️  Scripts no encontrados. ¿Estás en el directorio correcto del proyecto?"; \
	fi