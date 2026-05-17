/**
 * UPDATE SYSTEM // DECRYPTOR OS
 * Handles remote version checking and local update pack ingestion.
 */

export class UpdateSystem {
    constructor() {
        this.currentVersion = '1.0.0-DECRYPTOR-OS';
        this.repoOwner = 'Hugokami';
        this.repoName = 'Decryptor';
        this.updateUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;
        this.init();
    }

    async init() {
        console.log(`[UPDATE_SYSTEM] Initialized v${this.currentVersion}`);
        
        // Setup Drag & Drop listener for Update Packs
        this.setupDropZone();
    }

    async checkForUpdates() {
        try {
            console.log(`[UPDATE_SYSTEM] Checking for updates at ${this.updateUrl}...`);
            const response = await fetch(this.updateUrl);
            if (!response.ok) throw new Error('Failed to fetch update metadata');
            
            const data = await response.json();
            const latestVersion = data.tag_name;

            if (latestVersion && latestVersion !== this.currentVersion) {
                this.notifyUser(latestVersion, data.body);
                return { updateAvailable: true, version: latestVersion, notes: data.body };
            }

            console.log('[UPDATE_SYSTEM] App is up to date.');
            return { updateAvailable: false };
        } catch (err) {
            console.error('[UPDATE_SYSTEM] Update check failed:', err);
            return { error: err.message };
        }
    }

    notifyUser(version, notes) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        
        if (toast && toastMsg) {
            toastMsg.innerHTML = `UPDATE AVAILABLE: <span class="text-accent">${version}</span><br><span class="text-[9px] opacity-70">${notes.substring(0, 50)}...</span>`;
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
            
            setTimeout(() => {
                toast.style.transform = 'translateY(10px)';
                toast.style.opacity = '0';
            }, 8000);
        }
    }

    setupDropZone() {
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.name.endsWith('.decryptor') || file.name.endsWith('.zip')) {
                    console.log(`[UPDATE_SYSTEM] Update pack detected: ${file.name}`);
                    this.ingestUpdatePack(file.path);
                }
            }
        });
    }

    async ingestUpdatePack(filePath) {
        if (!window.electronAPI || !window.electronAPI.ingestPack) {
            console.warn('[UPDATE_SYSTEM] Electron API not available for ingestion.');
            return;
        }

        try {
            const result = await window.electronAPI.ingestPack(filePath);
            if (result.success) {
                console.log(`[UPDATE_SYSTEM] Update pack ingested successfully to: ${result.path}`);
                this.notifyIngestionSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('[UPDATE_SYSTEM] Ingestion failed:', err);
        }
    }

    notifyIngestionSuccess() {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        if (toast && toastMsg) {
            toastMsg.textContent = 'UPDATE PACK INSTALLED RESTART APP TO APPLY';
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }
    }
}
