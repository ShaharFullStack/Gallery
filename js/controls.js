import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export class Controls {
    constructor(camera, renderer, modelLoader) {
        this.camera = camera;
        this.renderer = renderer;
        this.modelLoader = modelLoader;
        
        this.setupOrbitControls();
        this.setupKeyboardControls();
        
        // ENABLED auto-rotation, DISABLED zoom
        this.isAutoRotating = true;           
        this.rotationSpeed = 0.5;             
        this.manualRotationSpeed = 0.05;
        
        // Camera animation properties
        this.cameraTargetPosition = new THREE.Vector3();
        this.cameraTargetLookAt = new THREE.Vector3(0, 0, 0);
        this.isAnimatingCamera = true;
        
        console.log("Controls initialized - Auto-rotation ENABLED, Zoom DISABLED");
    }

    setupOrbitControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // Disable camera auto-rotation, models will spin instead
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.autoRotate = false;           
        this.orbitControls.autoRotateSpeed = 0;          
        this.orbitControls.minDistance = 2;
        this.orbitControls.maxDistance = 15;
        this.orbitControls.enablePan = false;            // DISABLED panning
        this.orbitControls.enableKeys = false;           // DISABLED keys
        this.orbitControls.enableRotate = false;         // DISABLED manual orbit rotation
        this.orbitControls.enableZoom = false;           // DISABLED zoom
        
        // Target is always at center since models are centered
        this.orbitControls.target.set(0, 0, 0);
        
        // Limit vertical rotation (even though manual rotation is disabled)
        this.orbitControls.minPolarAngle = Math.PI / 6;
        this.orbitControls.maxPolarAngle = Math.PI - Math.PI / 6;
    }

    setupKeyboardControls() {
        // REMOVED zoom controls (+/-) as requested
        // REMOVED rotation controls (WASD) to avoid conflicts with ModelLoader
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            
            switch (e.key.toLowerCase()) {
                case 'r':
                    e.preventDefault();
                    this.resetView();
                    break;
                case 'h':
                    e.preventDefault();
                    this.showHelp();
                    break;
                case 't':
                    e.preventDefault();
                    this.toggleAutoRotate();
                    break;
            }
        });
    }

    showHelp() {
        console.log("Controls Help:");
        console.log("- Drag models to rotate them manually");
        console.log("- R: Reset camera view");
        console.log("- T: Toggle auto-rotation");
        console.log("- H: Show this help");
    }

    // ENABLED - Auto-rotation controls
    toggleAutoRotate() {
        this.isAutoRotating = !this.isAutoRotating;
        this.orbitControls.autoRotate = this.isAutoRotating;
        
        // Provide visual feedback
        if (this.isAutoRotating) {
            this.orbitControls.autoRotateSpeed = this.rotationSpeed;
            this.orbitControls.update();
            console.log('Auto rotation enabled');
        } else {
            this.orbitControls.autoRotateSpeed = 0;
            this.orbitControls.update();
            console.log('Auto rotation disabled');
        }
        return this.isAutoRotating;
    }

    setAutoRotateSpeed(speed) {
        this.rotationSpeed = speed;
        this.orbitControls.autoRotateSpeed = speed;
        this.orbitControls.autoRotate = speed > 0;
        this.isAutoRotating = speed > 0;
        console.log("Auto-rotation speed set to:", speed);
    }

    // DISABLED - Zoom controls removed
    zoom(delta) {
        console.log("Zoom is disabled");
        return;
    }

    // Camera control for scene navigation (not model rotation)
    rotate(angle) {
        // Manual camera rotation around Y axis (not model rotation)
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position.clone().sub(this.orbitControls.target));
        spherical.theta += angle;
        
        this.camera.position.setFromSpherical(spherical).add(this.orbitControls.target);
        this.camera.lookAt(this.orbitControls.target);
        this.orbitControls.update();
    }

    tilt(angle) {
        // Manual camera tilt (phi rotation)
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
        // Reset to optimal viewing position for centered models
        const targetPosition = new THREE.Vector3(0, 1, 0);
        const targetLookAt = new THREE.Vector3(0, 0, 0);
        
        // Smooth camera animation
        this.animateCameraTo(targetPosition, targetLookAt);
        
        // Reset OrbitControls
        this.orbitControls.target.copy(targetLookAt);
        this.orbitControls.update();
        
        // Reset model rotations in ModelLoader
        if (this.modelLoader && this.modelLoader.resetManualRotation) {
            this.modelLoader.resetManualRotation();
        }
    }

    updateCameraForModel(modelIndex) {
        // Since all models are centered, minimal camera movement needed
        const targetPosition = new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        const targetLookAt = new THREE.Vector3(0, 0, 0);
        
        const duration = 800;
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
            
            const eased = this.easeInOutCubic(progress);
            
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
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

    focusOnPoint(point, distance = 5) {
        const direction = new THREE.Vector3(1, 0.5, 1).normalize();
        const targetPosition = point.clone().add(direction.multiplyScalar(distance));
        
        this.animateCameraTo(targetPosition, point);
    }

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

    setInteractionFeedback(enabled) {
        // Let ModelLoader handle cursor changes
        return;
    }

    setPerformanceMode(enabled) {
        if (enabled) {
            this.orbitControls.enableDamping = false;
            this.setAutoRotateSpeed(0.2);
        } else {
            this.orbitControls.enableDamping = true;
            this.setAutoRotateSpeed(0.5);
        }
    }

    announcePosition() {
        const distance = this.camera.position.distanceTo(this.orbitControls.target);
        const announcement = `Camera distance: ${distance.toFixed(1)} units, Auto-rotation: ${this.isAutoRotating ? 'enabled' : 'disabled'}`;
        
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