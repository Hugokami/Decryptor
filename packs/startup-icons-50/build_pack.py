import os
import glob
import re
import zipfile
import shutil
import base64

base_dir = r"c:\Users\lyan1\Documents\texture\packs\startup-icons-50"
static_dir = os.path.join(base_dir, "static")
showcase_in = os.path.join(base_dir, "showcase.html")
pack_zip_out = os.path.join(base_dir, "startup-animated-pack.zip")

# Generate the JS object for 50 icons
icons_js = []
for file_path in sorted(glob.glob(os.path.join(static_dir, "*.svg"))):
    name = os.path.splitext(os.path.basename(file_path))[0]
    with open(file_path, "r", encoding="utf-8") as f:
        svg_content = f.read().strip()
    
    # We must escape backticks in the JS template literal
    safe_svg = svg_content.replace('`', '\\`')
    icons_js.append(f"            '{name}': `{safe_svg}`,")

icons_str = "{\n" + "\n".join(icons_js) + "\n        };"

# Read original showcase
with open(showcase_in, "r", encoding="utf-8") as f:
    html = f.read()

# Replace const icons = { ... }; with the full list
html = re.sub(
    r"const icons = \{.*?^\s*\};", 
    f"const icons = {icons_str}", 
    html,
    flags=re.DOTALL | re.MULTILINE
)

# Add toast CSS and copy-to-clipboard functionality like before
toast_css = """
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
            z-index: 9999;
        }

        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
"""
html = html.replace("</style>", toast_css + "\n    </style>")
html = html.replace("</body>", "    <div id=\"toast\" class=\"toast\">SVG copied to clipboard!</div>\n</body>")

# Replace alert with copy SVG function
js_addions = """
        // Copy to clipboard from base64 to avoid quote issues
        window.copySvgWrapper = function(svgContent) {
            navigator.clipboard.writeText(svgContent).then(() => {
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            });
        };
"""
html = html.replace("const drawGrid = document.getElementById('drawGrid');", js_addions + "\n        const drawGrid = document.getElementById('drawGrid');")

# Modify createCard to also copy SVG on click (only if it's not a replay)
new_createCard = """
        function createCard(name, svgMarkup, animClass) {
            const b64 = btoa(unescape(encodeURIComponent(svgMarkup)));
            return `<div class="icon-card ${animClass}" onclick="if(!event.target.classList.contains('replay-btn')) window.copySvgWrapper(decodeURIComponent(escape(atob('${b64}'))))">
                <span class="replay-btn" title="Replay" onclick="replayAnim(this.parentElement, '${animClass}'); event.stopPropagation();">⟲</span>
                ${svgMarkup}
                <span class="icon-name">${name}</span>
            </div>`;
        }
"""
html = re.sub(r"function createCard.*?return `.*?</div>`;\s*\}", new_createCard.strip(), html, flags=re.DOTALL)

pkg_dir = os.path.join(base_dir, "Gumroad_Ready_Animated_Pack")
if os.path.exists(pkg_dir):
    shutil.rmtree(pkg_dir)
os.makedirs(pkg_dir)

# Save the new preview page
with open(os.path.join(pkg_dir, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)

# Copy directories to package
dirs_to_copy = [
    "static", "preview",
    "animated-draw", "animated-pulse", "animated-color-cycle",
    "animated-holographic", "animated-magnetic-float", "animated-neon-draw"
]

for d in dirs_to_copy:
    src = os.path.join(base_dir, d)
    if os.path.isdir(src):
        dst = os.path.join(pkg_dir, d)
        shutil.copytree(src, dst)

print(f"Creating full animated zip at {pack_zip_out}...")
with zipfile.ZipFile(pack_zip_out, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, d_names, f_names in os.walk(pkg_dir):
        for file in f_names:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, pkg_dir)
            zf.write(file_path, arcname)

shutil.rmtree(pkg_dir)
print(f"Done! Zip generated at: {pack_zip_out}")
