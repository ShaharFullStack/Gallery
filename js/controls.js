import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export class Controls {
    constructor(camera, renderer, modelLoader) {
        this.camera = camera;
        this.renderer = renderer;
        this.modelLoader = modelLoader;
        
        this.setupOrbitControls();
        this.setupTouchControls();
        this.setupKeyboardControls();
        
        this.isAutoRotating = true;
        this.rotationSpeed = 0.5;
        this.zoomSpeed = 0.1;
        this.manualRotationSpeed = 0.05;
        
        // Camera animation properties
        this.cameraTargetPosition = new THREE.Vector3();
        this.cameraTargetLookAt = new THREE.Vector3();
        this.isAnimatingCamera = false;
    }

    setupOrbitControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Configure controls for minimal interference with direct model interaction
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.autoRotate = this.isAutoRotating;
        this.orbitControls.autoRotateSpeed = this.rotationSpeed;
        this.orbitControls.minDistance = 2;
        this.orbitControls.maxDistance = 15;
        this.orbitControls.enablePan = false; // Disable panning to keep focus on models
        this.orbitControls.enableKeys = false; // Disable to avoid conflicts
        this.orbitControls.enableRotate = false; // Disable orbit rotation to allow direct model interaction
        this.orbitControls.enableZoom = false; // Disable orbit zoom to allow custom zoom on models
        
        // Only auto-rotate, no user controls through OrbitControls
        this.orbitControls.addEventListener('start', () => {
            console.log('OrbitControls interaction detected - this should not happen');
        });
        
        // Limit vertical rotation
        this.orbitControls.minPolarAngle = Math.PI / 6; // 30 degrees from top
        this.orbitControls.maxPolarAngle = Math.PI - Math.PI / 6; // 30 degrees from bottom
    }

    setupTouchControls() {
        // Enhanced touch controls for mobile
        let touchStartDistance = 0;
        let touchStartTime = 0;
        let isTouchZooming = false;
        
        const canvas = this.renderer.domElement;
        
        // Multi-touch zoom
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                isTouchZooming = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDistance = Math.sqrt(dx * dx + dy * dy);
                touchStartTime = Date.now();
                e.preventDefault();
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            if (isTouchZooming && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (touchStartDistance > 0) {
                    const scale = distance / touchStartDistance;
                    const zoomDelta = (scale + 1) * 2;
                    this.zoom(-zoomDelta);
                }
                
                touchStartDistance = distance;
                e.preventDefault();
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', () => {
            isTouchZooming = false;
            touchStartDistance = 0;
        });
    }

    setupKeyboardControls() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            
            switch (e.key.toLowerCase()) {
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoom(-1);
                    break;
                case '-':
                    e.preventDefault();
                    this.zoom(1);
                    break;
                case 'a':
                    e.preventDefault();
                    this.rotate(-this.manualRotationSpeed);
                    break;
                case 'd':
                    e.preventDefault();
                    this.rotate(this.manualRotationSpeed);
                    break;
                case 'w':
                    e.preventDefault();
                    this.tilt(-this.manualRotationSpeed);
                    break;
                case 's':
                    e.preventDefault();
                    this.tilt(this.manualRotationSpeed);
                    break;
            }
        });
    }

    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        this.orbitControls.autoRotate = this.isAutoRotating;
        
        // Provide visual feedback
        if (this.isAutoRotating) {
            console.log('Auto rotation enabled');
        } else {
            console.log('Auto rotation disabled');
        }
    }

    setAutoRotateSpeed(speed) {
        this.rotationSpeed = speed;
        this.orbitControls.autoRotateSpeed = speed;
        this.orbitControls.autoRotate = speed > 0;
        this.isAutoRotating = speed > 0;
    }

    zoom(delta) {
        const currentDistance = this.camera.position.distanceTo(this.orbitControls.target);
        let newDistance = currentDistance + (delta * this.zoomSpeed);
        
        // Clamp zoom distance
        newDistance = Math.max(this.orbitControls.minDistance, Math.min(this.orbitControls.maxDistance, newDistance));
        
        // Apply zoom smoothly
        const direction = new THREE.Vector3();
        direction.subVectors(this.camera.position, this.orbitControls.target).normalize();
        this.camera.position.copy(this.orbitControls.target).add(direction.multiplyScalar(newDistance));
        
        this.orbitControls.update();
    }

    rotate(angle) {
        // Manual rotation around Y axis
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position.clone().sub(this.orbitControls.target));
        spherical.theta += angle;
        
        this.camera.position.setFromSpherical(spherical).add(this.orbitControls.target);
        this.camera.lookAt(this.orbitControls.target);
        this.orbitControls.update();
    }

    tilt(angle) {
        // Manual tilt (phi rotation)
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position.clone().sub(this.orbitControls.target));
        spherical.phi = Math.max(
            this.orbitControls.minPolarAngle,
            Math.min(this.orbitControls.maxPolarAngle, spherical.phi + angle)
        );
        
        this.camera.position.setFromSpherical(spherical).add(this.orbitControls.target);
        this.camera.lookAt(this.orbitControls.target);
        this.orbitControls.update();
    }

    resetView(currentIndex = 0) {
        // Reset to optimal viewing position for current model
        const modelPosition = this.modelLoader.getModelPosition(currentIndex);
        const isMobile = window.innerWidth <= 768;
        
        // Target position and look-at point with better camera positioning
        const cameraOffset = isMobile ? 0 : modelPosition * 0.2; // Reduced from 0.3 to 0.2
        const targetPosition = new THREE.Vector3(cameraOffset, 1, 8); // Slightly higher and further back
        const targetLookAt = new THREE.Vector3(modelPosition, 0, 0);
        
        // Smooth camera animation
        this.animateCameraTo(targetPosition, targetLookAt);
        
        // Reset zoom and rotation
        this.orbitControls.target.copy(targetLookAt);
        this.orbitControls.update();
    }

    updateCameraForModel(modelIndex) {
        const modelPosition = this.modelLoader.getModelPosition(modelIndex);
        const isMobile = window.innerWidth <= 768;
        
        // Calculate new camera position with better framing
        const cameraOffset = isMobile ? 0 : modelPosition * 0.2;
        const targetPosition = new THREE.Vector3(cameraOffset, this.camera.position.y, this.camera.position.z);
        const targetLookAt = new THREE.Vector3(modelPosition, 0, 0);
        
        // Smooth transition with longer duration for more models
        const duration = this.modelLoader.totalModels > 6 ? 1500 : 1000;
        this.animateCameraTo(targetPosition, targetLookAt, duration);
    }

    animateCameraTo(targetPosition, targetLookAt, duration = 1500) {
        if (this.isAnimatingCamera) return;
        
        this.isAnimatingCamera = true;
        
        const startPosition = this.camera.position.clone();
        const startLookAt = this.orbitControls.target.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const eased = this.easeInOutCubic(progress);
            
            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            
            // Interpolate look-at target
            this.orbitControls.target.lerpVectors(startLookAt, targetLookAt, eased);
            
            this.orbitControls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimatingCamera = false;
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Focus on specific point with smooth animation
    focusOnPoint(point, distance = 5) {
        const direction = new THREE.Vector3(1, 0.5, 1).normalize();
        const targetPosition = point.clone().add(direction.multiplyScalar(distance));
        
        this.animateCameraTo(targetPosition, point);
    }

    // Get current camera state for saving/loading views
    getCameraState() {
        return {
            position: this.camera.position.clone(),
            target: this.orbitControls.target.clone(),
            zoom: this.camera.zoom
        };
    }

    setCameraState(state) {
        if (state.position) this.camera.position.copy(state.position);
        if (state.target) this.orbitControls.target.copy(state.target);
        if (state.zoom) this.camera.zoom = state.zoom;
        
        this.camera.updateProjectionMatrix();
        this.orbitControls.update();
    }

    // Mouse/touch interaction feedback
    setInteractionFeedback(enabled) {
        if (enabled) {
            this.renderer.domElement.style.cursor = 'grab';
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    // Performance optimization for low-end devices
    setPerformanceMode(enabled) {
        if (enabled) {
            this.orbitControls.enableDamping = false;
            this.setAutoRotateSpeed(0.2);
        } else {
            this.orbitControls.enableDamping = true;
            this.setAutoRotateSpeed(0.5);
        }
    }

    // Accessibility: programmatic control for screen readers
    announcePosition() {
        const distance = this.camera.position.distanceTo(this.orbitControls.target);
        const announcement = `Camera distance: ${distance.toFixed(1)} units, Auto-rotation: ${this.isAutoRotating ? 'enabled' : 'disabled'}`;
        
        // Create temporary element for screen reader announcement
        const announcement_element = document.createElement('div');
        announcement_element.setAttribute('aria-live', 'polite');
        announcement_element.setAttribute('aria-atomic', 'true');
        announcement_element.style.position = 'absolute';
        announcement_element.style.left = '-10000px';
        announcement_element.textContent = announcement;
        document.body.appendChild(announcement_element);
        
        setTimeout(() => {
            document.body.removeChild(announcement_element);
        }, 1000);
    }

    update(delta) {
        if (this.orbitControls) {
            this.orbitControls.update();
        }
        
        // Add slight camera shake for active models (subtle effect)
        if (this.isAutoRotating && !this.isAnimatingCamera) {
            const time = Date.now() * 0.001;
            const shake = Math.sin(time * 2) * 0.002;
            this.camera.position.y += shake;
        }
    }

    dispose() {
        if (this.orbitControls) {
            this.orbitControls.dispose();
        }
    }
}