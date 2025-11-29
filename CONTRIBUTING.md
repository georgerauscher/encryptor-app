# Contributing to encryptor.app

Thank you for your interest in contributing! This project is built by [George A. Rauscher](https://rauscher.xyz) and maintained as open-source software.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Use the issue template** for bug reports
3. **Include:**
   - Browser/OS version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features

1. **Open an issue** with clear description
3. **Explain the use case** and why it's valuable

### Pull Requests

#### Before You Start
- **Discuss major changes** in an issue first
- **Follow code style guidelines**
- **Work minimalinvasively**

#### Code Style
- **No emojis** in code or documentation
- **No hardcoding** - use config files
- **English comments** in code
- **German error messages** in UI (for users)
- **Clean, readable code** - "handcoded look"

#### Testing Requirements
```bash
# Test encryption/decryption
1. Open encrypt.html in your browser
2. Enter test message
3. Encrypt with password
4. Decrypt with same password
5. Verify original message restored

# Test file encryption (if changed)
1. Upload test file (<100MB)
2. Encrypt with password
3. Download .encrypted file
4. Decrypt with same password
5. Verify original file restored

# Test contact form (if changed)
curl -X POST http://localhost/send-contact.php \
  -d "name=Test User" \
  -d "email=test@protonmail.com" \
  -d "message=Test message with at least 10 characters."
```

#### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Test** thoroughly (see above)
5. **Update** documentation:
   - `CHANGELOG.md` - Add your changes under "Unreleased"
   - `README.md` - Update if user-facing changes
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

#### Commit Messages
```
feat: Add password strength indicator
fix: Resolve mobile touch events for modal
docs: Update installation instructions
style: Improve button hover animations
refactor: Extract duplicate password validation
test: Add crypto.js unit tests
```

### What We're Looking For

**High Priority:**
- Security improvements (crypto, XSS, CSRF)
- Mobile browser compatibility
- Performance optimizations
- Accessibility (WCAG 2.1 AA)
- Translations (i18n/l10n)
- Documentation improvements

**Medium Priority:**
- UI/UX enhancements
- New encryption features
- File format support
- Browser extension

**Low Priority:**
- Frameworks (we prefer vanilla JS)
- Complex build systems
- External dependencies

### What We Won't Accept

- Code with emojis
- Hardcoded values (config must be in files)
- Breaking changes without migration path
- Features that compromise zero-knowledge architecture
- Analytics/tracking code
- Code that stores passwords or encrypted data on server

## Development Setup

### Prerequisites
```bash
# PHP 8.1+
php -v

# Composer
composer --version

# Web server (Nginx/Apache)
```

### Installation
```bash
# Clone your fork
git clone https://github.com/georgerauscher/encryptor-app.git
cd encryptor-app

# Install PHP dependencies
composer install

# Copy SMTP config
cp smtp-config.example.php smtp-config.php
nano smtp-config.php

# Set permissions
chmod 600 smtp-config.php
chmod 755 security/
chmod 644 security/blocked-domains.txt
```

### Local Testing
```bash
# Start PHP development server
php -S localhost:8000

# Open browser
open http://localhost:8000
```

## Code Review Process

1. **Automated checks** (GitHub Actions)
   - PHP syntax check
   - JavaScript linting
   - Security scan

2. **Manual review** by maintainer
   - Code quality
   - Security implications
   - Performance impact
   - Documentation completeness

3. **Testing** on multiple browsers
   - Chrome/Edge
   - Firefox
   - Safari (macOS/iOS)

4. **Merge** after approval

## Community Guidelines

### Be Respectful
- Constructive criticism only
- No personal attacks
- Respect different perspectives
- Help newcomers

### Be Professional
- No spam or self-promotion
- Stay on-topic
- Use clear, professional language
- Respect maintainer's decisions

### Security
- **Never** post sensitive data in issues
- **Report security vulnerabilities privately** to george@rauscher.xyz
- **Give time** for fixes before public disclosure (90 days)

## Questions?

- **General questions:** Open an issue with "Question" label
- **Security questions:** george@rauscher.xyz
- **Development help:** Discussions tab

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Built for freedom. Built for privacy. Built for those who need it most.**

Thank you for helping make encryption accessible to everyone!

