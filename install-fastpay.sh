#!/bin/bash

#===============================================================================
# BravePix - Script de Instalação Automática
# Ubuntu 24.04 LTS
# Domínio: bravepix.com
#===============================================================================

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DOMAIN="bravepix.com"
GITHUB_REPO="https://github.com/Lion1208/fastpay.git"
APP_DIR="/var/www/bravepix"
DB_NAME="bravepix_production"
EMAIL_SSL="admin@bravepix.com"  # Email para SSL (pode mudar)

# Funções de log
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Banner
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          BravePix - Instalação Automática                 ║${NC}"
echo -e "${GREEN}║          Domínio: ${DOMAIN}                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute como root: sudo bash install.sh"
    exit 1
fi

# Verificar Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    log_warning "Este script foi feito para Ubuntu. Continuando mesmo assim..."
fi

#===============================================================================
# ETAPA 1: Atualizar Sistema
#===============================================================================
echo ""
log_info "═══ ETAPA 1/10: Atualizando sistema... ═══"

apt update && apt upgrade -y
apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

log_success "Sistema atualizado!"

#===============================================================================
# ETAPA 2: Instalar Node.js 20
#===============================================================================
echo ""
log_info "═══ ETAPA 2/10: Instalando Node.js 20... ═══"

if command -v node &> /dev/null; then
    log_warning "Node.js já instalado: $(node -v)"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Instalar Yarn
if command -v yarn &> /dev/null; then
    log_warning "Yarn já instalado: $(yarn -v)"
else
    npm install -g yarn
fi

log_success "Node.js $(node -v) e Yarn $(yarn -v) instalados!"

#===============================================================================
# ETAPA 3: Instalar Python 3
#===============================================================================
echo ""
log_info "═══ ETAPA 3/10: Instalando Python 3... ═══"

apt install -y python3 python3-pip python3-venv python3-dev

log_success "Python $(python3 --version) instalado!"

#===============================================================================
# ETAPA 4: Instalar MongoDB
#===============================================================================
echo ""
log_info "═══ ETAPA 4/10: Instalando MongoDB... ═══"

if command -v mongod &> /dev/null; then
    log_warning "MongoDB já instalado"
else
    # Importar chave GPG
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
    
    # Adicionar repositório (usando jammy que funciona no Ubuntu 24)
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt update
    apt install -y mongodb-org
fi

# Iniciar MongoDB
systemctl start mongod || true
systemctl enable mongod || true

# Verificar se está rodando
sleep 2
if systemctl is-active --quiet mongod; then
    log_success "MongoDB instalado e rodando!"
else
    log_error "MongoDB não iniciou. Tentando corrigir..."
    # Tentar corrigir permissões
    chown -R mongodb:mongodb /var/lib/mongodb
    chown mongodb:mongodb /tmp/mongodb-27017.sock 2>/dev/null || true
    systemctl start mongod
fi

#===============================================================================
# ETAPA 5: Instalar Nginx
#===============================================================================
echo ""
log_info "═══ ETAPA 5/10: Instalando Nginx... ═══"

apt install -y nginx

systemctl start nginx
systemctl enable nginx

log_success "Nginx instalado!"

#===============================================================================
# ETAPA 6: Clonar Repositório
#===============================================================================
echo ""
log_info "═══ ETAPA 6/10: Clonando repositório... ═══"

# Remover diretório antigo se existir
if [ -d "$APP_DIR" ]; then
    log_warning "Diretório existente. Fazendo backup..."
    mv "$APP_DIR" "${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p /var/www
cd /var/www

git clone "$GITHUB_REPO" bravepix
cd "$APP_DIR"

log_success "Repositório clonado!"

#===============================================================================
# ETAPA 7: Configurar Backend
#===============================================================================
echo ""
log_info "═══ ETAPA 7/10: Configurando Backend... ═══"

cd "$APP_DIR/backend"

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependências
pip install --upgrade pip
pip install -r requirements.txt

# Gerar JWT_SECRET
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Gerar chaves VAPID
VAPID_KEYS=$(python3 -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print(v.public_key.public_bytes_raw().hex())
print('---')
print(v.private_key.private_bytes_raw().hex())
" 2>/dev/null || echo "")

if [ -z "$VAPID_KEYS" ]; then
    VAPID_PUBLIC="BJ0VzdnvGHEguOZF-VYHVmDOzWq_9PIHplTFoWVPRUcNdmw0Jrt-qg5UuTfUW5fOQVt7nudZVUUjhOkJrP7f58s"
    VAPID_PRIVATE="oyjOH5U7T1CkckrauzJWxrk2IJyAgmpzs5c0MQgdRus"
else
    VAPID_PUBLIC=$(echo "$VAPID_KEYS" | head -1)
    VAPID_PRIVATE=$(echo "$VAPID_KEYS" | tail -1)
fi

# Criar arquivo .env
cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="${DB_NAME}"
CORS_ORIGINS="*"
JWT_SECRET="${JWT_SECRET}"
VAPID_PUBLIC_KEY="${VAPID_PUBLIC}"
VAPID_PRIVATE_KEY="${VAPID_PRIVATE}"
VAPID_EMAIL="mailto:${EMAIL_SSL}"
EOF

deactivate

log_success "Backend configurado!"

#===============================================================================
# ETAPA 8: Configurar Frontend
#===============================================================================
echo ""
log_info "═══ ETAPA 8/10: Configurando Frontend... ═══"

cd "$APP_DIR/frontend"

# Criar arquivo .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
EOF

# Instalar dependências
yarn install --frozen-lockfile || yarn install

# Build para produção
yarn build

log_success "Frontend compilado!"

#===============================================================================
# ETAPA 9: Criar Serviços Systemd
#===============================================================================
echo ""
log_info "═══ ETAPA 9/10: Criando serviços... ═══"

# Serviço do Backend
cat > /etc/systemd/system/fastpay.service << EOF
[Unit]
Description=FastPay Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${APP_DIR}/backend/venv/bin"
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5
StandardOutput=append:/var/log/fastpay/backend.log
StandardError=append:/var/log/fastpay/backend.error.log

[Install]
WantedBy=multi-user.target
EOF

# Criar diretório de logs
mkdir -p /var/log/fastpay
chown -R www-data:www-data /var/log/fastpay

# Permissões
chown -R www-data:www-data "$APP_DIR"

# Recarregar systemd
systemctl daemon-reload

# Iniciar serviço
systemctl start fastpay
systemctl enable fastpay

# Verificar
sleep 3
if systemctl is-active --quiet fastpay; then
    log_success "Serviço FastPay rodando!"
else
    log_error "Erro ao iniciar FastPay. Verificando logs..."
    journalctl -u fastpay --no-pager -n 20
fi

#===============================================================================
# ETAPA 10: Configurar Nginx + SSL
#===============================================================================
echo ""
log_info "═══ ETAPA 10/10: Configurando Nginx e SSL... ═══"

# Configuração inicial do Nginx (sem SSL)
cat > /etc/nginx/sites-available/fastpay << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Frontend (React build)
    root ${APP_DIR}/frontend/build;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Frontend routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # Para uploads
        client_max_body_size 10M;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remover default e ativar fastpay
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/fastpay /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx

log_success "Nginx configurado!"

#===============================================================================
# SSL com Certbot
#===============================================================================
echo ""
log_info "Instalando SSL com Let's Encrypt..."

# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Verificar se o domínio aponta para este servidor
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short ${DOMAIN} | head -1)

echo ""
log_info "IP do servidor: ${SERVER_IP}"
log_info "IP do domínio ${DOMAIN}: ${DOMAIN_IP}"

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    log_warning "ATENÇÃO: O domínio ${DOMAIN} não aponta para este servidor!"
    log_warning "Configure o DNS antes de gerar o certificado SSL."
    log_warning ""
    log_warning "Após configurar o DNS, execute manualmente:"
    log_warning "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL_SSL} --agree-tos --non-interactive"
else
    # Gerar certificado SSL
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL_SSL} --agree-tos --non-interactive --redirect
    
    if [ $? -eq 0 ]; then
        log_success "SSL configurado com sucesso!"
    else
        log_error "Erro ao configurar SSL. Execute manualmente após verificar o DNS:"
        log_warning "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
    fi
fi

# Configurar renovação automática
systemctl enable certbot.timer
systemctl start certbot.timer

#===============================================================================
# Configurar Firewall
#===============================================================================
echo ""
log_info "Configurando Firewall..."

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log_success "Firewall configurado!"

#===============================================================================
# Criar script de atualização
#===============================================================================
cat > /usr/local/bin/fastpay-update << 'UPDATEEOF'
#!/bin/bash
cd /var/www/fastpay
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend
cd ../frontend
yarn install
yarn build

# Reiniciar serviços
sudo systemctl restart fastpay
sudo systemctl restart nginx

echo "FastPay atualizado com sucesso!"
UPDATEEOF

chmod +x /usr/local/bin/fastpay-update

#===============================================================================
# Criar script de logs
#===============================================================================
cat > /usr/local/bin/fastpay-logs << 'LOGSEOF'
#!/bin/bash
echo "=== Logs do Backend ==="
sudo journalctl -u fastpay -f
LOGSEOF

chmod +x /usr/local/bin/fastpay-logs

#===============================================================================
# Resumo Final
#===============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Resumo:${NC}"
echo -e "  • Domínio: https://${DOMAIN}"
echo -e "  • App: ${APP_DIR}"
echo -e "  • Backend: http://127.0.0.1:8001"
echo -e "  • MongoDB: mongodb://localhost:27017/${DB_NAME}"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo -e "  • Ver logs:        ${YELLOW}fastpay-logs${NC}"
echo -e "  • Atualizar:       ${YELLOW}fastpay-update${NC}"
echo -e "  • Status:          ${YELLOW}systemctl status fastpay${NC}"
echo -e "  • Reiniciar:       ${YELLOW}systemctl restart fastpay${NC}"
echo -e "  • Nginx:           ${YELLOW}systemctl restart nginx${NC}"
echo ""
echo -e "${BLUE}Verificações:${NC}"

# Verificar serviços
if systemctl is-active --quiet mongod; then
    echo -e "  • MongoDB:    ${GREEN}✓ Rodando${NC}"
else
    echo -e "  • MongoDB:    ${RED}✗ Parado${NC}"
fi

if systemctl is-active --quiet fastpay; then
    echo -e "  • Backend:    ${GREEN}✓ Rodando${NC}"
else
    echo -e "  • Backend:    ${RED}✗ Parado${NC}"
fi

if systemctl is-active --quiet nginx; then
    echo -e "  • Nginx:      ${GREEN}✓ Rodando${NC}"
else
    echo -e "  • Nginx:      ${RED}✗ Parado${NC}"
fi

# Testar API
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/health 2>/dev/null || echo "000")
if [ "$API_TEST" == "200" ]; then
    echo -e "  • API:        ${GREEN}✓ Respondendo${NC}"
else
    echo -e "  • API:        ${YELLOW}? Verificar (pode levar alguns segundos)${NC}"
fi

echo ""
echo -e "${YELLOW}IMPORTANTE:${NC}"
echo -e "  1. Certifique-se que o DNS de ${DOMAIN} aponta para: ${SERVER_IP}"
echo -e "  2. Se o SSL não foi configurado, execute:"
echo -e "     ${YELLOW}sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${NC}"
echo ""
echo -e "${GREEN}Acesse: https://${DOMAIN}${NC}"
echo ""
