# INDUSTRIAL DECRYPTOR // SVG STUDIO GUIDE

Welcome to the **SVG Studio Industrial Decryptor** upgrade. This guide details every advanced feature of the tool, designed for high-ticket Web3 asset generation.

---

## 1. TYPOGRAPHY & AESTHETIC
The tool uses the **Moon Walk** custom font globally.
- **Palette**: Obsidian (#050505) and Theme Lime (#E5FF00).
- **Brutalist Design**: 0px border radii, sharp geometry, and high-contrast technical labels.

## 2. ANIMATION ENGINE
The center of the tool is the Animation tab, offering three types of injections:

### A. Core Animations (GSAP & CSS)
- **Spin**: 360-degree rotation. Perfect for tokens and gears.
- **Pulse**: Scaling effect for attention-grabbing elements.
- **Float**: Smooth vertical hovering.
- **Shake**: High-frequency horizontal vibration.
- **Breathe**: Subtle opacity pulsing.

### B. Color Cycle (Stroke & Fill Sensitive)

- **Automated Targeting**: The tool detects if an element has a `fill` or `stroke` before applying colors.
- **Targeting**: Only elements with visible properties are animated, preventing transparent icons from gaining unwanted fills.

### C. Step-Motion Mode (Mechanical Easing)

- **Toggle**: Found in Animation Settings.
- **Step Count Slider**: Adjust from 2 to 20 steps. 
- **Effect**: This overrides standard smooth easing with discrete increments, creating a "stop-motion" or mechanical jerky movement ideal for technical assets.

### D. Advanced Stroke Animations (Fidelity-Ready)

- **Fidelity Draw**: Preserves original stroke colors, weights, and fills while performing the drawing effect.
- **Fidelity Draw & Erase**: A cyclical draw-in/erase-out animation that respects original styling.
- **Trace Glow**: Overlays a moving high-intensity light segment along the path without hiding the base stroke.
- **Electric Pulse**: High-frequency flickering and jittery dash for "damaged" or "high-voltage" looks.

---

## 3. TECHNICAL HUD OVERLAYS (TOOLS TAB)
Inject aesthetic technical markers around your selection using the **TECHNICALIZE SELECTION** button.

### Variations:
1. **Full Protocol**: Injects framing corners, a dotted boundary frame, and technical ID labels (`[PROTOCOL_ID:XXX]`).
2. **Corners Only**: Minimalist L-shape framing markers.
3. **Dashed Frame**: A simple 1px dashed boundary rectangle (#E5FF00).
4. **Compact Label**: Smaller ID tags and micro-corners for detailed icon sets.
5. **Target Radar**: Adds a circular radar frame with a static crosshair line for a "scanning" look.

---

## 4. PREMIUM BACKGROUND PRESETS
Select backgrounds in the Tools tab to showcase your work in context:
- **Obsidian Carbon**: Diagonal industrial stripes.
- **Radar Decryptor**: Repeating conic gradients with a radial glow.
- **Tech Blueprint**: High-precision grid with a technical blue/lime tint.
- **Lime Matrix**: Dark canvas with subtle lime dot patterns.

---

## 5. PERFORMANCE OPTIMIZATION
The editor is built to handle massive SVG files (1MB+) without crashing.
- **Adaptive Debounce**:
    - Small files update the preview in **200ms**.
    - Larger files (>100KB) trigger a **1s** or **2s** debounce to prevent UI stuttering.
- **Format & Minify**: Use the top-bar tools to clean your code before exporting for Web3 dApps.

---

## 6. PRO TIPS & ADVANCED MANIPULATION

- **Transform-Origin Mastery**: Use the `Origin` dropdown to set the rotation axis. "Manual" allows you to click the preview to set a custom pivot point.
- **Group Hierarchy**: When "Wrapping" elements for animations, the tool creates a `<g>` wrapper. If your SVG is already heavily nested, use the "Format" tool first to stabilize the DOM.
- **Live Preview Sync**: The "SYNC" button ensures the CodeMirror editor perfectly matches the latest state of the interactive preview, pulling in any programmatic ID shifts or transform applications.

---

## 7. WORKFLOW: CREATING A WEB3 TECHNICAL TOKEN

Follow these steps to produce a premium animated asset:

1. **Import Base**: Paste your token SVG into the Code editor.
2. **Industrialize**: Select the main token shape and click **TECHNICALIZE SELECTION** (Full Protocol) in the Tools tab.
3. **Step-Motion Entry**:
    - Go to the Animation tab.
    - Enable **Step-Motion Mode**.
    - Set **Step Count** to 8.
    - Click **Spin**.
4. **Environment Context**: Select the **Radar Decryptor** background in the Tools tab.
5. **Final Export**: Use the top-bar **MINIFY** tool, then **Copy SVG** for your dApp.

---

## 8. TROUBLESHOOTING PROTOCOLS

- **Animation not starting?**: Ensure your element has a unique `id`. The tool's "Auto-ID" feature will fix this on your first animation apply.
- **Color Cycle ignoring fills?**: Our engine uses *Computed Style Recognition*. If an element doesn't have an explicit `fill` (and isn't inheriting one), the animation won't target it to protect your designs from "bloating".
- **Performance Lag?**: If working with files >1MB, the adaptive debounce will kick in. Wait for the "READY" indicator in the status bar before making further edits.
