const fs = require('fs');
let svg = fs.readFileSync('svgviewer.html', 'utf8');
const tex = fs.readFileSync('texture_create_source.html', 'utf8');
const bodMatch = tex.match(/<body>([\s\S]*?)<\/body>/);
let html = bodMatch[1];

html = html.replace('<div id="app">', `<div id="app" class="hidden fixed inset-0 z-[100] bg-bg flex-col font-sans text-gray-100">
  <header class="flex justify-between items-center px-4 py-0 bg-panel border-b-2 border-border shrink-0 h-12">
    <div class="flex items-center gap-4">
      <span class="text-accent text-lg">■</span>
      <span class="font-display text-sm font-bold tracking-wider text-white uppercase">TEXTURE GENERATOR</span>
    </div>
    <div class="flex gap-2">
      <button id="texApplyToSvgBtn" class="btn-accent" style="border: 2px solid #E5FF00; color: #E5FF00; background: rgba(229,255,0,0.1); padding: 6px 14px;">APPLY TO SVG</button>
      <button id="texCloseBtn" onclick="document.getElementById('app').classList.remove('flex'); document.getElementById('app').classList.add('hidden')" class="btn-brutal text-red-500" style="border: 2px solid #ef4444; color: #ef4444; background: rgba(239,68,68,0.1); padding: 6px 14px; text-transform: uppercase;">CLOSE</button>
    </div>
  </header>
  <div class="flex-1 flex overflow-hidden relative" style="height: calc(100vh - 48px);">`);

html = html.replace('</div><!-- /#app -->', '</div></div><!-- /#app -->');

svg = svg.replace('</body>', html + '\n<script src="./texture_create.js"></script>\n</body>');

fs.writeFileSync('svgviewer.html', svg);
console.log('Injection successful');
