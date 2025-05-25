import * as THREE from 'three';

export class MouseInteraction {
    constructor(camera, renderer, scene, modelLoader, onModelInteract) {
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.modelLoader = modelLoader;
        this.onModelInteract = onModelInteract;
        
        // Raycasting for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Interaction state
        this.isInteracting = false;
        this.isDragging = false;
        this.isHovering = false;
        this.hoveredModel = null;
        this.activeModel = null;
        
        // Mouse tracking
        this.mouseStart = new THREE.Vector2();
        this.mouseCurrent = new THREE.Vector2();
        this.rotationSpeed = 0.01;
        
        // Touch support
        this.touches = [];
        this.touchStartDistance = 0;
        
        this.setupEventListeners();
        this.createHoverOverlay();
    }

    createHoverOverlay() {
        this.hoverOverlay = document.createElement('div');
        this.hoverOverlay.className = 'model-hover-overlay';
        this.hoverOverlay.style.width = '100px';
        this.hoverOverlay.style.height = '100px';
        document.body.appendChild(this.hoverOverlay);
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        console.log('Setting up mouse interaction on canvas:', canvas);
        
        // Mouse events
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Touch events
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        
        // Window events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Test event
        canvas.addEventListener('click', () => {
            console.log('Canvas clicked - mouse interaction is working');
        });
    }

    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    performRaycast() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all model objects
        const modelObjects = [];
        Object.values(this.modelLoader.modelStates).forEach(state => {
            if (state.modelObject && state.visible) {
                modelObjects.push(state.modelObject);
            }
        });
        
        // Perform raycast on all visible models
        const intersects = this.raycaster.intersectObjects(modelObjects, true);
        return intersects.length > 0 ? intersects[0] : null;
    }

    findModelIdFromObject(object) {
        // Find which model this object belongs to
        for (const [modelId, state] of Object.entries(this.modelLoader.modelStates)) {
            if (state.modelObject && this.isChildOfObject(object, state.modelObject)) {
                return modelId;
            }
        }
        return null;
    }

    isChildOfObject(child, parent) {
        let current = child;
        while (current) {
            if (current === parent) return true;
            current = current.parent;
        }
        return false;
    }

    onMouseMove(event) {
        this.updateMousePosition(event);
        this.mouseCurrent.set(event.clientX, event.clientY);
        
        if (this.isDragging && this.activeModel) {
            // Calculate rotation based on mouse movement
            const deltaX = this.mouseCurrent.x - this.mouseStart.x;
            const deltaY = this.mouseCurrent.y - this.mouseStart.y;
            
            this.rotateActiveModel(deltaX, deltaY);
            this.mouseStart.copy(this.mouseCurrent);
            
            // Update cursor
            this.renderer.domElement.className = 'grabbing';
        } else {
            // Check for hover
            const intersect = this.performRaycast();
            
            if (intersect) {
                const modelId = this.findModelIdFromObject(intersect.object);
                if (modelId && modelId === this.modelLoader.activeModelId) {
                    this.setHovering(true, intersect.point);
                    this.renderer.domElement.className = 'hovering';
                } else {
                    this.setHovering(false);
                    this.renderer.domElement.className = '';
                }
            } else {
                this.setHovering(false);
                this.renderer.domElement.className = '';
            }
        }
        
        // Update interaction hint
        this.updateInteractionHint();
    }

    onMouseDown(event) {
        if (event.button !== 0) return; // Only left mouse button
        
        this.updateMousePosition(event);
        this.mouseStart.set(event.clientX, event.clientY);
        
        const intersect = this.performRaycast();
        
        if (intersect) {
            const modelId = this.findModelIdFromObject(intersect.object);
            if (modelId && modelId === this.modelLoader.activeModelId) {
                this.isDragging = true;
                this.activeModel = modelId;
                this.isInteracting = true;
                this.renderer.domElement.className = 'grabbing';
                
                // Disable auto-rotation while interacting
                if (this.onModelInteract) {
                    this.onModelInteract('startInteraction', modelId);
                }
                
                event.preventDefault();
            }
        }
    }

    onMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.isInteracting = false;
            this.activeModel = null;
            this.renderer.domElement.className = this.isHovering ? 'hovering' : '';
            
            // Re-enable auto-rotation
            if (this.onModelInteract) {
                this.onModelInteract('endInteraction');
            }
        }
    }

    onMouseWheel(event) {
        event.preventDefault();
        
        // Check if we're hovering over the active model
        const intersect = this.performRaycast();
        if (intersect) {
            const modelId = this.findModelIdFromObject(intersect.object);
            if (modelId && modelId === this.modelLoader.activeModelId) {
                // Zoom toward the model
                const zoomSpeed = 0.1;
                const direction = new THREE.Vector3();
                direction.subVectors(this.camera.position, intersect.point).normalize();
                
                if (event.deltaY > 0) {
                    // Zoom out
                    this.camera.position.add(direction.multiplyScalar(zoomSpeed));
                } else {
                    // Zoom in
                    this.camera.position.sub(direction.multiplyScalar(zoomSpeed));
                }
                
                // Clamp zoom distance
                const distance = this.camera.position.length();
                if (distance < 2) {
                    this.camera.position.normalize().multiplyScalar(2);
                } else if (distance > 15) {
                    this.camera.position.normalize().multiplyScalar(15);
                }
                
                if (this.onModelInteract) {
                    this.onModelInteract('zoom', modelId, event.deltaY);
                }
            }
        }
    }

    rotateActiveModel(deltaX, deltaY) {
        if (!this.activeModel) return;
        
        const modelState = this.modelLoader.modelStates[this.activeModel];
        if (!modelState || !modelState.modelObject) return;
        
        const model = modelState.modelObject;
        
        // Rotate around Y axis (horizontal mouse movement)
        model.rotation.y += deltaX * this.rotationSpeed;
        
        // Rotate around X axis (vertical mouse movement)
        model.rotation.x += deltaY * this.rotationSpeed;
        
        // Clamp X rotation to prevent flipping
        model.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, model.rotation.x));
    }

    setHovering(isHovering, point = null) {
        this.isHovering = isHovering;
        
        if (isHovering && point) {
            // Convert 3D point to screen coordinates
            const screenPos = point.clone().project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            
            this.hoverOverlay.style.left = `${x}px`;
            this.hoverOverlay.style.top = `${y}px`;
            this.hoverOverlay.classList.add('visible');
        } else {
            this.hoverOverlay.classList.remove('visible');
        }
    }

    updateInteractionHint() {
        const hintElement = document.getElementById('interactionHint');
        if (!hintElement) return;
        
        if (this.isInteracting) {
            hintElement.textContent = 'Dragging to rotate...';
            hintElement.classList.add('visible');
        } else if (this.isHovering) {
            hintElement.textContent = 'Click and drag to rotate';
            hintElement.classList.add('visible');
        } else {
            hintElement.classList.remove('visible');
        }
    }

    // Touch Events
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single touch - treat as mouse click
            const touch = event.touches[0];
            this.updateMousePosition(touch);
            this.mouseStart.set(touch.clientX, touch.clientY);
            
            const intersect = this.performRaycast();
            if (intersect) {
                const modelId = this.findModelIdFromObject(intersect.object);
                if (modelId && modelId === this.modelLoader.activeModelId) {
                    this.isDragging = true;
                    this.activeModel = modelId;
                    this.isInteracting = true;
                    
                    if (this.onModelInteract) {
                        this.onModelInteract('startInteraction', modelId);
                    }
                }
            }
        } else if (event.touches.length === 2) {
            // Two finger touch - prepare for zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }

    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.isDragging) {
            // Single touch drag
            const touch = event.touches[0];
            this.mouseCurrent.set(touch.clientX, touch.clientY);
            
            const deltaX = this.mouseCurrent.x - this.mouseStart.x;
            const deltaY = this.mouseCurrent.y - this.mouseStart.y;
            
            this.rotateActiveModel(deltaX, deltaY);
            this.mouseStart.copy(this.mouseCurrent);
            
        } else if (event.touches.length === 2) {
            // Two finger zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.touchStartDistance > 0) {
                const scale = distance / this.touchStartDistance;
                const zoomDelta = (scale - 1) * 100; // Convert to wheel-like delta
                
                // Simulate wheel event for zoom
                this.onMouseWheel({ deltaY: -zoomDelta, preventDefault: () => {} });
            }
            
            this.touchStartDistance = distance;
        }
    }

    onTouchEnd(event) {
        event.preventDefault();
        
        if (event.touches.length === 0) {
            this.isDragging = false;
            this.isInteracting = false;
            this.activeModel = null;
            this.touchStartDistance = 0;
            
            if (this.onModelInteract) {
                this.onModelInteract('endInteraction');
            }
        }
    }

    onWindowResize() {
        // Update raycaster if needed
        this.mouse.set(0, 0);
    }

    // Public methods
    enableInteraction() {
        this.renderer.domElement.style.pointerEvents = 'auto';
    }

    disableInteraction() {
        this.renderer.domElement.style.pointerEvents = 'none';
        this.setHovering(false);
        this.isDragging = false;
        this.isInteracting = false;
        this.activeModel = null;
    }

    reset() {
        this.setHovering(false);
        this.isDragging = false;
        this.isInteracting = false;
        this.activeModel = null;
        this.renderer.domElement.className = '';
    }

    dispose() {
        if (this.hoverOverlay && this.hoverOverlay.parentNode) {
            this.hoverOverlay.parentNode.removeChild(this.hoverOverlay);
        }
        
        // Remove event listeners would go here if needed
        this.reset();
    }
}