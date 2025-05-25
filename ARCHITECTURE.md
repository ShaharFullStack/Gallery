# 3D Gallery Architecture Documentation

## Project Overview

A modern, interactive 3D gallery built with vanilla JavaScript and Three.js that displays artwork in a museum-like environment. Features direct mouse interaction with 3D models, dynamic spotlights, and a clean UI for navigation.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 modules)
- **3D Engine**: Three.js v0.159.0
- **Styling**: CSS3 with custom properties and modern features
- **Configuration**: JSON-based data management
- **Browser Support**: Modern browsers with ES6 module support

---

## Project Structure

```
3d-gallery/
├── index.html                 # Main HTML entry point
├── css/
│   └── styles.css            # Complete stylesheet with responsive design
├── js/
│   ├── main.js              # Application orchestrator and initialization
│   ├── modelLoader.js       # 3D model management and spotlights
│   ├── scrollHandler.js     # Scroll detection and navigation
│   ├── controls.js          # Camera controls and auto-rotation
│   ├── uiManager.js         # UI feedback and error handling
│   └── mouseInteraction.js  # Direct model mouse/touch interaction
└── urls.json                # Gallery data and configuration
```

---

## Core Architecture

### Module Dependencies

```
main.js
├── modelLoader.js
├── scrollHandler.js
├── controls.js
├── uiManager.js
└── mouseInteraction.js
```

### Data Flow

```
JSON Config → Main → ModelLoader → Three.js Scene
              ↓
         ScrollHandler ← → UIManager
              ↓
         MouseInteraction ← → Controls
```

---

## File-by-File Analysis

### 1. `index.html`
**Purpose**: Application shell and Three.js setup

**Key Features**:
- Three.js import map configuration
- Responsive viewport settings
- Minimal UI elements (progress dots, model info, controls)
- Canvas element for 3D rendering

**Elements**:
- `#main-three-canvas`: Three.js rendering surface
- `#gallery-container`: Scrollable content panels
- `#modelControls`: Auto-rotate and reset buttons
- `#progressDots`: Navigation indicators
- `#modelInfo`: Current artwork information display

### 2. `css/styles.css`
**Purpose**: Complete styling with responsive design

**Key Features**:
- CSS custom properties for theming
- Glass morphism effects with backdrop-filter
- Responsive breakpoints (768px, 480px)
- Smooth animations and transitions
- Z-index layering system

**Critical CSS Classes**:
- `.gallery-item`: Individual artwork sections
- `.content-left/.content-right`: Alternating layout
- `.model-interaction-area`: Interaction hints
- `.progress-dot`: Navigation elements

**Known Issues**:
- Fixed positioning for interaction areas doesn't align with dynamic model positions
- Responsive design could be improved for ultra-wide screens

### 3. `js/main.js`
**Purpose**: Application orchestrator and lifecycle management

**Key Functions**:

```javascript
class Gallery3D {
  constructor()              // Initialize application
  async init()              // Load config and setup modules
  async loadConfiguration() // Fetch urls.json
  initScene()              // Setup Three.js scene
  setupLighting()          // Configure scene lighting
  createGalleryHTML()      // Generate content panels
  async loadModels()       // Load all 3D models
  setupEventListeners()    // Bind UI events
  onItemChange(index)      // Handle navigation events
  switchToItem(index)      // Switch active model/content
  updateModelInfo(item)    // Update info panel
  updateProgressDots(index) // Update navigation indicators
  updateInteractionArea(index) // Position interaction hints
  animate()                // Main render loop
}
```

**Responsibilities**:
- Configuration loading from JSON
- Module initialization and coordination
- Scene setup (camera, renderer, lighting)
- Event handling and UI updates
- Main animation loop orchestration

**Issues Handled**:
- ✅ Module coordination
- ✅ Error handling during initialization
- ✅ Responsive window resizing
- ✅ Navigation state management

**Issues Not Handled**:
- ❌ Model position calculation accuracy
- ❌ Performance optimization for many models
- ❌ Memory cleanup on navigation

### 4. `js/modelLoader.js`
**Purpose**: 3D model management and spotlight system

**Key Functions**:

```javascript
class ModelLoader {
  constructor(scene, renderer, camera)
  calculateSceneLayout(totalModels)     // Dynamic spacing calculation
  calculateModelPosition(index)        // Per-model positioning
  calculateModelScale(originalScale, index) // Dynamic scaling
  async loadModel(item, index)         // Load individual GLB models
  processModel(gltf, item, index)      // Setup materials and positioning
  setupModelMaterials(model, modelId)  // Enhanced material properties
  createSpotlightForModel(model, modelId, index) // Dynamic lighting
  positionModel(model, modelId, index) // 3D positioning logic
  showModel(modelId, index)            // Switch active model
  updateModelPositions()               // Responsive repositioning
  activateSpotlight(modelId)           // Spotlight management
  animateSpotlights(delta)            // Smooth light transitions
  update(delta)                       // Animation loop updates
}
```

**Spotlight System**:
- Individual colored spotlights per model
- Dynamic intensity transitions
- Shadow mapping enabled
- Pulsing animation for active lights

**Model Management**:
- GLB file loading with progress tracking
- Material enhancement (metalness, roughness)
- Dynamic scaling based on model count
- Position calculation with Y/Z variations

**Issues Handled**:
- ✅ Progressive model loading
- ✅ Material optimization
- ✅ Spotlight animations
- ✅ Memory management for models

**Issues Not Handled**:
- ❌ **CRITICAL: Model positioning calculation is incorrect** - X offset values don't translate to expected screen positions
- ❌ Large model optimization
- ❌ Model LOD (Level of Detail) system
- ❌ Texture compression

### 5. `js/scrollHandler.js`
**Purpose**: Scroll-based navigation using Intersection Observer

**Key Functions**:

```javascript
class ScrollHandler {
  constructor(galleryData, onItemChange)
  initializeIntersectionObserver()     // Setup viewport detection
  observeGalleryItems()               // Attach observers to elements
  handleIntersection(entries)        // Process visibility changes
  setActiveItem(index)               // Update active state
  updateScrollProgress()             // Progress indicator
  scrollToItem(index)               // Programmatic navigation
  navigatePrevious/Next()           // Keyboard navigation
  setupTouchGestures()              // Mobile swipe support
}
```

**Navigation Logic**:
- Intersection Observer for efficient scroll detection
- Visibility-based active item calculation
- Smooth scrolling with easing
- Touch gesture support for mobile

**Issues Handled**:
- ✅ Efficient scroll detection
- ✅ Mobile touch gestures
- ✅ Smooth navigation
- ✅ Keyboard accessibility

**Issues Not Handled**:
- ❌ Complex scroll momentum
- ❌ Snap-to-item behavior
- ❌ Virtual scrolling for many items

### 6. `js/controls.js`
**Purpose**: Camera controls and auto-rotation

**Key Functions**:

```javascript
class Controls {
  constructor(camera, renderer, modelLoader)
  setupOrbitControls()              // Three.js OrbitControls setup
  setupTouchControls()             // Enhanced mobile support
  setupKeyboardControls()          // Keyboard shortcuts
  toggleAutoRotate()               // Auto-rotation toggle
  zoom(delta)                      // Manual zoom controls
  rotate(angle)                    // Manual rotation
  resetView(currentIndex)          // Reset to optimal position
  updateCameraForModel(modelIndex) // Follow model switching
  animateCameraTo(position, target) // Smooth camera transitions
}
```

**Camera System**:
- OrbitControls with custom limitations
- Auto-rotation with variable speed
- Smooth camera transitions between models
- Mobile-optimized touch controls

**Issues Handled**:
- ✅ Smooth camera animations
- ✅ Mobile touch optimization
- ✅ Auto-rotation management
- ✅ View reset functionality

**Issues Not Handled**:
- ❌ Advanced camera paths
- ❌ Cinematic camera movements
- ❌ Focus pulling between models

### 7. `js/uiManager.js`
**Purpose**: User interface feedback and state management

**Key Functions**:

```javascript
class UIManager {
  constructor()
  showLoading()                    // Loading screen management
  hideLoading()                   // Remove loading overlay
  updateProgress(percentage)      // Progress bar updates
  showError(message, type, duration) // Error notifications
  showSuccess(message, duration)  // Success feedback
  setButtonActive(buttonId, active) // Button state management
  announce(message, priority)     // Accessibility announcements
  trackPerformance(action, time)  // Performance monitoring
}
```

**UI Features**:
- Loading states with progress tracking
- Error queue management
- Success/warning notifications
- Accessibility support
- Performance monitoring

**Issues Handled**:
- ✅ User feedback systems
- ✅ Error state management
- ✅ Loading indicators
- ✅ Accessibility features

**Issues Not Handled**:
- ❌ Advanced notification system
- ❌ Undo/redo functionality
- ❌ User preferences storage

### 8. `js/mouseInteraction.js`
**Purpose**: Direct model interaction via mouse/touch

**Key Functions**:

```javascript
class MouseInteraction {
  constructor(camera, renderer, scene, modelLoader, onModelInteract)
  setupEventListeners()           // Mouse/touch event binding
  performRaycast()               // 3D object intersection
  findModelIdFromObject(object)  // Object to model mapping
  onMouseMove(event)             // Hover detection
  onMouseDown/Up(event)          // Click handling
  rotateActiveModel(deltaX, deltaY) // Direct model rotation
  onMouseWheel(event)            // Zoom on hover
  setHovering(isHovering, point) // Hover feedback
  updateInteractionHint()        // UI state updates
}
```

**Interaction Features**:
- Raycasting for precise model detection
- Direct model rotation via mouse drag
- Zoom-to-cursor functionality
- Visual hover feedback
- Touch gesture support

**Issues Handled**:
- ✅ Precise model detection
- ✅ Smooth rotation controls
- ✅ Mobile touch support
- ✅ Visual feedback

**Issues Not Handled**:
- ❌ Multi-model interaction
- ❌ Advanced gestures (pinch-to-rotate)
- ❌ Interaction history/recording

### 9. `urls.json`
**Purpose**: Gallery configuration and data

**Structure**:
```json
{
  "galleryItems": [
    {
      "id": "unique-identifier",
      "title": "Artwork Title",
      "description": "Detailed description",
      "imageUrl": "preview-image.jpg",
      "modelUrl": "model-file.glb",
      "modelScale": [x, y, z],
      "artist": "Artist Name",
      "year": "Creation Year",
      "material": "Material Type",
      "technique": "Creation Technique"
    }
  ],
  "settings": {
    "autoRotateSpeed": 0.5,
    "cameraDistance": 7,
    "modelXOffset": 4,
    "lightingIntensity": {...},
    "spotlightConfig": {...},
    "animations": {...},
    "controls": {...}
  }
}
```

---

## Critical Issues

### 🚨 **URGENT: Model Positioning Problem**

**Issue**: Models are not positioned at the expected screen locations despite increased X offset values.

**Root Cause Analysis**:
1. **Camera Projection**: The relationship between world coordinates and screen coordinates may not be linear
2. **Camera Distance**: Models at X=12 might be outside the camera's field of view
3. **Scene Scale**: The entire scene might need rescaling rather than just X offsets
4. **Projection Matrix**: Camera aspect ratio and FOV affecting visible range

**Potential Solutions**:
```javascript
// Option 1: Calculate proper X position based on camera FOV
const fov = camera.fov * Math.PI / 180;
const distance = camera.position.z;
const maxX = Math.tan(fov / 2) * distance;
const targetX = maxX * 0.8; // 80% to screen edge

// Option 2: Use screen-space positioning
const screenEdge = window.innerWidth * 0.1; // 10% from edge
const worldPosition = screenToWorld(screenEdge, camera);

// Option 3: Dynamic camera distance
adjustCameraDistance(numberOfModels);
```

**Testing Needed**:
- Verify model visibility at different X offsets
- Test camera FOV impact on positioning
- Validate responsive behavior

---

## Performance Considerations

### Current Optimizations
- ✅ Model LOD system ready
- ✅ Efficient scroll detection with Intersection Observer
- ✅ Conditional spotlight updates
- ✅ Material instance management

### Performance Bottlenecks
- ❌ No frustum culling for models
- ❌ Shadow map updates for all lights
- ❌ No texture compression
- ❌ Full scene re-render on every frame

### Recommended Optimizations
```javascript
// Frustum culling
if (!camera.frustum.intersectsBox(model.boundingBox)) {
  model.visible = false;
}

// Adaptive quality
const pixelRatio = window.devicePixelRatio > 1 ? 1.5 : 1;
renderer.setPixelRatio(Math.min(pixelRatio, 2));

// Texture compression
if (renderer.extensions.get('WEBGL_compressed_texture_s3tc')) {
  // Use compressed textures
}
```

---

## Browser Compatibility

### Supported Features
- ✅ ES6 Modules
- ✅ WebGL 2.0
- ✅ Intersection Observer
- ✅ CSS Custom Properties
- ✅ Backdrop Filter

### Fallbacks Needed
- ❌ WebGL 1.0 compatibility
- ❌ Intersection Observer polyfill
- ❌ CSS Grid fallbacks

---

## Future Features

### Near-term (Next Sprint)
1. **Fix Model Positioning** 🚨
   - Implement proper world-to-screen coordinate mapping
   - Add camera-aware positioning system
   - Test with various screen sizes

2. **Enhanced Interaction**
   - Multi-finger rotation on mobile
   - Model annotation system
   - Virtual museum mode

3. **Performance Improvements**
   - Implement frustum culling
   - Add texture compression
   - Optimize shadow mapping

### Medium-term (Next Quarter)
1. **Advanced Features**
   - VR/AR support preparation
   - Audio integration
   - Model animations
   - Environment mapping

2. **Content Management**
   - Admin panel for model uploads
   - Dynamic model replacement
   - Content versioning

3. **Analytics**
   - User interaction tracking
   - Performance monitoring
   - A/B testing framework

### Long-term (6+ Months)
1. **Platform Expansion**
   - Mobile app version
   - WebXR integration
   - Social sharing features

2. **AI Integration**
   - Automatic model positioning
   - Content recommendations
   - Voice interaction

3. **Advanced Rendering**
   - Real-time ray tracing
   - Advanced material system
   - Procedural environments

---

## Development Guidelines

### Code Style
- ES6+ features encouraged
- Modular architecture maintained
- Comprehensive error handling
- Performance-conscious development

### Testing Strategy
- Manual testing on multiple devices
- Performance profiling required
- Accessibility compliance
- Cross-browser validation

### Deployment
- Static file hosting compatible
- CDN-friendly asset structure
- Progressive loading support
- Offline capability planning

---

## Getting Started for New Developers

1. **Setup**: Serve files via HTTP (required for ES6 modules)
2. **Debug**: Check browser console for model loading progress
3. **Test**: Try interaction on desktop and mobile
4. **Modify**: Update `urls.json` for new content
5. **Position Debug**: Use console logs in `modelLoader.js` to track actual vs expected positions

### Debug Commands
```javascript
// In browser console
gallery.modelLoader.listModels()          // Show all loaded models
gallery.modelLoader.calculateSceneLayout(8) // Test layout calculation
gallery.currentIndex                       // Check active model
```

---

## Known Limitations

1. **Model Format**: Only GLB/GLTF supported
2. **File Size**: No progressive loading for large models
3. **Interaction**: Limited to rotation and zoom
4. **Browser**: Requires modern browser with WebGL 2.0
5. **Positioning**: Critical positioning calculation bug needs immediate attention

---

*Last Updated: Current Development Session*
*Next Priority: Fix model positioning calculation*