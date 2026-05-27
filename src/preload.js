const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usageMonitor', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  openSource: (id) => ipcRenderer.invoke('source:open', id),
  snapshotSource: (id) => ipcRenderer.invoke('source:snapshot', id),
  snapshotAll: () => ipcRenderer.invoke('source:snapshotAll'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('app:toggleAlwaysOnTop'),
  openConfig: () => ipcRenderer.invoke('app:openConfig'),
});
