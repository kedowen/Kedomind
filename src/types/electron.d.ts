// Electron API 类型定义

import { McpTool } from "./mcp";

export interface ElectronAPI {
  // 菜单相关
  onMenuNew: (callback: (data: any) => void) => void;
  onMenuAbout: (callback: (data: any) => void) => void;
  removeAllListeners: (channel: string) => void;
  
  // 版本信息
  getAppVersion: () => string;
  getNodeVersion: () => string;
  getChromeVersion: () => string;
  getElectronVersion: () => string;
  platform: string;
  isDev: boolean;

  // 自动更新相关
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: any) => void) => void;
  startDownloadUpdate: () => void;
  quitAndInstall: () => void;
  
  // 窗口控制相关API
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowHide: () => void;
  windowShow: () => void;
  windowQuit: () => void;
  getWindowState: () => Promise<{ isMaximized: boolean }>;
  onWindowStateChange: (callback: (event: any, state: { isMaximized: boolean }) => void) => void;
  openDevTools: () => void;
  
  // MCP相关API
  mcpInitialize?: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    result?: any;
  }>;
  mcpChatWithAI?: (userQuery: string) => Promise<{
    success: boolean;
    answer?: string;
    error?: string;
    steps?: number;
  }>;
  mcpSimpleChat?: (userQuery: string) => Promise<{
    success: boolean;
    answer?: string;
    error?: string;
  }>;
  mcpGetStatus?: () => Promise<{
    isInitialized: boolean;
    hasTools: boolean;
    toolCount: number;
  }>;
  mcpSetModel?: (modelConfig: { url: string; key: string; model: string }) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  mcpGetTools?: (id: string, config: any, reconnect?: boolean) => Promise<McpTool[]>;
  mcpCallTool?: (id: string, functionName: string, args: any, config?: any, sessionId?: string) => Promise<any>;
  mcpDisconnect?: (id: string) => Promise<boolean | { error: boolean; message: string }>;
  
  // MCP流事件监听
  onMcpStreamEvent?: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
} 