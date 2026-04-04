const fs = require('fs');
let html = fs.readFileSync('svgviewer.html', 'utf8');

// The block to extract
const startMarker = '<div id="animateDropdown"';
const endMarker = '</div>\n                    <div class="w-px h-4 bg-border mx-1"></div>\n                    <button id="stripAllAnimBtn"';

const startIdx = html.indexOf(startMarker);
// Find the exact end of animateDropdown
const blockSubstring = html.slice(startIdx, Math.min(startIdx + 10000, html.length));
// The animateDropdown contains exactly 1 big div. We can simply substring it reliably by looking at the inner HTML
let extractedBlock = '';

// Another way: we know it ends right before `<div class="w-px h-4 bg-border mx-1"></div>` and `stripAllAnimBtn`
const cutEndIndicator = '<div class="relative inline-block text-left">';
const cutStart = html.lastIndexOf(cutEndIndicator, startIdx); // start of the wrapper
const cutEnd = html.indexOf('<div class="w-px h-4 bg-border mx-1"></div>', startIdx);

if (cutStart > -1 && cutEnd > -1) {
    const rawWrapper = html.slice(cutStart, cutEnd);
    // Extract everything inside animateDropdown
    const dropStart = rawWrapper.indexOf('<div id="animateDropdown"');
    extractedBlock = rawWrapper.slice(dropStart);
    // Remove the wrapper div's closing tag
    extractedBlock = extractedBlock.replace(/<\/div>\s*$/, '');
    
    // Remove it from the main HTML
    html = html.slice(0, cutStart) + html.slice(cutEnd);
    console.log("Extracted animation block from toolbar");
}

// Now insert it into tab-animations
const tabMarker = '<div id="tab-animations" class="left-tab-content hidden flex-1 flex flex-col min-h-0 bg-panel p-2">';
const tabStart = html.indexOf(tabMarker);
if (tabStart > -1 && extractedBlock) {
    // Strip the "absolute left-0 mt-2 w-64 shadow-2xl z-50 hidden" classes from animateDropdown
    extractedBlock = extractedBlock.replace('hidden absolute left-0 mt-2 w-64 shadow-2xl bg-panel border border-border focus:outline-none z-50', 'flex-col gap-3');
    extractedBlock = extractedBlock.replace('id="animateDropdown"', 'id="animateSettingsPanel"');
    
    const insertPos = tabStart + tabMarker.length;
    html = html.slice(0, insertPos) + '\n<!-- Relocated Animation Settings -->\n' + extractedBlock + html.slice(insertPos);
    console.log("Inserted animation block into tab-animations");
}

fs.writeFileSync('svgviewer.html', html);
