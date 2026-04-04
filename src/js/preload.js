const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('decryptor', {
  ingestPack: (filePath) => ipcRenderer.invoke('ingest-pack', filePath),
  getPacks: () => ipcRenderer.invoke('get-packs'),
  getVersion: () => '1.0.0-DECRYPTOR-OS',
  platform: process.platform
});
