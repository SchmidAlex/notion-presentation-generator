const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');
const { Client } = require('@notionhq/client');
const store = new Store();

contextBridge.exposeInMainWorld('api', {
  getSecret: (key) => store.get(key),
  setSecret: (key, value) => store.set(key, value),
  savePresentation: (slidesContent) => ipcRenderer.invoke('save-presentation', slidesContent),
  loadPresentation: () => ipcRenderer.invoke('load-presentation'),
  createNotionClient: (apiKey) => new Client({ auth: apiKey }),
  openPresentation: (slidesContent) => ipcRenderer.invoke('open-presentation', slidesContent)
});
