/**
 * encryptor.app - LICENSES MODAL
 * Version 2.2.0 | AES-256-GCM | Zero-Knowledge
 * 
 * Built by: George A. Rauscher
 * Company: intelligent piXel GmbH, Starnberg, Germany
 * GitHub: https://github.com/georgerauscher/encryptor-app
 * License: MIT (see LICENSES.md)
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        // Create modal HTML
        createModal();
        
        // Attach event listeners
        attachEventListeners();
        
        // Load license content
        loadLicenses();
        
        // Ensure modal is ALWAYS closed on init (fix for persistent mobile bug)
        const modal = document.getElementById('licensesModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    function createModal() {
        const modalHTML = `
            <div id="licensesModal" class="licenses-modal">
                <div class="licenses-modal-content">
                    <div class="licenses-modal-header">
                        <h2 class="licenses-modal-title">
                            <i data-lucide="file-text"></i>
                            Open Source Licenses
                        </h2>
                        <button class="licenses-modal-close" id="closeModalBtn" aria-label="Close">
                            <i data-lucide="x" style="width: 24px; height: 24px;"></i>
                        </button>
                    </div>
                    <div class="licenses-modal-body" id="licensesModalBody">
                        <p style="color: var(--slate-400);">Loading licenses...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    function attachEventListeners() {
        const modal = document.getElementById('licensesModal');
        const closeBtn = document.getElementById('closeModalBtn');
        
        // ROBUST: Event delegation for dynamic links
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && (
                link.classList.contains('licenses-trigger') ||
                (link.href && link.href.includes('LICENSES.md'))
            )) {
                console.log('Licenses link clicked!'); // Debug
                e.preventDefault();
                e.stopPropagation();
                openModal();
                console.log('Modal should be open'); // Debug
                return false;
            }
        });
        
        // Close modal when clicking close button
        closeBtn.addEventListener('click', closeModal);
        
        // Close modal on touch devices (mobile fix)
        closeBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            closeModal();
        });
        
        // Close modal when clicking outside content
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close modal with ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }
    
    function openModal() {
        console.log('openModal() called'); // Debug
        const modal = document.getElementById('licensesModal');
        if (!modal) {
            console.error('Modal element not found!'); // Debug
            return;
        }
        
        console.log('Adding active class to modal'); // Debug
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Re-initialize Lucide icons in modal
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
    }
    
    function closeModal() {
        const modal = document.getElementById('licensesModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function loadLicenses() {
        const modalBody = document.getElementById('licensesModalBody');
        
        // License content (embedded to avoid extra HTTP request)
        const licenseContent = `
            <div class="license-section">
                <h2>
                    <i data-lucide="package" style="width: 20px; height: 20px; color: var(--blue-500);"></i>
                    Lucide Icons
                    <span class="license-badge">ISC License</span>
                </h2>
                <p>
                    <strong>Copyright:</strong> (c) Lucide Contributors 2025<br>
                    <strong>Copyright:</strong> (c) Cole Bemis 2013-2023 (Feather - MIT)<br>
                    <strong>Website:</strong> <a href="https://lucide.dev" target="_blank" rel="noopener">lucide.dev</a><br>
                    <strong>Usage:</strong> UI Icons (locally hosted at /js/lucide.js)
                </p>
                
                <h3>ISC License</h3>
                <div class="license-text">Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.</div>
            </div>
            
            <div class="license-section">
                <h2>
                    <i data-lucide="shield-check" style="width: 20px; height: 20px; color: var(--blue-500);"></i>
                    encryptor.app
                    <span class="license-badge">MIT License</span>
                </h2>
                <p>
                    <strong>Copyright:</strong> 2025 George A. Rauscher | intelligent piXel GmbH<br>
                    <strong>Version:</strong> 2.2.0<br>
                    <strong>Repository:</strong> Check GitHub for latest version
                </p>
                
                <h3>MIT License</h3>
                <div class="license-text">Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</div>
            </div>
            
            <p style="color: var(--slate-400); font-size: 0.875rem; text-align: center; margin-top: 2rem;">
                Last Updated: November 2, 2025
            </p>
        `;
        
        modalBody.innerHTML = licenseContent;
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ icons: lucide.icons });
        }
    }
})();
