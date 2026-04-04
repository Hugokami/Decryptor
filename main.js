const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#050505',
        frame: false, // Frameless for industrial look
        titleBarStyle: 'hidden',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.on('window-ctrl', (event, action) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    }
    if (action === 'close') app.quit();
});

// Pack Ingestion System
ipcMain.handle('ingest-pack', async (event, filePath) => {
    const packsDir = path.join(__dirname, 'packs');
    if (!fs.existsSync(packsDir)) fs.mkdirSync(packsDir);

    const fileName = path.basename(filePath);
    const destPath = path.join(packsDir, fileName);

    try {
        fs.copyFileSync(filePath, destPath);
        return { success: true, path: destPath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
