/**
 * encryptor.app - TEXT ENCRYPTION ENGINE
 * Version 2.2.0 | AES-256-GCM | Zero-Knowledge
 * 
 * Built by: George A. Rauscher
 * Company: intelligent piXel GmbH, Starnberg, Germany
 * GitHub: https://github.com/georgerauscher/encryptor-app
 * License: MIT (see LICENSES.md)
 * 
 * Client-side AES-256-GCM encryption. Everything happens in your browser.
 * No server. No cloud. No tracking. Just math.
 * 
 * HOW IT WORKS:
 * 1. Your password -> PBKDF2-SHA-256 (100k iterations) -> 256-bit key
 * 2. Generate random salt (16 bytes) and IV (12 bytes)
 * 3. Encrypt with AES-256-GCM (authenticated encryption)
 * 4. Output: salt + IV + ciphertext + auth tag (Base64-encoded)
 * 
 * DECRYPTION:
 * Same process in reverse. Wrong password = auth fails. Tampered data = auth fails.
 * No exceptions. No recovery. Either it works or it doesn't.
 * 
 * WHY GCM?
 * GCM (Galois/Counter Mode) provides both encryption and authentication.
 * Any modification to the ciphertext will be detected and rejected.
 * No tampering. No bit-flipping attacks. No silent corruption.
 * 
 * SECURITY NOTES:
 * - AES-256 is quantum-resistant (even Grover's algorithm needs billions of years)
 * - PBKDF2 with 100k iterations makes brute-force expensive
 * - Random salt prevents rainbow tables
 * - Random IV prevents pattern detection
 * - GCM auth tag prevents tampering
 * 
 * PASSWORD STRENGTH IS YOUR RESPONSIBILITY:
 * This code is unbreakable. Your password might not be.
 * Use long, random passwords. Use a password manager.
 * Short passwords = fast brute-force. Math doesn't care about your convenience.
 * 
 * Built by someone who's seen what happens when encryption is missing.
 * Use it. Share it. Fork it. But don't fuck with the crypto.
 */


const CRYPTO_CONFIG = {
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12, // 96 bits for GCM
    saltLength: 16,
    tagLength: 128, // 128-bit authentication tag
    pbkdf2: {
        name: 'PBKDF2',
        iterations: 100000, // OWASP recommended minimum
        hash: 'SHA-256'
    }
};

/**
 * Generate cryptographically secure random bytes
 * @param {number} length - Number of bytes to generate
 * @returns {Uint8Array} Random bytes
 */
function generateRandomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
async function deriveKey(password, salt) {
    // Import password as key material
    const passwordBuffer = new TextEncoder().encode(password);
    const importedKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: CRYPTO_CONFIG.pbkdf2.name },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive AES key using PBKDF2
    return await crypto.subtle.deriveKey(
        {
            name: CRYPTO_CONFIG.pbkdf2.name,
            salt: salt,
            iterations: CRYPTO_CONFIG.pbkdf2.iterations,
            hash: CRYPTO_CONFIG.pbkdf2.hash
        },
        importedKey,
        {
            name: CRYPTO_CONFIG.algorithm,
            length: CRYPTO_CONFIG.keyLength
        },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @param {string} password - Encryption password
 * @returns {Promise<string>} Base64-encoded encrypted data (salt + IV + ciphertext)
 */
async function encryptText(plaintext, password) {
    try {
        // Generate random salt and IV
        const salt = generateRandomBytes(CRYPTO_CONFIG.saltLength);
        const iv = generateRandomBytes(CRYPTO_CONFIG.ivLength);

        // Derive encryption key
        const key = await deriveKey(password, salt);

        // Encrypt plaintext
        const plaintextBuffer = new TextEncoder().encode(plaintext);
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: CRYPTO_CONFIG.algorithm,
                iv: iv,
                tagLength: CRYPTO_CONFIG.tagLength
            },
            key,
            plaintextBuffer
        );

        // Combine salt + IV + ciphertext
        const combined = new Uint8Array(
            salt.length + iv.length + ciphertext.byteLength
        );
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

        // Convert to Base64
        return arrayBufferToBase64(combined);
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Encryption failed: ' + error.message);
    }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {string} ciphertextBase64 - Base64-encoded encrypted data
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decryptText(ciphertextBase64, password) {
    try {
        // Decode Base64
        const combined = base64ToArrayBuffer(ciphertextBase64);

        // Extract salt, IV, and ciphertext
        const salt = combined.slice(0, CRYPTO_CONFIG.saltLength);
        const iv = combined.slice(
            CRYPTO_CONFIG.saltLength,
            CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength
        );
        const ciphertext = combined.slice(
            CRYPTO_CONFIG.saltLength + CRYPTO_CONFIG.ivLength
        );

        // Derive decryption key
        const key = await deriveKey(password, salt);

        // Decrypt ciphertext
        const plaintextBuffer = await crypto.subtle.decrypt(
            {
                name: CRYPTO_CONFIG.algorithm,
                iv: iv,
                tagLength: CRYPTO_CONFIG.tagLength
            },
            key,
            ciphertext
        );

        // Convert to string
        return new TextDecoder().decode(plaintextBuffer);
    } catch (error) {
        console.error('Decryption error:', error);
        
        // Provide user-friendly error messages
        if (error.name === 'OperationError' || error.message.includes('decrypt')) {
            throw new Error('Wrong password or corrupted data');
        } else if (error.message.includes('Invalid') || error.message.includes('format')) {
            throw new Error('Invalid encrypted message format');
        }
        
        throw new Error('Decryption failed: ' + error.message);
    }
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer|Uint8Array} buffer - Data to encode
 * @returns {string} Base64-encoded string
 */
function arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 * @param {string} base64 - Base64-encoded string
 * @returns {Uint8Array} Decoded data
 */
function base64ToArrayBuffer(base64) {
    try {
        const binary = atob(base64.trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } catch (error) {
        throw new Error('Invalid Base64 format');
    }
}

/**
 * Validate Web Crypto API support
 * @returns {boolean} True if supported
 */
function isCryptoSupported() {
    return (
        typeof crypto !== 'undefined' &&
        typeof crypto.subtle !== 'undefined' &&
        typeof crypto.getRandomValues === 'function'
    );
}

// Check browser support on load
if (!isCryptoSupported()) {
    console.error('Web Crypto API not supported in this browser');
    alert('Your browser does not support the Web Crypto API. Please use a modern browser (Chrome, Firefox, Safari, Edge).');
}

/**
 * Security notice for developers
 */
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    encryptor.app v2.0                     ║
║            Client-Side Encryption Library                 ║
║                                                           ║
║  Algorithm:     AES-256-GCM                              ║
║  Key Derivation: PBKDF2-SHA-256 (100,000 iterations)    ║
║  Architecture:   Zero-knowledge (100% client-side)       ║
║                                                           ║
║  Copyright 2025, George A. Rauscher                      ║
║  https://yourwebsite.com                                    ║
╚═══════════════════════════════════════════════════════════╝

Security Notes:
- All cryptographic operations happen in your browser
- Your plaintext and password never touch our servers
- Random salts and IVs prevent pattern analysis
- GCM mode provides authenticated encryption
- PBKDF2 with 100k iterations prevents brute-force attacks

For maximum security:
- Use passwords of at least 16 characters
- Include mixed case, numbers, and symbols
- Never reuse passwords across different messages
- Share passwords via separate channels (not with encrypted text)
`);

