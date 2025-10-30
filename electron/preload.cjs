const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
})

// Expose API for receiving messages from main process
contextBridge.exposeInMainWorld('electronAPI', {
  onStartRecording: (callback) => {
    ipcRenderer.on('start-recording', (_event, ...args) => callback(...args))
  },
  removeStartRecordingListener: (callback) => {
    ipcRenderer.removeListener('start-recording', callback)
  },
})

