import re
import os

file_path = r"c:\Users\lyan1\Documents\svgstudio\svgviewer.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace accent color codes globally (#E5FF00 -> #FF6B4A, #d4ee00 -> #FFAE42)
content = re.sub(r'#E5FF00', '#FF6B4A', content, flags=re.IGNORECASE)
content = re.sub(r'#d4ee00', '#FFAE42', content, flags=re.IGNORECASE) # Replace hover green with Gold
content = re.sub(r'rgba\(229,\s*255,\s*0,', 'rgba(255, 107, 74,', content) # Replace green rgba with Coral rgba
content = re.sub(r'rgba\(229,255,0,', 'rgba(255,107,74,', content)

# 2. Comply with Purple Ban inside dynamic animation filters & styles
# Glitch shadow values containing cyan (#00ffff), magenta (#ff00ff), blue (#0000ff):
old_glitch_0 = "rgba(255,0,0,0.8)) drop-shadow(${bOff}px 0 rgba(0,255,255,0.8))"
new_glitch_0 = "rgba(255,107,74,0.8)) drop-shadow(${bOff}px 0 rgba(255,174,66,0.8))"
content = content.replace(old_glitch_0, new_glitch_0)

old_glitch_25 = "rgba(255,0,0,0.8)) drop-shadow(${bOff*2}px 0 rgba(0,255,255,0.8))"
new_glitch_25 = "rgba(255,107,74,0.8)) drop-shadow(${bOff*2}px 0 rgba(255,174,66,0.8))"
content = content.replace(old_glitch_25, new_glitch_25)

old_glitch_50 = "rgba(255,0,255,0.8)) drop-shadow(${bOff/2}px 0 rgba(0,255,0,0.8))"
new_glitch_50 = "rgba(255,107,74,0.8)) drop-shadow(${bOff/2}px 0 rgba(255,138,0,0.8))"
content = content.replace(old_glitch_50, new_glitch_50)

old_glitch_75 = "rgba(255,255,0,0.8)) drop-shadow(${bOff}px 0 rgba(0,0,255,0.8))"
new_glitch_75 = "rgba(255,174,66,0.8)) drop-shadow(${bOff}px 0 rgba(255,138,0,0.8))"
content = content.replace(old_glitch_75, new_glitch_75)

old_glitch_100 = "rgba(255,0,0,0.8)) drop-shadow(${bOff}px 0 rgba(0,255,255,0.8))"
new_glitch_100 = "rgba(255,107,74,0.8)) drop-shadow(${bOff}px 0 rgba(255,174,66,0.8))"
content = content.replace(old_glitch_100, new_glitch_100)

# Replace other colors in animations:
# spectrum-flow colors:
old_spectrum = '<stop offset="0%" stop-color="#ff0000" /><stop offset="5%" stop-color="#ffff00" />\n                        <stop offset="10%" stop-color="#00ff00" /><stop offset="15%" stop-color="#00ffff" />\n                        <stop offset="20%" stop-color="#0000ff" /><stop offset="25%" stop-color="#ff00ff" />\n                        <stop offset="30%" stop-color="#ff0000" />'
new_spectrum = '<stop offset="0%" stop-color="#ff6b4a" /><stop offset="5%" stop-color="#ffae42" />\n                        <stop offset="10%" stop-color="#faf9f6" /><stop offset="15%" stop-color="#ffae42" />\n                        <stop offset="20%" stop-color="#ff6b4a" /><stop offset="25%" stop-color="#ffae42" />\n                        <stop offset="30%" stop-color="#ff6b4a" />'
content = content.replace(old_spectrum, new_spectrum)

# echo-trail colors:
old_echo = 'flood-color="#ff0055" flood-opacity="${0.5 * strokeOpacity}"/>\n                        <feDropShadow dx="-20" dy="0" stdDeviation="4" flood-color="#00ffff" flood-opacity="${0.3 * strokeOpacity}"/>'
new_echo = 'flood-color="#ff6b4a" flood-opacity="${0.5 * strokeOpacity}"/>\n                        <feDropShadow dx="-20" dy="0" stdDeviation="4" flood-color="#ffae42" flood-opacity="${0.3 * strokeOpacity}"/>'
content = content.replace(old_echo, new_echo)

# prismatic-glare colors:
old_prismatic = 'flood-color="#ff00ff"><animate attributeName="flood-color" values="#ff00ff;#00ffff;#e5ff00;#ff00ff"'
new_prismatic = 'flood-color="#ff6b4a"><animate attributeName="flood-color" values="#ff6b4a;#ffae42;#ff8a00;#ff6b4a"'
content = content.replace(old_prismatic, new_prismatic)

# vortex-gradient colors:
old_vortex_stops = '<radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">\n                            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="${strokeOpacity}" />\n                            <stop offset="50%" stop-color="#00FFFF" stop-opacity="${0.6 * strokeOpacity}" />\n                            <stop offset="100%" stop-color="#FF00FF" stop-opacity="0" />\n                        </radialGradient>'
new_vortex_stops = '<radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">\n                            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="${strokeOpacity}" />\n                            <stop offset="50%" stop-color="#ffae42" stop-opacity="${0.6 * strokeOpacity}" />\n                            <stop offset="100%" stop-color="#ff6b4a" stop-opacity="0" />\n                        </radialGradient>'
content = content.replace(old_vortex_stops, new_vortex_stops)

# active expressions list color:
content = content.replace('div.innerHTML = `<span style="color:#00ffff">${prop}:</span>', 'div.innerHTML = `<span style="color:var(--accent)">${prop}:</span>')

# magnetic tilt animation drop shadow:
content = content.replace('filter: drop-shadow(-20px 20px 0px rgba(229, 255, 0, 0.2))', 'filter: drop-shadow(-20px 20px 0px rgba(255, 107, 74, 0.2))')

# neon and glass styles in options:
content = content.replace("{ id: 'neon', name: 'Neon Glow', css: 'filter: drop-shadow(0 0 5px #e5ff00) drop-shadow(0 0 10px #e5ff00)' }",
                          "{ id: 'neon', name: 'Sunset Glow', css: 'filter: drop-shadow(0 0 5px #FF6B4A) drop-shadow(0 0 10px #FFAE42)' }")
content = content.replace("rgba(31,38,135,0.37)", "rgba(14,16,19,0.37)")

# Replace the antigravity-aura hue rotation animation with a subtle sunset tilt:
content = content.replace('<feColorMatrix in="blur" type="hueRotate" values="0" result="glow">\n                        <animate attributeName="values" from="0" to="360" dur="${duration * 2}s" repeatCount="indefinite"/>\n                    </feColorMatrix>',
                          '<feColorMatrix in="blur" type="hueRotate" values="0" result="glow">\n                        <animate attributeName="values" values="-30;30;-30" dur="${duration * 2}s" repeatCount="indefinite"/>\n                    </feColorMatrix>')

# Replace the text of "Obsidian Palette" to Sunset Palette:
content = content.replace('Obsidian Palette:</strong> High-contrast Obsidian (#050505) and Theme Lime (#E5FF00).',
                          'Sunset Palette:</strong> Premium Warm Sunset Coral (#FF6B4A), Sunset Gold (#FFAE42), Warm White, and Space Charcoal.')

# 3. Branding logo replacement in intro overlay
old_intro_logo = '<span class="font-black text-accent mr-2">■</span>SVG STUDIO'
new_intro_logo = """<svg class="w-10 h-10 text-accent inline-block mr-2 align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M4.93 4.93l1.41 1.41"></path>
    <path d="M17.66 17.66l1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="M6.34 17.66l-1.41 1.41"></path>
    <path d="M19.07 4.93l-1.41 1.41"></path>
</svg>SVG STUDIO"""
content = content.replace(old_intro_logo, new_intro_logo)

# 4. Header restructuring to add responsive hamburger, mobile drawer, and back-to-home button
old_header_content_start = """    <header
        class="flex justify-between items-center px-4 py-0 bg-bg border-b-2 border-border z-50 shrink-0 h-12 relative">
        <div class="flex items-center gap-4">
            <a href="index.html" class="flex items-center gap-2 no-underline">
                <span class="text-accent text-lg">■</span>
                <span class="font-display text-sm font-bold tracking-wider text-white uppercase">SVG STUDIO</span>
            </a>
            <span class="text-muted text-xs font-tech uppercase tracking-widest hidden sm:inline">// EDITOR v2.0</span>
        </div>
        <div class="flex gap-2 items-center">"""

new_header_content_start = """    <header
        class="flex justify-between items-center px-4 py-0 bg-bg border-b-2 border-border z-50 shrink-0 h-12 relative">
        <div class="flex items-center gap-3">
            <a href="index.html" class="flex items-center gap-1.5 text-muted hover:text-accent border border-border hover:border-accent bg-panel/30 px-2 py-1 transition-colors no-underline group" title="Back to Home">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                <span class="font-tech text-[10px] font-bold tracking-wider">HOME</span>
            </a>
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="M4.93 4.93l1.41 1.41"></path>
                    <path d="M17.66 17.66l1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="M6.34 17.66l-1.41 1.41"></path>
                    <path d="M19.07 4.93l-1.41 1.41"></path>
                </svg>
                <span class="font-display text-sm font-bold tracking-wider text-white uppercase hidden md:inline">SVG STUDIO</span>
            </div>
            <span class="text-muted text-xs font-tech uppercase tracking-widest hidden lg:inline">// EDITOR v2.0</span>
        </div>
        <div id="headerActions" class="hidden md:flex gap-2 items-center">"""

content = content.replace(old_header_content_start, new_header_content_start)

# Modify header end tag to close the #headerActions div and insert hamburger button
old_guide_and_header_end = """            <button id="walkthroughBtn" class="btn-brutal">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
                    </path>
                </svg>
                Guide
            </button>
            
    </header>"""

new_guide_and_header_end = """            <button id="walkthroughBtn" class="btn-brutal">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253">
                    </path>
                </svg>
                Guide
            </button>
        </div>
        <!-- Hamburger Menu Button -->
        <button id="mobileMenuToggle" class="flex md:hidden btn-brutal p-2 border-accent/30 text-accent hover:bg-accent/10" aria-label="Toggle Menu">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
        </button>
    </header>"""

content = content.replace(old_guide_and_header_end, new_guide_and_header_end)

# Insert the Mobile View Switcher (Tabs) right after the header ends
old_header_end = '</header>'
new_header_end_with_tabs = """</header>
    <!-- Mobile View Switcher (Tabs) -->
    <div id="mobileTabs" class="flex md:hidden w-full bg-panel border-b border-border shrink-0 z-40">
        <button id="showCodeBtn" class="flex-1 py-3 text-xs font-tech uppercase tracking-wider text-center border-r border-border transition-colors text-accent bg-bg font-bold border-b-2 border-b-accent">
            Code View
        </button>
        <button id="showCanvasBtn" class="flex-1 py-3 text-xs font-tech uppercase tracking-wider text-center transition-colors text-muted hover:text-white">
            Canvas View
        </button>
    </div>"""
content = content.replace(old_header_end, new_header_end_with_tabs, 1)

# Modify main layout tag to be flex-1 relative min-h-0 and remove static height calculations
content = content.replace('<main class="flex-1 flex flex-row h-[calc(100vh-3.5rem)] relative overflow-hidden">',
                          '<main class="flex-1 flex flex-row relative overflow-hidden min-h-0">')

# Insert mobile drawer right before </body>
old_body_end = '</body>'
mobile_drawer_html = """    <!-- Mobile Hamburger Drawer -->
    <div id="mobileDrawer" class="fixed inset-y-0 right-0 z-[100001] bg-bg/95 backdrop-blur-md translate-x-full transition-transform duration-300 md:hidden flex flex-col border-l border-border w-80 h-full shadow-2xl">
        <div class="flex justify-between items-center p-4 border-b border-border">
            <span class="font-display text-xs font-bold tracking-wider text-accent uppercase">MENU</span>
            <button id="mobileDrawerClose" class="btn-brutal p-1.5 border-accent/30 text-accent">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <div id="mobileDrawerContent" class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <!-- Buttons will be dynamically moved here on mobile and moved back to header on desktop -->
        </div>
    </div>
    <!-- Mobile Drawer Backdrop -->
    <div id="mobileDrawerBackdrop" class="fixed inset-0 z-[100000] bg-black/60 hidden md:hidden"></div>
</body>"""
content = content.replace(old_body_end, mobile_drawer_html)

# Add custom mobile overrides inside style tag.
mobile_css = """
        /* === MOBILE ACCORDION AND BUTTON OVERRIDES === */
        @media (max-width: 768px) {
            .templates-dropdown {
                position: static !important;
                width: 100% !important;
                max-height: 300px !important;
                margin-top: 8px !important;
                border-left: none !important;
                border-right: none !important;
                background: #0E1013 !important;
            }
            #mobileDrawerContent .btn-brutal,
            #mobileDrawerContent a.btn-brutal {
                width: 100% !important;
                justify-content: flex-start !important;
                padding: 10px 14px !important;
                font-size: 13px !important;
                border-width: 1px !important;
                background-color: #181B20 !important;
                color: #FAF9F6 !important;
            }
            #mobileDrawerContent .btn-brutal:hover,
            #mobileDrawerContent a.btn-brutal:hover {
                border-color: #FF6B4A !important;
                color: #FF6B4A !important;
                background-color: rgba(255, 107, 74, 0.05) !important;
            }
            #mobileDrawerContent #templatesWrapper {
                width: 100% !important;
            }
            #mobileDrawerContent #templatesBtn {
                width: 100% !important;
                justify-content: flex-start !important;
                padding: 10px 14px !important;
                font-size: 13px !important;
                background-color: #181B20 !important;
            }
            #mobileDrawerContent .active.btn-brutal,
            #mobileDrawerContent .btn-brutal.active,
            #mobileDrawerContent #selectModeBtn.active {
                border-color: #FFAE42 !important;
                color: #0E1013 !important;
                background-color: #FFAE42 !important;
            }
            #mobileDrawerContent #selectModeBtn.active * {
                color: #0E1013 !important;
            }
        }
"""
content = re.sub(r'(</style>)', mobile_css + r'\1', content, count=1)

# Append responsiveness JS at the very end of the main script tag
old_main_script_end = """        // ── Auto-switch to Properties tab on selection ──
        const origUpdateECP = updateECP;
        updateECP = function() {
            origUpdateECP();
            updatePropsTab();
            if (selectedElements.length > 0) {
                switchLeftTab('properties');
            }
        };"""

new_main_script_end = """        // ── Auto-switch to Properties tab on selection ──
        const origUpdateECP = updateECP;
        updateECP = function() {
            origUpdateECP();
            updatePropsTab();
            if (selectedElements.length > 0) {
                switchLeftTab('properties');
            }
        };

        // ═══ MOBILE RESPONSIVENESS AND INTERACTION OPTIMIZATIONS ═══
        (function() {
            const headerActions = document.getElementById('headerActions');
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            const mobileDrawer = document.getElementById('mobileDrawer');
            const mobileDrawerContent = document.getElementById('mobileDrawerContent');
            const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
            const mobileDrawerClose = document.getElementById('mobileDrawerClose');

            const editorSection = document.getElementById('editorSection');
            const previewSection = document.getElementById('previewSection');
            const resizer = document.getElementById('resizer');
            const showCodeBtn = document.getElementById('showCodeBtn');
            const showCanvasBtn = document.getElementById('showCanvasBtn');

            let activeMobileTab = 'code'; // 'code' or 'canvas'
            let isMobileLayout = false;
            let desktopFlexWidth = '35%';
            let wasMobile = false;

            // Move elements back and forth to keep events active
            function syncLayoutDOM() {
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    if (!isMobileLayout) {
                        isMobileLayout = true;
                        // Move header action children to mobile drawer content
                        while (headerActions.firstChild) {
                            mobileDrawerContent.appendChild(headerActions.firstChild);
                        }
                    }
                } else {
                    if (isMobileLayout) {
                        isMobileLayout = false;
                        // Close drawer if open
                        closeMobileDrawer();
                        // Move drawer content children back to header actions
                        while (mobileDrawerContent.firstChild) {
                            headerActions.appendChild(mobileDrawerContent.firstChild);
                        }
                    }
                }
            }

            function closeMobileDrawer() {
                if (mobileDrawer) {
                    mobileDrawer.classList.add('translate-x-full');
                }
                if (mobileDrawerBackdrop) {
                    mobileDrawerBackdrop.classList.add('hidden');
                }
            }

            function openMobileDrawer() {
                if (mobileDrawer) {
                    mobileDrawer.classList.remove('translate-x-full');
                }
                if (mobileDrawerBackdrop) {
                    mobileDrawerBackdrop.classList.remove('hidden');
                }
            }

            if (mobileMenuToggle) {
                mobileMenuToggle.addEventListener('click', openMobileDrawer);
            }
            if (mobileDrawerClose) {
                mobileDrawerClose.addEventListener('click', closeMobileDrawer);
            }
            if (mobileDrawerBackdrop) {
                mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);
            }

            // Close mobile drawer on any button click in content (e.g. templates, Guide etc.)
            if (mobileDrawerContent) {
                mobileDrawerContent.addEventListener('click', (e) => {
                    // If clicking a templates selection item, don't close right away to allow selection
                    if (e.target.closest('.template-item') || e.target.closest('#templatesBtn')) {
                        return;
                    }
                    closeMobileDrawer();
                });
            }

            function updateLayout() {
                const isMobile = window.innerWidth <= 768;
                syncLayoutDOM();

                if (isMobile) {
                    // Save desktop width before applying mobile layout
                    if (!wasMobile) {
                        const currentFlex = editorSection.style.flex;
                        if (currentFlex && currentFlex.startsWith('0 0 ')) {
                            desktopFlexWidth = currentFlex.replace('0 0 ', '');
                        }
                        wasMobile = true;
                    }

                    // Show tab bar
                    document.getElementById('mobileTabs').style.display = 'flex';
                    // Hide resizer on mobile
                    if (resizer) resizer.classList.add('hidden');

                    if (activeMobileTab === 'code') {
                        // Show editor, hide canvas
                        if (editorSection) {
                            editorSection.style.display = 'flex';
                            editorSection.style.flex = '1 1 100%';
                        }
                        if (previewSection) previewSection.style.display = 'none';
                        
                        showCodeBtn.classList.add('text-accent', 'bg-bg', 'font-bold', 'border-b-2', 'border-b-accent');
                        showCodeBtn.classList.remove('text-muted');
                        
                        showCanvasBtn.classList.remove('text-accent', 'bg-bg', 'font-bold', 'border-b-2', 'border-b-accent');
                        showCanvasBtn.classList.add('text-muted');

                        if (window.editor) {
                            window.editor.refresh();
                        }
                    } else {
                        // Show canvas, hide editor
                        if (editorSection) editorSection.style.display = 'none';
                        if (previewSection) {
                            previewSection.style.display = 'flex';
                            previewSection.style.flex = '1 1 100%';
                        }

                        showCanvasBtn.classList.add('text-accent', 'bg-bg', 'font-bold', 'border-b-2', 'border-b-accent');
                        showCanvasBtn.classList.remove('text-muted');
                        
                        showCodeBtn.classList.remove('text-accent', 'bg-bg', 'font-bold', 'border-b-2', 'border-b-accent');
                        showCodeBtn.classList.add('text-muted');

                        // Force update preview from editor content (sync code to canvas)
                        if (window.editor && typeof updatePreview === 'function') {
                            updatePreview(window.editor.getValue());
                        }
                    }
                } else {
                    // Desktop mode
                    wasMobile = false;
                    document.getElementById('mobileTabs').style.display = 'none';
                    if (resizer) resizer.classList.remove('hidden');
                    
                    // Restore desktop flex layouts
                    if (editorSection) {
                        editorSection.style.display = 'flex';
                        editorSection.style.flex = `0 0 ${desktopFlexWidth}`;
                    }
                    if (previewSection) {
                        previewSection.style.display = 'flex';
                        previewSection.style.flex = '1 1 0%';
                    }
                    
                    if (window.editor) {
                        window.editor.refresh();
                    }
                }
            }

            window.addEventListener('resize', updateLayout);
            if (showCodeBtn) {
                showCodeBtn.addEventListener('click', () => {
                    activeMobileTab = 'code';
                    updateLayout();
                });
            }
            if (showCanvasBtn) {
                showCanvasBtn.addEventListener('click', () => {
                    activeMobileTab = 'canvas';
                    updateLayout();
                });
            }

            // Touch gesture optimization
            let initialDistance = 0;
            let initialScale = 1;

            if (svgPreviewContainer) {
                svgPreviewContainer.addEventListener('touchstart', (e) => {
                    if (e.touches.length === 2) {
                        initialDistance = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        initialScale = scale;
                        e.preventDefault();
                    }
                }, { passive: false });

                svgPreviewContainer.addEventListener('touchmove', (e) => {
                    if (e.touches.length === 2) {
                        e.preventDefault();
                        const dist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        if (initialDistance > 0) {
                            const factor = dist / initialDistance;
                            scale = Math.max(0.1, Math.min(initialScale * factor, 5));
                            updateTransform();
                        }
                    } else if (e.touches.length === 1) {
                        if (interactionMode === 'pan' || interactionMode === 'drag' || interactionMode === 'marquee') {
                            e.preventDefault();
                        }
                    }
                }, { passive: false });
            }

            // Run initial check
            setTimeout(() => {
                updateLayout();
            }, 200);
        })();"""

content = content.replace(old_main_script_end, new_main_script_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: Refactoring of svgviewer.html finished.")
