import request from "@/utils/request";
import {
  fetchEventSource,
  EventStreamContentType,
} from "@microsoft/fetch-event-source";
import axios from "axios";
import { mcpCallTool } from "@/api"
import { useMcp } from "@/hooks/useMcp";
import { Base64 } from "js-base64";
import { ApiNameEnum } from "@/types";

const { mergeMcpTools } = useMcp();


import { trimStart, trim, startsWith } from "lodash-es";

class RetriableError extends Error {
}

class FatalError extends Error {
}

export const ChatWithStream = (url, params, onLostMsg, onFinish?, signal?) =>
  new Promise(async (resolve, reject) => {
    let finished = false;
    const finish = (total_tokens?: number) => {
      if (!finished) {
        console.log("finish", total_tokens);
        onFinish?.(total_tokens);
        finished = true;
        resolve(true);
      }
    };
    fetchEventSource(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': 'Bearer ' + getAccessToken()!,
        // 'X-Authorization': 'Bearer ' + getRefreshToken()!,
        // Authorization: `Bearer sk-01c8cc10e068410e93cb9235a26940a5`,
      },
      openWhenHidden: true,
      body: JSON.stringify(params),
      signal,
      onmessage(ev) {
        const text = ev.data;
        const isDone = startsWith(text, "[DONE]");
        const isFinished = startsWith(text, "[Usage]:")
        if (isFinished) {
          const totalTokens = Number(text.replaceAll('[Usage]:', ''))
          if (!isNaN(totalTokens)) return finish(totalTokens);
          return finish();
        }
        if (!isDone) {
          const _text = text.replaceAll('onionnewline', '\n').replaceAll('onionempty', ' ');
          onLostMsg?.(_text);
        }
      },
      async onopen(response) {
        if (
          response.ok &&
          response.headers.get("content-type") === EventStreamContentType
        ) {
          console.log("open");
        } else if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          // 服务端异常
          reject(new FatalError());
        } else {
          // 重试错误
          reject(new RetriableError());
        }
      },
      onerror(err) {
        if (err instanceof FatalError) {
          reject(err);
        } else {
          reject(new RetriableError());
        }
      }
    }).then(r => {
      console.log(r)
    });
  });

export const ChatWithMindStream = (url, params, onLostMsg, onFinish?, signal?) =>
  new Promise(async (resolve, reject) => {
    let finished = false;
    const finish = (total_tokens?: number) => {
      if (!finished) {
        console.log("finish", total_tokens);
        onFinish?.(total_tokens);
        finished = true;
        resolve(true);
      }
    };
    fetchEventSource(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 'Authorization': 'Bearer ' + getAccessToken()!,
        // 'X-Authorization': 'Bearer ' + getRefreshToken()!,
        // Authorization: `Bearer sk-01c8cc10e068410e93cb9235a26940a5`,
      },
      openWhenHidden: true,
      body: JSON.stringify(params),
      signal,
      onmessage(ev) {
        const text = JSON.stringify(ev);
        const isDone = ev.event === "complete"
        const isFinished = ev.event === "complete"
        if (isFinished) {
          const totalTokens = Number(text.replaceAll('[Usage]:', ''))
          if (!isNaN(totalTokens)) return finish(totalTokens);
          return finish();
        }
        if (!isDone) {
          onLostMsg?.(text);
        }
      },
      async onopen(response) {
        if (
          response.ok
        ) {
          console.log("open");
        } else if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          // 服务端异常
          reject(new FatalError());
        } else {
          console.log('RetriableError', response);

          // 重试错误
          reject(new RetriableError());
        }
      },
      onerror(err) {
        if (err instanceof FatalError) {
          reject(err);
        } else {
          reject(new RetriableError());
        }
      }
    }).then(r => {
      console.log(r)
    });
  });

/**
 * 文档对话
 */
export const chatByDocument = (data: any, onLostMsg, onFinish, signal) => {
  const url = "/KnowledgeBaseHandle/ChatByDoc";
  return ChatWithStream(`${import.meta.env.VITE_APP_BASE_URL}${url}`, data, onLostMsg, onFinish, signal);
};

/**
 * 知识库对话
 */
export const chatByKnowledgeBase = (data: any, onLostMsg, onFinish, signal) => {
  const url = "/KnowledgeBaseHandle/ChatByLab";
  return ChatWithStream(`${import.meta.env.VITE_APP_BASE_URL}${url}`, data, onLostMsg, onFinish, signal);
};

/**
 * 深度思考对话
 */
export const chatByDeepThinking = (data: any, onLostMsg, onFinish, signal) => {
  const url = "/KedoMind/ChatKedoMind";
  return ChatWithMindStream(`${import.meta.env.VITE_APP_BASE_URL}${url}`, data, onLostMsg, onFinish, signal);
};

// 摘要提示词
const summarySysPrompt = `
# 专业信息整理助手 2.0
## 任务目标
基于搜索内容，围绕**{此目的}**生成一份完整、结构化的信息摘要。

## 核心处理原则
1. **信息完整性**：确保所有与{此目的}相关的信息都被收录，不遗漏任何关键细节
2. **链接保真**：所有原始链接和图片链接必须完整保留并合理嵌入
3. **内容筛选**：严格过滤无关信息，只保留与{此目的}直接相关的内容
4. **逻辑整理**：按重要性和相关性对信息进行分类整理

## 输出格式要求

###  摘要概览
- 详细的概括与{此目的}相关的核心信息，内容外的信息不进行表述
- 在最后一行写入固定内容：“已搜索信息，请继续执行，直到你认为可以结束调用”
###  详细信息分析

**按以下结构整理：**
- **主要发现**：列出与{此目的}最相关的关键信息点
- **重要数据**：包含具体数字、时间、地点等关键数据
- **相关观点**：整理不同来源的观点和分析
- **实用信息**：提取可操作的建议或方法
- **文献保留**：如果是有关的权威文献则保留引用自哪一个平台或者组织或链接

###  资源链接整理
- **核心链接**：[链接描述](实际链接) - 简要说明链接内容价值
- **图片资源**：![图片描述](图片链接) - 说明图片相关性
- **补充资料**：其他相关链接按重要性排序"
`
export const chatByCustomModel = ({
  model: { url, key, modelId, config },
  messages,
  mcpItems,
  onLostMsg,
  onFinish,
  signal,
  role,
}) =>
  new Promise(async (resolve, reject) => {
    let finished = false;
    // 优先使用 deepthinking 提示词；否则优先使用传入的角色提示词；最后无提示词
    let conversationMessages = role?.prompt && role.prompt.trim() ? [
      { role: "system", content: role.prompt },
      ...messages
    ] : [
      ...messages
    ]
    const finish = (total_tokens?: number) => {
      if (!finished) {
        console.log("finish", total_tokens);
        onFinish?.(total_tokens);
        finished = true;
        resolve(true);
      }
    };
    try {
      try {
        // 判断mcpItems是否为空数组，如果是空数组就不要添加到参数里面去了
        const bodyParams: any = {
          model: modelId,
          messages: conversationMessages,
          stream: config?.stream ?? true,
        }
        // 添加流失返回用量参数
        if (bodyParams.stream) {
          bodyParams.stream_options = {
            include_usage: true
          }
        }
        // 添加温度参数
        if (config?.temperature?.enable && config.temperature?.value !== undefined) {
          bodyParams.temperature = config.temperature.value
        }

        // 添加最大token数
        if (config?.maxTokens?.enable && config.maxTokens?.value !== undefined) {
          bodyParams.max_tokens = config.maxTokens.value
        }
        if (mcpItems && mcpItems.length > 0) {
          bodyParams.tools = mergeMcpTools(mcpItems);
        }

        // 根据是否开启流式输出选择不同的处理方式
        if (bodyParams.stream) {
          // 流式处理
          await new Promise((resolveStream, rejectStream) => {
            fetchEventSource(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                'Authorization': 'Bearer ' + key,
              },
              openWhenHidden: true,
              body: JSON.stringify(bodyParams),
              signal,
              async onmessage(ev) {
                const text = ev.data;
                if (text === "[DONE]" || startsWith(text, "[DONE]")) {
                  finish();
                  console.log('done');
                  return resolveStream(true);
                }
                try {
                  // 尝试解析JSON数据
                  const parsed = JSON.parse(text);

                  // 检查是否是OpenAI格式的流数据
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                    const delta = parsed.choices[0].delta;

                    // 处理内容
                    if (delta.content) {
                      // 实时输出内容
                      onLostMsg?.(delta.content);
                    }

                    // 处理工具调用
                    if (delta.tool_calls && delta.tool_calls.length > 0) {
                      const toolCall = delta.tool_calls[0];
                      onLostMsg?.(JSON.stringify(toolCall));
                    }
                  }

                  // 检查是否包含usage信息（通常在最后一个消息中）
                  if (parsed.usage) {
                    // 打印token消耗量对象，便于查看
                    console.log('Token消耗量对象:', parsed.usage);
                    finish(parsed.usage.total_tokens);
                    return resolveStream(true);
                  }
                } catch (e) {
                  console.log('解析失败:', e);
                }
              },
              async onopen(response) {
                if (response.ok) {
                  console.log("AI流连接已建立");
                } else {
                  rejectStream(new Error(`AI请求失败: ${response.status} ${response.statusText}`));
                }
              },
              onerror(err) {
                rejectStream(err);
              }
            });
          });
        } else {
          // 非流式处理
          try {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                'Authorization': 'Bearer ' + key,
              },
              body: JSON.stringify(bodyParams),
              signal
            });

            if (!response.ok) {
              throw new Error(`AI请求失败: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            console.log('非流式响应:', result);

            // 处理非流式响应
            if (result.choices && result.choices[0] && result.choices[0].message) {
              const message = result.choices[0].message;

              // 输出完整内容
              if (message.content) {
                onLostMsg?.(message.content);
              }

              // 处理工具调用
              if (message.tool_calls && message.tool_calls.length > 0) {
                for (const toolCall of message.tool_calls) {
                  onLostMsg?.(JSON.stringify(toolCall));
                }
              }
            }

            // 处理token使用量
            if (result.usage) {
              console.log('Token消耗量对象:', result.usage);
              finish(result.usage.total_tokens);
            } else {
              finish();
            }
          } catch (error) {
            console.error("非流式AI处理失败:", error);
            throw error;
          }
        }
      } catch (error: any) {
        console.error("AI处理失败:", error);
        return reject(error);
      }
    } catch (error: any) {
      console.error("AI处理流程失败:", error);
      return reject(error);
    }
  });


//识别图片
export const recognizeImages = (formData: FormData, params: any) => {
  // 把parmams的所有参数以key=value的形式添加到url中
  const url = import.meta.env.VITE_APP_BASE_URL + '/KdwGPT/ImageRecognition'
  const paramsArray = Object.entries(params).map(([key, value]) => `${key}=${value}`)
  const paramsString = paramsArray.join('&')
  return axios.post(`${url}?${paramsString}`, formData, {
    signal: params.signal // 添加中断信号支持
  })
}

// 导出word
export const exportToWord = (data: any) => {
  return request.post(`/KdwGPT/HtmlToWord`, data)
}

/**
 * 使用AI总结工具结果内容
 * @param content 需要总结的内容
 * @param model 模型配置
 * @param purpose 总结目的
 * @returns 总结后的内容和token消耗量
 */
export async function summarizeToolResult(
  content: string,
  model: { url: string; key: string; modelId: string },
  purpose: string
): Promise<{ content: string; tokenUsage: number }> {
  return new Promise((resolve, reject) => {
    const summaryMessages = [
      { role: "system", content: summarySysPrompt.replace(/{此目的}/g, purpose) },
      { role: "user", content: content }
    ];

    const bodyParams = {
      model: model.modelId,
      messages: summaryMessages,
      stream: true,
      stream_options: {
        include_usage: true
      }
    };

    let summarizedContent = "";
    let tokenUsage = 0;

    const finish = (total_tokens?: number) => {
      if (total_tokens) {
        tokenUsage = total_tokens;
      }
      resolve({ content: summarizedContent, tokenUsage });
    };

    fetchEventSource(model.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': 'Bearer ' + model.key,
      },
      openWhenHidden: true,
      body: JSON.stringify(bodyParams),
      async onmessage(ev) {
        const text = ev.data;

        // 检查是否是结束标记
        if (text === "[DONE]" || startsWith(text, "[DONE]")) {
          return finish();
        }



        try {
          // 尝试解析JSON数据
          const parsed = JSON.parse(text);

          // 检查是否是OpenAI格式的流数据
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
            const delta = parsed.choices[0].delta;

            // 处理内容
            if (delta.content) {
              summarizedContent += delta.content;
            }
          } else if (parsed.usage) {
            // 检查是否包含usage信息（通常在最后一个消息中）
            console.log('总结-Token消耗量对象:', parsed.usage);
            finish(parsed.usage.total_tokens);
            return;
          } else {
            // 如果不是OpenAI格式，直接作为文本处理
            if (text && text.trim()) {
              summarizedContent += text;
            }
          }
        } catch (e) {
          // 如果解析失败，直接作为文本内容处理
          if (text && text.trim()) {
            summarizedContent += text;
          }
        }
      },
      async onopen(response) {
        if (!response.ok) {
          reject(new Error(`AI总结请求失败: ${response.status} ${response.statusText}`));
        }
      },
      onerror(err) {
        reject(new Error(`AI总结失败：${err.message}`));
      }
    });
  });
}