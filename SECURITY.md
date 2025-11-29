# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :x:                |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**PLEASE DO NOT REPORT SECURITY VULNERABILITIES THROUGH PUBLIC GITHUB ISSUES.**

We take security seriously at encryptor.app. If you discover a security vulnerability, please follow responsible disclosure:

### How to Report

**Email:** george@rauscher.xyz  
**PGP Key:** Available on request

### What to Include

1. **Type of vulnerability** (e.g., XSS, CSRF, crypto weakness)
2. **Location** (file path, line number if known)
3. **Proof of Concept** (steps to reproduce)
4. **Impact assessment** (what can attacker do?)
5. **Suggested fix** (if you have one)

### Response Timeline

- **24 hours:** Acknowledgment of your report
- **72 hours:** Initial assessment and severity classification
- **7 days:** Detailed response with fix timeline
- **90 days:** Public disclosure (coordinated with you)

### Severity Levels

**CRITICAL** (CVSS 9.0-10.0)
- Arbitrary code execution
- Authentication bypass
- Encryption broken

**HIGH** (CVSS 7.0-8.9)
- XSS allowing account takeover
- SQL injection
- CSRF on critical functions

**MEDIUM** (CVSS 4.0-6.9)
- Non-critical XSS
- Information disclosure
- Rate limiting bypass

**LOW** (CVSS 0.1-3.9)
- Minor information leaks
- UI spoofing
- Browser compatibility issues

### Our Commitment

1. **Acknowledgment** in SECURITY.md (with your permission)
2. **CVE** assignment for critical/high vulnerabilities
3. **Coordinated disclosure** (90 days from report)
4. **Credit** in release notes (if you want)
5. **No legal action** against good-faith researchers

### Out of Scope

The following are **NOT** considered security vulnerabilities:

- Missing security headers (unless exploitable)
- Self-XSS (requires user to attack themselves)
- Clickjacking on non-sensitive pages
- Open redirects (unless chained with other vulns)
- Rate limiting on non-critical endpoints
- Known vulnerabilities in outdated browsers
- Social engineering attacks

### Bug Bounty

Currently, we do **NOT** have a paid bug bounty program. However:

- Hall of Fame listing on website
- Credit in release notes
- Public acknowledgment (if desired)
- Our eternal gratitude

## Security Best Practices

### For Users

**Strong Passwords**
- Minimum 16 characters
- Mix uppercase, lowercase, numbers, symbols
- Use password manager
- Never reuse passwords

**Safe Usage**
- Use HTTPS only (https://encryptor.app)
- Verify certificate (green padlock)
- Don't share passwords via email/SMS
- Delete sensitive data after use
- Keep browser updated

**What We DON'T Know**
- Your plaintext messages
- Your passwords
- Your encryption keys
- Your file contents
- Your IP address (beyond 24h anonymous logs)

### For Developers

**Code Review Checklist**
- [ ] No hardcoded secrets
- [ ] Input validation on all user data
- [ ] Output encoding to prevent XSS
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on expensive operations
- [ ] SQL injection prevention (prepared statements)
- [ ] Crypto uses Web Crypto API (not custom)
- [ ] No sensitive data in logs
- [ ] Secure session handling
- [ ] HTTPS only (no mixed content)

**Crypto Guidelines**
- **Use:** Web Crypto API (W3C standard)
- **Avoid:** JavaScript crypto libraries
- **Use:** AES-256-GCM (authenticated encryption)
- **Avoid:** ECB mode, custom crypto
- **Use:** PBKDF2-SHA-256 (≥100k iterations)
- **Avoid:** SHA1, MD5 for passwords
- **Use:** Cryptographically secure random (crypto.getRandomValues)
- **Avoid:** Math.random() for security

## Known Issues

### Non-Security Issues

**Browser Compatibility**
- Safari < 14: Web Crypto API incomplete
- iOS < 14: File API limitations
- IE 11: Not supported (by design)

**File Size Limits**
- Desktop: 2GB max
- Mobile: 500MB recommended
- Memory constraints vary by device

### Resolved Issues

See CHANGELOG.md for security fixes in each version.

## Security Features

### Zero-Knowledge Architecture
- All encryption client-side (browser)
- Server never sees plaintext
- No data retention
- No user accounts
- No tracking

### Cryptography
- **Algorithm:** AES-256-GCM (NIST FIPS 197)
- **Key Derivation:** PBKDF2-SHA-256 (NIST SP 800-132)
- **Iterations:** 600,000 (OWASP 2023 recommendation)
- **Salt:** 16 bytes random per encryption
- **IV:** 12 bytes random per encryption
- **Tag:** 128 bits (authentication)

### Contact Form Security
- Rate limiting (3 emails / 10 minutes)
- Honeypot field
- 763+ blocked disposable email domains
- Pattern detection (spam names/emails)
- Language detection (German/English only)
- Spam keyword filtering
- Header injection prevention
- CSRF protection (planned)

### Infrastructure
- **Server:** Hetzner (Germany, EU)
- **SSL/TLS:** Let's Encrypt (2048-bit minimum)
- **HTTPS:** Enforced (HSTS enabled)
- **Data Location:** European Union (GDPR compliant)
- **Logs:** 24h max retention (anonymous)

## Compliance

### Standards
- W3C Web Crypto API
- NIST FIPS 197 (AES)
- NIST SP 800-132 (PBKDF2)
- OWASP Top 10 (2021)
- GDPR (EU 2016/679)

### Audits
- Last internal audit: 2025-11-02
- Next planned audit: Q1 2026
- External audit: Planned for Q2 2026

## Hall of Fame

Security researchers who helped make encryptor.app better:

*(No reports yet - be the first!)*

## Contact

**General:** george@rauscher.xyz  
**Security:** george@rauscher.xyz  
**Website:** https://encryptor.app

---

**Built for freedom. Built for privacy. Built for those who need it most.**

*"Cryptography should never be a black box."*

