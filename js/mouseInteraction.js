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
        this.isHovering = false;
        this.hoveredModel = null;
        
        // REMOVED: isDragging, isInteracting, activeModel - ModelLoader handles this now
        // REMOVED: rotation and zoom functionality - delegated to ModelLoader
        
        this.setupEventListeners();
        this.createHoverOverlay();
        
        console.log("MouseInteraction initialized - Rotation delegated to ModelLoader, Zoom DISABLED");
    }

    createHoverOverlay() {
        this.hoverOverlay = document.createElement('div');
        this.hoverOverlay.className = 'model-hover-overlay';
        this.hoverOverlay.style.cssText = `
            position: fixed;
            width: 100px;
            height: 100px;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s ease;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
        `;
        document.body.appendChild(this.hoverOverlay);
    }

    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        console.log('Setting up mouse interaction on canvas:', canvas);
        
        // ONLY mouse move for hover detection - ModelLoader handles drag events
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // REMOVED: mousedown, mouseup, wheel events - ModelLoader handles these
        // REMOVED: touch events - ModelLoader handles these
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Window events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Click event for feedback only
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
        
        // Only handle hover detection - ModelLoader handles dragging
        if (!this.modelLoader.manualRotation.isDragging) {
            const intersect = this.performRaycast();
            
            if (intersect) {
                const modelId = this.findModelIdFromObject(intersect.object);
                if (modelId && modelId === this.modelLoader.activeModelId) {
                    this.setHovering(true, intersect.point, modelId);
                } else {
                    this.setHovering(false);
                }
            } else {
                this.setHovering(false);
            }
        }
        
        // Update interaction hint
        this.updateInteractionHint();
    }

    // REMOVED: onMouseDown, onMouseUp, onMouseWheel - ModelLoader handles these
    // REMOVED: rotateActiveModel - ModelLoader handles rotation
    // REMOVED: touch events - ModelLoader handles these

    setHovering(isHovering, point = null, modelId = null) {
        this.isHovering = isHovering;
        this.hoveredModel = modelId;
        
        if (isHovering && point) {
            // Convert 3D point to screen coordinates
            const screenPos = point.clone().project(this.camera);
            const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
            
            this.hoverOverlay.style.left = `${x}px`;
            this.hoverOverlay.style.top = `${y}px`;
            this.hoverOverlay.style.opacity = '1';
            
            // Notify about hover
            if (this.onModelInteract) {
                this.onModelInteract('hover', modelId, point);
            }
        } else {
            this.hoverOverlay.style.opacity = '0';
            
            if (this.onModelInteract) {
                this.onModelInteract('hoverEnd');
            }
        }
    }

    updateInteractionHint() {
        const hintElement = document.getElementById('interactionHint');
        if (!hintElement) return;
        
        if (this.modelLoader.manualRotation.isDragging) {
            hintElement.textContent = 'Dragging...';
            hintElement.classList.add('visible');
        } else if (this.isHovering) {
            hintElement.textContent = 'Click and drag to rotate';
            hintElement.classList.add('visible');
        } else {
            hintElement.classList.remove('visible');
        }
    }

    onWindowResize() {
        // Update raycaster if needed
        this.mouse.set(0, 0);
    }

    // Public methods
    enableInteraction() {
        console.log("Interaction enabled - rotation handled by ModelLoader");
        // ModelLoader handles pointer events
    }

    disableInteraction() {
        console.log("Interaction disabled");
        this.setHovering(false);
        // Let ModelLoader handle disabling its interaction
        if (this.modelLoader.disableManualRotation) {
            this.modelLoader.disableManualRotation();
        }
    }

    reset() {
        this.setHovering(false);
        this.hoveredModel = null;
    }

    // Method to get current hover state (for other systems to use)
    getHoverState() {
        return {
            isHovering: this.isHovering,
            hoveredModel: this.hoveredModel
        };
    }

    // Method to check if a specific point is hovering over a model
    isPointOverModel(screenX, screenY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const intersect = this.performRaycast();
        return intersect ? this.findModelIdFromObject(intersect.object) : null;
    }

    dispose() {
        if (this.hoverOverlay && this.hoverOverlay.parentNode) {
            this.hoverOverlay.parentNode.removeChild(this.hoverOverlay);
        }
        
        // Remove our event listeners
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('click', this.onClick);
        canvas.removeEventListener('contextmenu', this.onContextMenu);
        
        window.removeEventListener('resize', this.onWindowResize);
        
        this.reset();
    }
}