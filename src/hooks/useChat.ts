import { Ref } from 'vue';
import { MessageEventData, MessageEventEnum, ApiNameEnum, Message, MessageRoleEnum, ToolCallStateEnum, AIMessageContentBlocksItem, AIMessageContentItem } from '@/types';
import { awaitWrapper, uploadImage as uploadImageApi } from '@/api';
import { useUserStore } from '@/store';

export const useChat = () => {
  const userStore = useUserStore();
  // 统一的事件解析函数
  const parseEventData = (eventData: MessageEventData, index: number) => {
    const result = {
      eventType: eventData.event,
      apiName: eventData.data.apiName || eventData.data.tool_name,
      toolCallId: eventData.data.id,
      stepNumber: eventData.data.step_number,
      toolIndex: eventData.data.tool_index,
      parsedData: null as any,
      error: null as string | null,
    };

    switch (eventData.event) {
      case MessageEventEnum.TOOL_CALL:
        try {
          const args = typeof eventData.data.arguments === "string"
            ? JSON.parse(eventData.data.arguments)
            : eventData.data.arguments;

          switch (eventData.data.apiName) {
            case ApiNameEnum.KEDOMIND_START:
            case ApiNameEnum.KEDOMIND_STEP:
            case ApiNameEnum.KEDOMIND_FINALIZE:
            case ApiNameEnum.KEDOMIND_STATUS:
              console.log('args', args);

              result.parsedData = {
                type: "thinking",
                thought: args.completion_note || "",
                index,
              };
              break;

            case ApiNameEnum.TAVILY_SEARCH:
            case "tavily_search":
              result.parsedData = {
                type: "search",
                query: args.query || "",
                index,
              };
              break;

            default:
              result.parsedData = {
                type: "terminal",
                apiName: eventData.data.apiName,
                arguments: args,
                index,
              };
              break;
          }
        } catch (error) {
          result.error = `Failed to parse ${eventData.data.apiName} args: ${error}`;
        }
        break;

      case MessageEventEnum.TOOL_RESULT:
        try {
          const resultContent = typeof eventData.data.result_content === "string"
            ? JSON.parse(eventData.data.result_content)
            : eventData.data.result_content;

          result.parsedData = {
            type: "result",
            content: resultContent,
            instruction: resultContent.instruction,
            searchResults: resultContent.search_results,
          };
        } catch (error) {
          result.parsedData = {
            type: "result",
            content: eventData.data.result_content,
          };
        }
        break;

      case MessageEventEnum.ERROR:
      case MessageEventEnum.TOOL_ERROR:
        result.parsedData = {
          type: "error",
          message: eventData.data["error_message"] ||
            eventData.data.errorMessage ||
            eventData.data.error_message ||
            "发生了未知错误",
          index,
        };
        break;

      default:
        break;
    }

    return result;
  };

  // 处理白板事件数据
  const processWhiteboardEvent = (
    eventData: MessageEventData,
    thinkingItems: Ref<any[]>,
    searchItems: Ref<any[]>,
    terminalItems: Ref<any[]>,
    timeSource?: string | (() => string)
  ) => {
    const getTimeString = () => {
      if (typeof timeSource === 'string') {
        return new Date(timeSource).toLocaleTimeString();
      } else if (typeof timeSource === 'function') {
        return timeSource();
      } else {
        return new Date().toLocaleTimeString();
      }
    };

    const parsed = parseEventData(eventData, 0);
    if (parsed.error) {
      console.error(parsed.error);
      return;
    }

    switch (parsed.eventType) {
      case MessageEventEnum.TOOL_CALL:
        switch (parsed.parsedData.type) {
          case "thinking":
            if (parsed.parsedData.thought) {
              thinkingItems.value.push({
                content: parsed.parsedData.thought,
                time: getTimeString(),
                instruction: null,
              });
            }
            break;
          case "search":
            if (parsed.parsedData.query) {
              searchItems.value.push({
                query: parsed.parsedData.query,
                time: getTimeString(),
                searchResults: [],
                resultsCount: 0,
                toolCallId: parsed.toolCallId,
              });
            }
            break;

          case "terminal":
            terminalItems.value.push({
              apiName: parsed.parsedData.apiName,
              arguments: parsed.parsedData.arguments,
              time: getTimeString(),
              result: null,
              error: null,
              status: "pending",
              toolCallId: parsed.toolCallId,
              stepNumber: parsed.stepNumber,
              toolIndex: parsed.toolIndex,
            });
            break;
        }
        break;

      case MessageEventEnum.TOOL_RESULT:
        switch (parsed.apiName) {
          case ApiNameEnum.KEDOMIND_START:
          case ApiNameEnum.KEDOMIND_STEP:
          case ApiNameEnum.KEDOMIND_FINALIZE:
          case ApiNameEnum.KEDOMIND_STATUS:
            if (parsed.parsedData.instruction && thinkingItems.value.length > 0) {
              thinkingItems.value[thinkingItems.value.length - 1].instruction = parsed.parsedData.instruction;
            }
            break;

          case ApiNameEnum.TAVILY_SEARCH:
          case "tavily_search":
            if (parsed.parsedData.searchResults && searchItems.value.length > 0) {
              const lastSearchItem = searchItems.value[searchItems.value.length - 1];
              lastSearchItem.searchResults = parsed.parsedData.searchResults;
              lastSearchItem.resultsCount = parsed.parsedData.searchResults.length;
            }
            break;

          default:
            // TOOL_RESULT的前一项必定是TOOL_CALL，直接取最后一个pending状态的项
            const terminalItem = terminalItems.value.findLast(
              (item) =>
                item.apiName === parsed.apiName &&
                item.status === "pending" &&
                item.result === null &&
                item.error === null
            );

            if (terminalItem) {
              terminalItem.result = parsed.parsedData.content;
              terminalItem.status = "success";
            } else {
              console.warn(`未找到匹配的终端项: ${parsed.apiName}`);
            }
            break;
        }
        break;

      case MessageEventEnum.TOOL_ERROR:
        // TOOL_ERROR的前一项必定是TOOL_CALL，直接取最后一个pending状态的项
        const terminalItem = terminalItems.value.findLast(
          (item) =>
            item.apiName === parsed.apiName &&
            item.status === "pending" &&
            item.result === null &&
            item.error === null
        );

        if (terminalItem) {
          terminalItem.error = parsed.parsedData.message;
          terminalItem.status = "error";
        } else {
          console.warn(`未找到匹配的终端项(错误): ${parsed.apiName}`);
        }
        break;
    }
  };

  // 处理聊天步骤数据
  const processStepEvent = (
    eventData: MessageEventData,
    steps: any[],
    currentThinkingStep: { value: any },
    index: number
  ) => {
    const parsed = parseEventData(eventData, index);
    if (parsed.error) {
      console.error(parsed.error);
      return;
    }

    switch (parsed.eventType) {
      case MessageEventEnum.TOOL_CALL:
        switch (parsed.parsedData.type) {
          case "thinking":
            if (parsed.parsedData.thought) {
              // 创建新的思考步骤
              currentThinkingStep.value = {
                type: "thinking" as const,
                content: parsed.parsedData.thought,
                index: parsed.parsedData.index,
                toolCallId: parsed.toolCallId,
                instruction: "",
                children: [],
              };
              steps.push(currentThinkingStep.value);
            }
            break;

          case "search":
            if (parsed.parsedData.query) {
              const searchStep = {
                type: "search" as const,
                content: parsed.parsedData.query,
                index: parsed.parsedData.index,
                toolCallId: parsed.toolCallId,
              };

              // 如果当前有思考步骤，作为子步骤添加
              if (currentThinkingStep.value) {
                currentThinkingStep.value.children.push(searchStep);
              } else {
                // 否则作为顶级步骤
                steps.push(searchStep);
              }
            }
            break;

          case "terminal":
            // 其他API调用，加入终端类型
            const terminalStep = {
              type: "terminal" as const,
              content: parsed.parsedData.apiName, // 只显示API名称
              index: parsed.parsedData.index,
              toolCallId: parsed.toolCallId,
            };

            // 如果当前有思考步骤，作为子步骤添加
            if (currentThinkingStep.value) {
              currentThinkingStep.value.children.push(terminalStep);
            } else {
              // 否则作为顶级步骤
              steps.push(terminalStep);
            }
            break;
        }
        break;

      case MessageEventEnum.TOOL_RESULT:
        // 处理思考结果中的指导建议
        if ((parsed.apiName === "sequentialthinking_tools") &&
          currentThinkingStep.value &&
          parsed.parsedData.instruction) {
          currentThinkingStep.value.instruction = parsed.parsedData.instruction;
        }
        break;

      case MessageEventEnum.ERROR:
      case MessageEventEnum.TOOL_ERROR:
        // 不创建独立的错误步骤，而是将错误信息嵌入到当前步骤的内容中
        const errorMessage = parsed.parsedData.message;

        // 如果当前有思考步骤，将错误信息添加到思考步骤的内容中
        if (currentThinkingStep.value) {
          currentThinkingStep.value.content += `\n\n❌ **错误**: ${errorMessage}`;
        } else {
          // 如果没有当前步骤，创建一个包含错误信息的思考步骤
          const errorStep = {
            type: "thinking" as const,
            content: `❌ **错误**: ${errorMessage}`,
            index: parsed.parsedData.index,
            children: [],
          };
          steps.push(errorStep);
        }
        break;

      default:
        break;
    }
  };

  // 获取所有处理步骤（层次化结构）
  const getProcessSteps = (events: MessageEventData[]) => {
    const steps: Array<{
      type: "thinking" | "search" | "error" | "terminal";
      content: string;
      index: number;
      toolCallId?: string;
      instruction?: string;
      children?: Array<{
        type: "thinking" | "search" | "error" | "terminal";
        content: string;
        index: number;
        toolCallId?: string;
      }>;
    }> = [];
    const currentThinkingStep = { value: null as any };
    events.forEach((event, index) => {
      processStepEvent(event, steps, currentThinkingStep, index);
    });

    return steps;
  };

  // 批量处理历史记录中的白板数据
  const parseWhiteboardDataFromHistory = (
    messages: Message[],
    thinkingItems: Ref<any[]>,
    searchItems: Ref<any[]>,
    terminalItems: Ref<any[]>
  ) => {
    // 清空现有数据
    thinkingItems.value = [];
    searchItems.value = [];
    terminalItems.value = [];

    // 遍历所有AI消息，提取白板数据
    messages.forEach((message: any) => {
      const isAIMessage = message.type === MessageRoleEnum.AI || message.type === "assistant";

      if (isAIMessage && message.contentList) {
        // 只处理contentList格式：message.contentList[].events
        message.contentList.forEach((content: any) => {
          if (content.events) {
            content.events.forEach((eventData: MessageEventData) => {
              processWhiteboardEvent(
                eventData,
                thinkingItems,
                searchItems,
                terminalItems,
                message.time
              );
            });
          }
        });
      }
    });
  };


  // 解析白板数据 - 适配 byCustomModel 格式
  const parseWhiteboardDataFromCustomModel = (messages: Message[], thinkingItems: Ref<any[]>,
    searchItems: Ref<any[]>,
    terminalItems: Ref<any[]>) => {
    // 清空现有数据
    thinkingItems.value = [];
    searchItems.value = [];
    terminalItems.value = [];

    // 遍历所有AI消息，提取白板数据 
    messages.forEach((message: Message) => {
      if (message.type === MessageRoleEnum.AI && message.content) {
        message.content.forEach((contentBlock: AIMessageContentItem) => {
          const contentList = contentBlock.contentList;
          // 处理 contentList 中的每个块
          if (Array.isArray(contentList)) {
            // 如果是数组格式（byCustomModel 格式）
            contentList.forEach((block: AIMessageContentBlocksItem) => {
              if (block.type === "tool" && block.toolData) {
                // 解析工具调用数据
                const toolData = block.toolData;
                let args: any = toolData.arguments;
                if (typeof args === "string") {
                  try {
                    args = JSON.parse(args);
                  } catch {
                    // 非法 JSON（历史流式碎片拼接等），保留原始字符串，避免抛错
                  }
                }

                // 检查工具调用是否失败
                let isError = false;
                let errorMessage = "";
                let resultContent = toolData.result;
                try {
                  resultContent = JSON.parse(toolData.result);
                } catch {

                }

                if (toolData.state === ToolCallStateEnum.ERROR) {
                  isError = true;
                  // 提取错误信息
                  if (
                    resultContent.content &&
                    Array.isArray(resultContent.content)
                  ) {
                    const textContent = resultContent.content.find(
                      (item) => item.type === "text"
                    );
                    if (textContent) {
                      errorMessage = textContent.text;
                      resultContent = errorMessage;
                    }
                  }
                }

                // 根据 apiName 分类处理
                switch (toolData.apiName) {
                  // case ApiNameEnum.KEDOMIND_START:
                  case ApiNameEnum.KEDOMIND_STEP:
                    // case ApiNameEnum.KEDOMIND_FINALIZE:
                    // 思考步骤
                    thinkingItems.value.push({
                      type: "thinking",
                      content: args.completion_note || "",
                      toolCallId: toolData.toolId,
                      apiName: toolData.apiName,
                      arguments: args,
                      state: toolData.state,
                      result: resultContent,
                      error: errorMessage, // 兼容原有字段
                      isError: isError,
                      errorMessage: errorMessage,
                      mcpName: toolData.mcpName,
                      timestamp: block.timestamp,
                      time: message.time,
                    });
                    break;

                  case ApiNameEnum.TAVILY_SEARCH:
                    console.log(resultContent);

                    // 搜索步骤
                    searchItems.value.push({
                      type: "search",
                      query: args.query || "",
                      toolCallId: toolData.toolId,
                      apiName: toolData.apiName,
                      arguments: args,
                      result: resultContent,
                      state: toolData.state,
                      isError: isError,
                      errorMessage: errorMessage,
                      mcpName: toolData.mcpName,
                      timestamp: block.timestamp,
                      time: message.time,
                    });
                    break;

                  default:
                    // 其他工具调用（终端类型）
                    terminalItems.value.push({
                      type: "terminal",
                      apiName: toolData.apiName,
                      toolCallId: toolData.toolId,
                      arguments: args,
                      result: resultContent,
                      state: toolData.state,
                      error: errorMessage, // 兼容原有字段
                      isError: isError,
                      errorMessage: errorMessage,
                      mcpName: toolData.mcpName,
                      timestamp: block.timestamp,
                      time: message.time,
                    });
                    break;
                }
              }
            });
          }
        });
      }
    });
  };

  // 上传图片
  const uploadImage = async (file: File, name?: string) => {
    if (!file) {
      return null;
    }
    const userId = String(userStore.getUserId);
    if (!userId) {
      return null;
    }
    const [err, res] = await awaitWrapper(uploadImageApi(file, userId, name || file.name));
    if (err) {
      return null;
    }
    return res.data;
  }

  return {
    parseEventData,
    processWhiteboardEvent,
    parseWhiteboardDataFromHistory,
    parseWhiteboardDataFromCustomModel,
    processStepEvent,
    getProcessSteps,
    uploadImage
  }
}