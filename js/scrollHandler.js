export class ScrollHandler {
    constructor(galleryData, onItemChange) {
        this.galleryData = galleryData;
        this.onItemChange = onItemChange;
        this.currentIndex = 0;
        this.isThrottled = false;
        this.throttleDelay = 100; // milliseconds
        
        // Initialize scroll observer
        this.initializeIntersectionObserver();
    }

    initializeIntersectionObserver() {
        // Create intersection observer for smooth item detection
        const options = {
            root: null,
            rootMargin: '-30% 0px -30% 0px', // Trigger when item is 20% visible from top/bottom
            threshold: [0, 0.2, 0.5, 0.8, 1.0]
        };

        this.observer = new IntersectionObserver((entries) => {
            this.handleIntersection(entries);
        }, options);

        // Observe all gallery items once they're created
        setTimeout(() => {
            this.observeGalleryItems();
        }, 100);
    }

    observeGalleryItems() {
        this.galleryData.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                this.observer.observe(element);
            }
        });
    }

    handleIntersection(entries) {
        let mostVisibleEntry = null;
        let maxVisibility = 0;

        entries.forEach(entry => {
            const element = entry.target;
            const itemIndex = this.galleryData.findIndex(item => item.id === element.id);
            
            if (itemIndex === -1) return;

            // Calculate visibility based on intersection ratio and position
            let visibility = entry.intersectionRatio;
            
            // Boost visibility for items closer to center
            if (entry.isIntersecting) {
                const rect = entry.boundingClientRect;
                const viewportCenter = window.innerHeight / 2;
                const elementCenter = rect.top + rect.height / 2;
                const distanceFromCenter = Math.abs(elementCenter - viewportCenter);
                const maxDistance = window.innerHeight / 2;
                const centerBoost = 1 - (distanceFromCenter * maxDistance);
                visibility *= (1 + centerBoost);
            }

            // Update element visibility class
            if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
                element.classList.add('visible');
            } else {
                element.classList.remove('visible');
            }

            // Track most visible element
            if (visibility > maxVisibility) {
                maxVisibility = visibility;
                mostVisibleEntry = { entry, itemIndex };
            }
        });

        // Update active item if changed
        if (mostVisibleEntry && mostVisibleEntry.itemIndex !== this.currentIndex) {
            this.setActiveItem(mostVisibleEntry.itemIndex);
        }
    }

    handleScroll() {
        if (this.isThrottled) return;
        
        this.isThrottled = true;
        setTimeout(() => {
            this.isThrottled = false;
        }, this.throttleDelay);

        // Fallback scroll handling for browsers without intersection observer
        if (!this.observer) {
            this.handleScrollFallback();
        }

        // Update scroll progress indicator
        this.updateScrollProgress();
    }

    handleScrollFallback() {
        const viewportHeight = window.innerHeight;
        let newActiveIndex = -1;
        let minDistanceToCenter = Infinity;

        this.galleryData.forEach((item, index) => {
            const element = document.getElementById(item.id);
            if (!element) return;

            const rect = element.getBoundingClientRect();
            const itemCenterY = rect.top + rect.height / 2;
            const distanceToCenter = Math.abs(itemCenterY - viewportHeight / 2);

            // Check if item is in viewport
            if (rect.top < viewportHeight && rect.bottom > 0) {
                element.classList.add('visible');
                
                // Find closest to center
                if (distanceToCenter < minDistanceToCenter) {
                    minDistanceToCenter = distanceToCenter;
                    newActiveIndex = index;
                }
            } else {
                element.classList.remove('visible');
            }
        });

        if (newActiveIndex !== -1 && newActiveIndex !== this.currentIndex) {
            this.setActiveItem(newActiveIndex);
        }
    }

    setActiveItem(index) {
        if (index === this.currentIndex) return;

        // Remove active class from previous item
        if (this.currentIndex >= 0) {
            const prevElement = document.getElementById(this.galleryData[this.currentIndex].id);
            if (prevElement) {
                prevElement.classList.remove('active');
            }
        }

        // Add active class to new item
        const newElement = document.getElementById(this.galleryData[index].id);
        if (newElement) {
            newElement.classList.add('active');
        }

        this.currentIndex = index;
        
        // Notify main application
        if (this.onItemChange) {
            this.onItemChange(index);
        }

        // Add subtle haptic feedback on mobile
        if ('vibrate' in navigator && window.innerWidth <= 768) {
            navigator.vibrate(10);
        }
    }

    updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min((scrollTop / scrollHeight) * 100, 100);
        
        const progressElement = document.getElementById('scrollProgress');
        if (progressElement) {
            progressElement.style.height = `${scrollProgress}%`;
        }
    }

    scrollToItem(index) {
        if (index >= 0 && index < this.galleryData.length) {
            const item = this.galleryData[index];
            const element = document.getElementById(item.id);
            if (element) {
                // Use smooth scrolling with custom easing
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });

                // Alternative smooth scroll for better control
                if ('scrollBehavior' in document.documentElement.style) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Fallback for older browsers
                    this.smoothScrollTo(element);
                }
            }
        }
    }

    smoothScrollTo(element) {
        const targetPosition = element.offsetTop - (window.innerHeight / 2) + (element.offsetHeight / 2);
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 800;
        let start = null;

        function animation(currentTime) {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = this.easeInOutQuad(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation.bind(this));
        }

        requestAnimationFrame(animation.bind(this));
    }

    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getPreviousIndex() {
        return Math.max(0, this.currentIndex - 1);
    }

    getNextIndex() {
        return Math.min(this.galleryData.length - 1, this.currentIndex + 1);
    }

    navigatePrevious() {
        const prevIndex = this.getPreviousIndex();
        if (prevIndex !== this.currentIndex) {
            this.scrollToItem(prevIndex);
        }
    }

    navigateNext() {
        const nextIndex = this.getNextIndex();
        if (nextIndex !== this.currentIndex) {
            this.scrollToItem(nextIndex);
        }
    }

    // Auto-scroll functionality for presentations
    startAutoScroll(intervalMs = 5000) {
        this.stopAutoScroll(); // Clear any existing interval
        
        this.autoScrollInterval = setInterval(() => {
            const nextIndex = (this.currentIndex + 1) % this.galleryData.length;
            this.scrollToItem(nextIndex);
        }, intervalMs);
    }

    stopAutoScroll() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }

    // Gesture support for mobile
    setupTouchGestures() {
        let touchStartY = 0;
        let touchStartTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            const deltaY = touchStartY - touchEndY;
            const deltaTime = touchEndTime - touchStartTime;
            
            // Detect swipe gesture
            if (Math.abs(deltaY) > 50 && deltaTime < 300) {
                if (deltaY > 0) {
                    // Swipe up - next item
                    this.navigateNext();
                } else {
                    // Swipe down - previous item
                    this.navigatePrevious();
                }
            }
        }, { passive: true });
    }

    dispose() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.stopAutoScroll();
    }
}