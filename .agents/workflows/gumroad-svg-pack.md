---
description: How to package and sell SVG icon packs on Gumroad
---

# SVG Icon Pack Packaging Workflow

This workflow describes the standard format for creating Gumroad-ready SVG icon packs.

## Package Structure

The final ZIP should contain:

```
index.html          → Interactive preview/showcase page (self-contained)
svgs/               → Individual SVG files (static originals)
animated-draw/      → Draw animation variants (if applicable)
animated-pulse/     → Pulse animation variants (if applicable)
animated-color-cycle/ → Color cycle variants (if applicable)
```

## Showcase Page Template (`showcase.html`)

The `showcase.html` in the project root serves as the master template. Key elements:

### 1. Hero Section
- Pack name, tagline, key stats (icon count, animation count, file size, dependencies)

### 2. Customization Panel (above icon grids)
Controls that let buyers preview icons in real-time:
- **Color picker** — changes icon stroke color
- **Size slider** — adjusts icon dimensions (16px–80px)
- **Stroke width slider** — adjusts stroke weight (0.5–4)
- **Animation speed slider** — adjusts animation duration (0.25×–3×)

### 3. Animated Icon Grids
- One section per animation style (Draw, Pulse, Color Cycle, etc.)
- Each section has a **"Download All" batch button** using JSZip CDN
- Click any icon to **copy its SVG** to clipboard (toast notification)
- Replay button on hover to re-trigger animations

> **IMPORTANT**: Batch download and copy-to-clipboard MUST use the original `icons` JS object as the source of truth — NOT DOM serialization via `XMLSerializer`. DOM-injected SVGs via `innerHTML` lose their XML namespaces, causing empty/broken output. Always add `xmlns="http://www.w3.org/2000/svg"` when writing SVGs to zip files. The download anchor element must be appended to `document.body` before calling `.click()` for cross-browser compatibility.

### 4. Comparison Table
- SVG vs GIF vs Lottie vs Video (file size, scalability, dependencies, etc.)

### 5. Features Grid
- Highlight key selling points (icon count, animation styles, zero dependencies, customizable, universal support, commercial license)

### 6. Contact CTA (bottom)
Replace generic "Buy now" CTA with:
```html
<h2>Want custom SVG icons or loading animations?<br>Contact me!</h2>
```
With two call-to-action buttons:
- **Email**: `mailto:lyan123.lh@gmail.com` (accent/yellow button)
- **Telegram**: `https://t.me/typomaxx` (blue outline button with Telegram SVG icon)

### 7. Footer
```
Made with SVG Studio · Animated SVG Icons for Modern Web
```

## Build Script (`build_pack.py`)

Located at the project root. Running it:
1. Reads all SVGs from `static/` directory
2. Injects all 50 icons into the showcase template
3. Adds copy-to-clipboard functionality
4. Copies all asset directories into a temp package folder
5. Zips everything → `startup-animated-pack.zip`

```bash
python build_pack.py
```

## Key Design Tokens

```css
--bg: #09090b;
--surface: #18181b;
--accent: #E5FF00;  /* Yellow-green accent */
--blue: #4285F4;    /* Google blue */
--red: #EA4335;
--yellow: #FBBC05;
--green: #34A853;
```

## Contact Info (for all packs)
- **Email**: lyan123.lh@gmail.com
- **Telegram**: https://t.me/typomaxx
