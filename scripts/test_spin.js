const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('c:/Users/lyan1/Documents/texture/svgviewer.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

dom.window.addEventListener('load', () => {
    try {
        console.log("Window loaded");
        // We know applyLiveAnimation is bound to the animType. Let's select it and trigger input.
        const typeSelect = dom.window.document.getElementById('animType');
        typeSelect.value = 'spin';
        const event = new dom.window.Event('input', { bubbles: true });
        typeSelect.dispatchEvent(event);
        console.log("Spin triggered successfully");
    } catch(err) {
        console.error("Error triggered:", err);
    }
});
