// MCP客户端管理器 - 使用官方@modelcontextprotocol/sdk
class McpManager {
  constructor() {
    this.Client = null;
    this.clients = new Map(); // 存储按会话隔离的客户端连接：key = serverId, value = Map<sessionId, client>
    this.sharedClients = new Map(); // 存储共享客户端连接：key = serverId, value = client
    console.log("🔧 [MCP] McpManager 初始化 - 支持会话隔离的并行请求");
  }

  async loadMcpClient() {
    const mcpModule = await import("@modelcontextprotocol/sdk/client/index.js");
    this.Client = mcpModule.Client;
  }

  // 创建传输层配置
  async createTransport(config) {
    console.log(`🔗 [MCP] 开始创建传输层，配置:`, JSON.stringify(config, null, 2));
    
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    
    console.log(`🔗 [MCP] 导入的传输类:`, {
      StdioClientTransport: typeof StdioClientTransport,
      SSEClientTransport: typeof SSEClientTransport,
      StreamableHTTPClientTransport: typeof StreamableHTTPClientTransport
    });

    switch (config.type) {
      case 'stdio':
        return new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env || {}
        });
      
      case 'sse':
        console.log(`🔗 [MCP] 创建 SSE 传输 - URL: ${config.url}`);
        
        if (!config.url || typeof config.url !== 'string') {
          throw new Error(`无效的SSE URL配置: ${typeof config.url === 'object' ? JSON.stringify(config.url) : config.url}`);
        }
        
        // 用户要求使用真正的 SSE，不降级
        console.log(`🔗 [MCP] 使用真正的 SSE 连接`);
        
        let sseUrl = config.url.trim();
        
        // 详细的URL分析和验证
        console.log(`🔍 [MCP] 开始SSE URL分析和验证:`);
        console.log(`🔍 [MCP] 原始URL: "${sseUrl}"`);
        console.log(`🔍 [MCP] URL长度: ${sseUrl.length}`);
        console.log(`🔍 [MCP] URL字符代码:`, Array.from(sseUrl).map(char => `${char}(${char.charCodeAt(0)})`).join(' '));
        
        // 检查常见的非法字符
        const illegalChars = [];
        const dangerousChars = ['&', '=', ' ', '"', "'", '<', '>', '{', '}', '|', '\\', '^', '`'];
        
        for (let i = 0; i < sseUrl.length; i++) {
          const char = sseUrl[i];
          const charCode = char.charCodeAt(0);
          
          // 检查不可打印字符
          if (charCode < 32 || charCode > 126) {
            if (charCode !== 9 && charCode !== 10 && charCode !== 13) { // 排除tab、换行、回车
              illegalChars.push(`${char}(${charCode}) at position ${i}`);
            }
          }
        }
        
        if (illegalChars.length > 0) {
          console.error(`❌ [MCP] 发现非法字符:`, illegalChars);
          throw new Error(`SSE URL包含非法字符: ${illegalChars.join(', ')}`);
        }
        
        // 尝试解析URL
        let urlObj;
        try {
          urlObj = new URL(sseUrl);
          console.log(`✅ [MCP] URL解析成功`);
        } catch (urlError) {
          console.error(`❌ [MCP] URL解析失败:`, urlError);
          console.error(`❌ [MCP] 尝试分析URL问题...`);
          
          // 分析可能的问题
          if (sseUrl.includes(' ')) {
            console.error(`❌ [MCP] URL包含空格，需要编码`);
            const fixedUrl = sseUrl.replace(/ /g, '%20');
            console.log(`🔧 [MCP] 尝试修复空格: ${fixedUrl}`);
            try {
              urlObj = new URL(fixedUrl);
              sseUrl = fixedUrl;
              console.log(`✅ [MCP] 空格修复成功`);
            } catch (e) {
              console.error(`❌ [MCP] 空格修复失败:`, e.message);
            }
          }
          
          if (!urlObj) {
            throw new Error(`SSE URL格式无效: ${urlError.message}\n原始URL: "${sseUrl}"`);
          }
        }
        
        // 详细分析URL组件
        console.log(`🔍 [MCP] URL组件分析:`, {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port,
          pathname: urlObj.pathname,
          search: urlObj.search,
          searchParams: Object.fromEntries(urlObj.searchParams),
          hash: urlObj.hash,
          origin: urlObj.origin
        });
        
        // 检查和修复查询参数
        if (urlObj.search) {
          console.log(`🔍 [MCP] 检查查询参数编码...`);
          const params = new URLSearchParams(urlObj.search);
          let needsRebuilt = false;
          const rebuiltParams = new URLSearchParams();
          
          for (const [key, value] of params) {
            console.log(`🔍 [MCP] 参数: ${key} = "${value}"`);
            
            // 检查参数值是否包含需要编码的字符
            const originalValue = value;
            const encodedValue = encodeURIComponent(decodeURIComponent(value));
            
            if (originalValue !== encodedValue) {
              console.log(`🔧 [MCP] 参数 ${key} 需要重新编码: "${originalValue}" -> "${encodedValue}"`);
              needsRebuilt = true;
            }
            
            rebuiltParams.set(key, value);
          }
          
          if (needsRebuilt) {
            const newSearch = rebuiltParams.toString();
            const newUrl = `${urlObj.origin}${urlObj.pathname}?${newSearch}${urlObj.hash}`;
            console.log(`🔧 [MCP] 重建URL: ${newUrl}`);
            
            try {
              const testUrlObj = new URL(newUrl);
              sseUrl = newUrl;
              urlObj = testUrlObj;
              console.log(`✅ [MCP] URL重建成功`);
            } catch (e) {
              console.warn(`⚠️ [MCP] URL重建失败，使用原始URL:`, e.message);
            }
          }
        }
        
        console.log(`🔗 [MCP] 最终使用的SSE URL: ${sseUrl}`);
        
        // 创建 SSE 传输，使用正确的配置格式
        console.log(`🔗 [MCP] 创建 SSEClientTransport: ${sseUrl}`);
        
        // 跳过EventSource验证，直接使用SSE连接
        console.log(`🚀 [MCP] 跳过EventSource验证，直接使用SSE连接`);
        console.log(`🔗 [MCP] 直接使用URL: ${sseUrl}`);
        const validatedUrl = sseUrl;
          
        // 准备 EventSource 的 headers（用于初始 SSE 连接）
          const eventSourceHeaders = {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...config.headers
          };
          
          // 准备 POST 请求的 headers（用于发送消息）
          const postHeaders = {
            'Content-Type': 'application/json',
            ...config.headers
          };
          
          console.log(`🔗 [MCP] EventSource headers:`, eventSourceHeaders);
          console.log(`🔗 [MCP] POST headers:`, postHeaders);
          
          // 使用正确的 SSEClientTransport 配置格式
          const transportOptions = {
            // EventSource 配置
            eventSourceInit: {
              headers: eventSourceHeaders,
              withCredentials: false
            },
            // POST 请求配置  
            requestInit: {
              headers: postHeaders,
              method: 'POST'
            }
          };
          
          console.log(`🔗 [MCP] SSE Transport 配置:`, JSON.stringify(transportOptions, null, 2));
          
          // 尝试创建 SSE 传输 - 传递 URL 对象而不是字符串
          const urlObject = new URL(validatedUrl);
          console.log(`🔗 [MCP] 创建URL对象: ${urlObject.toString()}`);
          const transport = new SSEClientTransport(urlObject, transportOptions);
          
          console.log(`✅ [MCP] SSEClientTransport 创建成功`);
          return transport;
      
      case 'httpStream':
      case 'streamableHttp':
      default:
        console.log(`🔗 [MCP] 创建 StreamableHTTP 传输 - URL: ${config.url}`);
        console.log(`🔗 [MCP] 配置类型: ${config.type}, Headers:`, config.headers);
        
        if (!config.url || typeof config.url !== 'string') {
          throw new Error(`无效的URL配置: ${typeof config.url === 'object' ? JSON.stringify(config.url) : config.url}`);
        }
        
        // 确保 URL 是有效的
        try {
          new URL(config.url); // 验证 URL 格式
        } catch (error) {
          throw new Error(`无效的URL格式: ${config.url} - ${error.message}`);
        }
        
        console.log(`🔗 [MCP] 正在创建 StreamableHTTPClientTransport，参数:`, {
          url: config.url,
          headers: config.headers || {}
        });
        
        // 临时调试：详细记录配置信息
        console.log(`🔍 [MCP-DEBUG] 完整配置信息:`, {
          configName: config.name || '未知',
          configType: config.type,
          configUrl: config.url,
          configHeaders: config.headers,
          configTimeout: config.timeout,
          urlType: typeof config.url,
          headersType: typeof config.headers
        });
        
        // 处理URL和headers参数
        const url = config.url;
        let headers = config.headers || {};
        
        // 确保headers是对象格式
        if (typeof headers === 'string') {
          try {
            headers = JSON.parse(headers);
            console.log(`🔗 [MCP] Headers从字符串解析为对象:`, headers);
          } catch (parseError) {
            console.warn(`⚠️ [MCP] Headers字符串解析失败，使用空对象:`, parseError.message);
            headers = {};
          }
        }
        
        console.log(`🔗 [MCP] 尝试创建 StreamableHTTPClientTransport:`);
        console.log(`🔗 [MCP] - URL (${typeof url}):`, url);
        console.log(`🔗 [MCP] - Headers (${typeof headers}):`, headers);
        
        try {
          // 验证 URL 是字符串类型
          if (typeof url !== 'string') {
            throw new Error(`URL必须是字符串类型，当前类型: ${typeof url}, 值: ${JSON.stringify(url)}`);
          }
          
          // 创建 URL 对象
          const urlObj = new URL(url);
          console.log(`🔗 [MCP] URL对象创建成功: ${urlObj.toString()}`);
          
          // 准备 requestInit 配置，包含 headers
          const requestInit = { headers: {} };
          
          // 🔧 添加MCP协议版本头（必需）
          requestInit.headers['MCP-Protocol-Version'] = '2025-06-18';
          
          // 🔧 根据MCP规范，初始连接不传递Mcp-Session-Id，让服务器在InitializeResult中分配
          console.log(`🔗 [MCP] 初始连接，不传递Mcp-Session-Id，等待服务器分配`);
          
          // 添加用户自定义headers
          if (headers && Object.keys(headers).length > 0) {
            Object.assign(requestInit.headers, headers);
            console.log(`🔗 [MCP] 添加自定义headers:`, headers);
          }
          
          console.log(`🔗 [MCP] 最终headers:`, requestInit.headers);
          
          // 准备传输选项
          const transportOptions = {};
          if (Object.keys(requestInit).length > 0) {
            transportOptions.requestInit = requestInit;
          }
          
          console.log(`🔗 [MCP] 最终传输配置:`, JSON.stringify(transportOptions, null, 2));
          
          // 创建传输层：URL对象 + 选项对象
          const transport = new StreamableHTTPClientTransport(urlObj, transportOptions);
          console.log(`✅ [MCP] StreamableHTTPClientTransport 创建成功，包含headers`);
          return transport;
          
        } catch (error) {
          console.error(`❌ [MCP] StreamableHTTPClientTransport 创建失败:`, error);
          console.error(`❌ [MCP] URL:`, url);
          console.error(`❌ [MCP] Headers:`, headers);
          throw error;
        }
    }
  }

  async getTools(id, config, reconnect = false) {
    console.log(`🔧 [MCP] 获取工具列表 - 服务器: ${id}, 重连: ${reconnect}`);
    
    // 对于 getTools，使用共享客户端连接（不需要会话隔离）
    if (!this.sharedClients.has(id) || reconnect) {
      // 如果重连，先断开旧连接
      if (reconnect && this.sharedClients.has(id)) {
        console.log(`🔄 [MCP] 重连前断开旧连接: ${id}`);
        const oldClient = this.sharedClients.get(id);
        if (oldClient && typeof oldClient.close === 'function') {
          try {
            await oldClient.close();
          } catch (closeError) {
            console.warn(`⚠️ [MCP] 关闭旧连接时出错: ${closeError.message}`);
          }
        }
        this.sharedClients.delete(id);
      }

      // 创建新的共享客户端连接
      console.log(`🔗 [MCP] 创建共享客户端连接用于工具列表获取: ${id}`);
      await this.createClientConnection(id, config, this.sharedClients);
    }

    const client = this.sharedClients.get(id);
    if (!client) {
      throw new Error(`服务器 ${id} 的共享客户端未连接`);
    }
    
    // 通过 requestOptions 传递 timeout，支持数字和字符串格式
    let timeoutValue = null;
    if (config?.timeout) {
      if (typeof config.timeout === 'number') {
        timeoutValue = config.timeout;
      } else if (typeof config.timeout === 'string') {
        timeoutValue = parseInt(config.timeout);
      }
    }
    const requestOptions = timeoutValue ? { timeout: timeoutValue * 1000 } : undefined;
    console.log(`🔧 [MCP] 调用 listTools，requestOptions:`, requestOptions);
    
    try {
      // 正确的调用方式：第一个参数是 params，第二个参数是 options
      const result = await client.listTools({}, requestOptions);
      console.log(`✅ [MCP] listTools 调用成功，获取到 ${result?.tools?.length || 0} 个工具`);
      return result;
    } catch (listError) {
      console.error(`❌ [MCP] listTools 调用失败:`, {
        error: listError.message,
        name: listError.name,
        stack: listError.stack
      });
      
      throw listError;
    }
  }

  // 获取或创建会话专用的客户端连接
  async getSessionClient(id, config, requestedSessionId) {
    const clientKey = requestedSessionId ? `${id}:${requestedSessionId}` : id;
    console.log(`🔗 [MCP] 获取会话客户端: ${clientKey} (请求的sessionId: ${requestedSessionId || 'N/A'})`);
    
    // 如果没有 requestedSessionId，使用共享客户端
    if (!requestedSessionId) {
      if (!this.sharedClients.has(id)) {
        console.log(`🔗 [MCP] 创建共享客户端连接: ${id}`);
        await this.createClientConnection(id, config, this.sharedClients);
      }
      return this.sharedClients.get(id);
    }
    
    // 有 requestedSessionId，使用会话隔离的客户端
    if (!this.clients.has(id)) {
      this.clients.set(id, new Map());
    }
    
    const sessionClients = this.clients.get(id);
    
    // 🔧 寻找已有的会话客户端，可能使用不同的键（服务器分配的sessionId）
    let existingClient = null;
    let existingKey = null;
    
    for (const [key, client] of sessionClients) {
      if (key === requestedSessionId || 
          (client._serverSessionId && client._serverSessionId === requestedSessionId) ||
          (client._requestedSessionId && client._requestedSessionId === requestedSessionId)) {
        existingClient = client;
        existingKey = key;
        console.log(`🔗 [MCP] 找到已有会话客户端: ${key}`);
        break;
      }
    }
    
    if (!existingClient) {
      console.log(`🔗 [MCP] 创建会话专用客户端连接: ${clientKey}`);
      const client = await this.createClientConnection(clientKey, config, sessionClients, requestedSessionId);
      
      // 🔧 存储请求的sessionId用于后续匹配
      client._requestedSessionId = requestedSessionId;
      
      return client;
    }
    
    return existingClient;
  }

  // 🔧 获取客户端的实际sessionId（优先服务器分配的）
  getActualSessionId(client, requestedSessionId) {
    // 1. 优先使用服务器分配的sessionId
    if (client._serverSessionId) {
      return client._serverSessionId;
    }
    
    // 2. 尝试从transport获取
    if (client.transport && client.transport.sessionId) {
      return client.transport.sessionId;
    }
    
    // 3. 使用请求的sessionId
    if (requestedSessionId) {
      return requestedSessionId;
    }
    
    // 4. 无sessionId（stdio传输或服务器不支持会话）
    return null;
  }

  // 创建客户端连接的通用方法
  async createClientConnection(key, config, storageMap, requestedSessionId = null) {
    if (!this.Client) {
      await this.loadMcpClient();
    }

    const clientName = requestedSessionId ? `kedo-mind-session-${requestedSessionId}` : `kedo-mind-${key}`;
    const client = new this.Client({
      name: clientName,
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    const connectionConfig = { ...(config || {}) };
    delete connectionConfig.timeout;
    
    console.log(`🛠️ [MCP] 连接配置 ${key}:`, JSON.stringify(connectionConfig, null, 2));
    
    try {
      // 🔧 根据MCP规范，初始连接不传递sessionId，让服务器生成
      const transport = await this.createTransport(connectionConfig);
      console.log(`🔗 [MCP] 创建传输层成功: ${transport.constructor.name}`);
      
      // 🔧 连接并执行初始化流程（包含initialize请求）
      await client.connect(transport);
      console.log(`🔗 [MCP] 客户端连接完成，开始获取sessionId`);
      
      // 🔧 从transport获取服务器分配的sessionId（符合MCP规范）
      // sessionId在initialize请求的响应头中返回，存储在transport._sessionId中
      const serverSessionId = transport.sessionId;
      console.log(`🔗 [MCP] 检查transport.sessionId: ${serverSessionId || 'N/A'}`);
      console.log(`🔗 [MCP] transport类型: ${transport.constructor.name}`);
      console.log(`🔗 [MCP] transport: ${JSON.stringify(transport, null, 2)}`);
      // 🔧 debug: 检查transport对象的所有属性
      console.log(`🔗 [MCP] transport属性:`, Object.getOwnPropertyNames(transport).filter(prop => !prop.startsWith('_')));
      if (transport._sessionId !== undefined) {
        console.log(`🔗 [MCP] transport._sessionId: ${transport._sessionId}`);
      }
      
      // 🔧 决定存储键：共享客户端用原始key，会话客户端用sessionId
      let storageKey;
      const isSharedClient = storageMap === this.sharedClients;
      
      if (isSharedClient) {
        // 共享客户端（用于getTools）：始终使用原始key，不管是否有serverSessionId
        storageKey = key;
        console.log(`🔗 [MCP] 共享客户端，使用原始key作为存储键: ${storageKey}`);
      } else {
        // 会话客户端（用于callTool）：优先使用serverSessionId进行会话隔离
        storageKey = serverSessionId || requestedSessionId || key;
        console.log(`🔗 [MCP] 会话客户端，使用sessionId作为存储键: ${storageKey}`);
      }
      
      storageMap.set(storageKey, client);
      
      // 🔧 如果服务器分配了sessionId，存储到客户端对象上
      if (serverSessionId) {
        client._serverSessionId = serverSessionId;
        console.log(`🔗 [MCP] 已存储服务器分配的sessionId: ${serverSessionId}`);
      } else {
        console.log(`⚠️ [MCP] 服务器未分配sessionId，可能是stdio传输或服务器不支持会话`);
      }
      
      console.log(`✅ [MCP] 客户端连接成功: ${key}, 存储键: ${storageKey}, 客户端类型: ${isSharedClient ? '共享' : '会话'}`);
      return client;
    } catch (connectionError) {
      console.error(`❌ [MCP] 客户端连接失败: ${key}`, connectionError);
      throw connectionError;
    }
  }

  async callTool(id, toolName, parameters, config, sessionId) {
    console.log(`🛠️ [MCP] 开始调用工具 - 服务器: ${id}, 工具: ${toolName}, 请求会话: ${sessionId || 'N/A'}`);
    console.log(`🛠️ [MCP] 工具参数:`, JSON.stringify(parameters, null, 2));
    console.log(`🛠️ [MCP] 配置信息:`, JSON.stringify(config, null, 2));

    // 获取会话专用的客户端连接，支持真正的并行请求
    const client = await this.getSessionClient(id, config, sessionId);
    if (!client) {
      const errorMsg = `无法获取服务器 ${id} 的客户端连接`;
      console.error(`❌ [MCP] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // 🔧 获取实际的sessionId（服务器分配的或请求的）
    const actualSessionId = this.getActualSessionId(client, sessionId);
    console.log(`🛠️ [MCP] 实际使用的sessionId: ${actualSessionId || 'N/A'}`);
    if (client._serverSessionId) {
      console.log(`🛠️ [MCP] 服务器分配的sessionId: ${client._serverSessionId}`);
    }

    try {
      console.log(`🛠️ [MCP] 发送工具调用请求: ${toolName}`);
      
      // 通过 requestOptions 传递 timeout，支持数字和字符串格式
      let timeoutValue = null;
      if (config?.timeout) {
        if (typeof config.timeout === 'number') {
          timeoutValue = config.timeout;
        } else if (typeof config.timeout === 'string') {
          timeoutValue = parseInt(config.timeout);
        }
      }
      const requestOptions = timeoutValue ? { timeout: timeoutValue * 1000 } : undefined;
      console.log(`🛠️ [MCP] 请求选项:`, requestOptions);
      
      // 使用官方推荐的 client.request 方式，正确传递 sessionId
      const request = {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: parameters || {},
        }
      };
      
      // 🔧 sessionId现在由服务器在初始化时分配，SDK自动处理HTTP头传递
      if (sessionId) {
        console.log(`🛠️ [MCP] 使用会话ID: ${sessionId} (可能是服务器分配的或请求的)`);
      }
      
      console.log(`🛠️ [MCP] 发送请求:`, JSON.stringify(request, null, 2));
      
      // 使用 client.reques
      const { CallToolResultSchema } = await import("@modelcontextprotocol/sdk/types.js");
      const result = await client.request(request, CallToolResultSchema, requestOptions);
      
      console.log(`✅ [MCP] 工具调用成功: ${toolName}`);
      // console.log(`🛠️ [MCP] 原始响应:`, JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error(`❌ [MCP] 工具调用失败: ${toolName}`, {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      throw error;
    }
  }

  // 测试连接并获取服务器信息
  async testConnection(id, config) {
    console.log(`🔍 [MCP] 测试连接 - 服务器: ${id}`);
    
    try {
      if (!this.Client) {
        await this.loadMcpClient();
      }

      const client = new this.Client({
        name: id,
        version: "1.0.0"
      }, {
        capabilities: {}
      });
      
      const connectionConfig = { ...config };
      delete connectionConfig.timeout;
      
      const transport = await this.createTransport(connectionConfig);
      console.log(`🔗 [MCP] 测试传输层创建成功`);
      
      await client.connect(transport);
      console.log(`✅ [MCP] 测试连接成功`);
      
      // 获取服务器信息
      const serverCapabilities = client.getServerCapabilities();
      const serverVersion = client.getServerVersion();
      const instructions = client.getInstructions();
      
      console.log(`📊 [MCP] 服务器信息:`, {
        capabilities: serverCapabilities,
        version: serverVersion,
        instructions: instructions
      });
      
      // 测试 ping
      try {
        console.log(`🏓 [MCP] 测试 ping...`);
        const pingResult = await client.ping();
        console.log(`✅ [MCP] Ping 成功:`, pingResult);
      } catch (pingError) {
        console.warn(`⚠️ [MCP] Ping 失败:`, pingError.message);
      }
      
      // 尝试关闭测试连接
      try {
        if (typeof client.close === 'function') {
          await client.close();
        }
      } catch (closeError) {
        console.warn(`⚠️ [MCP] 关闭测试连接失败:`, closeError.message);
      }
      
      return {
        success: true,
        serverCapabilities,
        serverVersion,
        instructions,
        connectionType: connectionConfig.type
      };
      
    } catch (error) {
      console.error(`❌ [MCP] 连接测试失败:`, error);
      return {
        success: false,
        error: error.message,
        connectionType: config.type
      };
    }
  }

  // 断开并移除指定 id 的 client
  async disconnect(id, sessionId = null) {
    console.log(`🔌 [MCP] 断开连接 - 服务器: ${id}, 请求断开会话: ${sessionId || 'ALL'}`);
    
    let disconnected = false;
    
    // 断开共享客户端连接
    const sharedClient = this.sharedClients.get(id);
    if (sharedClient) {
      try {
        if (typeof sharedClient.close === 'function') {
          await sharedClient.close();
        }
        console.log(`✅ [MCP] 共享客户端连接已断开: ${id}`);
      } catch (e) {
        console.warn(`⚠️ [MCP] 断开共享连接时出现异常:`, e);
      }
      this.sharedClients.delete(id);
      disconnected = true;
    }
    
    // 断开会话专用客户端连接
    const sessionClients = this.clients.get(id);
    if (sessionClients) {
      if (sessionId) {
        // 🔧 断开特定会话的连接，支持服务器分配的sessionId
        let targetClient = null;
        let targetKey = null;
        
        // 尝试多种方式找到目标客户端
        for (const [key, client] of sessionClients) {
          if (key === sessionId || 
              (client._serverSessionId && client._serverSessionId === sessionId) ||
              (client._requestedSessionId && client._requestedSessionId === sessionId)) {
            targetClient = client;
            targetKey = key;
            break;
          }
        }
        
        if (targetClient) {
          try {
            if (typeof targetClient.close === 'function') {
              await targetClient.close();
            }
            console.log(`✅ [MCP] 会话客户端连接已断开: ${id}:${targetKey} (请求断开: ${sessionId})`);
          } catch (e) {
            console.warn(`⚠️ [MCP] 断开会话连接时出现异常:`, e);
          }
          sessionClients.delete(targetKey);
          disconnected = true;
        } else {
          console.warn(`⚠️ [MCP] 未找到会话客户端: ${id}:${sessionId}`);
        }
        
        // 如果没有其他会话了，清理整个服务器的会话映射
        if (sessionClients.size === 0) {
          this.clients.delete(id);
        }
      } else {
        // 断开所有会话的连接
        for (const [sid, sessionClient] of sessionClients) {
          try {
            if (typeof sessionClient.close === 'function') {
              await sessionClient.close();
            }
            console.log(`✅ [MCP] 会话客户端连接已断开: ${id}:${sid}`);
          } catch (e) {
            console.warn(`⚠️ [MCP] 断开会话连接时出现异常:`, e);
          }
        }
        this.clients.delete(id);
        disconnected = true;
      }
    }
    
    return disconnected;
  }

  // 🔧 测试初始化流程和sessionId获取的工具方法
  async testInitialization(config) {
    console.log(`🧪 [MCP] 开始测试初始化流程`);
    console.log(`🧪 [MCP] 配置:`, JSON.stringify(config, null, 2));
    
    try {
      if (!this.Client) {
        await this.loadMcpClient();
      }

      const testClient = new this.Client({
        name: "kedo-mind-test",
        version: "1.0.0"
      }, {
        capabilities: {}
      });

      const transport = await this.createTransport(config);
      console.log(`🧪 [MCP] 测试传输创建成功: ${transport.constructor.name}`);
      
      // 在连接前检查sessionId
      console.log(`🧪 [MCP] 连接前 transport.sessionId: ${transport.sessionId || 'undefined'}`);
      
      await testClient.connect(transport);
      
      // 在连接后检查sessionId
      console.log(`🧪 [MCP] 连接后 transport.sessionId: ${transport.sessionId || 'undefined'}`);
      console.log(`🧪 [MCP] 连接后 transport._sessionId: ${transport._sessionId || 'undefined'}`);
      
      // 获取服务器信息
      const serverCapabilities = testClient.getServerCapabilities();
      const serverVersion = testClient.getServerVersion();
      
      console.log(`🧪 [MCP] 服务器能力:`, serverCapabilities);
      console.log(`🧪 [MCP] 服务器版本:`, serverVersion);
      
      // 关闭测试连接
      await testClient.close();
      
      return {
        success: true,
        sessionId: transport.sessionId || transport._sessionId,
        serverCapabilities,
        serverVersion,
        transportType: transport.constructor.name
      };
      
    } catch (error) {
      console.error(`❌ [MCP] 初始化测试失败:`, error);
      return {
        success: false,
        error: error.message,
        transportType: config.type
      };
    }
  }
}

module.exports = { McpManager };