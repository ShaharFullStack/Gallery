# 3D Interactive Gallery

A modern, interactive 3D gallery built with Three.js that displays artwork in a museum-like environment with direct mouse interaction and dynamic lighting.

## ✨ Features

- **Direct Model Interaction** - Click and drag 3D models to rotate them
- **Dynamic Spotlights** - Each artwork has its own colored spotlight
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Smooth Navigation** - Scroll or click dots to browse artworks
- **Auto-rotation** - Models rotate automatically when not being interacted with
- **Clean UI** - Minimal interface that doesn't distract from the art

## 🚀 Quick Start

1. **Serve the files** (required for ES6 modules):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

2. **Open in browser**: `http://localhost:8000`

3. **Interact**:
   - Scroll to navigate between artworks
   - Click and drag on 3D models to rotate them
   - Use mouse wheel to zoom when hovering over models
   - Click progress dots for direct navigation

## 📁 Project Structure

```
├── index.html              # Main application
├── css/styles.css          # Responsive styling
├── js/
│   ├── main.js            # Application core
│   ├── modelLoader.js     # 3D model & lighting management
│   ├── scrollHandler.js   # Navigation logic
│   ├── controls.js        # Camera controls
│   ├── uiManager.js       # User interface
│   └── mouseInteraction.js # Direct model interaction
└── urls.json              # Gallery configuration
```

## ⚙️ Configuration

Edit `urls.json` to add your own 3D models and content:

```json
{
  "galleryItems": [
    {
      "id": "unique-id",
      "title": "Artwork Title",
      "description": "Description text",
      "imageUrl": "preview.jpg",
      "modelUrl": "model.glb",
      "modelScale": [3.5, 3.5, 3.5],
      "artist": "Artist Name",
      "year": "2024"
    }
  ]
}
```

## 🎮 Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Navigate | Scroll or arrow keys | Scroll or swipe |
| Rotate model | Click & drag on model | Touch & drag on model |
| Zoom | Mouse wheel on model | Pinch gesture |
| Auto-rotate | Click 🔄 button | Click 🔄 button |
| Reset view | Click 🎯 button | Click 🎯 button |

## 🔧 Requirements

- **Modern browser** with WebGL 2.0 support
- **HTTP server** (required for ES6 modules)
- **3D models** in GLB/GLTF format

## 📱 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 🐛 Known Issues

- Model positioning calculation needs refinement for extreme side placement
- Performance optimization needed for 10+ models
- No fallback for WebGL 1.0 browsers

## 📄 License

Open source - feel free to use and modify for your projects.

## 🤝 Contributing

See `ARCHITECTURE.md` for detailed technical documentation and development guidelines.