const { contextBridge, ipcRenderer } = require('electron');
const { Client } = require('@notionhq/client');

contextBridge.exposeInMainWorld('api', {
  getSecret: (key) => {
    const result = ipcRenderer.sendSync('electron-store-get-data', key);
    console.log(result);
    return result;
  },
  setSecret: (key, value) => ipcRenderer.sendSync('electron-store-set-data', key, value),
  savePresentation: (slidesContent) => ipcRenderer.invoke('save-presentation', slidesContent),
  openStoredPresentation: () => ipcRenderer.invoke('open-stored-presentation'),
  createNotionClient: (apiKey) => new Client({ auth: apiKey }),
  openPresentation: (htmlSlidesContent) => ipcRenderer.invoke('open-presentation', htmlSlidesContent)
});
