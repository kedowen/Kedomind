const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onMenuNew: (callback) => ipcRenderer.on("menu-new", callback),
  onMenuAbout: (callback) => ipcRenderer.on("menu-about", callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  getAppVersion: () => process.versions.app,
  getNodeVersion: () => process.versions.node,
  getChromeVersion: () => process.versions.chrome,
  getElectronVersion: () => process.versions.electron,
  platform: process.platform,
  isDev: process.env.NODE_ENV === "development",

  // 自动更新相关
  // onUpdateAvailable: (callback) =>
  //   ipcRenderer.on("update-available", (event, info) => callback(info)),
  // onUpdateDownloadProgress: (callback) =>
  //   ipcRenderer.on("update-download-progress", (event, progress) =>
  //     callback(progress)
  //   ),
  // onUpdateDownloaded: (callback) =>
  //   ipcRenderer.on("update-downloaded", (event, info) => callback(info)),
  // onUpdateError: (callback) =>
  //   ipcRenderer.on("update-error", (event, error) => callback(error)),
  // startDownloadUpdate: () => ipcRenderer.send("start-download-update"),
  // quitAndInstall: () => ipcRenderer.send("quit-and-install"),

  // 窗口控制相关API
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowHide: () => ipcRenderer.send("window-hide"),
  windowShow: () => ipcRenderer.send("window-show"),
  windowQuit: () => ipcRenderer.send("window-quit"),
  getWindowState: () => ipcRenderer.invoke("get-window-state"),
  onWindowStateChange: (callback) => ipcRenderer.on("window-state-changed", callback),
  openDevTools: () => ipcRenderer.send("open-devtools"),

  // MCP相关API
  mcpGetTools: (id, config, reconnect = false) => ipcRenderer.invoke("mcp-get-tools", id, config, reconnect),
  mcpCallTool: (id, toolName, parameters, config, sessionId) =>
    ipcRenderer.invoke("mcp-call-tool", id, toolName, parameters, config, sessionId),
  mcpDisconnect: (id) => ipcRenderer.invoke("mcp-disconnect", id),
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
});
