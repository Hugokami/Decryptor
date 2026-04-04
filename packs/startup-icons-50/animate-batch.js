/**
 * ═══════════════════════════════════════════════════════
 *  SVG STUDIO — Batch Icon Animator
 *  Reads static SVGs from ./static/ and generates
 *  3 animated variants per icon into their folders.
 * ═══════════════════════════════════════════════════════
 *
 *  Usage: node animate-batch.js
 *
 *  Output:
 *    ./animated-draw/        → Stroke draw animation
 *    ./animated-pulse/       → Scale pulse animation
 *    ./animated-color-cycle/ → Google-gradient color cycling
 */

const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(__dirname, 'static');
const DRAW_DIR = path.join(__dirname, 'animated-draw');
const PULSE_DIR = path.join(__dirname, 'animated-pulse');
const COLOR_DIR = path.join(__dirname, 'animated-color-cycle');

// Ensure output dirs exist
[DRAW_DIR, PULSE_DIR, COLOR_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const files = fs.readdirSync(STATIC_DIR).filter(f => f.endsWith('.svg'));

if (files.length === 0) {
    console.log('⚠️  No SVG files found in ./static/');
    console.log('   Place your static SVG icons there first, then re-run.');
    process.exit(0);
}

console.log(`\n🎨 SVG Studio Batch Animator`);
console.log(`   Found ${files.length} static SVGs\n`);

let count = 0;

files.forEach(filename => {
    const raw = fs.readFileSync(path.join(STATIC_DIR, filename), 'utf8');
    const name = path.basename(filename, '.svg');

    // ── 1. DRAW ANIMATION ──
    // Adds stroke-dasharray/dashoffset animation to all paths
    const drawSvg = applyDrawAnimation(raw, name);
    fs.writeFileSync(path.join(DRAW_DIR, filename), drawSvg);

    // ── 2. PULSE ANIMATION ──
    // Adds a gentle scale pulse via CSS animation
    const pulseSvg = applyPulseAnimation(raw, name);
    fs.writeFileSync(path.join(PULSE_DIR, filename), pulseSvg);

    // ── 3. COLOR CYCLE ANIMATION ──
    // Adds SMIL <animate> tags for Google-gradient color cycling
    const colorSvg = applyColorCycleAnimation(raw, name);
    fs.writeFileSync(path.join(COLOR_DIR, filename), colorSvg);

    count++;
    console.log(`   ✅ ${filename} → 3 variants`);
});

console.log(`\n🎉 Done! Generated ${count * 3} animated SVGs from ${count} originals.\n`);


// ═══════════════════════════════════════════════════════
//  ANIMATION GENERATORS
// ═══════════════════════════════════════════════════════

function applyDrawAnimation(svg, name) {
    const id = `draw-${name}`;
    
    // Inject CSS keyframes for stroke draw
    const style = `
<style>
  @keyframes ${id} {
    0% { stroke-dashoffset: var(--path-length); opacity: 0.3; }
    10% { opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: 1; }
  }
  #${id} path, #${id} line, #${id} polyline, #${id} polygon, 
  #${id} rect, #${id} circle, #${id} ellipse {
    stroke: currentColor;
    stroke-width: 1.5;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: ${id} 2s ease-out forwards;
  }
</style>`;

    // Add id to root svg and inject style + dasharray script
    let result = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
        // Remove existing id if present
        attrs = attrs.replace(/\s*id="[^"]*"/, '');
        return `<svg${attrs} id="${id}">${style}`;
    });

    // Add a script that sets dasharray on load
    const script = `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('${id}');
    if (!svg) return;
    svg.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse').forEach(el => {
      try {
        const len = el.getTotalLength ? el.getTotalLength() : 300;
        el.style.setProperty('--path-length', len);
        el.style.strokeDasharray = len;
        el.style.strokeDashoffset = len;
      } catch(e) {}
    });
  });
<\/script>`;

    // For inline use (no script needed), use a fixed dasharray approach
    // Replace all paths with stroke-dasharray attributes
    result = result.replace(
        /(<(?:path|line|polyline|polygon|rect|circle|ellipse)([^>]*))(\/?>)/g,
        (match, start, attrs, end) => {
            // Remove existing fill, add stroke props
            let cleaned = attrs
                .replace(/\s*fill="[^"]*"/g, '')
                .replace(/\s*stroke="[^"]*"/g, '')
                .replace(/\s*stroke-width="[^"]*"/g, '');
            return `${start.replace(attrs, cleaned)} fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="500" stroke-dashoffset="500" style="animation: ${id} 2s ease-out forwards"${end}`;
        }
    );

    return result;
}


function applyPulseAnimation(svg, name) {
    const id = `pulse-${name}`;
    
    const style = `
<style>
  @keyframes ${id} {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  #${id} {
    animation: ${id} 2s ease-in-out infinite;
    transform-origin: center center;
    transform-box: fill-box;
  }
</style>`;

    let result = svg.replace(/<svg([^>]*)>/, (match, attrs) => {
        attrs = attrs.replace(/\s*id="[^"]*"/, '');
        return `<svg${attrs} id="${id}">${style}`;
    });

    return result;
}


function applyColorCycleAnimation(svg, name) {
    // Google/Antigravity gradient values
    const colors = '#4285F4;#EA4335;#FBBC05;#34A853;#4285F4;#34A853;#FBBC05;#EA4335;#4285F4';
    
    // Inject <animate> tags into each shape element
    let result = svg.replace(
        /(<(?:path|rect|circle|ellipse|polygon|polyline|text|tspan)([^>]*?))(\/?>)/g,
        (match, start, attrs, end) => {
            const hasFill = /fill="(?!none)/.test(attrs);
            const hasStroke = /stroke="(?!none)/.test(attrs);
            
            let animTags = '';
            
            if (hasStroke) {
                animTags += `<animate attributeName="stroke" values="${colors}" dur="3s" repeatCount="indefinite"/>`;
            }
            if (hasFill || (!hasFill && !hasStroke)) {
                animTags += `<animate attributeName="fill" values="${colors}" dur="3s" repeatCount="indefinite"/>`;
            }
            
            if (end === '/>') {
                // Self-closing tag — need to convert to open/close
                return `${start}>${animTags}</${start.match(/<(\w+)/)[1]}>`;
            } else {
                return `${start}${end}${animTags}`;
            }
        }
    );

    return result;
}
