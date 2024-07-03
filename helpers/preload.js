const { contextBridge, ipcRenderer } = require('electron');
const { Client } = require('@notionhq/client');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('api', {
  getSecret: (key) => ipcRenderer.invoke('electron-store-get-data', key),
  setSecret: (key, value) => store.set(key, value),
  savePresentation: (slidesContent) => ipcRenderer.invoke('save-presentation', slidesContent),
  openStoredPresentation: () => ipcRenderer.invoke('open-stored-presentation'),
  createNotionClient: (apiKey) => new Client({ auth: apiKey }),
  openPresentation: (htmlSlidesContent) => ipcRenderer.invoke('open-presentation', htmlSlidesContent),

  startSeminarServer: () => ipcRenderer.send('start-seminar-server'),
  stopSeminarServer: () => ipcRenderer.invoke('stop-seminar-server'),
  onSeminarServerStarted: (callback) => ipcRenderer.on('seminar-server-started', callback),
  setupSeminarView: (config) => ipcRenderer.invoke('setup-seminar-view', config),

  // Windowhandling
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  maximizeRestoreWindow: () => ipcRenderer.send('maximize-restore-window'),
  onMaximize: (callback) => ipcRenderer.on('window-maximized', callback),
  onUnmaximize: (callback) => ipcRenderer.on('window-unmaximized', callback),
  minimizePresentationWindow: () => ipcRenderer.send('presentation-minimize-window'),
  closePresentationWindow: () => ipcRenderer.send('presentation-close-window'),
  maximizeRestorePresentationWindow: () => ipcRenderer.send('presentation-maximize-restore-window'),
  onMaximizePresentation: (callback) => ipcRenderer.on('window-maximized', callback),
  onUnmaximizePresentation: (callback) => ipcRenderer.on('window-unmaximized', callback)
});
