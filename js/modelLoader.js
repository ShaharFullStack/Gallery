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
        this.modelXOffset = 6; // Increased from 4 to 6 for more side positioning
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
    }

    calculateSceneLayout(totalModels) {
        this.totalModels = totalModels;
        
        // Dynamic offset based on number of models
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
            // On mobile, slight offset but mostly centered
            return isContentOnLeft ? -this.modelXOffset * 0.3 : this.modelXOffset * 0.3;
        } else {
            // On desktop, full side positioning - opposite to content
            return isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
        }
    }

    calculateModelScale(originalScale, index) {
        // Apply scene scale multiplier
        const baseScale = originalScale.clone().multiplyScalar(this.sceneConfig.scaleMultiplier);
        
        // Add slight variation for visual interest
        const variation = 0.9 + (Math.sin(index * 1.234) * 0.2); // Varies between 0.7 and 1.1
        return baseScale.multiplyScalar(variation);
    }

    async loadModel(item, index) {
        return new Promise((resolve, reject) => {
            // Initialize model state
            this.modelStates[item.id] = {
                modelObject: null,
                targetOpacity: index === 0 ? 1 : 0,
                currentOpacity: index === 0 ? 1 : 0,
                visible: index === 0,
                targetX: 0,
                currentX: 0,
                scale: new THREE.Vector3(...item.modelScale),
                mixer: null
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
                        if (percent % 25 === 0) { // Log every 25%
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
        
        // Setup materials and shadows
        this.setupModelMaterials(model, item.id);
        
        // Setup animations if available
        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            this.mixers[item.id] = mixer;
            this.modelStates[item.id].mixer = mixer;
            
            // Play all animations
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
                // Clone material to avoid shared references
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = this.modelStates[modelId].currentOpacity;
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Enhanced material properties
                if (child.material.map) {
                    child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
                
                // Improve material appearance
                if (child.material.isMeshStandardMaterial) {
                    // Add subtle metallic and roughness variations
                    child.material.metalness = Math.min(child.material.metalness + 0.1, 1);
                    child.material.roughness = Math.max(child.material.roughness - 0.05, 0);
                    
                    // Enhanced environment reflection
                    if (!child.material.envMap) {
                        // Create a simple environment map
                        const envMap = this.createEnvironmentMap();
                        child.material.envMap = envMap;
                        child.material.envMapIntensity = 0.3;
                    }
                }
                
                // Add subtle emission for glow effect
                if (child.material.emissive) {
                    child.material.emissive.multiplyScalar(0.1);
                }
            }
        });
    }

    createEnvironmentMap() {
        // Create a simple cube environment map
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
        
        // Simple gradient environment
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
        // Create spotlight
        const spotlight = new THREE.SpotLight(
            this.spotlightConfig.color,
            this.spotlightConfig.intensity,
            this.spotlightConfig.distance,
            this.spotlightConfig.angle,
            this.spotlightConfig.penumbra,
            this.spotlightConfig.decay
        );
        
        // Enable shadows
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 1024;
        spotlight.shadow.mapSize.height = 1024;
        spotlight.shadow.camera.near = 0.5;
        spotlight.shadow.camera.far = this.spotlightConfig.distance;
        spotlight.shadow.bias = -0.0001;
        
        // Position spotlight above and slightly in front of model
        const modelPosition = model.position.clone();
        spotlight.position.set(
            modelPosition.x,
            this.spotlightConfig.height,
            modelPosition.z + 5
        );
        
        // Create target for spotlight
        const target = new THREE.Object3D();
        target.position.copy(modelPosition).add(this.spotlightConfig.targetOffset);
        this.scene.add(target);
        spotlight.target = target;
        
        // Add color variation based on model index for visual interest
        const hue = (index * 0.15) % 1; // Rotate hue for each model
        const color = new THREE.Color().setHSL(hue, 0.3, 0.9);
        spotlight.color = color;
        
        // Store spotlight and target
        this.spotlights[modelId] = {
            light: spotlight,
            target: target,
            originalIntensity: this.spotlightConfig.intensity,
            currentIntensity: index === 0 ? this.spotlightConfig.intensity : 0,
            targetIntensity: index === 0 ? this.spotlightConfig.intensity : 0
        };
        
        // Add to scene
        this.scene.add(spotlight);
        
        // Add helper for debugging (optional)
        if (this.showHelpers) {
            const helper = new THREE.SpotLightHelper(spotlight);
            this.spotlightHelpers[modelId] = helper;
            this.scene.add(helper);
        }
        
        // Start with correct intensity
        spotlight.intensity = this.spotlights[modelId].currentIntensity;
    }

    updateSpotlightForModel(modelId, modelPosition) {
        const spotlightData = this.spotlights[modelId];
        if (!spotlightData) return;
        
        const { light, target } = spotlightData;
        
        // Update spotlight position
        light.position.set(
            modelPosition.x,
            this.spotlightConfig.height,
            modelPosition.z + 5
        );
        
        // Update target position
        target.position.copy(modelPosition).add(this.spotlightConfig.targetOffset);
        
        // Update helper if it exists
        if (this.spotlightHelpers[modelId]) {
            this.spotlightHelpers[modelId].update();
        }
    }

    activateSpotlight(modelId) {
        // Deactivate all spotlights
        Object.keys(this.spotlights).forEach(id => {
            this.spotlights[id].targetIntensity = 0;
        });
        
        // Activate spotlight for current model
        if (this.spotlights[modelId]) {
            this.spotlights[modelId].targetIntensity = this.spotlights[modelId].originalIntensity;
        }
    }

    animateSpotlights(delta) {
        Object.values(this.spotlights).forEach(spotlightData => {
            // Smooth intensity transition
            spotlightData.currentIntensity = THREE.MathUtils.lerp(
                spotlightData.currentIntensity,
                spotlightData.targetIntensity,
                delta * 3
            );
            
            spotlightData.light.intensity = spotlightData.currentIntensity;
            
            // Add subtle intensity pulsing for active spotlight
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
            // Center models on mobile
            targetX = 0;
        } else {
            // Position models opposite to content
            targetX = isContentOnLeft ? this.modelXOffset : -this.modelXOffset;
        }
        
        this.modelStates[modelId].targetX = targetX;
        this.modelStates[modelId].currentX = targetX;
        model.position.x = targetX;
        
        // Add slight Y offset for visual interest
        model.position.y = (Math.random() - 0.5) * 0.5;
        
        // Add slight rotation for dynamic look
        model.rotation.y = (Math.random() - 0.5) * 0.2;
    }

    showModel(modelId, index) {
        // Hide current model
        if (this.activeModelId && this.modelStates[this.activeModelId]) {
            this.modelStates[this.activeModelId].targetOpacity = 0;
            this.modelStates[this.activeModelId].visible = false;
        }

        // Show new model
        this.activeModelId = modelId;
        
        if (this.modelStates[modelId]) {
            this.modelStates[modelId].targetOpacity = 1;
            this.modelStates[modelId].visible = true;
            
            if (this.modelStates[modelId].modelObject) {
                this.modelStates[modelId].modelObject.visible = true;
            }
        }
        
        // Activate spotlight for new model
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
                
                // Update spotlight position
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
    }

    update(delta) {
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
                
                // Update spotlight position when model moves
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

                // Add subtle floating animation to active model
                if (modelId === this.activeModelId && state.visible) {
                    const time = Date.now() * 0.001;
                    state.modelObject.position.y += Math.sin(time) * 0.001;
                    state.modelObject.rotation.y += Math.sin(time * 0.5) * 0.0005;
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
        // Clean up resources
        Object.values(this.modelStates).forEach(state => {
            if (state.modelObject) {
                this.scene.remove(state.modelObject);
                
                // Dispose geometries and materials
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

        // Dispose mixers
        Object.values(this.mixers).forEach(mixer => {
            if (mixer) mixer.uncacheRoot(mixer.getRoot());
        });
        
        // Dispose spotlights
        Object.values(this.spotlights).forEach(spotlightData => {
            this.scene.remove(spotlightData.light);
            this.scene.remove(spotlightData.target);
        });
        
        // Dispose spotlight helpers
        Object.values(this.spotlightHelpers).forEach(helper => {
            this.scene.remove(helper);
        });

        this.modelStates = {};
        this.mixers = {};
        this.spotlights = {};
        this.spotlightHelpers = {};
        this.activeModelId = null;
    }

    // Debug method to toggle spotlight helpers
    toggleSpotlightHelpers() {
        this.showHelpers = !this.showHelpers;
        
        if (this.showHelpers) {
            // Add helpers for existing spotlights
            Object.keys(this.spotlights).forEach(modelId => {
                if (!this.spotlightHelpers[modelId]) {
                    const helper = new THREE.SpotLightHelper(this.spotlights[modelId].light);
                    this.spotlightHelpers[modelId] = helper;
                    this.scene.add(helper);
                }
            });
        } else {
            // Remove all helpers
            Object.values(this.spotlightHelpers).forEach(helper => {
                this.scene.remove(helper);
            });
            this.spotlightHelpers = {};
        }
    }

    // Method to update spotlight configuration
    updateSpotlightConfig(config) {
        this.spotlightConfig = { ...this.spotlightConfig, ...config };
        
        // Update existing spotlights
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