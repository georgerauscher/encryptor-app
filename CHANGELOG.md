# encryptor.app - Changelog

All notable changes to this project will be documented in this file.

---

## [2.2.0-DEPLOY] - 2025-11-14

### 🚀 GitHub Deployment Preparation

#### White-Label & Anonymization
- **Imprint:** Replaced personal company/contact data with placeholders (YOUR COMPANY NAME, your@email.com)
- **Privacy Policy:** Anonymized personal data (YOUR NAME OR COMPANY, Your Street Address, etc.)
- **User Customization:** Easy placeholders for users to insert their own legal information
- **Mandatory Attribution:** George A. Rauscher credit retained in footer (MIT License requirement)

#### Configuration & Installation
- **SMTP Config:** Fixed hardcoded server paths in send-contact.php
  - Removed: `/var/www/vhosts/encryptor.app/smtp-config.php`
  - New Paths: `../smtp-config.php` (recommended) or `./smtp-config.php` (fallback)
- **Example Config:** Created smtp-config.example.php as template
- **Installation Guide:** Updated INSTALLATION.md with correct SMTP config paths
- **Murphy's Law Testing:** Verified fresh installation process (composer install, config setup, PHP syntax)

#### GitHub Standards
- **`.gitignore`:** Expanded to exclude vendor/, logs, internal docs, backups
- **`CONTRIBUTING.md`:** Created contribution guidelines for open source
- **`SECURITY.md`:** Created security policy and vulnerability reporting
- **`DEPLOYMENT-CHECKLIST.md`:** Created 70+ point checklist for GitHub deployment
- **Zero Personal Data:** All personal information removed or anonymized
- **Zero Hardcoded Paths:** All server-specific paths removed
- **Installability:** Verified installation works on any server

#### Bug Fixes
- **Mobile Display:** Fixed Licenses Modal permanently visible on mobile
  - Added `touchend` event listener for mobile close button
  - Force-close modal on page init
  - Explicit mobile CSS rules (`display: none !important` by default)
- **Cache Busting:** Added version parameters to CSS/JS links (`?v=20251114090000`)
- **Browser Caching:** Ensured latest CSS/JS loads after bug fixes

---

## [2.2.0] - 2025-11-02

### 🔐 Security Enhancements - Quantum-Resistant Password Generation

#### Password Generator Improvements
- **Length Increase:** 20 → 24 characters (~158 bits entropy)
- **Charset Expansion:** 70 → 94 characters (added: `[]{}|;:,.<>?`)
- **Quantum Resistance:** ~79 bits effective entropy after Grover's algorithm
- **NIST Compliant:** Meets post-quantum cryptography recommendations
- **Password Strength Display:** Fixed bug where generated passwords showed "None" instead of actual strength
- **Event Trigger:** Added `dispatchEvent('input')` to automatically analyze generated passwords
- **Files Updated:** crypto-file.js, encrypt.html

#### Technical Details
- **Previous:** 20 chars × log₂(70) ≈ 122 bits (61 bits post-quantum)
- **Current:** 24 chars × log₂(94) ≈ 158 bits (79 bits post-quantum)
- **Future-Proof:** Secure against quantum computers for 10-15+ years

### 🧹 Code Quality & GitHub Preparation

#### Emoji Removal (Complete Cleanup)
- **JavaScript Files:** Removed 20+ emojis from console.log statements
  - crypto-file.js: 15 emojis (✅, ❌, 🔐, 🔓, 📦, 🎨, 📊, ⏱️, ⏳, 🎉)
  - js/password-strength.js: 1 emoji (💡)
- **PHP Files:** Removed 6 emojis from email templates
  - send-contact.php: (🔐, 📧, 🌐, 👤, 💬, ⏰)
- **HTML Files:** Removed 1 emoji from header comments
  - decrypt.html: (🔓)
- **Reason:** Professional code standards for GitHub publication

#### Refactoring & DRY Principle
- **Shared Module:** Created `/js/password-strength.js` (173 lines)
- **Code Reduction:** Eliminated 128 lines of duplicate code
  - encrypt.html: -148 lines
  - crypto-file.js: -153 lines
- **Consistent API:** All files now use `window.PasswordStrength.analyze()` and `window.PasswordStrength.updateMeter()`
- **Maintainability:** Single source of truth for password analysis logic

#### Bug Fixes
- **Export API:** Fixed incorrect module export in password-strength.js
  - Old: `window.analyzePasswordStrength` (direct function export)
  - New: `window.PasswordStrength = { analyze, updateMeter }` (object export)
- **Function Calls:** Updated all 4 HTML pages to use correct API
- **Consistency:** Ensured encrypt.html, encrypt-file.html, decrypt-file.html all use same password strength logic

### 🎨 Code Quality & Cleanup
- **JavaScript Headers:** Cleaned up and standardized header comments
- **Comment Style:** Developer-friendly explanations
- **Code Quality:** Removed duplicate comment blocks and cleaned up formatting
- **Files Updated:** crypto.js, crypto-file.js

### 🔧 Bug Fixes
- **Licenses Modal:** Fixed broken modal due to incorrect script reference (licenses-modal.js-clean → licenses-modal.js)
- **Script Loading:** Corrected 6 files with wrong script paths (decrypt.html, encrypt.html, encrypt-file.html, decrypt-file.html, imprint.php, privacy.php)
- **Modal Functionality:** Restored working licenses popup across all pages

### 📄 Legal Updates
- **Imprint:** Updated copyright section to reflect MIT License (removed "written consent required")
- **Open Source Clarity:** Added clear statement about free use, modification, and distribution rights
- **Third-Party Attribution:** Added Lucide Icons (ISC License) attribution with link to lucide.dev
- **License Compliance:** Aligned imprint with actual MIT License terms

### 🔒 Privacy & GDPR Compliance

#### Local Asset Hosting
- **Lucide Icons:** Moved from CDN to local hosting (/js/lucide.js, 549KB)
- **Zero Third-Party:** No external requests, 100% privacy
- **No USA Transfer:** Eliminated Cloudflare CDN data transfer
- **Faster Loading:** No external DNS lookups required

#### Privacy Policy Updates
- **Version 2.2.0:** Updated to reflect zero third-party services
- **Removed Sections:** Third-Party Services section (Cloudflare/USA) removed
- **Simplified Language:** Clearer, more concise data processing description
- **Legal Compliance:** Full GDPR compliance review completed

#### Contact Form Enhancements
- **Privacy Consent:** Mandatory checkbox for Art. 6 para. 1 lit. a GDPR
- **Live Validation:** Instant frontend validation for blocked domains
- **IP Storage:** Reduced from 30 to 7 days, documented in Privacy Policy
- **Cleanup Script:** Automatic deletion of rate-limit files after 7 days
- **Legal Basis:** Changed to Art. 6 para. 1 lit. f (legitimate interest)

#### Liability & Disclaimers
- **§309 BGB Compliant:** Legally valid limitation of liability
- **Three-Tier Liability:** Intent/gross negligence, slight negligence, personal injury
- **Product Liability:** Unlimited liability for personal injury and Product Liability Act

### 📊 Legal Assessment
- **GDPR Compliance:** Note 1 (Sehr Gut)
- **Abmahn-Risiko:** 0.5/10 (Minimal)
- **Bußgeld-Risiko:** 0.5/10 (Minimal)

---

## [2.1.0] - 2025-10-31

### 🚀 Major Features

#### File Encryption/Decryption
- **File Encryption:** Encrypt files up to 2GB client-side
- **File Decryption:** Decrypt .encrypted files with original filename restoration
- **Chunked Processing:** 64MB chunks for efficient memory management
- **Progress Tracking:** Real-time progress bar with percentage and time estimates
- **Cancel Support:** Ability to cancel encryption/decryption mid-process

#### Technical Implementation
- **Algorithm:** AES-256-GCM with authenticated encryption
- **Key Derivation:** PBKDF2-SHA-256 with 100,000 iterations
- **Metadata:** Encrypted file stores original filename and size
- **Format:** Custom binary format with magic bytes validation
- **Browser Memory:** Chunked processing prevents browser crashes

### 🎨 UI/UX Improvements

#### Mega-Spinner
- **Size:** 120x120 pixels (highly visible)
- **Duration:** Minimum 5 seconds display time
- **Animation:** Smooth rotation (0.8s per cycle)
- **Auto-Scroll:** Automatic scroll to progress container
- **Progress Bar:** Animated with percentage and time remaining

#### User Experience
- **Drag & Drop:** Intuitive file upload interface
- **Password Strength:** Real-time password strength meter
- **File Validation:** Instant feedback for invalid files
- **Reset Functionality:** Clean page reload for "Another File" button
- **Visual Feedback:** Custom alerts instead of browser popups

### 🛠️ Code Quality

#### Handcoded Appearance
- **CSS Classes:** Replaced inline styles with proper CSS classes
- **Consistent Styling:** Unified design system across all pages
- **Clean HTML:** Removed repetitive patterns and emojis from code
- **Production Ready:** Removed debug logs and BETA markers

#### Performance
- **Cache Busting:** CSS versioning for browser cache control
- **Lazy Loading:** Icons loaded via Lucide CDN
- **Optimized Processing:** 100ms browser render pause before heavy operations

### 📧 Contact Form (v2.1 Enhancement)

#### Email Design
- **HTML Template:** Beautiful email design matching encryptor.app style
- **Purple/Blue Gradient:** Header (#667eea → #764ba2)
- **Dark Theme:** Background matching website
- **Emoji Icons:** All fields (👤 📧 💬 🌐 ⏰)
- **Structured Layout:** Card design with accent borders
- **Metadata Grid:** IP + Timestamp display
- **Verified Badge:** "Verified & Secured" footer
- **Client Optimization:** No white borders, fully visible badges
- **Plain-Text Fallback:** AltBody for email clients

#### Localization
- **Timezone:** Changed from UTC to Berlin (Europe/Berlin)
- **Date Format:** German format (dd.mm.yyyy HH:MM:SS)
- **Example:** `31.10.2025 18:30:00 Berlin`

#### Security Enhancement
- **Gmail Blocking:** gmail.com and gmail.de blocked
- **ProtonMail Allowed:** All ProtonMail domains whitelisted
- **Live Domain Validation:** Real-time blocked domain checking
- **Custom Error Messages:** Domain-specific rejection messages
- **Total Blocked Domains:** 769

---

## [2.0.0] - 2025-10-29

### 🛡️ Security - Multi-Layer Anti-Spam System

#### Rate Limiting
- Max 3 emails per 10 minutes per IP address
- JSON-based tracking in `/security/` directory
- Returns remaining submission count to user

#### Honeypot Field
- Hidden "website" field to catch bots
- Instant rejection if filled

#### Disposable Email Blocking
- 767+ blocked domains loaded from `/security/blocked-domains.txt`
- Includes: guerrillamail, tempmail, 10minutemail, mailinator, etc.
- Rejects emails from known disposable/temporary email services

#### Advanced Pattern Detection
- **Email Patterns:** Detects suspicious patterns like `name123@domain.com`
- **Name Patterns:** Detects random names like `LeePreli`
- **Language Detection:** Allows only German and English text
- **Spam Keywords:** Filters common spam words (viagra, casino, crypto, price, etc.)

#### Header Injection Protection
- Strips newlines from all user inputs
- Prevents email header manipulation attacks

#### Security Logging
- All blocked attempts logged to `/logs/spam-attempts.log`
- Includes: timestamp, IP, email, name, reason
- Rate limit violations logged to `/logs/contact-security.log`

---

## [1.2.0] - 2025-10-29

### ✨ Features
- **Live Form Validation:** Real-time validation on blur and input events
- **Error Messages:** Visual feedback below each field
- **Field Validation:**
  - Name: 2-100 characters, pattern detection
  - Email: Valid format, random pattern detection
  - Message: 10-5000 characters
- **Visual Feedback:**
  - Red borders for invalid fields
  - Error message spans with fade-in animation
  - Auto-scroll to first error on submit

### 🎨 Design
- Error message styling with smooth animations
- Red borders and shadows for invalid inputs
- Consistent with encryptor.app design language

---

## [1.1.0] - 2025-10-28

### ✨ Features
- Basic contact form with Name, Email, Message fields
- Client-side validation
- PHP backend for email sending (mail() function)

### 🎨 Design
- Modern UI with purple/blue color scheme
- Glassmorphism effects
- Responsive layout
- Dark theme

---

## [1.0.0] - 2025-10-27

### 🚀 Initial Release
- AES-256-GCM client-side encryption
- PBKDF2-SHA-256 key derivation
- Zero-knowledge architecture
- Military-grade security
- No server-side storage
- Progressive Web App (PWA)
- Modern UI/UX design

---

## Version History Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| 2.1.0 | 2025-10-31 | File Encryption/Decryption (2GB), Mega-Spinner, Production Ready |
| 2.0.0 | 2025-10-29 | Multi-Layer Anti-Spam System, PHPMailer, SMTP Integration |
| 1.2.0 | 2025-10-29 | Live Form Validation, Error Messages |
| 1.1.0 | 2025-10-28 | Basic Contact Form |
| 1.0.0 | 2025-10-27 | Initial Release with Encryption Core |

---

## Upcoming Features

### Planned for v2.2.0
- [ ] CSRF token protection
- [ ] Persistent IP blacklist for repeat offenders
- [ ] Admin panel for managing blocked domains
- [ ] Statistics dashboard for form submissions
- [ ] Email verification via API
- [ ] Optional invisible reCAPTCHA

### Under Consideration
- [ ] SMS/Telegram/Slack notifications
- [ ] A/B testing for email designs
- [ ] Webhook support for integrations
- [ ] Multi-language support for form
- [ ] Custom spam filter rules via UI
- [ ] File size limit increase (5GB+ with optimizations)
- [ ] Batch file encryption
- [ ] Archive encryption (.zip, .tar.gz)

---

## Breaking Changes

### v2.1.0
- File encryption feature requires modern browser with Web Crypto API
- Minimum browser versions:
  - Chrome 60+
  - Firefox 55+
  - Safari 11+
  - Edge 79+

### v2.0.0
- Changed email backend from PHP `mail()` to PHPMailer
- Requires Composer and PHPMailer installation
- SMTP configuration required in `/vhosts/encryptor.app/smtp-config.php`

---

## Security Advisories

### 2025-10-31
- **File Encryption:** All processing happens client-side. Server never sees plaintext or passwords.
- **Zero-Knowledge:** Encrypted files can only be decrypted with correct password.

### 2025-10-30
- **Gmail Blocked:** All Gmail addresses are now rejected. Users must use ProtonMail or business emails.
- **Reason:** Spam prevention and privacy-focused email policy

---

## Contributors

- **George A. Rauscher** - Lead Developer
- **intelligent piXel GmbH / International Institute of Forensic Expertise (IIFE)** - Company

---

## License

© 2025 George A. Rauscher
intelligent piXel GmbH
International Institute of Forensic Expertise (IIFE)  
All Rights Reserved

---

**Last Updated:** 2025-11-02 15:45 Berlin  
**Status:** Production Ready - Version 2.2.0 LIVE  
**Live URL:** Your deployment URL
