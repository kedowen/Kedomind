import Dexie, { Table } from 'dexie';
import { McpConfigItem, McpTool } from '@/types/mcp';

// 定义MCP配置数据结构
export interface McpConfigRecord {
  id: string;
  description: string;
  command: string;
  params: string;
  env?: string; // 环境变量字段
  name: string;
  headers: string;
  timeout: string;
  type: string;
  url: string;
  tools: McpTool[];
  error?: string;
  connectStatus?: string;
  userId: string;
  createTime: string;
  updateTime: string;
}

// 扩展Dexie类
export class McpConfigDatabase extends Dexie {
  // 定义表
  mcpConfigs!: Table<McpConfigRecord>;

  constructor() {
    super('McpConfigDatabase');

    // 定义数据库结构
    this.version(1).stores({
      mcpConfigs: 'id, userId, createTime, updateTime'
    });
  }
}

// 创建数据库实例
export const mcpConfigDb = new McpConfigDatabase();

// MCP配置本地存储管理类
export class McpConfigLocal {
  private db: McpConfigDatabase;

  constructor() {
    this.db = mcpConfigDb;
  }

  private toPlainJSON<T>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      // 兜底：如果序列化失败，返回空数组/对象，避免 DataCloneError
      return Array.isArray(data) ? ([] as unknown as T) : ({} as T);
    }
  }

  /**
   * 创建MCP配置
   * @param params 创建参数
   * @returns Promise<[Error | null, McpConfigRecord | null]>
   */
  async createMcpConfig(params: {
    id: string;
    userId: string;
    description: string;
    command: string;
    params: string;
    env?: string;
    name: string;
    headers: string;
    timeout: string;
    type: string;
    url: string;
    tools: McpTool[];
    error?: string;
    connectStatus?: string;
  }): Promise<[Error | null, McpConfigRecord | null]> {
    try {
      console.log(params);
      
      const now = new Date().toISOString();
      const plainTools = this.toPlainJSON(params.tools || []);
      const configRecord: McpConfigRecord = {
        id: params.id,
        description: params.description,
        command: params.command,
        params: params.params,
        env: params.env,
        name: params.name,
        headers: params.headers,
        timeout: params.timeout,
        type: params.type,
        url: params.url,
        tools: plainTools,
        error: params.error,
        connectStatus: params.connectStatus,
        userId: params.userId,
        createTime: now,
        updateTime: now,
      };
      await this.db.mcpConfigs.add(configRecord);
      return [null, configRecord];
    } catch (error) {
      console.error('创建MCP配置失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 更新MCP配置（支持局部更新，如tools、error、connectStatus等）
   */
  async updateMcpConfig(params: {
    userId: string;
    configId: string;
    patch: Partial<Pick<McpConfigRecord, 'description' | 'command' | 'params' | 'env' | 'name' | 'headers' | 'timeout' | 'type' | 'url' | 'tools' | 'error' | 'connectStatus'>>;
  }): Promise<[Error | null, McpConfigRecord | null]> {
    try {
      const existed = await this.db.mcpConfigs
        .where('id')
        .equals(params.configId)
        .and(rec => rec.userId === params.userId)
        .first();

      if (!existed) {
        return [new Error('MCP配置不存在'), null];
      }

      const patch: any = { ...params.patch };
      if (patch && 'tools' in patch) {
        patch.tools = this.toPlainJSON(patch.tools || []);
      }

      const updated: McpConfigRecord = {
        ...existed,
        ...patch,
        updateTime: new Date().toISOString(),
      };

      await this.db.mcpConfigs.put(updated);
      return [null, updated];
    } catch (error) {
      console.error('更新MCP配置失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 获取MCP配置列表
   * @param params 查询参数
   * @returns Promise<[Error | null, { items: McpConfigRecord[], total: number } | null]>
   */
  async getMcpConfigList(params: {
    userId: string;
  }): Promise<[Error | null, { items: McpConfigRecord[], total: number } | null]> {
    try {
      const records = await this.db.mcpConfigs
        .where('userId')
        .equals(params.userId)
        .toArray();

      // 按更新时间倒序
      records.sort((a, b) => (b.updateTime || '').localeCompare(a.updateTime || ''));

      const items = records;
      const total = records.length;

      return [null, { items, total }];
    } catch (error) {
      console.error('获取MCP配置列表失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 根据ID获取单个MCP配置
   */
  async getMcpConfigById(params: {
    userId: string;
    configId: string;
  }): Promise<[Error | null, McpConfigRecord | null]> {
    try {
      const record = await this.db.mcpConfigs
        .where('id')
        .equals(params.configId)
        .and(rec => rec.userId === params.userId)
        .first();
      return [null, record || null];
    } catch (error) {
      console.error('根据ID获取MCP配置失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 删除MCP配置
   * @param params 删除参数
   * @returns Promise<[Error | null, boolean | null]>
   */
  async deleteMcpConfig(params: {
    userId: string;
    configId: string;
  }): Promise<[Error | null, boolean | null]> {
    try {
      // 删除配置
      const deletedCount = await this.db.mcpConfigs
        .where('id')
        .equals(params.configId)
        .and(record => record.userId === params.userId)
        .delete();

      if (deletedCount === 0) {
        return [new Error('MCP配置不存在'), null];
      }

      return [null, true];
    } catch (error) {
      console.error('删除MCP配置失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 导出单例实例
export const mcpConfigLocal = new McpConfigLocal();
