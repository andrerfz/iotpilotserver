#!/bin/bash

# IotPilot SSL Certificate Generation Script
# Generates self-signed certificates for development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[SSL]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

header() {
    echo -e "${BLUE}[SSL]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Configuration
DOMAIN=${DOMAIN:-localhost}
CERT_DIR="traefik/config"
DAYS=365

# Create certificate directory
create_cert_dir() {
    mkdir -p "${CERT_DIR}"
    info "Created certificate directory: ${CERT_DIR}"
}

# Generate Root CA
generate_root_ca() {
    header "Generating Root CA..."

    # Generate Root CA private key
    openssl genrsa -out "${CERT_DIR}/rootCA.key" 4096

    # Generate Root CA certificate
    openssl req -x509 -new -nodes -key "${CERT_DIR}/rootCA.key" \
        -sha256 -days ${DAYS} -out "${CERT_DIR}/rootCA.crt" \
        -subj "/C=US/ST=State/L=City/O=IotPilot/OU=Development/CN=IotPilot Root CA"

    info "Root CA generated ✓"
}

# Generate server certificate
generate_server_cert() {
    header "Generating server certificate for ${DOMAIN}..."

    # Generate server private key
    openssl genrsa -out "${CERT_DIR}/server.key" 2048

    # Create certificate signing request
    openssl req -new -key "${CERT_DIR}/server.key" \
        -out "${CERT_DIR}/server.csr" \
        -subj "/C=US/ST=State/L=City/O=IotPilot/OU=Development/CN=${DOMAIN}"

    # Create certificate extensions file
    cat > "${CERT_DIR}/server.ext" << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = localhost
DNS.3 = *.${DOMAIN}
DNS.4 = iotpilotserver.test
DNS.5 = *.iotpilotserver.test
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

    # Generate server certificate signed by Root CA
    openssl x509 -req -in "${CERT_DIR}/server.csr" \
        -CA "${CERT_DIR}/rootCA.crt" -CAkey "${CERT_DIR}/rootCA.key" \
        -CAcreateserial -out "${CERT_DIR}/server.crt" \
        -days ${DAYS} -sha256 -extfile "${CERT_DIR}/server.ext"

    # Create combined certificate file
    cat "${CERT_DIR}/server.crt" "${CERT_DIR}/rootCA.crt" > "${CERT_DIR}/cert.pem"
    cp "${CERT_DIR}/server.key" "${CERT_DIR}/key.pem"

    # Cleanup temporary files
    rm "${CERT_DIR}/server.csr" "${CERT_DIR}/server.ext" "${CERT_DIR}/rootCA.srl"

    info "Server certificate generated ✓"
}

# Generate client certificate (optional)
generate_client_cert() {
    header "Generating client certificate..."

    # Generate client private key
    openssl genrsa -out "${CERT_DIR}/client.key" 2048

    # Create client certificate signing request
    openssl req -new -key "${CERT_DIR}/client.key" \
        -out "${CERT_DIR}/client.csr" \
        -subj "/C=US/ST=State/L=City/O=IotPilot/OU=Development/CN=IotPilot Client"

    # Generate client certificate signed by Root CA
    openssl x509 -req -in "${CERT_DIR}/client.csr" \
        -CA "${CERT_DIR}/rootCA.crt" -CAkey "${CERT_DIR}/rootCA.key" \
        -CAcreateserial -out "${CERT_DIR}/client.crt" \
        -days ${DAYS} -sha256

    # Create PKCS#12 file for easy import
    openssl pkcs12 -export -out "${CERT_DIR}/client.p12" \
        -inkey "${CERT_DIR}/client.key" \
        -in "${CERT_DIR}/client.crt" \
        -certfile "${CERT_DIR}/rootCA.crt" \
        -password pass:iotpilot

    # Cleanup
    rm "${CERT_DIR}/client.csr" "${CERT_DIR}/rootCA.srl"

    info "Client certificate generated ✓"
}

# Set proper permissions
set_permissions() {
    header "Setting certificate permissions..."

    # Set secure permissions
    chmod 600 "${CERT_DIR}"/*.key
    chmod 644 "${CERT_DIR}"/*.crt "${CERT_DIR}"/*.pem
    chmod 600 "${CERT_DIR}"/*.p12 2>/dev/null || true

    info "Permissions set ✓"
}

# Verify certificates
verify_certificates() {
    header "Verifying certificates..."

    # Verify server certificate
    if openssl x509 -in "${CERT_DIR}/cert.pem" -text -noout | grep -q "${DOMAIN}"; then
        info "Server certificate verification passed ✓"
    else
        warn "Server certificate verification failed"
    fi

    # Check certificate expiration
    EXPIRY=$(openssl x509 -in "${CERT_DIR}/cert.pem" -noout -dates | grep "notAfter" | cut -d= -f2)
    info "Certificate expires: ${EXPIRY}"

    # Verify certificate chain
    if openssl verify -CAfile "${CERT_DIR}/rootCA.crt" "${CERT_DIR}/server.crt" &>/dev/null; then
        info "Certificate chain verification passed ✓"
    else
        warn "Certificate chain verification failed"
    fi
}

# Create Traefik TLS configuration
create_traefik_tls_config() {
    header "Creating Traefik TLS configuration..."

    mkdir -p traefik/dynamic

    cat > traefik/dynamic/tls-certs.yml << EOF
tls:
  certificates:
    - certFile: /etc/traefik/config/cert.pem
      keyFile: /etc/traefik/config/key.pem
      stores:
        - default
  stores:
    default:
      defaultCertificate:
        certFile: /etc/traefik/config/cert.pem
        keyFile: /etc/traefik/config/key.pem
EOF

    info "Traefik TLS configuration created ✓"
}

# Show installation instructions
show_installation_instructions() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}     SSL Certificate Installation Guide     ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""
    echo "Certificates generated successfully!"
    echo ""
    echo "📁 Certificate files location: ${CERT_DIR}/"
    echo ""
    echo "🔒 Generated files:"
    echo "  • rootCA.crt     - Root Certificate Authority"
    echo "  • rootCA.key     - Root CA private key"
    echo "  • server.crt     - Server certificate"
    echo "  • server.key     - Server private key"
    echo "  • cert.pem       - Combined certificate chain"
    echo "  • key.pem        - Server private key (copy)"
    echo "  • client.crt     - Client certificate"
    echo "  • client.key     - Client private key"
    echo "  • client.p12     - Client certificate (PKCS#12 format)"
    echo ""
    echo "🖥️  To trust the Root CA on your system:"
    echo ""
    echo "macOS:"
    echo "  sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${CERT_DIR}/rootCA.crt"
    echo ""
    echo "Linux (Ubuntu/Debian):"
    echo "  sudo cp ${CERT_DIR}/rootCA.crt /usr/local/share/ca-certificates/"
    echo "  sudo update-ca-certificates"
    echo ""
    echo "Windows:"
    echo "  Import ${CERT_DIR}/rootCA.crt to 'Trusted Root Certification Authorities'"
    echo ""
    echo "🌐 Browser trust:"
    echo "  1. Import rootCA.crt as a trusted root certificate"
    echo "  2. Or accept the security warning when accessing https://${DOMAIN}"
    echo ""
    echo "🔧 For development with curl:"
    echo "  curl -k https://${DOMAIN}  # Skip certificate verification"
    echo "  curl --cacert ${CERT_DIR}/rootCA.crt https://${DOMAIN}  # Use custom CA"
    echo ""
    echo "⚠️  Note: These are self-signed certificates for development only!"
    echo "   Use proper certificates from a trusted CA in production."
    echo ""
}

# Main function
main() {
    echo ""
    echo -e "${BLUE}=============================================${NC}"
    echo -e "${BLUE}        IotPilot SSL Certificate Generator   ${NC}"
    echo -e "${BLUE}=============================================${NC}"
    echo ""

    info "Generating SSL certificates for domain: ${DOMAIN}"
    echo ""

    create_cert_dir
    generate_root_ca
    generate_server_cert
    generate_client_cert
    set_permissions
    verify_certificates
    create_traefik_tls_config
    show_installation_instructions
}

# Run main function
main "$@"