const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openVideo: () => ipcRenderer.invoke('dialog:openVideo'),
  openGpx: () => ipcRenderer.invoke('dialog:openGpx'),
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  readTextFile: (filePath) => ipcRenderer.invoke('file:readText', filePath),
});
