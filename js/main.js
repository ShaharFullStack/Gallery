import * as THREE from 'three';
import { ModelLoader } from './modelLoader.js';
import { ScrollHandler } from './scrollHandler.js';
import { Controls } from './controls.js';
import { UIManager } from './uiManager.js';
import { MouseInteraction } from './mouseInteraction.js';

class Gallery3D {
    constructor() {
        this.galleryData = null;
        this.settings = null;
        this.modelLoader = null;
        this.scrollHandler = null;
        this.controls = null;
        this.uiManager = null;
        this.mouseInteraction = null;
        this.currentIndex = 0;

        this.init();
    }

    async init() {
        try {
            // Show loading
            this.uiManager = new UIManager();
            this.uiManager.showLoading();

            // Load configuration
            await this.loadConfiguration();

            // Initialize Three.js scene
            this.initScene();

            // Initialize modules
            this.modelLoader = new ModelLoader(this.scene, this.renderer, this.camera);

            // Configure spotlight settings if available
            if (this.settings.spotlightConfig) {
                this.modelLoader.updateSpotlightConfig(this.settings.spotlightConfig);
            }

            this.scrollHandler = new ScrollHandler(this.galleryData, this.onItemChange.bind(this));
            this.controls = new Controls(this.camera, this.renderer, this.modelLoader);

            // Initialize mouse interaction for direct model control
            this.mouseInteraction = new MouseInteraction(
                this.camera,
                this.renderer,
                this.scene,
                this.modelLoader,
                this.onModelInteract.bind(this)
            );

            // Create gallery HTML
            this.createGalleryHTML();

            // Load models
            await this.loadModels();

            // Setup event listeners
            this.setupEventListeners();

            // Start animation loop
            this.animate();

            // Hide loading and show controls
            this.uiManager.hideLoading();
            this.showControls();

            console.log('3D Gallery initialized successfully');
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            this.uiManager.showError('Failed to load gallery. Please refresh the page.');
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('urls.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            this.galleryData = config.galleryItems;
            this.settings = config.settings;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw new Error('Could not load gallery configuration');
        }
    }

    initScene() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, this.settings.cameraDistance);

        // Renderer setup
        const canvas = document.getElementById('main-three-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting setup
        this.setupLighting();

        // Clock for animations
        this.clock = new THREE.Clock();
    }

    setupLighting() {
        const lighting = this.settings.lightingIntensity;

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, lighting.ambient);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, lighting.main);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        this.scene.add(mainLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x9090ff, lighting.fill);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.PointLight(0xff6090, lighting.rim, 20);
        rimLight.position.set(0, 5, -5);
        this.scene.add(rimLight);

        // Additional accent lights
        const accentLight1 = new THREE.SpotLight(0x667eea, 0.3, 30, Math.PI / 6, 0.1, 2);
        accentLight1.position.set(8, 8, 8);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.SpotLight(0x764ba2, 0.2, 25, Math.PI / 8, 0.1, 2);
        accentLight2.position.set(-8, 6, -8);
        this.scene.add(accentLight2);
    }

    createGalleryHTML() {
        const container = document.getElementById('gallery-container');

        this.galleryData.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('gallery-item');
            itemElement.id = item.id;

            // Alternate content positioning
            const isContentOnLeft = (index % 2) === 0;
            itemElement.classList.add(isContentOnLeft ? 'content-left' : 'content-right');

            const wrapperElement = document.createElement('div');
            wrapperElement.classList.add('item-content-wrapper');

            const contentElement = document.createElement('div');
            contentElement.classList.add('item-content');

            // Image
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = `תמונה עבור ${item.title}`;
            img.loading = 'lazy';
            img.onerror = () => {
                img.src = 'https://placehold.co/400x300/333/ccc?text=Image+Not+Found';
            };

            // Title
            const title = document.createElement('h2');
            title.textContent = item.title;

            // Description
            const description = document.createElement('p');
            description.textContent = item.description;

            // Metadata
            const metadata = document.createElement('div');
            metadata.classList.add('item-meta');
            metadata.innerHTML = `
                <span><strong>אמן:</strong> ${item.artist}</span>
                <span><strong>שנה:</strong> ${item.year}</span>
                <span><strong>טכניקה:</strong> ${item.technique}</span>
            `;

            // Assemble content
            contentElement.appendChild(img);
            contentElement.appendChild(title);
            contentElement.appendChild(description);
            contentElement.appendChild(metadata);
            wrapperElement.appendChild(contentElement);
            itemElement.appendChild(wrapperElement);
            container.appendChild(itemElement);
        });
    }

    async loadModels() {
        const totalModels = this.galleryData.length;
        let loadedCount = 0;

        // Configure scene layout for the number of models
        this.modelLoader.calculateSceneLayout(totalModels);

        for (let i = 0; i < this.galleryData.length; i++) {
            const item = this.galleryData[i];

            try {
                await this.modelLoader.loadModel(item, i);
                loadedCount++;

                // Update progress
                const progress = (loadedCount / totalModels) * 100;
                this.uiManager.updateProgress(progress);

            } catch (error) {
                console.error(`Failed to load model ${item.title}:`, error);
                this.uiManager.showError(`Failed to load 3D model: ${item.title}`);
                loadedCount++;
            }
        }

        // Position first model
        if (this.galleryData.length > 0) {
            this.modelLoader.showModel(this.galleryData[0].id, 0);
            this.currentIndex = 0;
        }

        console.log(`Loaded ${loadedCount}/${totalModels} models successfully`);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this), { passive: true });

        // Scroll handling
        window.addEventListener('scroll', this.scrollHandler.handleScroll.bind(this.scrollHandler), { passive: true });

        // Keyboard navigation
        document.addEventListener('keydown', this.onKeyDown.bind(this));

        // Minimal controls
        const autoRotateBtn = document.getElementById('autoRotateBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');

        if (autoRotateBtn) {
            autoRotateBtn.addEventListener('click', () => {
                this.controls.toggleAutoRotate();
                autoRotateBtn.classList.toggle('active');

                // Show user feedback
                const isActive = autoRotateBtn.classList.contains('active');
                this.uiManager.showSuccess(`Auto rotation ${isActive ? 'enabled' : 'disabled'}`);
            });
        }

        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', () => {
                this.controls.resetView(this.currentIndex);
                this.uiManager.showSuccess('View reset');

                // Reset mouse interaction
                if (this.mouseInteraction) {
                    this.mouseInteraction.reset();
                }
            });
        }
    }

    onModelInteract(action, modelId, data) {
        switch (action) {
            case 'startInteraction':
                // Disable auto-rotation when user starts interacting
                this.controls.setAutoRotateSpeed(0);
                this.uiManager.setButtonActive('autoRotateBtn', false);
                break;

            case 'endInteraction':
                // Re-enable auto-rotation after interaction
                setTimeout(() => {
                    if (this.controls.isAutoRotating) {
                        this.controls.setAutoRotateSpeed(this.settings.autoRotateSpeed);
                    }
                }, 2000); // Wait 2 seconds before resuming auto-rotation
                break;

            case 'zoom':
                // Provide haptic feedback on mobile
                if ('vibrate' in navigator && window.innerWidth <= 768) {
                    navigator.vibrate(10);
                }
                break;
        }
    }

    updateModelInfo(item) {
        const modelTitle = document.getElementById('modelTitle');
        if (modelTitle && item) {
            modelTitle.textContent = item.title;
        }

        const modelInfo = document.getElementById('modelInfo');
        if (modelInfo) {
            if (item) {
                modelInfo.classList.add('visible');
            } else {
                modelInfo.classList.remove('visible');
            }
        }
    }

    createProgressDots() {
        const progressDots = document.getElementById('progressDots');
        if (!progressDots) return;

        progressDots.innerHTML = '';
        this.galleryData.forEach((item, index) => {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            if (index === 0) dot.classList.add('active');

            // Add click handler for direct navigation
            dot.addEventListener('click', () => {
                console.log(`Dot ${index} clicked - navigating to ${item.title}`);
                this.navigateToItem(index);
            });

            // Add hover tooltip
            dot.title = item.title;

            progressDots.appendChild(dot);
        });

        console.log(`Created ${this.galleryData.length} progress dots`);
    }

    navigateToItem(index) {
        if (index >= 0 && index < this.galleryData.length && index !== this.currentIndex) {
            console.log(`Navigating from item ${this.currentIndex} to ${index}`);

            const item = this.galleryData[index];
            const element = document.getElementById(item.id);

            if (element) {
                // Scroll to the element
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Immediately switch the model (don't wait for scroll)
                this.switchToItem(index);
            }
        }
    }

    switchToItem(newIndex) {
        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.galleryData.length) {
            console.log(`Switching from item ${this.currentIndex} to ${newIndex}`);

            this.currentIndex = newIndex;
            const item = this.galleryData[newIndex];

            // Switch 3D model immediately
            this.modelLoader.showModel(item.id, newIndex);

            // Update UI elements
            this.updateProgressDots(newIndex);
            this.updateModelInfo(item);
            this.updateInteractionArea(newIndex);

            // Update camera for new model position
            this.controls.updateCameraForModel(newIndex);

            // Reset mouse interaction
            if (this.mouseInteraction) {
                this.mouseInteraction.reset();
            }

            console.log(`Successfully switched to: ${item.title}`);
        }
    }

    updateProgressDots(activeIndex) {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }

    updateInteractionArea(index) {
        const interactionArea = document.getElementById('modelInteractionArea');
        if (!interactionArea) return;

        const isMobile = window.innerWidth <= 768;
        const isContentOnLeft = (index % 2) === 0;

        if (isMobile) {
            // Hide on mobile since interaction works everywhere
            interactionArea.classList.remove('visible');
        } else {
            // Use simple class-based positioning since models are now properly positioned
            interactionArea.style.left = '';
            interactionArea.style.top = '';
            interactionArea.style.right = '';
            interactionArea.style.transform = '';

            if (isContentOnLeft) {
                // Content on left, model on right
                interactionArea.classList.remove('left');
                interactionArea.classList.add('visible');
            } else {
                // Content on right, model on left
                interactionArea.classList.add('left');
                interactionArea.classList.add('visible');
            }

            console.log(`Model ${index}: Content on ${isContentOnLeft ? 'left' : 'right'}, Model positioned on ${isContentOnLeft ? 'right' : 'left'}`);

            // Hide after 3 seconds
            setTimeout(() => {
                interactionArea.classList.remove('visible');
            }, 3000);
        }
    }

    onItemChange(newIndex) {
        // This is called by scroll handler
        this.switchToItem(newIndex);
    }

    onKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.navigateToItem(this.currentIndex - 1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateToItem(this.currentIndex + 1);
                break;
            case ' ': // Spacebar
                event.preventDefault();
                this.controls.toggleAutoRotate();
                document.getElementById('autoRotateBtn')?.classList.toggle('active');
                break;
            case 'r':
            case 'R':
                event.preventDefault();
                this.controls.resetView(this.currentIndex);
                break;
        }
    }

    onWindowResize() {
        // Update camera
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update model positions
        this.modelLoader.updateModelPositions();

        // Update controls
        this.controls.updateCameraForModel(this.currentIndex);

        // Handle scroll
        this.scrollHandler.handleScroll();
    }

    showControls() {
        const minimalControls = document.getElementById('minimalControls');
        const mouseInstructions = document.getElementById('mouseInstructions');
        const modelInfo = document.getElementById('modelInfo');
        const progressIndicator = document.getElementById('progressIndicator');

        setTimeout(() => {
            if (minimalControls) minimalControls.classList.add('visible');
            if (mouseInstructions) mouseInstructions.classList.add('visible');
            if (modelInfo) modelInfo.classList.add('visible');
            if (progressIndicator) progressIndicator.classList.add('visible');
        }, 500);

        // Create progress dots
        this.createProgressDots();

        // Set initial model info
        if (this.galleryData.length > 0) {
            this.updateModelInfo(this.galleryData[0]);
        }

        // Hide mouse instructions after 5 seconds
        setTimeout(() => {
            if (mouseInstructions) {
                mouseInstructions.classList.remove('visible');
            }
        }, 5000);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Update controls
        if (this.controls) {
            this.controls.update(delta);
        }

        // Update models
        if (this.modelLoader) {
            this.modelLoader.update(delta);
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Gallery3D();
});