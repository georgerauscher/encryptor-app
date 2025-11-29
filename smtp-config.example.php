<?php
/**
 * encryptor.app - SMTP Configuration (Example)
 * 
 * Copy this file to:
 *   - /var/www/vhosts/encryptor.app/smtp-config.php (recommended, outside web root)
 *   - OR same directory as send-contact.php (less secure)
 * 
 * Adjust permissions:
 *   chmod 600 smtp-config.php
 *   chown www-data:www-data smtp-config.php
 * 
 * Built by George A. Rauscher
 * License: MIT | https://github.com/georgerauscher/encryptor-app
 */

return [
    // SMTP Server Configuration
    'smtp_host'    => '127.0.0.1',              // Your SMTP server (localhost, mail.yourserver.com, smtp.gmail.com, etc.)
    'smtp_port'    => 25,                       // SMTP port (25 for local, 587 for TLS, 465 for SSL)
    'smtp_user'    => '',                       // SMTP username (leave empty for local relay without auth)
    'smtp_pass'    => '',                       // SMTP password (leave empty for local relay without auth)
    'smtp_auth'    => false,                    // Enable SMTP authentication (true/false)
    'smtp_secure'  => '',                       // Encryption: '' (none), 'tls', or 'ssl'
    
    // Email Addresses
    'from_email'   => 'noreply@yourdomain.com', // Sender email address
    'from_name'    => 'Your Site Contact Form', // Sender name
    'to_email'     => 'your@email.com',         // Where to receive contact form submissions
    
    // Optional: Reply-To
    'reply_to'     => '',                       // Reply-To address (leave empty to use sender's email)
    
    // Optional: CC/BCC
    'cc_email'     => '',                       // CC address (leave empty to disable)
    'bcc_email'    => '',                       // BCC address (leave empty to disable)
];

