export class UIManager {
    constructor() {
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.errorClose = document.getElementById('errorClose');
        
        this.setupErrorHandling();
        this.setupProgressTracking();
        
        this.errorQueue = [];
        this.isShowingError = false;
    }

    setupErrorHandling() {
        if (this.errorClose) {
            this.errorClose.addEventListener('click', () => {
                this.hideError();
            });
        }

        // Auto-hide errors after 5 seconds
        this.errorTimeout = null;
        
        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please refresh the page.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('Failed to load some resources. Please check your connection.');
        });
    }

    // Success Messages
    showSuccess(message, duration = 3000) {
        this.showError(message, 'success', duration);
    }

    setupProgressTracking() {
        // Performance monitoring
        this.performanceMetrics = {
            loadStartTime: Date.now(),
            modelsLoaded: 0,
            totalModels: 0,
            errors: 0
        };
    }

    // Loading Management
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            this.loadingOverlay.style.opacity = '1';
        }
        this.updateProgress(0);
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
            }, 500);
        }
        
        // Show completion metrics
        const loadTime = Date.now() - this.performanceMetrics.loadStartTime;
        console.log(`Gallery loaded in ${loadTime}ms`);
        console.log(`Models loaded: ${this.performanceMetrics.modelsLoaded}/${this.performanceMetrics.totalModels}`);
        
        if (this.performanceMetrics.errors > 0) {
            console.warn(`${this.performanceMetrics.errors} errors occurred during loading`);
        }
    }

    updateProgress(percentage) {
        const clampedPercentage = Math.max(0, Math.min(100, percentage));
        
        if (this.progressFill) {
            this.progressFill.style.width = `${clampedPercentage}%`;
        }
        
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(clampedPercentage)}%`;
        }
        
        // Update performance metrics
        if (clampedPercentage === 100) {
            this.performanceMetrics.modelsLoaded = this.performanceMetrics.totalModels;
        }
    }

    // Error Management
    showError(message, type = 'error', duration = 5000) {
        if (this.isShowingError) {
            this.errorQueue.push({ message, type, duration });
            return;
        }

        this.isShowingError = true;
        this.performanceMetrics.errors++;
        
        if (this.errorText) {
            this.errorText.textContent = message;
        }
        
        if (this.errorMessage) {
            this.errorMessage.classList.add('show');
            this.errorMessage.style.display = 'flex';
            
            // Apply different styles based on error type
            this.errorMessage.className = `error-message show ${type}`;
        }
        
        // Auto-hide after duration
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }
        
        this.errorTimeout = setTimeout(() => {
            this.hideError();
        }, duration);
        
        // Log error for debugging
        console.error(`UI Error (${type}): ${message}`);
    }

    hideError() {
        if (this.errorMessage) {
            this.errorMessage.classList.remove('show');
            
            setTimeout(() => {
                this.errorMessage.style.display = 'none';
                this.isShowingError = false;
                
                // Show next error in queue
                if (this.errorQueue.length > 0) {
                    const nextError = this.errorQueue.shift();
                    this.showError(nextError.message, nextError.type, nextError.duration);
                }
            }, 300);
        }
        
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
    }

    // Control Visibility
    showControls() {
        // No longer needed with minimal UI
    }

    hideControls() {
        // No longer needed with minimal UI
    }

    // Button State Management
    setButtonActive(buttonId, active = true) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (active) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }

    setButtonEnabled(buttonId, enabled = true) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = !enabled;
            if (enabled) {
                button.classList.remove('disabled');
            } else {
                button.classList.add('disabled');
            }
        }
    }

    // Tooltip Management
    showTooltip(element, message, duration = 2000) {
        // Remove existing tooltip
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.8em;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            white-space: nowrap;
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        
        // Show tooltip
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
        });
        
        this.currentTooltip = tooltip;
        
        // Auto-hide
        setTimeout(() => {
            this.hideTooltip();
        }, duration);
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.style.opacity = '0';
            setTimeout(() => {
                if (this.currentTooltip && this.currentTooltip.parentNode) {
                    this.currentTooltip.parentNode.removeChild(this.currentTooltip);
                }
                this.currentTooltip = null;
            }, 200);
        }
    }

    // Accessibility Announcements
    announce(message, priority = 'polite') {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', priority);
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcer.textContent = message;
        
        document.body.appendChild(announcer);
        
        setTimeout(() => {
            if (announcer.parentNode) {
                announcer.parentNode.removeChild(announcer);
            }
        }, 1000);
    }

    // Performance Monitoring
    trackPerformance(action, startTime) {
        const duration = Date.now() - startTime;
        console.log(`Performance: ${action} took ${duration}ms`);
        
        // Warn about slow operations
        if (duration > 1000) {
            console.warn(`Slow operation detected: ${action} (${duration}ms)`);
        }
    }

    // Theme Management
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('gallery-theme', theme);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('gallery-theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        }
    }

    // Responsive UI Updates
    updateForScreenSize() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        document.body.classList.toggle('mobile', isMobile);
        document.body.classList.toggle('tablet', isTablet);
        document.body.classList.toggle('desktop', !isMobile && !isTablet);
        
        // Update control visibility
        const controls = document.querySelectorAll('.control-btn .text');
        controls.forEach(text => {
            text.style.display = isMobile ? 'none' : 'inline';
        });
    }

    // Initialization
    init() {
        this.loadTheme();
        this.updateForScreenSize();
        
        // Update on resize
        window.addEventListener('resize', () => {
            this.updateForScreenSize();
        }, { passive: true });
        
        console.log('UI Manager initialized');
    }

    // Cleanup
    dispose() {
        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }
        
        this.hideTooltip();
        this.errorQueue = [];
    }
}

// Add custom CSS for additional UI elements
const style = document.createElement('style');
style.textContent = `
    .error-message.success {
        background: rgba(50, 220, 50, 0.9) !important;
    }
    
    .error-message.warning {
        background: rgba(255, 165, 0, 0.9) !important;
    }
    
    .control-btn.disabled {
        opacity: 0.5;
        pointer-events: none;
    }
    
    .sr-only {
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
    }
    
    @media (max-width: 768px) {
        .control-btn .text {
            display: none;
        }
    }
`;
document.head.appendChild(style);