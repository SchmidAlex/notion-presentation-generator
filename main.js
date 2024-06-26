const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const store = new Store();
let seminarServer;
let ws;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'helpers', 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: true,
      sandbox: false
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (seminarServer) {
    seminarServer.kill('SIGTERM');
    seminarServer = null;
    console.log('Seminar server stopped')
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
    webPreferences: {
      contextIsolation: false,
      enableRemoteModule: true,
      sandbox: false,
      nodeIntegration: true
    }
  });
  
  presentationWindow.loadFile('presentationWindow.html');

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
  if (!seminarServer) {
    seminarServer = spawn('node', ['seminar/server.js'], { stdio: 'inherit' });
    seminarServer.on('close', (code) => {
      console.log(`Seminar Server exited with code ${code}`);
    });
    console.log('Seminar Server started');
  } else {
    console.log('Seminar Server is already running');
  }

  if (ws && ws._server && ws._server.listening) {
    ws.close();
  }

  event.reply('seminar-server-started');
  
});

ipcMain.on('stop-seminar-server', (event, arg) => {
  if (seminarServer) {
    seminarServer.kill('SIGTERM');
    seminarServer = null;
    console.log('Seminar server stopped')
  }

  if (ws && ws._server && ws._server.listening) {
    ws.close();
  }
});

ipcMain.on('setup-seminar-view', (event, data) => {
  ws = new WebSocket.Server({host: '0.0.0.0', port: 4434});

  ws.on('connection', function connection(ws) {
    ws.send(JSON.stringify(data));
  });
})