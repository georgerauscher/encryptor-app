/**
 * encryptor.app - PASSWORD STRENGTH ANALYZER
 * Version 2.2.0 | AES-256-GCM | Zero-Knowledge
 * 
 * Built by: George A. Rauscher
 * Company: intelligent piXel GmbH, Starnberg, Germany
 * GitHub: https://github.com/georgerauscher/encryptor-app
 * License: MIT (see LICENSES.md)
 */

(function(window) {
    'use strict';

    /**
     * Analyze password strength
     * @param {string} password - Password to analyze
     * @returns {Object} Analysis result with score, entropy, tips, etc.
     */
    function analyzePasswordStrength(password) {
        const length = password.length;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        // Count character types
        const countUpper = (password.match(/[A-Z]/g) || []).length;
        const countLower = (password.match(/[a-z]/g) || []).length;
        const countDigit = (password.match(/[0-9]/g) || []).length;
        const countSpecial = (password.match(/[^a-zA-Z0-9]/g) || []).length;
        
        // Calculate charset size for entropy
        // Our charset: a-z (26) + A-Z (26) + 0-9 (10) + !@#$%^&*()-_=+[]{}|;:,.<>? (24) = 86 chars
        let charsetSize = 0;
        if (hasLower) charsetSize += 26;
        if (hasUpper) charsetSize += 26;
        if (hasDigit) charsetSize += 10;
        if (hasSpecial) charsetSize += 24; // Full special char set from our generator
        
        // Calculate entropy in bits
        const entropy = length > 0 ? Math.log2(Math.pow(charsetSize, length)) : 0;
        
        // Calculate score (0-100)
        let score = 0;
        if (length >= 8) score += 10;
        if (length >= 12) score += 20;
        if (length >= 16) score += 20;
        if (length >= 20) score += 10;
        if (hasLower) score += 10;
        if (hasUpper) score += 10;
        if (hasDigit) score += 10;
        if (hasSpecial) score += 10;
        score = Math.min(100, score);
        
        // Determine strength level
        let level, color, label;
        if (entropy < 40) {
            level = 'critical'; color = 'var(--red-500)'; label = 'Very Weak';
        } else if (entropy < 60) {
            level = 'weak'; color = 'var(--red-500)'; label = 'Weak';
        } else if (entropy < 80) {
            level = 'medium'; color = 'var(--amber-500)'; label = 'Medium';
        } else if (entropy < 100) {
            level = 'good'; color = 'var(--green-500)'; label = 'Good';
        } else {
            level = 'excellent'; color = 'var(--green-500)'; label = 'Excellent';
        }
        
        // Generate tips for improvement
        const tips = [];
        if (length < 12) tips.push('Use at least 12 characters');
        if (length < 16) tips.push('Longer passwords are stronger (16+ recommended)');
        if (!hasLower) tips.push('Add lowercase letters (a-z)');
        if (!hasUpper) tips.push('Add uppercase letters (A-Z)');
        if (!hasDigit) tips.push('Add numbers (0-9)');
        if (!hasSpecial) tips.push('Add special characters (!@#$%^&*)');
        
        // Calculate brute-force time
        let bruteForceTime = '';
        if (entropy > 0) {
            const attempts = Math.pow(2, entropy);
            const attemptsPerSecond = 100e9; // 100 billion hashes/second (fast GPU)
            const secondsToBreak = attempts / attemptsPerSecond;
            
            if (secondsToBreak < 1) {
                bruteForceTime = 'Instantly';
            } else if (secondsToBreak < 60) {
                bruteForceTime = Math.round(secondsToBreak) + ' seconds';
            } else if (secondsToBreak < 3600) {
                bruteForceTime = Math.round(secondsToBreak / 60) + ' minutes';
            } else if (secondsToBreak < 86400) {
                bruteForceTime = Math.round(secondsToBreak / 3600) + ' hours';
            } else if (secondsToBreak < 31536000) {
                bruteForceTime = Math.round(secondsToBreak / 86400) + ' days';
            } else if (secondsToBreak < 31536000000) {
                bruteForceTime = Math.round(secondsToBreak / 31536000) + ' years';
            } else if (secondsToBreak < 31536000000000) {
                bruteForceTime = (secondsToBreak / 31536000000).toExponential(1) + ' thousand years';
            } else if (secondsToBreak < 31536000000000000) {
                bruteForceTime = (secondsToBreak / 31536000000000).toExponential(1) + ' million years';
            } else {
                const exponent = Math.floor(Math.log10(secondsToBreak / 31536000));
                bruteForceTime = '10^' + exponent + ' years';
            }
        }
        
        return {
            score,
            entropy: Math.round(entropy),
            level,
            color,
            label,
            tips,
            bruteForceTime,
            hasContent: length > 0,
            // Character composition counts
            length,
            countUpper,
            countLower,
            countDigit,
            countSpecial
        };
    }

    /**
     * Update strength meter UI
     * @param {Object} analysis - Result from analyzePasswordStrength()
     */
    function updateStrengthMeter(analysis) {
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        const passwordTips = document.getElementById('passwordTips');
        const passwordEntropy = document.getElementById('passwordEntropy');
        
        // Update progress bar
        strengthFill.style.width = analysis.score + '%';
        strengthFill.style.backgroundColor = analysis.color;
        
        // Update label
        if (!analysis.hasContent) {
            strengthText.textContent = 'None';
            strengthText.style.color = 'var(--slate-400)';
            passwordTips.style.display = 'none';
            passwordEntropy.style.display = 'none';
            return;
        }
        
        strengthText.textContent = analysis.label;
        strengthText.style.color = analysis.color;
        
        // Show entropy and brute-force time
        passwordEntropy.style.display = 'block';
        
        // Calculate post-quantum resistance (Grover's algorithm: sqrt of classical)
        const postQuantumEntropy = Math.round(analysis.entropy / 2);
        const isQuantumResistant = analysis.entropy >= 200; // 200+ bits = 100+ post-quantum
        
        // Build character composition line
        let compositionText = `<strong style="color: var(--slate-300);">${analysis.length} characters</strong>`;
        if (analysis.countUpper > 0) compositionText += ` • <span style="color: var(--slate-400);">Uppercase: ${analysis.countUpper}</span>`;
        if (analysis.countLower > 0) compositionText += ` • <span style="color: var(--slate-400);">Lowercase: ${analysis.countLower}</span>`;
        if (analysis.countDigit > 0) compositionText += ` • <span style="color: var(--slate-400);">Numbers: ${analysis.countDigit}</span>`;
        if (analysis.countSpecial > 0) compositionText += ` • <span style="color: var(--slate-400);">Special: ${analysis.countSpecial}</span>`;
        
        // Build entropy line
        let entropyText = `<strong style="color: var(--slate-300);">${analysis.entropy} bits entropy</strong>`;
        
        // Add post-quantum info for strong passwords
        if (isQuantumResistant) {
            entropyText += ` <span style="color: var(--cyan-400);">(~${postQuantumEntropy} bits post-quantum)</span>`;
        }
        
        entropyText += ` • Brute-force time: <strong style="color: ${analysis.color};">${analysis.bruteForceTime}</strong>`;
        
        // Combine composition + entropy
        let fullText = compositionText + '<br>' + entropyText;
        
        // Add quantum-resistant badge for 200+ bits
        if (isQuantumResistant) {
            fullText += `<br><span style="color: var(--cyan-400); font-size: 0.8125rem;">⚠️ Quantum-resistant for 50+ years</span>`;
        }
        
        passwordEntropy.innerHTML = fullText;
        
        // Show tips if password is not excellent
        if (analysis.tips.length > 0 && analysis.level !== 'excellent') {
            passwordTips.style.display = 'block';
            passwordTips.innerHTML = `
                <div style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--blue-500); border-radius: 0.375rem;">
                    <div style="font-size: 0.8125rem; color: var(--blue-400); font-weight: 600; margin-bottom: 0.375rem;">
                        Tips to make it stronger:
                    </div>
                    <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.8125rem; color: var(--slate-300); line-height: 1.6;">
                        ${analysis.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            passwordTips.style.display = 'none';
        }
    }

    // Export to global scope
    window.PasswordStrength = {
        analyze: analyzePasswordStrength,
        updateMeter: updateStrengthMeter
    };

})(window);

