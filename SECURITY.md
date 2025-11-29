# Security Policy

## Supported Versions

We currently support the latest release only.

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| < 2.2   | :x:                |

## Reporting a Vulnerability

**PLEASE DO NOT REPORT SECURITY VULNERABILITIES THROUGH PUBLIC GITHUB ISSUES.**

If you discover a security vulnerability, please follow responsible disclosure practices.

### How to Report

**Email:** george@rauscher.xyz

Please include:
1. Type of vulnerability (e.g., XSS, Crypto weakness)
2. Location (file path, line number if known)
3. Proof of Concept (steps to reproduce)
4. Impact assessment

### Response Policy

We appreciate your report and will investigate the issue as soon as possible. We ask for a reasonable timeframe to fix the issue before any public disclosure.

**Note:** This is an open-source project maintained on a best-effort basis. We do not guarantee specific response times.

### Bug Bounty

We do **NOT** have a paid bug bounty program.

## Security Best Practices

### For Users

**Strong Passwords**
- Minimum 16 characters recommended
- Use a password manager
- Never reuse passwords

**Safe Usage**
- Use HTTPS only
- Don't share passwords via insecure channels
- Delete sensitive data after use

### For Developers / Self-Hosters

**Deployment Checklist**
- [ ] Keep software updated (latest version)
- [ ] Use HTTPS (SSL/TLS)
- [ ] Configure web server headers correctly (HSTS, CSP)
- [ ] Restrict access to sensitive files (.env, .git)

## Disclaimer

This software is provided "as is" without warranty of any kind. The authors are not liable for any damages arising from the use of this software. Use at your own risk.
