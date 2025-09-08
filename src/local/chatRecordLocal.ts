import Dexie, { Table } from 'dexie';

// 定义会话数据结构
export interface ChatRecord {
  id: string;
  title: string;
  userId: string;
  createTime: string;
  updateTime: string;
}

// 扩展Dexie类
export class ChatRecordDatabase extends Dexie {
  // 定义表
  chatRecords!: Table<ChatRecord>;
  messages!: Table<ChatMessageRecord>;

  constructor() {
    super('ChatRecordDatabase');

    // 定义数据库结构
    this.version(1).stores({
      chatRecords: 'id, userId, createTime, updateTime'
    });
    // 升级：增加消息表
    this.version(2).stores({
      chatRecords: 'id, userId, createTime, updateTime',
      messages: 'id, chatId, userId, createTime'
    });
  }
}

// 创建数据库实例
export const db = new ChatRecordDatabase();

// 聊天记录本地存储管理类
export class ChatRecordLocal {
  private db: ChatRecordDatabase;

  constructor() {
    this.db = db;
  }

  /**
   * 创建新会话
   * @param params 创建会话参数
   * @returns Promise<[Error | null, ChatRecord | null]>
   */
  async createChat(params: {
    id: string,
    userId: string;
    title: string;
  }): Promise<[Error | null, ChatRecord | null]> {
    try {
      const now = new Date().toISOString();
      const chatRecord: ChatRecord = {
        id: params.id,
        title: params.title,
        userId: params.userId,
        createTime: now,
        updateTime: now,
      };
      await this.db.chatRecords.add(chatRecord);
      return [null, chatRecord];
    } catch (error) {
      console.error('创建会话失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 获取会话列表
   * @param params 查询参数
   * @returns Promise<[Error | null, { items: ChatRecord[], total: number } | null]>
   */
  async getChatList(params: {
    userId: string;
    pageIndex: number;
    pageSize: number;
    keyword?: string;
  }): Promise<[Error | null, { items: ChatRecord[], total: number } | null]> {
    try {
      const start = Math.max(0, (Math.max(1, params.pageIndex) - 1) * params.pageSize);

      const keywordLower = (params.keyword || '').toLowerCase();
      const baseCollection = this.db.chatRecords
        .orderBy('createTime')
        .reverse()
        .filter(record => {
          if (record.userId !== params.userId) return false;
          if (!keywordLower) return true;
          return (record.title || '').toLowerCase().includes(keywordLower);
        });

      const total = await baseCollection.count();
      const items = await baseCollection.offset(start).limit(params.pageSize).toArray();

      return [null, { items, total }];
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 更新会话标题
   * @param params 更新参数
   * @returns Promise<[Error | null, ChatRecord | null]>
   */
  async updateChat(params: {
    userId: string;
    chatId: string;
    title: string;
  }): Promise<[Error | null, ChatRecord | null]> {
    try {
      const chatRecord = await this.db.chatRecords
        .where('id')
        .equals(params.chatId)
        .and(record => record.userId === params.userId)
        .first();

      if (!chatRecord) {
        return [new Error('会话不存在'), null];
      }

      const updatedRecord = {
        ...chatRecord,
        title: params.title,
        updateTime: new Date().toISOString(),
      };

      await this.db.chatRecords.update(params.chatId, updatedRecord);
      return [null, updatedRecord];
    } catch (error) {
      console.error('更新会话失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 删除会话
   * @param params 删除参数
   * @returns Promise<[Error | null, boolean | null]>
   */
  async deleteChat(params: {
    chatId: string;
    userId: string;
  }): Promise<[Error | null, boolean | null]> {
    try {
      // 删除会话
      const deletedCount = await this.db.chatRecords
        .where('id')
        .equals(params.chatId)
        .and(record => record.userId === params.userId)
        .delete();

      if (deletedCount === 0) {
        return [new Error('会话不存在'), null];
      }

      return [null, true];
    } catch (error) {
      console.error('删除会话失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 删除用户所有会话
   * @param userId 用户ID
   * @returns Promise<[Error | null, boolean | null]>
   */
  async removeAllChat(userId: string): Promise<[Error | null, boolean | null]> {
    try {
      // 删除所有会话
      await this.db.chatRecords
        .where('userId')
        .equals(userId)
        .delete();

      return [null, true];
    } catch (error) {
      console.error('删除所有会话失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 获取会话消息列表（本地）
   */
  async getChatHistory(params: {
    userId: string;
    chatId: string;
    pageIndex: number;
    pageSize: number;
  }): Promise<[
    Error | null,
    { items: ChatMessageRecord[]; total: number } | null
  ]> {
    try {
      const allMessages = await this.db.messages
        .where('chatId')
        .equals(params.chatId)
        .and((m) => m.userId === params.userId)
        .toArray();

      // 按创建时间升序（老的在前）
      allMessages.sort((a, b) => (a.createTime || '').localeCompare(b.createTime || ''));

      const start = Math.max(0, (Math.max(1, params.pageIndex) - 1) * params.pageSize);
      const end = start + params.pageSize;
      const items = allMessages.slice(start, end);
      const total = allMessages.length;

      return [null, { items, total }];
    } catch (error) {
      console.error('获取本地会话消息失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 将云端消息批量同步到本地（存在则更新，不存在则新增）
   */
  async upsertMessagesFromCloud(params: {
    userId: string;
    chatId: string;
    cloudItems: Array<{
      f_Id: string;
      f_RoleType: 'user' | 'ai';
      content: string; // base64 字符串
      f_CreateDate?: string;
      f_UpdateDate?: string;
    }>;
  }): Promise<[Error | null, boolean | null]> {
    try {
      const nowIso = new Date().toISOString();
      const mapped: ChatMessageRecord[] = params.cloudItems.map((item) => ({
        id: item.f_Id,
        chatId: params.chatId,
        userId: params.userId,
        roleType: item.f_RoleType,
        contentData: item.content || '',
        createTime: item.f_CreateDate || nowIso,
        updateTime: item.f_UpdateDate || item.f_CreateDate || nowIso,
      }));

      await this.db.messages.bulkPut(mapped);
      return [null, true];
    } catch (error) {
      console.error('同步云端消息到本地失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 新增消息（本地）
   */
  async saveMessage(params: {
    userId: string;
    chatId: string;
    roleType: 'user' | 'ai';
    contentData: string; // base64
    createTime?: string;
  }): Promise<[Error | null, { id: string } | null]> {
    try {
      const nowIso = new Date().toISOString();
      const id = this.generateId();
      const record: ChatMessageRecord = {
        id,
        userId: params.userId,
        chatId: params.chatId,
        roleType: params.roleType,
        contentData: params.contentData,
        createTime: params.createTime || nowIso,
        updateTime: params.createTime || nowIso,
      };
      await this.db.messages.add(record);
      return [null, { id }];
    } catch (error) {
      console.error('本地新增消息失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 更新消息（本地）
   */
  async updateMessage(params: {
    id: string;
    userId: string;
    chatId: string;
    roleType?: 'user' | 'ai';
    contentData?: string; // base64
  }): Promise<[Error | null, boolean | null]> {
    try {
      const existed = await this.db.messages
        .where('id')
        .equals(params.id)
        .and((m) => m.userId === params.userId)
        .first();
      if (!existed) return [new Error('消息不存在'), null];

      const updated: ChatMessageRecord = {
        ...existed,
        roleType: params.roleType || existed.roleType,
        contentData: params.contentData ?? existed.contentData,
        updateTime: new Date().toISOString(),
      };
      await this.db.messages.put(updated);
      return [null, true];
    } catch (error) {
      console.error('本地更新消息失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 删除消息（本地）
   */
  async deleteMessage(params: { id: string; userId: string }): Promise<[Error | null, boolean | null]> {
    try {
      const deleted = await this.db.messages
        .where('id')
        .equals(params.id)
        .and((m) => m.userId === params.userId)
        .delete();
      if (deleted === 0) return [new Error('消息不存在'), null];
      return [null, true];
    } catch (error) {
      console.error('本地删除消息失败:', error);
      return [error as Error, null];
    }
  }

  /**
   * 将本地消息ID替换为云端ID（用于云端返回新ID后对齐）
   */
  async replaceMessageId(params: { oldId: string; newId: string; userId: string }): Promise<[Error | null, boolean | null]> {
    try {
      if (params.oldId === params.newId) return [null, true];
      const existed = await this.db.messages
        .where('id')
        .equals(params.oldId)
        .and((m) => m.userId === params.userId)
        .first();
      if (!existed) return [new Error('原消息不存在'), null];

      await this.db.transaction('rw', this.db.messages, async () => {
        await this.db.messages.delete(params.oldId);
        await this.db.messages.add({ ...existed, id: params.newId });
      });
      return [null, true];
    } catch (error) {
      console.error('替换本地消息ID失败:', error);
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

// 为了便于 Dexie 类型声明放在类外部
export interface ChatMessageRecord {
  id: string;
  chatId: string;
  userId: string;
  roleType: 'user' | 'ai';
  cloudId?: string;
  /**
   * 序列化后的消息内容：
   * - user: string
   * - ai: AIMessageContentBlocksItem[]
   */
  contentData: string;
  createTime: string;
  updateTime: string;
}

// 导出单例实例
export const chatRecordLocal = new ChatRecordLocal();
