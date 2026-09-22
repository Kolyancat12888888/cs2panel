#!/usr/bin/env bash
# ====================================================================
# CS2Panel Automated Let's Encrypt SSL Setup & Auto-Renewal
# Domain: cs2.hfl-nodes.pro
# ====================================================================
set -e

DOMAIN="cs2.hfl-nodes.pro"
EMAIL="admin@${DOMAIN}"

echo "====================================================="
echo "   CS2Panel Automated SSL Setup (Let's Encrypt)      "
echo "   Domain: ${DOMAIN}                                 "
echo "====================================================="

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run as root (sudo ./setup-ssl.sh)"
  exit 1
fi

# 1. Install Certbot & Nginx plugin if not present
echo "[+] Ensuring Certbot and Nginx are installed..."
if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y -qq certbot python3-certbot-nginx nginx
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y certbot python3-certbot-nginx nginx
elif command -v yum >/dev/null 2>&1; then
    yum install -y epel-release
    yum install -y certbot python3-certbot-nginx nginx
fi

# 2. Prepare directories
mkdir -p /var/www/certbot
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d

# 3. Copy CS2Panel Nginx config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/cs2.hfl-nodes.pro.conf" ]; then
    echo "[+] Installing Nginx configuration for ${DOMAIN}..."
    cp "${SCRIPT_DIR}/cs2.hfl-nodes.pro.conf" /etc/nginx/conf.d/cs2.hfl-nodes.pro.conf
    # For Debian/Ubuntu sites-available style
    if [ -d "/etc/nginx/sites-available" ]; then
        cp "${SCRIPT_DIR}/cs2.hfl-nodes.pro.conf" /etc/nginx/sites-available/cs2.hfl-nodes.pro.conf
        ln -sf /etc/nginx/sites-available/cs2.hfl-nodes.pro.conf /etc/nginx/sites-enabled/
    fi
fi

# 4. Obtain Let's Encrypt Certificate
echo "[+] Requesting Let's Encrypt SSL Certificate for ${DOMAIN}..."
if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    certbot certonly --webroot -w /var/www/certbot \
        -d "${DOMAIN}" \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --non-interactive || {
            echo "[!] Webroot challenge failed, attempting standalone/nginx certbot..."
            certbot --nginx -d "${DOMAIN}" --email "${EMAIL}" --agree-tos --no-eff-email --non-interactive
        }
else
    echo "[+] Certificate already exists in /etc/letsencrypt/live/${DOMAIN}"
fi

# 5. Configure Automatic Renewal Cron & Hook
echo "[+] Configuring automated certificate renewal..."
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat << 'EOF' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/sh
nginx -t && systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Add cron job to ensure auto-renewal runs twice daily
CRON_JOB="0 3,15 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -v "certbot renew" ; echo "$CRON_JOB") | crontab -

# Enable and start certbot systemd timer if available
if systemctl list-unit-files | grep -q certbot.timer; then
    systemctl enable --now certbot.timer
fi

# 6. Test Nginx Configuration & Reload
echo "[+] Testing Nginx configuration syntax..."
nginx -t
systemctl reload nginx || systemctl restart nginx

echo ""
echo "====================================================="
echo "  ✓ SSL setup completed for https://${DOMAIN}!"
echo "  ✓ Automatic certificate renewal is ACTIVE (crontab & systemd timer)"
echo "====================================================="
