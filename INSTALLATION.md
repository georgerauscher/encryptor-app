# Installation Guide - encryptor.app

**Complete step-by-step instructions for self-hosting encryptor.app**

**Time required:** 15-30 minutes  
**Difficulty:** Intermediate  
**Last updated:** November 30, 2025

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start)
3. [Production Installation](#production-installation)
4. [Configuration](#configuration)
5. [Web Server Setup](#web-server-setup)
6. [Contact Form Setup](#contact-form-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Security Hardening](#security-hardening)
10. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software
```bash
# PHP 8.1 or higher
php -v

# Composer (PHP package manager)
composer --version

# Web Server (Nginx or Apache)
nginx -v  # OR apache2 -v

# SMTP Server (for contact form)
# Local: Postfix, Exim
# Remote: Gmail, SendGrid, Mailgun, etc.
```

### System Requirements
- **OS:** Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+) or macOS
- **RAM:** 512MB minimum (1GB recommended)
- **Disk:** 50MB for application + space for logs
- **PHP Extensions:** `curl`, `mbstring`, `openssl`

### Skills Required
- Basic Linux command line
- Basic web server configuration
- Basic PHP/Composer knowledge

---

## Quick Start

**For testing or local development only**

```bash
# 1. Clone repository
git clone https://github.com/georgerauscher/encryptor-app.git
cd encryptor-app

# 2. Install dependencies
composer install

# 3. Copy SMTP configuration
cp smtp-config.example.php smtp-config.php
nano smtp-config.php  # Edit with your SMTP settings

# 4. Start PHP development server
php -S localhost:8000

# 5. Open browser
open http://localhost:8000
```

**Done!** You can now test the application locally.

**Warning:** Do NOT use PHP built-in server for production!

---

## Production Installation

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx php8.3-fpm php8.3-cli php8.3-curl php8.3-mbstring php8.3-xml composer git
```

### Step 2: Clone Repository

```bash
# Create web directory
sudo mkdir -p /var/www/mysite
cd /var/www/mysite

# Clone repository
sudo git clone https://github.com/georgerauscher/encryptor-app.git httpdocs

# Set ownership
sudo chown -R www-data:www-data httpdocs/
cd httpdocs
```

### Step 3: Install PHP Dependencies

```bash
# Install PHPMailer and other dependencies
composer install --no-dev --optimize-autoloader

# Verify installation
ls -la vendor/phpmailer/
```

### Step 4: Create Required Directories

```bash
# Create logs directory
mkdir -p /var/www/mysite/logs
chmod 755 /var/www/mysite/logs
chown www-data:www-data /var/www/mysite/logs

# Security directory already exists (from git)
chmod 755 security/
chmod 644 security/blocked-domains.txt
```

### Step 5: Configure SMTP

```bash
# Option A: SMTP config in parent directory (recommended - outside webroot)
sudo cp smtp-config.example.php ../smtp-config.php
sudo nano ../smtp-config.php

# Option B: SMTP config in same directory (less secure, but works)
cp smtp-config.example.php smtp-config.php
nano smtp-config.php

# Set permissions (CRITICAL!)
# Option A:
sudo chmod 600 ../smtp-config.php
sudo chown www-data:www-data ../smtp-config.php

# Option B:
chmod 600 smtp-config.php
chown www-data:www-data smtp-config.php
```

**Edit smtp-config.php:**
```php
return [
    'smtp_host'    => '127.0.0.1',         // Your SMTP server
    'smtp_port'    => 25,                  // 25 (local), 587 (TLS), 465 (SSL)
    'smtp_user'    => '',                  // SMTP username (if needed)
    'smtp_pass'    => '',                  // SMTP password (if needed)
    'smtp_auth'    => false,               // Enable auth (true/false)
    'from_email'   => 'noreply@yoursite.com',
    'from_name'    => 'Your Site Contact Form',
    'to_email'     => 'your@email.com',   // Where to receive messages
];
```

---

## Configuration

### Customize Your Installation

#### 1. Edit Imprint (Legal Notice)
```bash
nano imprint.php
```

Replace these placeholder texts:
- `YOUR COMPANY NAME HERE` → Your actual company name
- `Your Street Address` → Your actual address
- `your@email.com` → Your actual email
- `www.yourwebsite.com` → Your actual website
- Company registration details (if applicable)

#### 2. Edit Privacy Policy
```bash
nano privacy.php
```

Replace:
- `your@email.com` → Your actual email
- Company information
- Data protection officer (if required)

#### 3. Edit Homepage
```bash
nano index.html
```

Update:
- Contact form recipient email
- Footer copyright notice
- JSON-LD structured data (line 50-98)

#### 4. Remove Version Parameters (Optional)

For cleaner URLs, remove all `?v=20251114...` parameters:
```bash
# Find all version parameters
grep -r "?v=" *.html *.php

# Remove manually or with sed (careful!)
sed -i 's/\.css?v=[0-9]*/\.css/g' *.html *.php
sed -i 's/\.js?v=[0-9]*/\.js/g' *.html *.php
```

---

## Web Server Setup

### Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/encryptor.app
```

**Nginx Config:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name encryptor.app www.encryptor.app;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name encryptor.app www.encryptor.app;
    
    root /var/www/mysite/httpdocs;
    index index.html;
    
    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/encryptor.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/encryptor.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:; font-src 'self' data:;" always;
    
    # Cache Static Assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
    
    # PHP Processing
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Block access to sensitive files
    location ~ /\.(git|env|htaccess) {
        deny all;
        return 404;
    }
    
    location ~ /(composer\.(json|lock)|vendor|logs) {
        deny all;
        return 404;
    }
    
    # Pretty URLs (optional)
    location / {
        try_files $uri $uri/ =404;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/encryptor.app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration

```bash
sudo nano /etc/apache2/sites-available/encryptor.app.conf
```

**Apache Config:**
```apache
<VirtualHost *:80>
    ServerName encryptor.app
    ServerAlias www.encryptor.app
    DocumentRoot /var/www/mysite/httpdocs
    
    # Redirect HTTP to HTTPS
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName encryptor.app
    ServerAlias www.encryptor.app
    DocumentRoot /var/www/mysite/httpdocs
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/encryptor.app/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/encryptor.app/privkey.pem
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Directory Configuration
    <Directory /var/www/mysite/httpdocs>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Block sensitive files
    <FilesMatch "(composer\.(json|lock)|\.git|\.env)">
        Require all denied
    </FilesMatch>
    
    <DirectoryMatch "(vendor|logs)">
        Require all denied
    </DirectoryMatch>
    
    # Cache static files
    <FilesMatch "\.(css|js|jpg|jpeg|png|gif|ico|svg)$">
        Header set Cache-Control "max-age=604800, public"
    </FilesMatch>
</VirtualHost>
```

**Enable site:**
```bash
sudo a2enmod ssl headers rewrite
sudo a2ensite encryptor.app
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## Contact Form Setup

### Option 1: Local SMTP (Postfix)

**Install Postfix:**
```bash
sudo apt install postfix
# Select "Internet Site" during installation
```

**Configure Postfix:**
```bash
sudo nano /etc/postfix/main.cf
```

Add/modify:
```
myhostname = encryptor.app
mydomain = encryptor.app
myorigin = $mydomain
mydestination = $myhostname, localhost.$mydomain, localhost
relayhost =
```

**Restart Postfix:**
```bash
sudo systemctl restart postfix
sudo systemctl enable postfix
```

**Test SMTP:**
```bash
echo "Test message" | mail -s "Test Subject" your@email.com
```

### Option 2: External SMTP (Gmail)

**Enable Gmail SMTP:**
1. Go to Google Account Security
2. Enable 2-Factor Authentication
3. Create App Password

**Update smtp-config.php:**
```php
return [
    'smtp_host'    => 'smtp.gmail.com',
    'smtp_port'    => 587,
    'smtp_user'    => 'your@gmail.com',
    'smtp_pass'    => 'your-app-password',
    'smtp_auth'    => true,
    'smtp_secure'  => 'tls',
    'from_email'   => 'your@gmail.com',
    'from_name'    => 'Your Name',
    'to_email'     => 'recipient@email.com',
];
```

### Option 3: SMTP Service (SendGrid, Mailgun, etc.)

Follow provider documentation for SMTP credentials.

---

## Testing

### Test Encryption
```bash
# Open browser
http://localhost/encrypt.html

# Steps:
1. Enter test message: "Hello World"
2. Enter password: "test123"
3. Click "Encrypt Message"
4. Copy encrypted message
5. Go to /decrypt.html
6. Paste encrypted message
7. Enter password: "test123"
8. Click "Decrypt Message"
9. Verify: "Hello World" appears
```

### Test File Encryption
```bash
# Create test file
echo "Test file content" > test.txt

# Steps:
1. Go to http://localhost/encrypt-file.html (or your domain)
2. Upload test.txt
3. Enter password: "test123"
4. Click "Encrypt File"
5. Download test.txt.encrypted
6. Go to /decrypt-file.html
7. Upload test.txt.encrypted
8. Enter password: "test123"
9. Click "Decrypt File"
10. Download decrypted file
11. Verify content matches
```

### Test Contact Form
```bash
# Test valid email
curl -X POST http://localhost/send-contact.php \
  -d "name=Test User" \
  -d "email=test@protonmail.com" \
  -d "message=Test message with at least 10 characters."

# Expected: {"ok":true,"message":"Message sent successfully..."}

# Test blocked email (Gmail)
curl -X POST http://localhost/send-contact.php \
  -d "name=Test User" \
  -d "email=test@gmail.com" \
  -d "message=Test message."

# Expected: {"ok":false,"message":"..."}

# Check logs
tail -f /var/www/mysite/logs/spam-attempts.log
```

---

## Troubleshooting

### Contact Form Not Sending

**Check PHP mail function:**
```bash
php -r "mail('test@example.com', 'Test', 'Test message');"
```

**Check Postfix logs:**
```bash
tail -f /var/log/mail.log
```

**Check permissions:**
```bash
ls -l ../smtp-config.php
# Should be: -rw------- (600) www-data:www-data
```

### 404 Errors

**Check web root:**
```bash
ls -la /var/www/mysite/httpdocs/index.html
```

**Check Nginx config:**
```bash
sudo nginx -t
```

### Permission Errors

**Fix ownership:**
```bash
sudo chown -R www-data:www-data /var/www/mysite/httpdocs
sudo chown -R www-data:www-data /var/www/mysite/logs
```

**Fix permissions:**
```bash
find /var/www/mysite/httpdocs -type f -exec chmod 644 {} \;
find /var/www/mysite/httpdocs -type d -exec chmod 755 {} \;
chmod 600 ../smtp-config.php
```

### JavaScript Not Working

**Check browser console:**
- Press F12
- Look for errors
- Check if lucide.js is loaded

**Check file paths:**
```bash
ls -la /var/www/mysite/httpdocs/js/lucide.js
ls -la /var/www/mysite/httpdocs/crypto.js
```

---

## Security Hardening

### SSL/TLS Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d encryptor.app -d www.encryptor.app

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### File Permissions

```bash
# Web files
find /var/www/mysite/httpdocs -type f -exec chmod 644 {} \;
find /var/www/mysite/httpdocs -type d -exec chmod 755 {} \;

# SMTP config (CRITICAL!)
chmod 600 ../smtp-config.php

# Logs
chmod 755 /var/www/mysite/logs
chmod 644 /var/www/mysite/logs/*.log
```

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

### Fail2Ban (Optional)

```bash
# Install
sudo apt install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
```

---

## Maintenance

### Update Dependencies

```bash
cd /var/www/mysite/httpdocs
composer update
sudo systemctl reload php8.3-fpm
```

### Update Application

```bash
cd /var/www/mysite/httpdocs
git pull origin main
composer install --no-dev
sudo systemctl reload nginx
```

### Clean Old Logs

```bash
# Find logs older than 30 days
find /var/www/mysite/logs -name "*.log" -mtime +30

# Delete (be careful!)
find /var/www/mysite/logs -name "*.log" -mtime +30 -delete
```

### Clean Rate-Limit Files

```bash
# Automatic cleanup script
bash /var/www/mysite/httpdocs/security/cleanup-ratelimit.sh
```

**Add to cron (daily cleanup):**
```bash
crontab -e
```

Add:
```
0 2 * * * /usr/bin/bash /var/www/mysite/httpdocs/security/cleanup-ratelimit.sh >/dev/null 2>&1
```

### Backup

```bash
# Create backup script
nano /usr/local/bin/backup-encryptor.sh
```

Content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/encryptor"
mkdir -p $BACKUP_DIR

# Backup files
tar -czf $BACKUP_DIR/encryptor_$DATE.tar.gz \
  /var/www/mysite/httpdocs \
  ../smtp-config.php \
  --exclude='/var/www/mysite/httpdocs/vendor' \
  --exclude='/var/www/mysite/httpdocs/logs'

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: $BACKUP_DIR/encryptor_$DATE.tar.gz"
```

**Make executable and add to cron:**
```bash
chmod +x /usr/local/bin/backup-encryptor.sh

# Add to cron (daily backup at 3 AM)
crontab -e
0 3 * * * /usr/local/bin/backup-encryptor.sh >/dev/null 2>&1
```

---

## Support

### Documentation
- **README.md** - Project overview
- **DEPLOYMENT.md** - Advanced deployment options
- **SECURITY.md** - Security policy
- **CONTRIBUTING.md** - How to contribute

### Get Help
- **GitHub Issues:** https://github.com/georgerauscher/encryptor-app/issues
- **Email:** your@email.com
- **Website:** https://encryptor.app

### Original Author
- **George A. Rauscher** - https://rauscher.xyz
- **Original Project:** https://encryptor.app
- **Repository:** https://github.com/georgerauscher/encryptor-app

---

**Built for freedom. Built for privacy. Built for those who need it most.**

Installation successful? Share your experience and star the repository!

