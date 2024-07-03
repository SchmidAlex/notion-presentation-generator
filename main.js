const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const seminarServer = require('./seminar/server');

const store = new Store();
let ws;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'helpers', 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: true,
      sandbox: false
    },
  });

  win.loadFile('index.html');

  ipcMain.on('minimize-window', () => {
    win.minimize();
  });

  ipcMain.on('close-window', () => {
    win.close();
  });

  ipcMain.on('maximize-restore-window', () => {
    if (win.isMaximized()) {
      win.unmaximize();
      win.webContents.send('window-unmaximized');
    } else {
      win.maximize();
      win.webContents.send('window-maximized');
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (seminarServer.getServerRunning()) {
    seminarServer.stop();
  }
  if (ws && ws._server && ws._server.listening) {
    ws.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle saving presentation
ipcMain.handle('save-presentation', async (event, slidesContent) => {
  const {canceled, filePath} = await dialog.showSaveDialog({
    title: 'Save Presentation',
    filters: [
      { name: 'HTML Files', extensions: ['html']},
      { name: 'All Files', extensions: ['*']}
    ]
  });

  if (!canceled && filePath){
    fs.writeFileSync(filePath, slidesContent);
    return filePath;
  } else {
    return null;
  }
});

// Handle loading presentation
ipcMain.handle('open-stored-presentation', async () => {
  const {canceled, filePaths} = await dialog.showOpenDialog({
    title: 'Load Presentation',
    filters: [
      { name: 'HTML Files', extensions: ['html']},
      { name: 'All Files', extensions: ['*']}
    ],
    properties: ['openFile']
  });

  if (!canceled && filePaths.length > 0 && fs.existsSync(filePaths[0])){
    return fs.readFileSync(filePaths[0], 'utf-8');
  } else {
    return false;
  }
});

ipcMain.handle('open-presentation', (event, htmlSlidesContent) => {
  const presentationWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: true,
      sandbox: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'helpers', 'preload.js')
    }
  });
  
  presentationWindow.loadFile('presentationWindow.html');

  ipcMain.on('presentation-minimize-window', () => {
    presentationWindow.minimize();
  });

  ipcMain.on('presentation-close-window', () => {
    presentationWindow.close();
    ipcMain.removeAllListeners('presentation-minimize-window');
    ipcMain.removeAllListeners('presentation-maximize-restore-window');
    ipcMain.removeAllListeners('presentation-close-window');
  });

  ipcMain.on('presentation-maximize-restore-window', () => {
    if (presentationWindow.isMaximized()) {
      presentationWindow.unmaximize();
      presentationWindow.webContents.send('window-unmaximized');
    } else {
      presentationWindow.maximize();
      presentationWindow.webContents.send('window-maximized');
    }
  });

  presentationWindow.webContents.on('dom-ready', async () => {
    presentationWindow.focus();
    const sanitizedContent = JSON.stringify(htmlSlidesContent);
    try {
      presentationWindow.webContents.executeJavaScript('document.querySelector(\'.slides\').innerHTML = ' + sanitizedContent);
    } catch (error) {
      console.error("An error occoured while setting content and initiate reveal on presentationwindow: ", error);
    }
  });
});

ipcMain.handle('electron-store-get-data', (event, key) => {
  if (store.has(key)){
    const data = store.get(key);
    return data;
  } else {
    return false;
  }
  
});

ipcMain.handle('electron-store-set-data', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.on('start-seminar-server', (event, arg) => {
  if (seminarServer.getServerRunning()) {
    seminarServer.stop();
  }

  seminarServer.start();
  console.log('Seminar Server started');

  if (ws && ws._server && ws._server.listening) {
    ws.close();
  }

  event.reply('seminar-server-started');
  
});

ipcMain.handle('stop-seminar-server', (event, arg) => {
  if (seminarServer.getServerRunning()) {
    seminarServer.stop();
    console.log('Seminar server stopped')
  }

  if (ws && ws._server && ws._server.listening) {
    ws.close();
  }
});

ipcMain.handle('setup-seminar-view', (event, data) => {
  ws = new WebSocket.Server({host: '0.0.0.0', port: 4434});

  ws.on('connection', function connection(ws) {
    ws.send(JSON.stringify(data));
  });
})