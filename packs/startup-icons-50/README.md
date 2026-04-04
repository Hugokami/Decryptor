# 🎨 Animated SVG Icons — Startup Essential Pack

## What's Inside
```
📂 static/                  → 50 original static SVG icons
📂 animated-draw/           → 50 stroke-draw animated variants
📂 animated-pulse/          → 50 pulse/breathing animated variants
📂 animated-color-cycle/    → 50 Google-gradient color cycling variants
📂 preview/                 → Preview images and showcase
📄 showcase.html            → Interactive preview (open in browser)
```

## Quick Start

### Drop into HTML
```html
<!-- Just paste the SVG inline -->
<div class="my-icon">
  <!-- paste contents of any animated SVG file here -->
</div>
```

### Use as an image
```html
<img src="animated-draw/home.svg" alt="Home" width="24" height="24">
```

### React / Vue / Svelte
```jsx
// Import as component (with a loader like vite-plugin-svgr)
import HomeDraw from './animated-draw/home.svg?react';

function App() {
  return <HomeDraw className="w-6 h-6" />;
}
```

## Customization

### Change Colors
All icons use `currentColor` for strokes. Just set the CSS color:
```css
.my-icon { color: #ff6b6b; }
```

### Change Animation Speed
Edit the `animation` property duration in the SVG's `<style>` tag:
```css
/* Default */
animation: draw-home 2s ease-out forwards;

/* Faster */
animation: draw-home 0.8s ease-out forwards;

/* Slower */
animation: draw-home 4s ease-out forwards;
```

### Trigger on Hover Only
```css
.my-icon svg path { animation: none; }
.my-icon:hover svg path { animation: draw 1s ease-out forwards; }
```

## Icon List
home · search · user · monitor · mail · heart · clock · activity · bell · grid
*(+ 40 more in the full pack)*

## License
Commercial license included. Use in unlimited personal and commercial projects.
No attribution required. Do not redistribute or resell the pack itself.

## Support
Questions? Email: [your-email@example.com]
