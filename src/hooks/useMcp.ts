
import { McpConfigItem, McpConfigItemType, McpConnectStatus, McpTool } from "@/types"
import { awaitWrapper, mcpGetTools, mcpCallTool, addUserMcp, UpdateUserMcp, getUserMcpList, removeUserMcp, mcpDisconnect } from "@/api"
import { mcpConfigLocal } from "@/local/mcpConfigLocal"
import { useUserStore } from "@/store/user"
import { nanoid } from 'nanoid';

export const useMcp = () => {
  // 将mcp工具转换为大模型工具
  const mcpToolToModelTool = (tool: McpTool) => {
    return {
      type: "function",
      function: {
        description: tool.description,
        name: tool.name,
        parameters: {
          type: tool?.inputSchema?.type || "object",
          properties: tool?.inputSchema?.properties || {},
          required: tool?.inputSchema?.required || []
        }
      }
    }
  }
  // 将所有选择的mcp工具合并
  const mergeMcpTools = (mcpItems: McpConfigItem[]) => {
    const mergeArray: any[] = []
    for (const item of mcpItems) {
      const tools = item.tools?.map(tool => mcpToolToModelTool(tool))
      if (Array.isArray(tools)) {
        mergeArray.push(...tools)
      }
    }
    return mergeArray
  }
  const getProcessedConfig = (config: McpConfigItem): any => {
    // 处理请求头的辅助函数
    const parseHeaders = (headersString: string) => {
      if (!headersString) return {};

      try {
        // 尝试解析为JSON格式（向后兼容）
        return JSON.parse(headersString);
      } catch {
        // 如果不是JSON格式，按照key=value格式解析
        const headers: Record<string, string> = {};
        const headerLines = headersString.split('\n').filter(line => line.trim());

        for (const line of headerLines) {
          const equalIndex = line.indexOf('=');
          if (equalIndex > 0) {
            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();
            if (key && value) {
              headers[key] = value;
            }
          }
        }
        return headers;
      }
    };

    switch (config.type) {
      case McpConfigItemType.HTTP:
      case 'streamableHttp': // 兼容字符串格式
        console.log(`🔧 [MCP] 处理HTTP配置 - URL: ${config.url}, 类型: ${config.type}`);
        return {
          name: config.id,
          type: 'streamableHttp', // 保持与 builtinMcp.json 一致
          url: config.url,
          headers: parseHeaders(config.headers),
        };
      case McpConfigItemType.STDIO:
      case 'stdio': // 兼容字符串格式
        // 处理参数，确保 Windows 路径中的反斜杠正确
        let processedArgs = config?.params?.split('\n').map(arg => arg.trim()) || [];
        // 如果参数中包含路径，确保反斜杠正确
        processedArgs = processedArgs.map(arg => {
          // 检查是否是路径参数（包含 --directory 等）
          if (arg.includes('--directory') || arg.includes('\\')) {
            // 确保路径中的反斜杠正确
            return arg.replace(/\\\\/g, '\\');
          }
          return arg;
        });

        // 处理环境变量
        const parseEnv = (envString: string) => {
          if (!envString) return {};
          
          const env: Record<string, string> = {};
          const envLines = envString.split('\n').filter(line => line.trim());
          
          for (const line of envLines) {
            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
              const key = line.substring(0, equalIndex).trim();
              const value = line.substring(equalIndex + 1).trim();
              if (key && value) {
                env[key] = value;
              }
            }
          }
          return env;
        };

        return {
          name: config.id,
          type: 'stdio',
          command: config.command,
          args: processedArgs,
          env: parseEnv(config.env || ''),
        };
      case McpConfigItemType.SSE:
      case 'sse': // 兼容字符串格式
        return {
          name: config.id,
          type: 'sse',
          url: config.url,
          headers: parseHeaders(config.headers),
        };
      default:
        // 默认处理 HTTP 类型（向后兼容）
        console.warn(`Unknown MCP type: ${config.type}, 默认按 HTTP 类型处理`);
        return {
          name: config.id,
          type: 'streamableHttp',
          url: config.url,
          headers: parseHeaders(config.headers),
        };
    }
  }
  // 根据mcp配置获取对应tool
  const getToolsByMcpConfig = async (config: McpConfigItem, reconnect = false) => {
    try {
      if (!config.id) {
        throw new Error('MCP config id is required');
      }
      
      const processedConfig = getProcessedConfig(config);
      console.log(`🔧 [MCP-HOOK] 处理后的配置 (${config.name}):`, JSON.stringify(processedConfig, null, 2));
      
      // 验证URL是否为字符串
      if (processedConfig.url && typeof processedConfig.url !== 'string') {
        console.error(`❌ [MCP-HOOK] URL类型错误: ${typeof processedConfig.url}`, processedConfig.url);
        throw new Error(`Invalid URL type: expected string, got ${typeof processedConfig.url}`);
      }
      
      const result = await mcpGetTools(String(config.id), processedConfig, reconnect)
      console.log('getToolsByMcpConfig->result', result);
      // 检查返回的是否是错误对象
      if (result && typeof result === 'object' && 'error' in result && (result as any).error) {
        throw new Error(String((result as any).message || 'Unknown MCP error'));
      }
      if(result && typeof result === 'object' && 'tools' in result && Array.isArray(result.tools)){
        return result.tools as McpTool[];
      }
      return (result as McpTool[]) || [];
    } catch (error) {
      throw error;
    }
  }

  // 调用MCP工具
  const callMcpTool = async (id: string, toolName: string, args: any, config?: any, sessionId?: string) => {
    console.log(`🔧 [MCP-HOOK] 开始调用MCP工具 - 服务器: ${id}, 工具: ${toolName}, 会话: ${sessionId || 'N/A'}`);
    console.log(`🔧 [MCP-HOOK] 参数:`, JSON.stringify(args, null, 2));
    console.log(`🔧 [MCP-HOOK] 配置:`, JSON.stringify(config, null, 2));
    
    try {
      const result = await mcpCallTool(id, toolName, args, config, sessionId)
      console.log(`✅ [MCP-HOOK] API调用返回结果:`, JSON.stringify(result, null, 2));

      // 检查返回的是否是错误对象
      if (result && typeof result === 'object' && 'error' in result && result.error) {
        console.error(`❌ [MCP-HOOK] MCP工具调用失败 - ${toolName}:`, result.message);
        console.error(`❌ [MCP-HOOK] 错误详情:`, result);
        return {
          content: [
            {
              type: "text",
              text: `工具调用失败: ${result.message}`,
            },
          ],
          isError: true,
        };
      }
      
      console.log(`✅ [MCP-HOOK] MCP工具调用成功 - ${toolName}, 会话: ${sessionId || 'N/A'}`);
      return result;
    } catch (error) {
      console.error(`❌ [MCP-HOOK] IPC调用异常 - ${toolName}:`, error);
      console.error(`❌ [MCP-HOOK] 异常堆栈:`, error instanceof Error ? error.stack : String(error));
      return {
        content: [
          {
            type: "text",
            text: `工具调用失败: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  // 反向查找servername
  const getMcpToolByToolName = (toolName: string, mcpItems) => {

    // 通过反向遍历mcpItems查找对应的serverName
    if (mcpItems && mcpItems.length > 0) {
      for (const mcpItem of mcpItems) {
        if (mcpItem.tools && Array.isArray(mcpItem.tools)) {
          const foundTool = mcpItem.tools.find(tool => tool.name === toolName);
          if (foundTool) {
            return mcpItem;
          }
        }
      }
    }
    return null;
  }

  // 将后台接口参数转换为前端参数
  const convertToFrontendParams = (item: any): McpConfigItem => {
    // 处理从后端返回的参数，恢复 Windows 路径中的反斜杠
    let processedParams = item?.mcppara || '';
    if (processedParams && item?.serviceType === McpConfigItemType.STDIO) {
      // 将双反斜杠恢复为单反斜杠
      processedParams = processedParams.replace(/\\\\/g, '\\');
    }

    return {
      date: item?.createDate || '',
      description: item?.description || '',
      isAvailable: item?.isAvailable || false,
      id: item?.id || '',
      command: item?.mcpcommand || '',
      params: processedParams,
      env: item?.mcpenv || '', // 环境变量字段
      name: item?.name || '',
      headers: item?.requestHeaders || '',
      timeout: item?.requestTimeout || '',
      type: item?.serviceType || '',
      url: item.url,
      tools: [],
      serverName: item?.id, // 兼容字段，但使用 id
      connectStatus: McpConnectStatus.NOT_CONNECTED
    }
  }

  // 将前端参数转换为后台接口参数
  const convertToBackendParams = (item: McpConfigItem) => {
    // 处理 Windows 路径中的反斜杠，确保在传输过程中不被丢失
    let processedParams = item?.params || '';
    if (processedParams && item?.type === McpConfigItemType.STDIO) {
      // 将单反斜杠替换为双反斜杠，确保 JSON 序列化时正确保留
      processedParams = processedParams.replace(/\\/g, '\\\\');
    }

    return {
      "id": item?.id || '',
      "name": item?.name || '',
      "description": item?.description || '',
      "serviceType": item?.type || '',
      "url": item?.url || '',
      "requestHeaders": item?.headers || '',
      "requestTimeout": item?.timeout || 60,
      "isAvailable": item?.isAvailable || false,
      "mcpcommand": item?.command || '',
      "mcppara": processedParams,
      "mcpenv": item?.env || '' // 环境变量字段
    }
  }

  // 添加MCP配置
  const addMcpConfig = async (config: McpConfigItem) => {
    const userStore = useUserStore();
    try {
      // 先调用后台API创建
      const backendParams = { ...convertToBackendParams(config), userId: userStore.getUserId };
      const [apiError, apiResult] = await awaitWrapper(addUserMcp(backendParams));

      if (apiError) {
        throw apiError;
      }

      if (apiResult && apiResult.data) {
        // 使用后端返回的 id，先拉取工具，最后一次性写入本地
        const createdId = String(apiResult.data);
        const configWithId: McpConfigItem = { ...config, id: createdId } as McpConfigItem;

        let tools: McpTool[] = [];
        let connectStatus: McpConnectStatus = McpConnectStatus.CONNECTED;
        let errorMessage: string = '';
        try {
          tools = await getToolsByMcpConfig(configWithId, true);
        } catch (err) {
          tools = [];
          connectStatus = McpConnectStatus.CONNECT_FAILED;
          errorMessage = err instanceof Error ? err.message : String(err);
        }

        const [localError, localResult] = await mcpConfigLocal.createMcpConfig({
          id: createdId,
          userId: String(userStore.getUserId),
          description: config.description || '',
          command: config.command || '',
          params: config.params || '',
          env: config.env || '',
          name: config.name || '',
          headers: config.headers || '',
          timeout: config.timeout || '',
          type: config.type || '',
          url: config.url || '',
          tools,
          error: errorMessage,
          connectStatus,
        });
        if (localError) {
          console.error('保存到本地失败:', localError);
        }
        return localResult;
      }
    } catch (error) {
      console.error('添加MCP配置失败:', error);
      throw error;
    }
  };

  // 更新MCP配置
  const updateMcpConfig = async (config: McpConfigItem, isLocal: boolean = false) => {
    const userStore = useUserStore();
    const patch = {
      description: config.description,
      command: config.command,
      params: config.params,
      env: config.env,
      name: config.name,
      headers: config.headers,
      timeout: config.timeout, // 保持原类型
      type: config.type,
      url: config.url,
      tools: config.tools,
      error: config.error,
      connectStatus: config.connectStatus,
    } as any;

    const [err, res] = await mcpConfigLocal.updateMcpConfig({
      userId: String(userStore.getUserId),
      configId: config.id || '',
      patch,
    });
    if (!err && !isLocal) {
      // 尝试远端同步；失败仅告警，不影响本地结果
      try {
        const backendParams = { ...convertToBackendParams(config), userId: userStore.getUserId };
        await awaitWrapper(UpdateUserMcp(backendParams));
        // 配置变更后，不主动断开；后续获取工具时以 reconnect=true 重新连接
      } catch (e) {
        console.warn('远端同步失败(已本地更新):', e);
      }

      // 远端同步后，一次性拉工具并更新本地，避免多次更新
      if (config.id) {
        let tools: McpTool[] = [];
        let connectStatus: McpConnectStatus = McpConnectStatus.CONNECTED;
        let errorMessage = '';
        try {
          tools = await getToolsByMcpConfig(config as McpConfigItem, true);
        } catch (fetchErr) {
          tools = [];
          connectStatus = McpConnectStatus.CONNECT_FAILED;
          errorMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        }
        await mcpConfigLocal.updateMcpConfig({
          userId: String(userStore.getUserId),
          configId: String(config.id),
          patch: { tools, connectStatus, error: errorMessage },
        });
      }
    } else {
      throw err;
    }
    return res;
  };

  // 查询MCP配置列表
  const getMcpConfigList = async () => {
    const userStore = useUserStore();

    // 优先使用本地存储
    try {
      const [localError, localResult] = await mcpConfigLocal.getMcpConfigList({
        userId: String(userStore.getUserId),
      });
      console.log(localResult);


      if (!localError && localResult) {
        // 本地查询成功，转换为前端格式
        const items = localResult.items.map(record => ({
          id: record.id,
          description: record.description,
          command: record.command,
          params: record.params,
          env: record.env,
          name: record.name,
          headers: record.headers,
          timeout: record.timeout,
          type: record.type,
          url: record.url,
          tools: record.tools,
          error: record.error,
          connectStatus: record.connectStatus,
          userId: record.userId,
          createTime: record.createTime,
          updateTime: record.updateTime,
        }));

        return [null, { items, total: localResult.total }];
      }
    } catch (localErr) {
      console.warn('本地存储查询失败，尝试远程API:', localErr);
    }
    // 本地存储失败，回退到远程API
    try {
      const [apiError, apiResult] = await awaitWrapper(
        getUserMcpList({
          userId: String(userStore.getUserId),
        })
      );

      if (apiError) {
        throw apiError;
      }

      if (apiResult && apiResult.data) {
        // 转换远程数据格式
        const items = apiResult.data.map((item: any) => ({
          ...convertToFrontendParams(item),
          mcpServerId: item.mcpServerId,
        }));

        // 为每个配置获取工具信息
        for (const item of items) {
          try {
            const tools = await getToolsByMcpConfig(item);
            item.tools = tools;
            item.connectStatus = McpConnectStatus.CONNECTED;
          } catch (error) {
            console.warn(`获取配置 ${item.name} 的工具失败:`, error);
            item.tools = [];
            item.connectStatus = McpConnectStatus.CONNECT_FAILED;
          }
        }

        return [null, { items, total: items.length }];
      }
    } catch (error) {
      console.error('查询MCP配置失败:', error);
      throw error;
    }
  };

  // 根据ID查询单个MCP配置（包含工具）
  const getMcpConfigById = async (configId: string) => {
    try {
      const userStore = useUserStore();
      const userIdStr = String(userStore.getUserId);
      const [err, rec] = await mcpConfigLocal.getMcpConfigById({
        userId: userIdStr,
        configId,
      });
      if (err) return [err, null];
      if (!rec) return [null, null];

      let item: any = { ...rec };
      // 确保工具已加载
      if (!item.tools || item.tools.length === 0) {
        try {
          const tools = await getToolsByMcpConfig(item);
          item = { ...item, tools };
        } catch {
          // 忽略获取工具失败，仍返回基本配置
        }
      }
      return [null, item];
    } catch (e) {
      return [e as any, null];
    }
  };

  // 删除MCP配置
  const deleteMcpConfig = async (configId: string) => {
    const userStore = useUserStore();

    // 优先使用本地存储
    try {
      const [localError, localResult] = await mcpConfigLocal.deleteMcpConfig({
        userId: String(userStore.getUserId),
        configId,
      });

      if (!localError && localResult) {
        // 本地删除成功，尝试断开 client（忽略断开异常）
        try { await mcpDisconnect(String(configId)); } catch {}
        // 本地删除成功，同时尝试同步到远程
        try {
          await awaitWrapper(
            removeUserMcp({
              id: configId,
              userId: String(userStore.getUserId),
            })
          );
        } catch (remoteErr) {
          console.warn('远程同步失败，但本地已删除:', remoteErr);
        }

        return [null, true];
      }
    } catch (localErr) {
      console.warn('本地存储删除失败，尝试远程API:', localErr);
    }

    // 本地存储失败，回退到远程API
    try {
      const [apiError, apiResult] = await awaitWrapper(
        removeUserMcp({
          id: configId,
          userId: String(userStore.getUserId),
        })
      );

      if (apiError) {
        throw apiError;
      }

      // 远程删除成功后，尝试断开 client
      try { await mcpDisconnect(String(configId)); } catch {}
      return [null, true];
    } catch (error) {
      console.error('删除MCP配置失败:', error);
      throw error;
    }
  };

  return {
    mergeMcpTools,
    mcpToolToModelTool,
    getToolsByMcpConfig,
    callMcpTool,
    convertToBackendParams,
    convertToFrontendParams,
    getMcpToolByToolName,
    getProcessedConfig, // 导出配置处理函数
    addMcpConfig,
    updateMcpConfig,
    getMcpConfigList,
    getMcpConfigById,
    deleteMcpConfig
  }
}