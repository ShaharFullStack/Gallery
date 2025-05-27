import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor(scene, renderer, camera) {
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        this.loader = new GLTFLoader();
        this.modelStates = {};
        this.activeModelId = null;
        this.modelXOffset = 6;
        this.totalModels = 0;
        
        // Animation mixers for animated models
        this.mixers = {};
        
        // Spotlight management
        this.spotlights = {};
        this.spotlightHelpers = {};
        this.showHelpers = false;
        
        // Dynamic scene management
        this.sceneConfig = {
            minOffset: 4,
            maxOffset: 8,
            scaleMultiplier: 1.0,
            cameraDistanceMultiplier: 1.0
        };
        
        // Spotlight configuration
        this.spotlightConfig = {
            color: 0xffffff,
            intensity: 2.0,
            distance: 30,
            angle: Math.PI / 6,
            penumbra: 0.3,
            decay: 1.5,
            height: 8,
            targetOffset: new THREE.Vector3(0, 0, 0)
        };
          // Manual rotation configuration
        this.manualRotation = {
            enabled: true,
            sensitivity: 0.05,
            dampening: 0.95,
            maxSpeed: 0.05,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            velocityX: 0,
            velocityY: 0,
            targetRotationX: 0,
            targetRotationY: 0,
            currentRotationX: 0,
            currentRotationY: 0,
            rotateActiveOnly: true  // Only rotate active model
        };        // Auto rotation configuration (behaves like manual rotation)
        this.autoRotation = {
            enabled: true,  // Default enabled to match Controls
            speed: 0.5,
            direction: -1, // 1 for clockwise, -1 for counterclockwise
            rotateActiveOnly: true  // Only rotate active model
        };
        
        // Setup manual rotation controls
        this.setupManualRotation();
        
        console.log("ModelLoader initialized with manual rotation (zoom disabled)");
    }

    setupManualRotation() {
        const canvas = this.renderer.domElement;
        
        // Store bound functions for removal later
        this.boundMouseDown = this.onMouseDown.bind(this);
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        this.boundMouseLeave = this.onMouseLeave.bind(this);
        this.boundTouchStart = this.onTouchStart.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);
        this.boundTouchEnd = this.onTouchEnd.bind(this);
        this.boundContextMenu = this.onContextMenu.bind(this);
        
        // Add event listeners
        canvas.addEventListener('mousedown', this.boundMouseDown);
        canvas.addEventListener('mousemove', this.boundMouseMove);
        canvas.addEventListener('mouseup', this.boundMouseUp);
        canvas.addEventListener('mouseleave', this.boundMouseLeave);
        canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.boundTouchEnd, { passive: false });
        canvas.addEventListener('contextmenu', this.boundContextMenu);
        
        // Set initial cursor
        canvas.style.cursor = 'grab';
        
        console.log("Manual rotation event listeners added");
    }

    onMouseDown(event) {
        if (!this.manualRotation.enabled || event.button !== 0) return;
        
        this.manualRotation.isDragging = true;
        this.manualRotation.lastMouseX = event.clientX;
        this.manualRotation.lastMouseY = event.clientY;
        this.manualRotation.velocityX = 0;
        this.manualRotation.velocityY = 0;
        
        this.renderer.domElement.style.cursor = 'grabbing';
        console.log("Manual rotation started");
    }

    onMouseMove(event) {
        if (!this.manualRotation.enabled || !this.manualRotation.isDragging) return;
        
        const deltaX = event.clientX - this.manualRotation.lastMouseX;
        const deltaY = event.clientY - this.manualRotation.lastMouseY;
        
        this.manualRotation.velocityX = deltaX * this.manualRotation.sensitivity;
        this.manualRotation.velocityY = deltaY * this.manualRotation.sensitivity;
        
        // Clamp velocity
        this.manualRotation.velocityX = Math.max(-this.manualRotation.maxSpeed, 
            Math.min(this.manualRotation.maxSpeed, this.manualRotation.velocityX));
        this.manualRotation.velocityY = Math.max(-this.manualRotation.maxSpeed, 
            Math.min(this.manualRotation.maxSpeed, this.manualRotation.velocityY));
        
        this.manualRotation.lastMouseX = event.clientX;
        this.manualRotation.lastMouseY = event.clientY;
    }

    onMouseUp(event) {
        if (!this.manualRotation.enabled) return;
        
        this.manualRotation.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';
        console.log("Manual rotation ended");
    }

    onMouseLeave(event) {
        if (!this.manualRotation.enabled) return;
        
        this.manualRotation.isDragging = false;
        this.renderer.domElement.style.cursor = 'default';
    }

    onTouchStart(event) {
        if (!this.manualRotation.enabled || event.touches.length !== 1) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.manualRotation.isDragging = true;
        this.manualRotation.lastMouseX = touch.clientX;
        this.manualRotation.lastMouseY = touch.clientY;
        this.manualRotation.velocityX = 0;
        this.manualRotation.velocityY = 0;
    }

    onTouchMove(event) {
        if (!this.manualRotation.enabled || !this.manualRotation.isDragging || event.touches.length !== 1) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.manualRotation.lastMouseX;
        const deltaY = touch.clientY - this.manualRotation.lastMouseY;
        
        this.manualRotation.velocityX = deltaX * this.manualRotation.sensitivity;
        this.manualRotation.velocityY = deltaY * this.manualRotation.sensitivity;
        
        this.manualRotation.lastMouseX = touch.clientX;
        this.manualRotation.lastMouseY = touch.clientY;
    }

    onTouchEnd(event) {
        if (!this.manualRotation.enabled) return;
        
        event.preventDefault();
        this.manualRotation.isDragging = false;
    }

    onContextMenu(event) {
        event.preventDefault();
    }

    calculateSceneLayout(totalModels) {
        this.totalModels = totalModels;
        
        if (totalModels <= 3) {
            this.modelXOffset = 6;
            this.sceneConfig.scaleMultiplier = 1.0;
        } else if (totalModels <= 6) {
            this.modelXOffset = 5;
            this.sceneConfig.scaleMultiplier = 0.9;
        } else if (totalModels <= 10) {
            this.modelXOffset = 4.5;
            this.sceneConfig.scaleMultiplier = 0.8;
        } else {
            this.modelXOffset = 4;
            this.sceneConfig.scaleMultiplier = 0.7;
        }
        
        console.log(`Scene configured for ${totalModels} models. Offset: ${this.modelXOffset}, Scale: ${this.sceneConfig.scaleMultiplier}`);
    }

    calculateModelPosition(index) {
        const isMobile = window.innerWidth <= 768;
        const isContentOnLeft = (index % 2) === 0;
        
        if (isMobile) {
            return isContentOnLeft ? -this.modelXOffset * 0.3 : this.modelXOffset * 0.3;
        } else {
            return isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
        }
    }

    calculateModelScale(originalScale, index) {
        const baseScale = originalScale.clone().multiplyScalar(this.sceneConfig.scaleMultiplier);
        const variation = 0.9 + (Math.sin(index * 1.234) * 0.2);
        return baseScale.multiplyScalar(variation);
    }

    async loadModel(item, index) {
        return new Promise((resolve, reject) => {            this.modelStates[item.id] = {
                modelObject: null,
                targetOpacity: index === 0 ? 1 : 0,
                currentOpacity: index === 0 ? 1 : 0,
                visible: index === 0,
                targetX: 0,
                currentX: 0,
                scale: new THREE.Vector3(...item.modelScale),
                mixer: null,
                // Manual rotation state
                manualRotation: {
                    rotationX: 0,
                    rotationY: 0,
                    baseRotationX: (Math.random() - 0.5) * 0.2,
                    baseRotationY: Math.random() * Math.PI * 2,
                    baseRotationZ: (Math.random() - 0.5) * 0.2
                },
                // Auto rotation state (behaves like manual rotation)
                autoRotation: {
                    currentRotationX: 0,
                    currentRotationY: 0,
                    baseRotationX: (Math.random() - 0.5) * 0.2,
                    baseRotationY: Math.random() * Math.PI * 2,
                    baseRotationZ: (Math.random() - 0.5) * 0.2
                }
            };

            console.log(`Loading model: ${item.title}`);

            this.loader.load(
                item.modelUrl,
                (gltf) => {
                    console.log(`Successfully loaded: ${item.title}`);
                    this.processModel(gltf, item, index);
                    resolve();
                },
                (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.min(Math.round((progress.loaded / progress.total) * 100), 100);
                        if (percent % 25 === 0) {
                            console.log(`Loading ${item.title}: ${percent}%`);
                        }
                    }
                },
                (error) => {
                    console.error(`Error loading ${item.title}:`, error);
                    reject(error);
                }
            );
        });
    }

    processModel(gltf, item, index) {
        const model = gltf.scene;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Apply scale
        model.scale.copy(this.modelStates[item.id].scale);
        
        // Set initial rotation
        const manualRot = this.modelStates[item.id].manualRotation;
        model.rotation.set(manualRot.baseRotationX, manualRot.baseRotationY, manualRot.baseRotationZ);
        
        // Setup materials and shadows
        this.setupModelMaterials(model, item.id);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            this.mixers[item.id] = mixer;
            this.modelStates[item.id].mixer = mixer;
            
            gltf.animations.forEach(clip => {
                const action = mixer.clipAction(clip);
                action.play();
            });
        }
        
        // Position model
        this.positionModel(model, item.id, index);
        
        // Create spotlight for this model
        this.createSpotlightForModel(model, item.id, index);
        
        // Store model
        this.modelStates[item.id].modelObject = model;
        this.scene.add(model);
        
        // Set visibility
        if (index !== 0) {
            model.visible = false;
        } else {
            this.activeModelId = item.id;
        }
    }

    setupModelMaterials(model, modelId) {
        model.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = this.modelStates[modelId].currentOpacity;
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material.map) {
                    child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
                
                if (child.material.isMeshStandardMaterial) {
                    child.material.metalness = Math.min(child.material.metalness + 0.1, 1);
                    child.material.roughness = Math.max(child.material.roughness - 0.05, 0);
                    
                    if (!child.material.envMap) {
                        const envMap = this.createEnvironmentMap();
                        child.material.envMap = envMap;
                        child.material.envMapIntensity = 0.3;
                    }
                }
                
                if (child.material.emissive) {
                    child.material.emissive.multiplyScalar(0.1);
                }
            }
        });
    }

    createEnvironmentMap() {
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
        
        const scene = new THREE.Scene();
        const geometry = new THREE.BoxGeometry(100, 100, 100);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.2, 0.2, 0.4),
            side: THREE.BackSide
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        cubeCamera.update(this.renderer, scene);
        return cubeRenderTarget.texture;
    }

    createSpotlightForModel(model, modelId, index) {
        const spotlight = new THREE.SpotLight(
            this.spotlightConfig.color,
            this.spotlightConfig.intensity,
            this.spotlightConfig.distance,
            this.spotlightConfig.angle,
            this.spotlightConfig.penumbra,
            this.spotlightConfig.decay
        );
        
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 1024;
        spotlight.shadow.mapSize.height = 1024;
        spotlight.shadow.camera.near = 0.5;
        spotlight.shadow.camera.far = this.spotlightConfig.distance;
        spotlight.shadow.bias = -0.0001;
        
        const modelPosition = model.position.clone();
        spotlight.position.set(
            modelPosition.x,
            this.spotlightConfig.height,
            modelPosition.z + 5
        );
        
        const target = new THREE.Object3D();
        target.position.copy(modelPosition).add(this.spotlightConfig.targetOffset);
        this.scene.add(target);
        spotlight.target = target;
        
        const hue = (index * 0.15) % 1;
        const color = new THREE.Color().setHSL(hue, 0.3, 0.9);
        spotlight.color = color;
        
        this.spotlights[modelId] = {
            light: spotlight,
            target: target,
            originalIntensity: this.spotlightConfig.intensity,
            currentIntensity: index === 0 ? this.spotlightConfig.intensity : 0,
            targetIntensity: index === 0 ? this.spotlightConfig.intensity : 0
        };
        
        this.scene.add(spotlight);
        
        if (this.showHelpers) {
            const helper = new THREE.SpotLightHelper(spotlight);
            this.spotlightHelpers[modelId] = helper;
            this.scene.add(helper);
        }
        
        spotlight.intensity = this.spotlights[modelId].currentIntensity;
    }

    updateSpotlightForModel(modelId, modelPosition) {
        const spotlightData = this.spotlights[modelId];
        if (!spotlightData) return;
        
        const { light, target } = spotlightData;
        
        light.position.set(
            modelPosition.x,
            this.spotlightConfig.height,
            modelPosition.z + 5
        );
        
        target.position.copy(modelPosition).add(this.spotlightConfig.targetOffset);
        
        if (this.spotlightHelpers[modelId]) {
            this.spotlightHelpers[modelId].update();
        }
    }

    activateSpotlight(modelId) {
        Object.keys(this.spotlights).forEach(id => {
            this.spotlights[id].targetIntensity = 0;
        });
        
        if (this.spotlights[modelId]) {
            this.spotlights[modelId].targetIntensity = this.spotlights[modelId].originalIntensity;
        }
    }

    animateSpotlights(delta) {
        Object.values(this.spotlights).forEach(spotlightData => {
            spotlightData.currentIntensity = THREE.MathUtils.lerp(
                spotlightData.currentIntensity,
                spotlightData.targetIntensity,
                delta * 3
            );
            
            spotlightData.light.intensity = spotlightData.currentIntensity;
            
            if (spotlightData.targetIntensity > 0) {
                const time = Date.now() * 0.002;
                const pulse = Math.sin(time) * 0.1 + 1;
                spotlightData.light.intensity = spotlightData.currentIntensity * pulse;
            }
        });
    }

    positionModel(model, modelId, index) {
        const isMobile = window.innerWidth <= 768;
        const isContentOnLeft = (index % 2) === 0;
        
        let targetX;
        if (isMobile) {
            targetX = 0;
        } else {
            targetX = isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
        }
        
        this.modelStates[modelId].targetX = targetX;
        this.modelStates[modelId].currentX = targetX;
        model.position.x = targetX;
        
        model.position.y = (Math.random() - 0.5) * 0.5;
    }

    showModel(modelId, index) {
        if (this.activeModelId && this.modelStates[this.activeModelId]) {
            this.modelStates[this.activeModelId].targetOpacity = 0;
            this.modelStates[this.activeModelId].visible = false;
        }

        this.activeModelId = modelId;
        
        if (this.modelStates[modelId]) {
            this.modelStates[modelId].targetOpacity = 1;
            this.modelStates[modelId].visible = true;
            
            if (this.modelStates[modelId].modelObject) {
                this.modelStates[modelId].modelObject.visible = true;
            }
        }
        
        this.activateSpotlight(modelId);
    }

    updateModelPositions() {
        const isMobile = window.innerWidth <= 768;
        
        Object.keys(this.modelStates).forEach((modelId, index) => {
            const state = this.modelStates[modelId];
            const isContentOnLeft = (index % 2) === 0;
            
            let targetX;
            if (isMobile) {
                targetX = 0;
            } else {
                targetX = isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
            }
            
            state.targetX = targetX;
            if (state.modelObject) {
                state.modelObject.position.x = targetX;
                state.currentX = targetX;
                
                this.updateSpotlightForModel(modelId, state.modelObject.position);
            }
        });
    }

    updateModelAppearance(modelId) {
        const state = this.modelStates[modelId];
        if (state && state.modelObject) {
            state.modelObject.visible = state.visible;
            state.modelObject.traverse(child => {
                if (child.isMesh) {
                    child.material.opacity = state.currentOpacity;
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    // Manual rotation methods
    updateManualRotation(delta) {
        // Apply dampening to velocities
        this.manualRotation.velocityX *= this.manualRotation.dampening;
        this.manualRotation.velocityY *= this.manualRotation.dampening;
        
        // Update target rotations
        this.manualRotation.targetRotationY += this.manualRotation.velocityX;
        this.manualRotation.targetRotationX += this.manualRotation.velocityY;
        
        // Smooth interpolation to target rotations
        this.manualRotation.currentRotationX = THREE.MathUtils.lerp(
            this.manualRotation.currentRotationX,
            this.manualRotation.targetRotationX,
            delta * 8
        );
        this.manualRotation.currentRotationY = THREE.MathUtils.lerp(
            this.manualRotation.currentRotationY,
            this.manualRotation.targetRotationY,
            delta * 8
        );
        
        // Apply rotation to models
        if (this.manualRotation.rotateActiveOnly) {
            // Only rotate active model
            if (this.activeModelId && this.modelStates[this.activeModelId]) {
                this.applyManualRotationToModel(this.activeModelId);
            }
        } else {
            // Rotate all visible models
            Object.keys(this.modelStates).forEach(modelId => {
                const state = this.modelStates[modelId];
                if (state.visible) {
                    this.applyManualRotationToModel(modelId);
                }
            });
        }
    }    applyManualRotationToModel(modelId) {
        const state = this.modelStates[modelId];
        if (!state || !state.modelObject) return;
        
        const manualRot = state.manualRotation;
        
        // Apply manual rotation on top of base rotation
        state.modelObject.rotation.x = manualRot.baseRotationX + this.manualRotation.currentRotationX;
        state.modelObject.rotation.y = manualRot.baseRotationY + this.manualRotation.currentRotationY;
        state.modelObject.rotation.z = manualRot.baseRotationZ;
    }

    // Auto rotation methods (behaves like manual rotation)
    updateAutoRotation(delta) {
        if (this.autoRotation.rotateActiveOnly) {
            // Only rotate active model
            if (this.activeModelId && this.modelStates[this.activeModelId]) {
                this.applyAutoRotationToModel(this.activeModelId, delta);
            }
        } else {
            // Rotate all visible models
            Object.keys(this.modelStates).forEach(modelId => {
                const state = this.modelStates[modelId];
                if (state.visible) {
                    this.applyAutoRotationToModel(modelId, delta);
                }
            });
        }
    }

    applyAutoRotationToModel(modelId, delta) {
        const state = this.modelStates[modelId];
        if (!state || !state.modelObject) return;
        
        const autoRot = state.autoRotation;
        
        // Continuously rotate around Y axis (like manual rotation does)
        autoRot.currentRotationY += this.autoRotation.speed * this.autoRotation.direction * delta;
        
        // Apply auto rotation on top of base rotation (similar to manual rotation)
        state.modelObject.rotation.x = autoRot.baseRotationX;
        state.modelObject.rotation.y = autoRot.baseRotationY + autoRot.currentRotationY;
        state.modelObject.rotation.z = autoRot.baseRotationZ;
    }

    // Manual rotation control methods
    enableManualRotation() {
        this.manualRotation.enabled = true;
        this.renderer.domElement.style.cursor = 'grab';
        console.log("Manual rotation enabled");
    }

    disableManualRotation() {
        this.manualRotation.enabled = false;
        this.manualRotation.isDragging = false;
        this.renderer.domElement.style.cursor = 'default';
        console.log("Manual rotation disabled");
    }

    setRotationSensitivity(sensitivity) {
        this.manualRotation.sensitivity = Math.max(0.001, Math.min(0.1, sensitivity));
        console.log("Rotation sensitivity set to:", this.manualRotation.sensitivity);
    }

    setRotationDampening(dampening) {
        this.manualRotation.dampening = Math.max(0.8, Math.min(0.99, dampening));
        console.log("Rotation dampening set to:", this.manualRotation.dampening);
    }    resetManualRotation() {
        this.manualRotation.targetRotationX = 0;
        this.manualRotation.targetRotationY = 0;
        this.manualRotation.currentRotationX = 0;
        this.manualRotation.currentRotationY = 0;
        this.manualRotation.velocityX = 0;
        this.manualRotation.velocityY = 0;
        console.log("Manual rotation reset");
    }

    // Auto rotation control methods
    enableAutoRotation() {
        this.autoRotation.enabled = true;
        console.log("Auto rotation enabled");
    }

    disableAutoRotation() {
        this.autoRotation.enabled = false;
        console.log("Auto rotation disabled");
    }

    toggleAutoRotation() {
        this.autoRotation.enabled = !this.autoRotation.enabled;
        console.log("Auto rotation", this.autoRotation.enabled ? "enabled" : "disabled");
        return this.autoRotation.enabled;
    }

    setAutoRotationSpeed(speed) {
        this.autoRotation.speed = Math.max(0, Math.min(5, speed)); // Clamp between 0 and 5
        console.log("Auto rotation speed set to:", this.autoRotation.speed);
    }

    setAutoRotationDirection(direction) {
        this.autoRotation.direction = direction > 0 ? 1 : -1;
        console.log("Auto rotation direction set to:", this.autoRotation.direction > 0 ? "clockwise" : "counterclockwise");
    }

    resetAutoRotation() {
        // Reset auto rotation for all models
        Object.keys(this.modelStates).forEach(modelId => {
            const state = this.modelStates[modelId];
            if (state.autoRotation) {
                state.autoRotation.currentRotationX = 0;
                state.autoRotation.currentRotationY = 0;
            }
        });
        console.log("Auto rotation reset for all models");
    }

    // Method to disable zoom in any existing controls
    disableZoom() {
        // This method can be called to ensure zoom is disabled
        // in your existing controls system
        console.log("Zoom functionality disabled in ModelLoader");
        
        // If you're using OrbitControls, you would call:
        // this.controls.enableZoom = false;
        // this.controls.enablePan = false; // Optional: also disable panning
    }

    getActiveModel() {
        return this.activeModelId ? this.modelStates[this.activeModelId] : null;
    }

    getModelPosition(index) {
        const isMobile = window.innerWidth <= 768;
        const isContentOnLeft = (index % 2) === 0;
        
        if (isMobile) {
            return 0;
        } else {
            return isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
        }
    }    update(delta) {
        // Update manual rotation
        if (this.manualRotation.enabled) {
            this.updateManualRotation(delta);
        }

        // Update auto rotation (behaves like manual rotation)
        if (this.autoRotation.enabled && !this.manualRotation.isDragging) {
            this.updateAutoRotation(delta);
        }
        
        // Update model animations and transitions
        for (const modelId in this.modelStates) {
            const state = this.modelStates[modelId];
            
            if (state.modelObject) {
                // Smooth opacity transition
                state.currentOpacity = THREE.MathUtils.lerp(
                    state.currentOpacity,
                    state.targetOpacity,
                    delta * 3
                );

                // Smooth position transition
                state.currentX = THREE.MathUtils.lerp(
                    state.currentX,
                    state.targetX,
                    delta * 4
                );
                state.modelObject.position.x = state.currentX;
                
                this.updateSpotlightForModel(modelId, state.modelObject.position);

                // Hide/show models based on opacity
                if (state.currentOpacity < 0.01 && state.targetOpacity === 0) {
                    state.visible = false;
                    state.currentOpacity = 0;
                } else if (state.targetOpacity > 0) {
                    state.visible = true;
                }

                this.updateModelAppearance(modelId);

                // Update animation mixer
                if (state.mixer) {
                    state.mixer.update(delta);
                }

                // Add subtle floating animation only if manual rotation is not active
                if (modelId === this.activeModelId && state.visible && !this.manualRotation.isDragging) {
                    const time = Date.now() * 0.001;
                    const floatingY = Math.sin(time) * 0.001;
                    state.modelObject.position.y += floatingY;
                }
            }
        }

        // Update all animation mixers
        Object.values(this.mixers).forEach(mixer => {
            if (mixer) mixer.update(delta);
        });
        
        // Animate spotlights
        this.animateSpotlights(delta);
    }

    dispose() {
        // Remove event listeners properly
        const canvas = this.renderer.domElement;
        if (this.boundMouseDown) {
            canvas.removeEventListener('mousedown', this.boundMouseDown);
            canvas.removeEventListener('mousemove', this.boundMouseMove);
            canvas.removeEventListener('mouseup', this.boundMouseUp);
            canvas.removeEventListener('mouseleave', this.boundMouseLeave);
            canvas.removeEventListener('touchstart', this.boundTouchStart);
            canvas.removeEventListener('touchmove', this.boundTouchMove);
            canvas.removeEventListener('touchend', this.boundTouchEnd);
            canvas.removeEventListener('contextmenu', this.boundContextMenu);
        }
        
        // Clean up resources
        Object.values(this.modelStates).forEach(state => {
            if (state.modelObject) {
                this.scene.remove(state.modelObject);
                
                state.modelObject.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
        });

        Object.values(this.mixers).forEach(mixer => {
            if (mixer) mixer.uncacheRoot(mixer.getRoot());
        });
        
        Object.values(this.spotlights).forEach(spotlightData => {
            this.scene.remove(spotlightData.light);
            this.scene.remove(spotlightData.target);
        });
        
        Object.values(this.spotlightHelpers).forEach(helper => {
            this.scene.remove(helper);
        });

        this.modelStates = {};
        this.mixers = {};
        this.spotlights = {};
        this.spotlightHelpers = {};
        this.activeModelId = null;
    }

    toggleSpotlightHelpers() {
        this.showHelpers = !this.showHelpers;
        
        if (this.showHelpers) {
            Object.keys(this.spotlights).forEach(modelId => {
                if (!this.spotlightHelpers[modelId]) {
                    const helper = new THREE.SpotLightHelper(this.spotlights[modelId].light);
                    this.spotlightHelpers[modelId] = helper;
                    this.scene.add(helper);
                }
            });
        } else {
            Object.values(this.spotlightHelpers).forEach(helper => {
                this.scene.remove(helper);
            });
            this.spotlightHelpers = {};
        }
    }

    updateSpotlightConfig(config) {
        this.spotlightConfig = { ...this.spotlightConfig, ...config };
        
        Object.values(this.spotlights).forEach(spotlightData => {
            const light = spotlightData.light;
            light.intensity = config.intensity || light.intensity;
            light.distance = config.distance || light.distance;
            light.angle = config.angle || light.angle;
            light.penumbra = config.penumbra || light.penumbra;
            light.decay = config.decay || light.decay;
            
            if (config.color) {
                light.color.setHex(config.color);
            }
        });
    }
}