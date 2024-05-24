const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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
      contextIsolation: true,
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