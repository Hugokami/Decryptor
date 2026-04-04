const fs = require('fs');
let svg = fs.readFileSync('svgviewer.html', 'utf8');

// 1. Remove CSS
const cssStart = svg.indexOf('<style id="texGenStyles">');
if (cssStart > -1) {
    const cssEnd = svg.indexOf('</style>', cssStart) + 8;
    svg = svg.slice(0, cssStart) + svg.slice(cssEnd);
    console.log('Removed CSS');
}

// 2. Remove Button
const btnStart = svg.indexOf('<button id="texGenLaunchBtn"');
if (btnStart > -1) {
    const btnEnd = svg.indexOf('</button>', btnStart) + 9;
    svg = svg.slice(0, btnStart) + svg.slice(btnEnd);
    console.log('Removed Button');
}

// 3. Remove JS Integration
const jsStart = svg.indexOf('// --- Texture Generator Integration ---');
if (jsStart > -1) {
    const scriptEnd = svg.indexOf('</script>', jsStart);
    svg = svg.slice(0, Math.max(0, jsStart - 8)) + svg.slice(scriptEnd);
    console.log('Removed JS Integration');
}

// 4. Remove HTML App layout & everything after it till </body>
const appStart = svg.indexOf('<div id="app" class="hidden fixed inset-0');
if (appStart > -1) {
    const bodyEnd = svg.indexOf('</body>');
    if (bodyEnd > -1) {
        svg = svg.slice(0, appStart) + '\n</body>' + svg.slice(bodyEnd + 7);
        console.log('Removed HTML Overlay and associated modals');
    }
}

fs.writeFileSync('svgviewer.html', svg);
console.log('Cleanup complete.');
