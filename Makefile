.PHONY: all help up start down stop clean re logs frontend backend

# Variables
PROJECT_NAME=transcender

all up start:
	@echo "Iniciando contenedores..."
	COMPOSE_BAKE=true sudo docker compose build --no-cache
	sudo docker compose up --force-recreate

# Comando predeterminado al ejecutar 'make' sin argumentos
help:
	@echo "Uso del Makefile para Transcender:"
	@echo "  make up|start	- Levantar todos los contenedores"
	@echo "  make down|stop   - Detener todos los contenedores"
	@echo "  make frontend	- Levantar solo el contenedor frontend"
	@echo "  make backend	 - Levantar solo el contenedor backend"
	@echo "  make logs		- Ver logs de todos los contenedores"
	@echo "  make clean	   - Detener y eliminar contenedores, redes, imágenes y volúmenes del proyecto"
	@echo "  make re	 - Reconstruir imágenes y reiniciar contenedores"
	@echo "  make help		- Mostrar esta ayuda"


# Detener todos los contenedores
down stop:
	@echo "Deteniendo contenedores..."
	sudo docker compose down

# Levantar solo el frontend
frontend:
	@echo "Iniciando contenedor frontend..."
	sudo docker compose up -d frontend
	@echo "Frontend disponible en: http://localhost:8080"

# Levantar solo el backend
backend:
	@echo "Iniciando contenedor backend..."
	sudo docker compose up -d backend
	@echo "Backend disponible en: http://localhost:3000"

# Ver logs
logs:
	sudo docker compose logs -f

# Limpiar recursos
clean:
	@echo "Deteniendo contenedores y limpiando recursos..."
	sudo docker compose down --rmi all --volumes --remove-orphans
	sudo docker system prune -a --volumes
	@echo "Limpieza completada."

# Reconstruir imágenes y reiniciar contenedores
re:
	@echo "Deteniendo contenedores..."
	make down
	@echo "Reconstruyendo imágenes..."
	COMPOSE_BAKE=true sudo docker compose build --no-cache
	@echo "Reiniciando contenedores..."
	sudo docker compose up -d
	@echo "Reconstrucción completada."