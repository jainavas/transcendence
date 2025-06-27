#!/bin/bash

# Script para generar certificados SSL self-signed automáticamente
# Se ejecuta solo si no existen los certificados

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CERTS_DIR="$PROJECT_ROOT/backend/certs"
KEY_FILE="$CERTS_DIR/localhost.key"
CERT_FILE="$CERTS_DIR/localhost.crt"

echo -e "${BLUE}🔒 Verificando certificados SSL...${NC}"

# Verificar si los certificados ya existen
if [[ -f "$KEY_FILE" && -f "$CERT_FILE" ]]; then
    echo -e "${GREEN}✅ Certificados SSL ya existen, saltando generación${NC}"
    echo -e "${BLUE}📍 Ubicación: $CERTS_DIR${NC}"
    
    # Verificar validez (opcional)
    if openssl x509 -in "$CERT_FILE" -noout -checkend 86400 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Certificados válidos (no expiran en 24h)${NC}"
    else
        echo -e "${YELLOW}⚠️  Certificados próximos a expirar, considera regenerarlos${NC}"
    fi
    
    exit 0
fi

echo -e "${YELLOW}🔧 Certificados no encontrados, generando nuevos...${NC}"

# Verificar si openssl está instalado
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL no está instalado${NC}"
    echo -e "${BLUE}💡 Instalar con:${NC}"
    echo "  - Ubuntu/Debian: sudo apt-get install openssl"
    echo "  - macOS: brew install openssl"
    echo "  - Windows: Usar Git Bash o WSL"
    exit 1
fi

# Crear directorio de certificados
mkdir -p "$CERTS_DIR"
echo -e "${BLUE}📁 Directorio creado: $CERTS_DIR${NC}"

# Generar certificado self-signed para localhost
echo -e "${BLUE}🔐 Generando certificado SSL self-signed...${NC}"

# Configuración del certificado para navegadores web
cat > "$CERTS_DIR/openssl.conf" << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ES
ST = Madrid
L = Madrid
O = Transcendence Development
OU = IT Department
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
nsComment = "OpenSSL Generated Certificate for Development"

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = *.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generar clave privada y certificado
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -config "$CERTS_DIR/openssl.conf" \
    -extensions v3_req

# Limpiar archivo de configuración temporal
rm "$CERTS_DIR/openssl.conf"

# Verificar que se generaron correctamente
if [[ -f "$KEY_FILE" && -f "$CERT_FILE" ]]; then
    echo -e "${GREEN}✅ Certificados SSL generados exitosamente${NC}"
    echo -e "${BLUE}📍 Ubicación:${NC}"
    echo "  - Clave privada: $KEY_FILE"
    echo "  - Certificado: $CERT_FILE"
    
    # Mostrar información del certificado
    echo -e "${BLUE}📋 Información del certificado:${NC}"
    openssl x509 -in "$CERT_FILE" -noout -subject -dates
    
    # Configurar permisos seguros
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    echo -e "${GREEN}🔒 Permisos de seguridad configurados${NC}"
    
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo "  - Este es un certificado self-signed para desarrollo"
    echo "  - El navegador mostrará advertencias de seguridad"
    echo "  - Haz clic en 'Avanzado' > 'Continuar a localhost'"
    
else
    echo -e "${RED}❌ Error al generar certificados${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Certificados listos para HTTPS${NC}"