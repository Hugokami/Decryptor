import os
import glob
import zipfile
import base64
import shutil

base_dir = r"c:\Users\lyan1\Documents\texture\packs\startup-icons-50"
static_dir = os.path.join(base_dir, "static")
output_zip = os.path.join(base_dir, "startup-static-icons-pack.zip")

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Startup Static SVGs - 50 Premium Icons</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #09090b;
            --surface: #18181b;
            --border: #27272a;
            --text: #fafafa;
            --text-muted: #a1a1aa;
            --accent: #E5FF00; /* Matching showcase accent */
            --accent-hover: #ccff00;
            --radius: 12px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 40px 24px;
        }

        header {
            max-width: 1200px;
            margin: 0 auto 60px;
            text-align: center;
        }

        h1 {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: -1px;
            margin-bottom: 16px;
        }

        p.subtitle {
            font-size: 18px;
            color: var(--text-muted);
            max-width: 600px;
            margin: 0 auto;
        }

        .controls {
            margin-top: 32px;
            display: flex;
            gap: 16px;
            justify-content: center;
        }

        input[type="range"] {
            width: 200px;
            accent-color: var(--accent);
        }

        .grid {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 20px;
        }

        .icon-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            transition: all 0.2s;
            cursor: pointer;
            position: relative;
        }

        .icon-card:hover {
            border-color: var(--accent);
            transform: translateY(-4px);
            box-shadow: 0 8px 32px rgba(229,255,0,0.1);
        }

        .icon-card svg {
            width: 32px;
            height: 32px;
            color: var(--text);
            transition: transform 0.2s;
        }

        .icon-card:hover svg {
            transform: scale(1.1);
            color: var(--accent);
        }

        .icon-name {
            font-size: 12px;
            color: var(--text-muted);
            font-family: monospace;
            font-weight: 500;
        }

        .icon-card:hover .icon-name {
            color: var(--accent);
        }

        .toast {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--text);
            color: var(--bg);
            padding: 12px 24px;
            border-radius: 100px;
            font-weight: 600;
            font-size: 14px;
            opacity: 0;
            transition: all 0.3s;
            pointer-events: none;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        .footer {
            margin-top: 80px;
            text-align: center;
            color: var(--text-muted);
            font-size: 14px;
        }
    </style>
</head>
<body>
    <header>
        <h1><span style="color: var(--accent)">✦</span> Static SVGs</h1>
        <p class="subtitle">50 meticulously crafted, lightweight minimal icons for startups and modern interfaces.</p>
        <div class="controls">
            <label style="color: var(--text-muted); font-size: 14px; display: flex; align-items: center; gap: 8px;">
                Size Preview: <span id="sizeVal">32px</span>
                <input type="range" id="sizeSlider" min="16" max="64" value="32">
            </label>
        </div>
        <p style="font-size: 14px; color: var(--text-muted); margin-top: 16px;">Click any icon to copy its raw SVG code or use the provided /svgs folder.</p>
    </header>

    <div class="grid" id="iconGrid">
        <!-- ICONS_HERE -->
    </div>
    
    <div class="footer">
        Ready to deploy. Use in unlimited commercial projects.
    </div>

    <div class="toast" id="toast">Copied SVG to clipboard!</div>

    <script>
        // Size slider
        const slider = document.getElementById('sizeSlider');
        const sizeVal = document.getElementById('sizeVal');
        const svgs = document.querySelectorAll('.icon-card svg');
        
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            sizeVal.textContent = val + 'px';
            svgs.forEach(svg => {
                svg.style.width = val + 'px';
                svg.style.height = val + 'px';
            });
        });

        // Copy to clipboard from base64 to avoid quote issues
        function copySvg(base64Str) {
            const svgContent = decodeURIComponent(escape(atob(base64Str)));
            navigator.clipboard.writeText(svgContent).then(() => {
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            });
        }
    </script>
</body>
</html>
"""

cards = []
for file_path in sorted(glob.glob(os.path.join(static_dir, "*.svg"))):
    name = os.path.splitext(os.path.basename(file_path))[0]
    with open(file_path, "r", encoding="utf-8") as f:
        svg_content = f.read().strip()
    
    b64_svg = base64.b64encode(svg_content.encode('utf-8')).decode('utf-8')
    
    card = f'''
        <div class="icon-card" onclick="copySvg('{b64_svg}')">
            {svg_content}
            <div class="icon-name">{name}.svg</div>
        </div>
    '''
    cards.append(card)

html_content = html_template.replace("<!-- ICONS_HERE -->", "".join(cards))

pkg_dir = os.path.join(base_dir, "Gumroad_Ready_Static_Icons")
os.makedirs(pkg_dir, exist_ok=True)

with open(os.path.join(pkg_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(html_content)

pkg_static_dir = os.path.join(pkg_dir, "svgs")
if os.path.exists(pkg_static_dir):
    shutil.rmtree(pkg_static_dir)
shutil.copytree(static_dir, pkg_static_dir)

print(f"Creating zip at {output_zip}...")
with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(pkg_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, pkg_dir)
            zf.write(file_path, arcname)

shutil.rmtree(pkg_dir)
print(f"Done! Zip generated at: {output_zip}")
