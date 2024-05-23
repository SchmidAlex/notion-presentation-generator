const { app, BrowserWindow, ipcMain } = require('electron');
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
ipcMain.handle('save-presentation', (event, slidesContent) => {
  const filePath = path.join(app.getPath('userData'), 'presentation.html');
  fs.writeFileSync(filePath, slidesContent);
});

// Handle loading presentation
ipcMain.handle('load-presentation', () => {
  const filePath = path.join(app.getPath('userData'), 'presentation.html');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
});

ipcMain.handle('open-presentation', (event, slidesContent) => {
  const presentationWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  presentationWindow.loadFile('presentationWindow.html');

  presentationWindow.webContents.on('dom-ready', async () => {
    const cleanedSlidesContent = slidesContent.replace(/'/g, "\\'");
    console.log(slidesContent);
    presentationWindow.webContents.executeJavaScript(`
      document.querySelector('.slides').innerHTML = '${cleanedSlidesContent}';
      Reveal.initialize({
        margin: 1,
        plugins: [ RevealMarkdown ],
        controls: true,
        controlsLayout: 'bottom-right',
        controlsBackArrows: 'faded',
        progress: true,
        slideNumber: true,
        keyboard: true,
        overview: true,
        center: true,
        loop: false,
        navigationMode: 'default',
        shuffle: false,
        autoAnimate: true,
        autoAnimateEasing: 'ease',
        autoAnimateDuration: 1.0,
        autoAnimateUnmatched: true,
      });
    `);
  });

  presentationWindow.on('closed', () => {
    presentationWindow = null;
  });
});