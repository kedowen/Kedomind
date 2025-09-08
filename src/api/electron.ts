/**
 * 获取可用工具列表
 */
export const mcpGetTools = async (id: string, config: any, reconnect: boolean = false) => {
  try {
    console.log(`🔌 [API] mcpGetTools 调用 - ID: ${id}, 重连: ${reconnect}`);
    console.log(`🔌 [API] 传递的配置:`, JSON.stringify(config, null, 2));
    
    // 验证配置参数
    if (!config) {
      throw new Error('Config is required');
    }
    
    if (config.url && typeof config.url !== 'string') {
      console.error(`❌ [API] URL类型错误: 期望string，实际${typeof config.url}`, config.url);
      throw new Error(`Invalid URL type: expected string, got ${typeof config.url}`);
    }
    
    if (window.electronAPI) {
      console.log(`🔌 [API] 调用 electronAPI.mcpGetTools`);
      const result = await window.electronAPI.mcpGetTools!(id, config, reconnect);
      console.log(`🔌 [API] mcpGetTools 结果:`, result);
      return result;
    }
    throw new Error('Electron API not available');
  } catch (error) {
    console.error(`❌ [API] mcpGetTools 失败:`, error);
    throw new Error(error as string);
  }
};

// 调用mcp工具
export const mcpCallTool = async (id: string, functionName: string, args: any, config?: any, sessionId?: string) => {
  if (window.electronAPI) {
    return await window.electronAPI.mcpCallTool!(id, functionName, args, config, sessionId);
  }
  throw new Error('Electron API not available');
};

export const mcpDisconnect = async (id: string) => {
  if (window.electronAPI) {
    return await window.electronAPI.mcpDisconnect!(id);
  }
  throw new Error('Electron API not available');
};

