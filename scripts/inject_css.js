const fs = require('fs');
let svg = fs.readFileSync('svgviewer.html', 'utf8');

const styles = `
    <style id="texGenStyles">
        /* === TEXTURE GENERATOR ENGINE Y2K STYLES === */
        #layer-panel, #left-panel, #right-panel, #thumbnail-panel {
            background: #111;
            border-right: 2px solid #333;
            border-left: 2px solid #333;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
        }
        #layer-panel { min-width: 70px; max-width: 70px; align-items: center; padding-top: 10px; }
        #left-panel { min-width: 300px; }
        #right-panel { min-width: 320px; }
        #thumbnail-panel { min-width: 140px; display: none; } /* Hide thumbnail panel for cleaner look */

        #center-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #050505;
        }

        #top-panel {
            display: flex;
            gap: 8px;
            padding: 10px;
            border-bottom: 2px solid #333;
            background: #111;
            flex-wrap: wrap;
        }

        #top-panel button {
            background: transparent !important;
            border: 2px solid #666;
            color: #ccc;
            padding: 4px 12px;
            font-family: 'Nippo', sans-serif;
            font-size: 11px;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.2s;
        }
        #top-panel button:hover {
            border-color: #E5FF00;
            color: #E5FF00;
        }

        #canvas-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
        }

        #preview-canvas-container {
            position: relative;
            box-shadow: 0 0 40px rgba(229, 255, 0, 0.1);
            border: 2px solid #333;
        }

        #preview-canvas {
            display: block;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="10" height="10" fill="%231a1a1a"/><rect x="10" y="10" width="10" height="10" fill="%231a1a1a"/><rect x="10" width="10" height="10" fill="%23222"/><rect y="10" width="10" height="10" fill="%23222"/></svg>');
        }

        #canvas-overlay {
            position: absolute;
            bottom: -25px;
            left: 0;
            right: 0;
            text-align: center;
            color: #666;
            font-family: 'Nippo', sans-serif;
            font-size: 10px;
            letter-spacing: 2px;
        }

        /* Generated GUI Controls within left/right panels */
        #gui-left, #gui-right, #gradient-section {
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .category-header {
            font-family: 'Nippo', sans-serif;
            font-size: 12px;
            color: #E5FF00;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .gui-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 11px;
            color: #ccc;
        }

        .gui-row label {
            width: 80px;
            font-family: 'Nippo', sans-serif;
        }

        .gui-row input[type="range"] {
            flex: 1;
            accent-color: #E5FF00;
        }

        .gui-row input[type="number"], .gui-row select {
            width: 70px;
            background: #000;
            color: #E5FF00;
            border: 1px solid #333;
            padding: 4px;
            font-family: monospace;
            text-align: right;
            outline: none;
        }
        
        .gui-row input[type="color"] {
            background: transparent;
            border: 1px solid #333;
            width: 30px;
            height: 30px;
            padding: 0;
            cursor: pointer;
        }

        /* Layer Panel Styles */
        .layer-item {
            width: 50px;
            height: 50px;
            margin-bottom: 10px;
            border: 2px solid #333;
            background: #000;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .layer-item.active {
            border-color: #E5FF00;
            box-shadow: 0 0 10px rgba(229,255,0,0.3);
        }
        .layer-item:hover {
            border-color: #aaa;
        }
        .layer-thumb {
            width: 100%;
            height: 100%;
            display: block;
        }
        .layer-add-btn {
            background: transparent;
            border: 2px dashed #666;
            color: #666;
            width: 50px;
            height: 50px;
            font-size: 24px;
            cursor: pointer;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .layer-add-btn:hover {
            border-color: #E5FF00;
            color: #E5FF00;
        }

        /* Texture Grid Modal specific to TextureCreate */
        .modal-overlay {
            position: absolute; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 200;
        }
        #texture-grid-modal .modal-content {
            background: #111;
            border: 2px solid #E5FF00;
            width: 90vw;
            height: 90vh;
            display: flex;
            flex-direction: column;
        }
        #texture-grid-modal .modal-header {
            padding: 15px;
            border-bottom: 2px solid #333;
            display: flex;
            justify-content: space-between;
            color: #E5FF00;
            font-family: 'Nippo', sans-serif;
            text-transform: uppercase;
            font-weight: bold;
        }
        #modal-close-btn { background:none; border:none; color:#ef4444; cursor:pointer; font-size: 20px; }
        #texture-grid-modal .modal-body {
            flex: 1;
            overflow-y: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
            padding: 20px;
        }
        .type-thumbnail {
            background: #000;
            border: 2px solid #333;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
        }
        .type-thumbnail:hover {
            border-color: #E5FF00;
            transform: scale(1.05);
            z-index: 10;
        }
        .type-thumbnail canvas {
            width: 100%;
            aspect-ratio: 1/1;
            display: block;
            border-bottom: 1px solid #333;
        }
        .type-thumbnail-label {
            text-align: center;
            padding: 8px 5px;
            font-size: 11px;
            font-family: 'Nippo', sans-serif;
            color: #ccc;
        }
        /* Color Ramp Editor */
        #gradient-editor-area {
            position: relative;
            height: 80px;
            background: #000;
            border: 1px solid #333;
            margin-top: 10px;
            cursor: crosshair;
        }
        .grad-stop {
            position: absolute;
            top: -5px;
            width: 10px;
            height: calc(100% + 10px);
            border: 2px solid #fff;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            cursor: ew-resize;
            transform: translateX(-5px);
        }
        .grad-stop.active {
            border-color: #E5FF00;
        }
        .preset-controls { display: flex; gap: 10px; align-items: center; }
        .preset-btn { background: #222 !important; border-color: #555 !important; }
    </style>
`;

if (!svg.includes('id="texGenStyles"')) {
    svg = svg.replace('</head>', styles + '\n</head>');
    fs.writeFileSync('svgviewer.html', svg);
    console.log('CSS Injection successful');
} else {
    console.log('CSS already injected');
}
