// 模型变体标签
export type ModelTag = '推荐' | '最新' | '经济' | '高级' | '实验性';

// 模型配置的接口
export interface ModelConfig {
  // 模型温度
  temperature: {
    value: number;
    enable: boolean;
  }
  // 是否流式
  stream: boolean,
  // 最大token数字
  maxTokens: {
    value: number;
    enable: boolean;
  }
}

// 模型接口
export interface Model {
  id: string;
  name: string;
  icon: string;
  config: ModelConfig;
}

// 模型提供商接口
export interface Provider {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  apiKey: string;
  apiUrl: string;
  keyLink: string;
  models: Model[];
  config: ModelConfig;
}
