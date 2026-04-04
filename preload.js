const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    windowCtrl: (action) => ipcRenderer.send('window-ctrl', action),
    ingestPack: (filePath) => ipcRenderer.invoke('ingest-pack', filePath),
    platform: process.platform
});
