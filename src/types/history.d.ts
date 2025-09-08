import { DocumentFile, Library } from "./index";
// 会话类型
export enum HistoryTypeEnum {
  DOCUMENT = "1",
  KNOWLEDGE_BASE = "2",
}

export const HistoryTypeName = {
  [HistoryTypeEnum.DOCUMENT]: "文档",
  [HistoryTypeEnum.KNOWLEDGE_BASE]: "知识库",
};

export interface Conversation {
  id: number;
  title: string;
  type: HistoryTypeEnum;
  createTime: string;
  baseOn: DocumentFile[] | Library;
}

// 聊天记录项
export interface ChatRecordItem {
  id: string;
  title: string;
  editing?: boolean;
  editTitle?: string;
}


