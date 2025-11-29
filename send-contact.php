<?php
/**
 * encryptor.app - CONTACT FORM HANDLER
 * Version 2.2.0 | AES-256-GCM | Zero-Knowledge
 * 
 * Built by: George A. Rauscher
 * Company: intelligent piXel GmbH, Starnberg, Germany
 * GitHub: https://github.com/georgerauscher/encryptor-app
 * License: MIT
 */
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

// Load SMTP configuration (outside web root for security)
// Tries multiple locations:
// 1. Parent directory (recommended): ../smtp-config.php
// 2. Same directory (fallback): ./smtp-config.php
$smtpConfig = null;
$configPaths = [
    __DIR__ . '/../smtp-config.php',
    __DIR__ . '/smtp-config.php',
];

foreach ($configPaths as $path) {
    if (file_exists($path)) {
        $smtpConfig = require $path;
        break;
    }
}

if (!$smtpConfig) {
    error_log("SMTP config not found. Checked paths: " . implode(', ', $configPaths));
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'Service temporarily unavailable. Please try again later.']);
    exit;
}

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/logs/contact-security.log');

// Headers
header('Content-Type: application/json; charset=utf-8');

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

// ============================================================================
// SECURITY FUNCTIONS
// ============================================================================

function getClientIP(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    }
    
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : 'unknown';
}

function checkRateLimit(string $ip): array {
    $rateLimitDir = __DIR__ . '/security';
    if (!is_dir($rateLimitDir)) {
        mkdir($rateLimitDir, 0750, true);
    }
    
    $rateLimitFile = $rateLimitDir . '/rate-limit-' . md5($ip) . '.json';
    $maxEmails = 3;
    $timeWindow = 600; // 10 minutes
    $now = time();
    
    $data = ['count' => 0, 'first_attempt' => $now, 'attempts' => []];
    
    if (file_exists($rateLimitFile)) {
        $json = file_get_contents($rateLimitFile);
        $data = json_decode($json, true) ?: $data;
        
        // Clean old attempts
        $data['attempts'] = array_filter($data['attempts'], fn($t) => ($now - $t) < $timeWindow);
        $data['count'] = count($data['attempts']);
    }
    
    // Check limit
    if ($data['count'] >= $maxEmails) {
        $oldestAttempt = min($data['attempts']);
        $waitTime = $timeWindow - ($now - $oldestAttempt);
        return ['allowed' => false, 'wait' => ceil($waitTime / 60)];
    }
    
    // Add new attempt
    $data['attempts'][] = $now;
    $data['count'] = count($data['attempts']);
    
    file_put_contents($rateLimitFile, json_encode($data));
    
    return ['allowed' => true];
}

function loadBlockedDomains(): array {
    $blockedFile = __DIR__ . '/security/blocked-domains.txt';
    if (!file_exists($blockedFile)) {
        return [];
    }
    
    $lines = file($blockedFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $domains = [];
    
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip comments
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        // Convert to lowercase for case-insensitive matching
        $domains[] = strtolower($line);
    }
    
    return $domains;
}

function checkBlockedDomain(string $email): bool {
    $blockedDomains = loadBlockedDomains();
    if (empty($blockedDomains)) {
        return false;
    }
    
    $emailParts = explode('@', strtolower($email));
    if (count($emailParts) !== 2) {
        return false;
    }
    
    $domain = strtolower($emailParts[1]);
    
    return in_array($domain, $blockedDomains, true);
}

function checkSpamKeywords(string $text): array {
    $textLower = mb_strtolower($text, 'UTF-8');
    
    // Spam keywords (multi-language)
    $spamKeywords = [
        // English
        'viagra', 'cialis', 'casino', 'gambling', 'lottery', 'winner',
        'click here', 'free money', 'urgent', 'limited time', 'act now',
        'congratulations', 'you won', 'claim prize', 'inheritance', 'nigerian prince',
        'bitcoin investment', 'cryptocurrency', 'forex trading', 'binary option',
        'weight loss', 'diet pills', 'enlarge', 'penis', 'breast',
        'pharmacy', 'prescription', 'rolex', 'replica', 'luxury',
        'loan', 'credit card', 'debt relief', 'mortgage',
        // German
        'kostenlos', 'gewinn', 'glücksspiel', 'casino', 'bonus',
        'kredit', 'darlehen', 'rechnung', 'zahlung', 'preis',
        // Pattern-based
        '[url=', '[link=', 'www.', 'http://', 'https://',
        // Price-related (often spam)
        'preis', 'price', 'kosten', 'cost', 'angebot', 'offer',
        'tiμη', // Greek "price"
        'τιμή', // Greek "price" alternate
    ];
    
    $found = [];
    foreach ($spamKeywords as $keyword) {
        if (stripos($textLower, $keyword) !== false) {
            $found[] = $keyword;
        }
    }
    
    return $found;
}

function detectLanguage(string $text): string {
    // Detect non-Latin scripts (Greek, Cyrillic, Arabic, Chinese, etc.)
    if (preg_match('/[\x{0370}-\x{03FF}]/u', $text)) { // Greek
        return 'greek';
    }
    if (preg_match('/[\x{0400}-\x{04FF}]/u', $text)) { // Cyrillic
        return 'cyrillic';
    }
    if (preg_match('/[\x{0600}-\x{06FF}]/u', $text)) { // Arabic
        return 'arabic';
    }
    if (preg_match('/[\x{4E00}-\x{9FFF}]/u', $text)) { // Chinese
        return 'chinese';
    }
    if (preg_match('/[\x{3040}-\x{309F}\x{30A0}-\x{30FF}]/u', $text)) { // Japanese
        return 'japanese';
    }
    
    // Check for German/English specifically (common words)
    $textLower = mb_strtolower($text, 'UTF-8');
    
    // German indicators
    $germanWords = ['der', 'die', 'das', 'und', 'ist', 'für', 'mit', 'sich', 'auf', 'ist', 'zu', 'von', 'können', 'wird', 'haben', 'sind', 'könnte', 'würde', 'hallo', 'bitte', 'danke', 'sehr', 'gerne', 'info', 'kontakt'];
    $hasGerman = false;
    foreach ($germanWords as $word) {
        if (preg_match('/\b' . preg_quote($word, '/') . '\b/u', $textLower)) {
            $hasGerman = true;
            break;
        }
    }
    
    // English indicators
    $englishWords = ['the', 'and', 'for', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'hello', 'please', 'thank', 'very', 'information', 'contact', 'about', 'this', 'that'];
    $hasEnglish = false;
    foreach ($englishWords as $word) {
        if (preg_match('/\b' . preg_quote($word, '/') . '\b/u', $textLower)) {
            $hasEnglish = true;
            break;
        }
    }
    
    // If text contains German or English words, allow it
    if ($hasGerman || $hasEnglish) {
        return 'allowed'; // German or English detected
    }
    
    // Latin script but no DE/EN indicators - still allow (French, Spanish, Italian, etc.)
    // Only block if non-Latin script detected
    return 'allowed';
}

function checkRandomPattern(string $text): bool {
    // Check for random character sequences (like "zekisuquc419")
    // Pattern: 3+ random consonants followed by 3+ numbers = suspicious
    if (preg_match('/^[bcdfghjklmnpqrstvwxyz]{3,}\d{2,}$/i', $text)) {
        return true;
    }
    
    // Pattern: 2+ random letter groups + numbers = suspicious
    if (preg_match('/^[a-z]{2,}\d+[a-z]{2,}\d+$/i', $text)) {
        return true;
    }
    
    // Too many consonants in a row (8+) = suspicious
    if (preg_match('/[bcdfghjklmnpqrstvwxyz]{8,}/i', $text)) {
        return true;
    }
    
    return false;
}

function checkEmailPattern(string $email): bool {
    $localPart = explode('@', $email)[0] ?? '';
    
    // Check for random patterns in email username
    if (checkRandomPattern($localPart)) {
        return true;
    }
    
    // Gmail with suspicious patterns
    if (stripos($email, '@gmail.com') !== false) {
        // Random sequences: abc123, xyz789, random letters + numbers
        if (preg_match('/^[a-z]{3,}\d{3,}@gmail\.com$/i', $email)) {
            return true;
        }
        
        // Pattern: 3+ random letters + 3+ numbers = suspicious
        if (preg_match('/^[a-z]{3,}\d{3,}@gmail\.com$/i', $email)) {
            return true;
        }
    }
    
    return false;
}

function logSpamAttempt(string $ip, string $email, string $name, string $message, string $reason): void {
    $logFile = __DIR__ . '/logs/spam-attempts.log';
    $timestamp = date('Y-m-d H:i:s') . ' UTC';
    $logEntry = sprintf(
        "[%s] SPAM BLOCKED - IP: %s | Email: %s | Name: %s | Reason: %s\n",
        $timestamp,
        $ip,
        $email,
        $name,
        $reason
    );
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// ============================================================================
// MAIN SECURITY CHECKS
// ============================================================================

// Get client IP
$clientIP = getClientIP();

// Check rate limit
$rateLimit = checkRateLimit($clientIP);
if (!$rateLimit['allowed']) {
    http_response_code(429);
    echo json_encode([
        'ok' => false,
        'message' => "Rate limit exceeded. Please wait {$rateLimit['wait']} minutes before trying again."
    ]);
    exit;
}

// Honeypot check
if (!empty($_POST['website'])) {
    logSpamAttempt($clientIP, $_POST['email'] ?? 'unknown', $_POST['name'] ?? 'unknown', '', 'Honeypot field filled');
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid request']);
    exit;
}

// Validate inputs
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid email address']);
    exit;
}

if (strlen($name) > 100 || strlen($email) > 100 || strlen($message) > 5000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Input too long']);
    exit;
}

// ============================================================================
// ANTI-SPAM CHECKS
// ============================================================================

$spamReasons = [];

// 1. Check disposable email domains
if (checkBlockedDomain($email)) {
    $spamReasons[] = 'Blocked email domain';
}

// 2. Check email pattern (random sequences)
if (checkEmailPattern($email)) {
    $spamReasons[] = 'Suspicious email pattern';
}

// 3. Check name pattern (random sequences)
if (checkRandomPattern($name)) {
    $spamReasons[] = 'Suspicious name pattern';
}

// 4. Language detection (block non-Latin scripts, allow German/English)
$textLanguage = detectLanguage($message);
if ($textLanguage !== 'allowed') {
    $spamReasons[] = 'Non-allowed language detected: ' . $textLanguage;
}

// 5. Spam keyword detection
$foundKeywords = checkSpamKeywords($message);
if (!empty($foundKeywords)) {
    $spamReasons[] = 'Spam keywords: ' . implode(', ', $foundKeywords);
}

// 6. Combined text check (name + message)
$combinedText = $name . ' ' . $message;
$combinedKeywords = checkSpamKeywords($combinedText);
if (!empty($combinedKeywords)) {
    $spamReasons[] = 'Spam keywords in combined text';
}

// Block if any spam indicators found
if (!empty($spamReasons)) {
    $reason = implode(' | ', $spamReasons);
    logSpamAttempt($clientIP, $email, $name, substr($message, 0, 200), $reason);
    
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'message' => 'Message could not be sent. Please contact directly: your@email.com'
    ]);
    exit;
}

// ============================================================================
// SANITIZE AND SEND
// ============================================================================

$name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$email = filter_var($email, FILTER_SANITIZE_EMAIL);
$message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');

// ============================================================================
// SEND EMAIL VIA PHPMailer + ProtonMail SMTP
// ============================================================================

try {
    $mail = new PHPMailer(true);
    
    // SMTP Configuration
    $mail->isSMTP();
    $mail->Host       = $smtpConfig['smtp_host'];
    $mail->SMTPAuth   = isset($smtpConfig['smtp_auth']) ? $smtpConfig['smtp_auth'] : true;
    
    // Only set credentials if authentication is enabled
    if ($mail->SMTPAuth) {
        $mail->Username   = $smtpConfig['smtp_user'];
        $mail->Password   = $smtpConfig['smtp_pass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        // No encryption for local SMTP relay
        $mail->SMTPAutoTLS = false;
    }
    
    $mail->Port       = $smtpConfig['smtp_port'];
    $mail->CharSet    = 'UTF-8';
    
    // Disable verbose debug output (production)
    $mail->SMTPDebug = 0;
    
    // Recipients
    $mail->setFrom($smtpConfig['from_email'], $smtpConfig['from_name']);
    $mail->addAddress($smtpConfig['to_email']);
    $mail->addReplyTo($email, $name);
    
    // Content - HTML Email with encryptor.app design
    $mail->isHTML(true);
    $mail->Subject = '[encryptor.app] New Contact from ' . $name;
    
    // Build beautiful HTML email body
    $emailBody = '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form Submission</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #16213e;
            padding: 0;
            margin: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            border-radius: 0;
            overflow: visible;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
            border-bottom: 2px solid rgba(102, 126, 234, 0.3);
        }
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
        }
        .content {
            padding: 40px 30px;
        }
        .field {
            margin-bottom: 24px;
        }
        .field-label {
            color: #a0a0d8;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            display: block;
        }
        .field-value {
            color: #ffffff;
            font-size: 16px;
            font-weight: 400;
            padding: 14px 18px;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        .field-value.message {
            white-space: pre-wrap;
            line-height: 1.7;
            min-height: 100px;
        }
        .metadata {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid rgba(102, 126, 234, 0.2);
        }
        .metadata-item {
            background: rgba(118, 75, 162, 0.1);
            padding: 12px 16px;
            border-radius: 8px;
        }
        .metadata-label {
            color: #a0a0d8;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .metadata-value {
            color: #ffffff;
            font-size: 13px;
            font-weight: 500;
            font-family: "SF Mono", Monaco, "Courier New", monospace;
        }
        .footer {
            background: rgba(0, 0, 0, 0.3);
            padding: 30px 30px 40px 30px;
            text-align: center;
            border-top: 1px solid rgba(102, 126, 234, 0.2);
        }
        .footer p {
            color: #a0a0d8;
            font-size: 13px;
            margin-bottom: 16px;
            line-height: 1.6;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .badge {
            display: inline-block;
            background: rgba(102, 126, 234, 0.3);
            color: #ffffff;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 8px;
            border: 1px solid rgba(102, 126, 234, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>encryptor.app</h1>
            <p>New Contact Form Submission</p>
        </div>
        
        <div class="content">
            <div class="field">
                <span class="field-label">Name</span>
                <div class="field-value">' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</div>
            </div>
            
            <div class="field">
                <span class="field-label">Email</span>
                <div class="field-value">' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</div>
            </div>
            
            <div class="field">
                <span class="field-label">Message</span>
                <div class="field-value message">' . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . '</div>
            </div>
            
            <div class="metadata">
                <div class="metadata-item">
                    <div class="metadata-label">IP Address</div>
                    <div class="metadata-value">' . htmlspecialchars($clientIP, ENT_QUOTES, 'UTF-8') . '</div>
                </div>
                <div class="metadata-item">
                    <div class="metadata-label">Timestamp</div>
                    <div class="metadata-value">' . date('d.m.Y H:i:s', time() + 3600) . ' Berlin</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>This message was sent via a contact form</p>
            <span class="badge">Verified & Secured</span>
        </div>
    </div>
</body>
</html>';
    
    $mail->Body = $emailBody;
    
    // Plain text alternative for email clients that don't support HTML
    $berlinTime = date('d.m.Y H:i:s', time() + 3600) . ' Berlin';
    $mail->AltBody = "New contact form submission from encryptor.app\n\n"
        . "Name: $name\n"
        . "Email: $email\n"
        . "IP: $clientIP\n"
        . "Time: $berlinTime\n\n"
        . "Message:\n" . str_repeat('-', 50) . "\n"
        . "$message\n"
        . str_repeat('-', 50);
    
    // Send
    $mail->send();
    
    // Success
    echo json_encode([
        'ok' => true,
        'message' => 'Message sent successfully. I will respond within 48 hours.'
    ]);
    
} catch (Exception $e) {
    // Error - log detailed error
    error_log("PHPMailer Error: " . $e->getMessage() . " | IP: $clientIP | Email: $email");
    
    // Return generic error to user (don't expose internals)
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Failed to send message. Please email directly: your@email.com'
    ]);
}
