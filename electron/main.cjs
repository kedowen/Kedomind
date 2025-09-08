const { app, BrowserWindow, shell, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const log = require("electron-log");
const isDev = process.env.NODE_ENV === "development";

// MCP相关模块
const { McpManager } = require("./mcp/McpManager.cjs");
let mainWindow;
let tray = null;

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

// MCP相关全局变量
let mcpManager = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, "../public/logo-mind_64.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.cjs"),
      // 使用持久化 session，确保数据在应用重启后仍然存在
      partition: 'persist:kedo-mind',
    },
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
  });

  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// 窗口控制事件处理
ipcMain.on("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    // 通知前端窗口状态变化
    mainWindow.webContents.send("window-state-changed", {
      isMaximized: mainWindow.isMaximized(),
    });
  }
});

ipcMain.handle("get-window-state", () => {
  if (mainWindow) {
    return { isMaximized: mainWindow.isMaximized() };
  }
  return { isMaximized: false };
});

ipcMain.on("window-close", () => {
  if (mainWindow) {
    mainWindow.hide(); // 隐藏到托盘而不是关闭
  }
});

ipcMain.on("window-hide", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on("window-show", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on("window-quit", () => {
  app.quit();
});

// 打开开发者工具
ipcMain.on("open-devtools", () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
});

// 创建托盘
function createTray() {
  tray = new Tray(path.join(__dirname, "../public/logo-mind_32.ico"));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "显示主窗口",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "退出",
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setToolTip("KedoMind");
    tray.setContextMenu(contextMenu);

  // 点击托盘图标显示主窗口
  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 自动更新相关
// if (!isDev) {
//   const { autoUpdater } = require("electron-updater");
//   autoUpdater.logger = require("electron-log");
//   autoUpdater.logger.transports.file.level = "info";

//   // 禁用自动下载，只检查更新
//   autoUpdater.autoDownload = false;

//   // 通知前端有新版本
//   autoUpdater.on("update-available", (info) => {
//     if (mainWindow) {
//       mainWindow.webContents.send("update-available", info);
//     }
//   });

//   // 下载进度
//   autoUpdater.on("download-progress", (progressObj) => {
//     if (mainWindow) {
//       mainWindow.webContents.send("update-download-progress", progressObj);
//     }
//   });

//   // 下载完成
//   autoUpdater.on("update-downloaded", (info) => {
//     if (mainWindow) {
//       mainWindow.webContents.send("update-downloaded", info);
//     }
//   });

//   // 错误
//   autoUpdater.on("error", (err) => {
//     if (mainWindow) {
//       mainWindow.webContents.send(
//         "update-error",
//         err == null ? "未知错误" : (err.stack || err).toString()
//       );
//     }
//   });

//   // 前端请求：检查更新
//   ipcMain.on("check-for-updates", () => {
//     autoUpdater.checkForUpdates();
//   });

//   // 前端请求：开始下载
//   ipcMain.on("start-download-update", () => {
//     autoUpdater.downloadUpdate();
//   });

//   // 前端请求：重启并安装
//   ipcMain.on("quit-and-install", () => {
//     autoUpdater.quitAndInstall();
//   });

//   // 应用启动时只检查更新，不自动下载
//   app.on("ready", () => {
//     setTimeout(() => {
//       autoUpdater.checkForUpdates();
//     }, 3000);
//   });
// }

// 通过mcp-client获取tools
ipcMain.handle("mcp-get-tools", async (event, id, config, reconnect = false) => {
  try {
    if (!mcpManager) {
      mcpManager = new McpManager();
    }
    
    log.info(`🔧 [MAIN] 获取MCP工具 - 服务器: ${id}, 类型: ${config?.type}, 重连: ${reconnect}`);
    return await mcpManager.getTools(id, config, reconnect);
  } catch (error) {
    console.log(config);
    
    console.error(`❌ 连接 ${config?.name || id} 失败:`, error);
    return {
      error: true,
      message: error.message,
      details: error.toString()
    };
  }
});

ipcMain.handle("mcp-call-tool", async (event, id, toolName, args, config, sessionId) => {
  try {
    if (!mcpManager) {
      mcpManager = new McpManager();
    }
    console.log(`🛠️ [MAIN] 调用MCP工具 - 服务器: ${id}, 工具: ${toolName}, 会话: ${sessionId || 'N/A'}`);
    return await mcpManager.callTool(id, toolName, args, config, sessionId);
  } catch (error) {
    console.error("调用MCP工具失败:", error);
    return {
      error: true,
      message: error.message,
      details: error.toString()
    };
  }
});

// 断开并移除指定 id 的 client
ipcMain.handle("mcp-disconnect", async (event, id) => {
  try {
    if (!mcpManager) {
      mcpManager = new McpManager();
    }
    return await mcpManager.disconnect(id);
  } catch (error) {
    return { error: true, message: error.message };
  }
});

// 🧪 测试MCP初始化和sessionId获取
ipcMain.handle("mcp-test-initialization", async (event, config) => {
  try {
    if (!mcpManager) {
      mcpManager = new McpManager();
    }
    
    log.info(`🧪 [MAIN] 测试MCP初始化 - 配置: ${JSON.stringify(config)}`);
    return await mcpManager.testInitialization(config);
  } catch (error) {
    console.error("测试MCP初始化失败:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 单实例处理
if (!gotTheLock) {
  console.log('应用已经在运行，退出当前实例');
  app.quit();
} else {
  // 当运行第二个实例时，聚焦到主窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      // 如果窗口被隐藏（最小化到托盘），先显示窗口
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      // 如果窗口被最小化，恢复窗口
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      // 聚焦到窗口
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray(); // 创建托盘

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
