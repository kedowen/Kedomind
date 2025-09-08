// 无需额外导入

// 新增事件类型枚举
export enum MessageEventEnum {
  START = "start",
  STEP_START = "step_start",
  FINAL_ANSWER = "final_answer",
  COMPLETE = "complete",
  TOOLS_PLANNED = "tools_planned",
  TOOL_CALL = "tool_call",
  TOOL_RESULT = "tool_result",
  TOOL_IMAGE = "tool_image",
  STEP_COMPLETED = "step_completed",
  ERROR = "error",
  TOOL_ERROR = "tool_error"
}
// 新增apiName枚举
export enum ApiNameEnum {
  KEDOMIND_START = "kedomind_start",
  KEDOMIND_STEP = "kedomind_step",
  KEDOMIND_FINALIZE = "kedomind_finalize",
  KEDOMIND_STATUS = "kedomind_status",
  TAVILY_SEARCH = "tavily_search",
}

// 新增消息事件数据接口
export interface MessageEventData {
  event: MessageEventEnum;
  data: any; // 序列化的字符串数据
}

export enum MessageRoleEnum {
  USER = "user",
  AI = "ai",
}

// 消息操作枚举
export enum MessageActionEnum {
  COPY = "copy",
  EXPORT_WORD = "export_word",
  RETRY = "retry",
  DELETE = "delete",
}

export enum AIMessageContentBlocksType {
  TEXT = "text",
  TOOL = "tool",
  BASE64 = "base64",
}

// 工具调用状态
export enum ToolCallStateEnum {
  STOP = "stop",
  CALLING = "calling",
  SUCCESS = "success",
  ERROR = "error",
}

export interface AIMessageContentBlocksToolData {
  toolId: string;
  mcpName: string;
  apiName: string;
  arguments: Record<string, any>;//参数
  result: string;//结果
  state?: ToolCallStateEnum;
}


export interface AIMessageContentBlocksItem {
  type: AIMessageContentBlocksType;
  content: string;
  timestamp: number;
  toolData?: AIMessageContentBlocksToolData
}

export interface UserMessage {
  id: number | string;
  type: MessageRoleEnum.USER;
  content: string;
  time?: string;
}

// Basic message interface
// 新增：AI消息内容项接口
export interface AIMessageContentItem {
  tokenUsage: number; // 该次请求的token消耗量
  contentList: AIMessageContentBlocksItem[]; // 该次请求的内容列表
}

export interface AIMessage {
  id: number | string;
  type: MessageRoleEnum.AI;
  currentIndex: number;
  content: AIMessageContentItem[]; // 存储对象数组，每个对象包含usageToken和contentList
  isStreaming: boolean;
  time?: string;
}

export type Message = UserMessage | AIMessage;

