export interface McpTool{
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export enum McpConfigItemType {
  HTTP = 'streamableHttp',
  STDIO = 'stdio',
  SSE = 'sse',
}

export enum McpConnectStatus {
  // 未连接
  NOT_CONNECTED = 'NOT_CONNECTED',
  // 连接中
  CONNECTING = 'CONNECTING',
  // 已连接
  CONNECTED = 'CONNECTED',
  // 连接失败
  CONNECT_FAILED = 'CONNECT_FAILED',
}

export interface McpConfigItem{
  id?: string;
  date: string,
  description: string,
  isAvailable:boolean,
  command: string,
  params:string,
  env?: string, // 环境变量（stdio模式）
  name: string,
  serverName: string;// 兼容字段，实际使用 id
  headers: string,
  timeout:string,
  type:McpConfigItemType,
  url: string,
  tools?:McpTool[],
  mcpServerId?: string, // 市场服务id
  error?: string, // 错误信息
  connectStatus?: McpConnectStatus // 连接状态
}