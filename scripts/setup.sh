#!/bin/bash

# Script de setup principal del proyecto
# Ejecuta automáticamente la generación de certificados y otras tareas de setup

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Configurando proyecto Transcendence...${NC}"

# 1. Verificar dependencias básicas
echo -e "${BLUE}🔍 Verificando dependencias...${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker no encontrado - instálalo desde https://docker.com${NC}"
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose no encontrado${NC}"
fi

# 2. Generar certificados SSL automáticamente
echo -e "${BLUE}🔒 Configurando HTTPS...${NC}"
"$SCRIPT_DIR/generate-certs.sh"

# 3. Verificar archivo .env
echo -e "${BLUE}📁 Verificando configuración...${NC}"
if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
    if [[ -f "$PROJECT_ROOT/.env.example" ]]; then
        echo -e "${YELLOW}⚠️  Copiando .env.example a .env${NC}"
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${YELLOW}⚠️  IMPORTANTE: Edita .env con tus configuraciones${NC}"
    else
        echo -e "${YELLOW}⚠️  No se encontró .env ni .env.example${NC}"
    fi
else
    echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
fi

# 4. Crear directorios necesarios
echo -e "${BLUE}📁 Creando directorios...${NC}"
mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/backend/certs"

echo -e "${GREEN}✅ Setup completado${NC}"
echo ""
echo -e "${BLUE}🎯 Próximos pasos:${NC}"
echo "  1. Ejecutar: make up"
echo "  2. Acceder a: http://localhost:8080 (HTTP) o https://localhost:8443 (HTTPS)"
echo "  3. Para HTTPS, acepta el certificado self-signed en el navegador"
echo ""
echo -e "${YELLOW}💡 Comandos útiles:${NC}"
echo "  - make up      # Iniciar servicios"
echo "  - make down    # Detener servicios"
echo "  - make logs    # Ver logs"
echo "  - make clean   # Limpiar todo"