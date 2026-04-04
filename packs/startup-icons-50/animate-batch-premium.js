const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(__dirname, 'static');
const DRAW_DIR = path.join(__dirname, 'animated-neon-draw');
const FLOAT_DIR = path.join(__dirname, 'animated-magnetic-float');
const HOLO_DIR = path.join(__dirname, 'animated-holographic');

// Ensure output dirs exist
[DRAW_DIR, FLOAT_DIR, HOLO_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const files = fs.readdirSync(STATIC_DIR).filter(f => f.endsWith('.svg'));
let count = 0;

files.forEach(filename => {
    const raw = fs.readFileSync(path.join(STATIC_DIR, filename), 'utf8');
    const name = path.basename(filename, '.svg');

    // 1. NEON DRAW
    fs.writeFileSync(path.join(DRAW_DIR, filename), applyNeonDraw(raw, name));

    // 2. MAGNETIC FLOAT
    fs.writeFileSync(path.join(FLOAT_DIR, filename), applyMagneticFloat(raw, name));

    // 3. HOLOGRAPHIC SWEEP
    fs.writeFileSync(path.join(HOLO_DIR, filename), applyHolographic(raw, name));

    count++;
});

console.log(`🎉 Premium Batch Complete! Generated ${count * 3} high-end animated SVGs.`);

// ═══════════════════════════════════════════════════════
//  PREMIUM ANIMATION GENERATORS
// ═══════════════════════════════════════════════════════

function applyNeonDraw(svg, name) {
    const id = `neon-${name}`;
    
    // Add CSS and SVG Filter for Neon Glow
    const defs = `
  <defs>
    <filter id="glow-${name}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <style>
    @keyframes ${id} {
      0% { stroke-dashoffset: var(--pl, 100); opacity: 0; filter: none; }
      30% { opacity: 1; }
      80% { filter: url(#glow-${name}); }
      100% { stroke-dashoffset: 0; filter: url(#glow-${name}); opacity: 1; }
    }
    #${id} path, #${id} line, #${id} polyline, #${id} polygon, 
    #${id} rect, #${id} circle, #${id} ellipse {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      animation: ${id} 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
  </style>`;

    let result = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
        attrs = attrs.replace(/\s*id="[^"]*"/, '');
        return `<svg${attrs} id="${id}">${defs}`;
    });

    result = result.replace(
        /(<(?:path|line|polyline|polygon|rect|circle|ellipse)([^>]*))(\/?>)/g,
        (match, start, attrs, end) => {
            let cleaned = attrs.replace(/\s*(fill|stroke|stroke-width)="[^"]*"/g, '');
            // Arbitrary dasharray length of 100 for now, dynamically scaled via CSS vars if JS used, but static works for SVG path lengths generally if set high enough. Using 150.
            return `${start.replace(attrs, cleaned)} style="--pl: 150; stroke-dasharray: 150; stroke-dashoffset: 150;"${end}`;
        }
    );
    return result;
}

function applyMagneticFloat(svg, name) {
    const id = `float-${name}`;
    const style = `
  <style>
    @keyframes ${id} {
      0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
      33% { transform: translateY(-4px) rotate(3deg) scale(1.05); }
      66% { transform: translateY(2px) rotate(-2deg) scale(0.98); }
    }
    #${id} {
      animation: ${id} 4s cubic-bezier(0.45, 0, 0.15, 1) infinite;
      transform-origin: center;
      overflow: visible;
    }
    #${id} * {
      stroke: currentColor;
      stroke-width: 2;
      transition: stroke 0.3s ease;
    }
  </style>`;

    return svg.replace(/<svg([^>]*)>/, (match, attrs) => {
        attrs = attrs.replace(/\s*id="[^"]*"/, '');
        return `<svg${attrs} id="${id}">${style}`;
    });
}

function applyHolographic(svg, name) {
    const id = `holo-${name}`;
    const defs = `
  <defs>
    <linearGradient id="grad-${name}" x1="0%" y1="0%" x2="200%" y2="200%">
      <stop offset="0%" stop-color="#FF0080" />
      <stop offset="33%" stop-color="#7928CA" />
      <stop offset="66%" stop-color="#4facfe" />
      <stop offset="100%" stop-color="#00f2fe" />
      <animate attributeName="x1" values="0%;-100%;0%" dur="4s" repeatCount="indefinite" />
      <animate attributeName="y1" values="0%;-100%;0%" dur="4s" repeatCount="indefinite" />
      <animate attributeName="x2" values="200%;100%;200%" dur="4s" repeatCount="indefinite" />
      <animate attributeName="y2" values="200%;100%;200%" dur="4s" repeatCount="indefinite" />
    </linearGradient>
  </defs>
  <style>
    #${id} * {
      stroke: url(#grad-${name});
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }
  </style>`;

    return svg.replace(/<svg([^>]*)>/, (match, attrs) => {
        attrs = attrs.replace(/\s*id="[^"]*"/, '');
        return `<svg${attrs} id="${id}">${defs}`;
    });
}
