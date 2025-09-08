<template>
  <!-- 聊天对话列表 -->
  <div v-if="chatList.length > 0" class="chat-area">
    <div
      ref="chatListRef"
      class="chat-list"
      :class="{ 'is-collapse': isCollapse }"
    >
      <!-- 用户消息 -->
      <div v-for="(message, index) in chatList" :key="index">
        <div v-if="message.type === MessageRoleEnum.USER" class="user-box">
          <div class="user-chat">
            <!-- 用户消息操作按钮 -->
            <div
              v-if="message.actions && message.actions.length > 0"
              class="message-actions user-actions"
            >
              <a-popconfirm
                v-if="
                  !props.isShareMode &&
                  message.id &&
                  typeof message.id === 'string'
                "
                :title="t('chat.deleteMessageConfirm')"
                :ok-text="t('common.confirm')"
                :cancel-text="t('common.cancel')"
                @confirm="$emit('deleteMessage', message, index)"
              >
                <a-button
                  type="text"
                  size="small"
                  :title="t('chat.delete')"
                  class="delete-message-btn"
                >
                  <DeleteOutlined />
                </a-button>
              </a-popconfirm>
              <a-button
                v-if="message.actions.includes(MessageActionEnum.COPY)"
                type="text"
                size="small"
                @click="$emit('copyMessage', message.content)"
                :title="t('common.copy')"
              >
                <CopyOutlined />
              </a-button>
              <a-button
                v-if="message.actions.includes(MessageActionEnum.EXPORT_WORD)"
                type="text"
                size="small"
                @click="$emit('exportToWord', message.content)"
                :title="t('chat.exportWord')"
              >
                <FileWordOutlined />
              </a-button>
            </div>
            <div class="user-chat-left">
              <div class="user-chat-left-box">
                <div class="label-user">{{ message.content }}</div>
              </div>
            </div>
            <!-- <div class="img-user">
              {{ userInfo?.name?.charAt(0) || "U" }}
            </div> -->
          </div>
        </div>
        <!-- AI回复 -->
        <div v-if="message.type === MessageRoleEnum.AI" class="assistant-box">
          <div class="assistant-chat">
            <img
              class="img-assistant"
              alt=""
              :class="{ streaming: message.isStreaming }"
              src="@/assets/images/brain.png"
            />
            <div class="assistant-chat-content">
              <div class="assistant-chat-label">
                <!-- 处理步骤 -->

                <div
                  v-if="
                    currentMessageContent(message) &&
                    hasProcessSteps(currentMessageContent(message).events)
                  "
                  class="process-steps"
                >
                  <!-- 按顺序显示所有步骤 -->
                  <div
                    v-for="(step, stepIndex) in getProcessSteps(
                      currentMessageContent(message).events
                    )"
                    :key="`step-${stepIndex}`"
                    class="process-step"
                  >
                    <div
                      class="step-header"
                      @click="$emit('toggleStepCollapsed', index, stepIndex)"
                    >
                      <div class="step-info">
                        <BulbOutlined
                          v-if="step.type === 'thinking'"
                          class="step-icon thinking-step-icon"
                        />
                        <SearchOutlined
                          v-if="step.type === 'search'"
                          class="step-icon search-step-icon"
                        />
                        <ExclamationCircleOutlined
                          v-if="step.type === 'error'"
                          class="step-icon error-step-icon"
                        />
                        <MoreOutlined
                          v-if="step.type === 'terminal'"
                          class="step-icon terminal-step-icon"
                        />
                        <span class="step-title">
                          <span v-if="step.type === 'thinking'">
                            {{ step.instruction || t("chat.thinking") }}
                            <span
                              v-if="step.children && step.children.length > 0"
                              class="child-count"
                            >
                              ({{ step.children.length }}
                              {{ t("chat.subSteps") }})
                            </span>
                          </span>
                          <span v-if="step.type === 'search'"
                            >{{ t("chat.search") }} {{ stepIndex + 1 }}</span
                          >
                          <span v-if="step.type === 'error'"
                            >{{ t("chat.error") }} {{ stepIndex + 1 }}</span
                          >
                          <span v-if="step.type === 'terminal'">{{
                            step.content
                          }}</span>
                        </span>
                      </div>
                      <div class="step-actions">
                        <!-- 跳转到mind空间按钮 -->
                        <a-button
                          v-if="
                            (step.type === 'search' ||
                              step.type === 'terminal') &&
                            step.toolCallId
                          "
                          type="text"
                          size="small"
                          class="mind-jump-btn"
                          @click.stop="
                            $emit('jumpToMindSpace', step.type, step.toolCallId)
                          "
                          :title="t('chat.viewInMindSpace')"
                        >
                          <LayoutOutlined />
                        </a-button>
                        <!-- 折叠按钮 -->
                        <div class="collapse-icon">
                          <DownOutlined
                            v-if="!isStepCollapsed(index, stepIndex)"
                          />
                          <RightOutlined v-else />
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        !isStepCollapsed(index, stepIndex) &&
                        step.type !== 'terminal'
                      "
                      class="step-content"
                      :class="{ 'error-content': step.type === 'error' }"
                    >
                      <MarkdownParser :msg="step.content" />

                      <!-- 渲染子步骤 -->
                      <div
                        v-if="step.children && step.children.length > 0"
                        class="child-steps"
                      >
                        <div
                          v-for="(childStep, childIndex) in step.children"
                          :key="`child-${stepIndex}-${childIndex}`"
                          class="child-step"
                          :class="{
                            'child-step-search': childStep.type === 'search',
                            'child-step-terminal':
                              childStep.type === 'terminal',
                            'child-step-error': childStep.type === 'error',
                            'child-step-clickable':
                              (childStep.type === 'search' ||
                                childStep.type === 'terminal') &&
                              childStep.toolCallId,
                          }"
                          @click="
                            (childStep.type === 'search' ||
                              childStep.type === 'terminal') &&
                              childStep.toolCallId &&
                              $emit(
                                'jumpToMindSpace',
                                childStep.type,
                                childStep.toolCallId
                              )
                          "
                        >
                          <SearchOutlined
                            v-if="childStep.type === 'search'"
                            class="child-step-icon"
                          />
                          <MoreOutlined
                            v-if="childStep.type === 'terminal'"
                            class="child-step-icon"
                          />
                          <ExclamationCircleOutlined
                            v-if="childStep.type === 'error'"
                            class="child-step-icon"
                          />
                          <div class="child-step-title">
                            <span v-if="childStep.type === 'search'"
                              >{{ t("chat.search") }}
                              {{ childStep.content }}</span
                            >
                            <span v-if="childStep.type === 'terminal'"
                              >{{ t("chat.called") }}
                              {{ childStep.content }}</span
                            >
                            <span v-if="childStep.type === 'error'"
                              >{{ t("chat.error") }}:{{
                                childStep.content
                              }}</span
                            >
                          </div>
                          <!-- 子步骤的Mind空间指示器 -->
                          <LayoutOutlined
                            v-if="
                              (childStep.type === 'search' ||
                                childStep.type === 'terminal') &&
                              childStep.toolCallId
                            "
                            class="child-step-mind-icon"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        !isStepCollapsed(index, stepIndex) &&
                        step.type === 'terminal'
                      "
                      class="step-content terminal-content"
                    >
                      {{ t("chat.called") }} {{ step.content }} API
                    </div>
                  </div>
                </div>

                <!-- AI回复内容 -->
                <div
                  v-if="currentMessageContent(message).content"
                  class="assistant-content"
                >
                  <MarkdownParser
                    :msg="currentMessageContent(message).content"
                  />
                </div>

                <!-- 流式加载动画 -->
                <div v-if="message.isStreaming" class="assistant-chat-loading">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
              </div>
              <!-- AI消息操作按钮 -->
              <div
                v-if="
                  !message.isStreaming &&
                  currentMessageContent(message).actions &&
                  currentMessageContent(message).actions.length > 0
                "
                class="assistant-actions"
              >
                <div class="assistant-pagination">
                  <a-space align="center" v-if="message.contentList.length > 1">
                    <a-button
                      class="assistant-pagination-btn"
                      type="text"
                      size="small"
                      :disabled="
                        currentMessageContent(message) &&
                        message.currentIndex === 0
                      "
                      @click="handlePrev(message)"
                      :title="t('common.prev')"
                    >
                      <LeftOutlined />
                    </a-button>
                    <span>
                      {{ message.currentIndex + 1 }} /
                      {{ message.contentList.length }}
                    </span>
                    <a-button
                      class="assistant-pagination-btn"
                      type="text"
                      size="small"
                      :disabled="
                        currentMessageContent(message) &&
                        message.currentIndex === message.contentList.length - 1
                      "
                      @click="handleNext(message)"
                      :title="t('common.next')"
                    >
                      <RightOutlined />
                    </a-button>
                  </a-space>
                </div>
                <div class="message-actions">
                  <a-popconfirm
                    v-if="
                      !props.isShareMode &&
                      message.id &&
                      typeof message.id === 'string'
                    "
                    :title="t('chat.deleteMessageConfirm')"
                    :ok-text="t('common.confirm')"
                    :cancel-text="t('common.cancel')"
                    @confirm="$emit('deleteMessage', message, index)"
                  >
                    <a-button
                      type="text"
                      size="small"
                      :title="t('chat.delete')"
                      class="delete-message-btn"
                    >
                      <DeleteOutlined />
                    </a-button>
                  </a-popconfirm>
                  <a-button
                    v-if="
                      currentMessageContent(message).content &&
                      currentMessageContent(message).actions.includes(
                        MessageActionEnum.COPY
                      )
                    "
                    type="text"
                    size="small"
                    @click="
                      $emit(
                        'copyMessage',
                        currentMessageContent(message).content
                      )
                    "
                    :title="t('common.copy')"
                  >
                    <CopyOutlined />
                  </a-button>
                  <a-button
                    v-if="
                      currentMessageContent(message).content &&
                      currentMessageContent(message).actions.includes(
                        MessageActionEnum.EXPORT_WORD
                      )
                    "
                    type="text"
                    size="small"
                    @click="
                      exportWord(currentMessageContent(message).content)
                    "
                    :title="t('chat.exportWord')"
                  >
                    <FileWordOutlined />
                  </a-button>
                  <a-button
                    v-if="
                      currentMessageContent(message).actions.includes(
                        MessageActionEnum.RETRY
                      )
                    "
                    type="text"
                    size="small"
                    @click="$emit('retryMessage', message, index)"
                    :title="t('chat.retry')"
                  >
                    <RedoOutlined />
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  BulbOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  DownOutlined,
  LeftOutlined,
  RightOutlined,
  CopyOutlined,
  FileWordOutlined,
  DeleteOutlined,
  LayoutOutlined,
  RedoOutlined,
} from "@ant-design/icons-vue";
import MarkdownParser from "@/components/markdownParser/MarkdownParser.vue";
import {
  AIMessage,
  AIMessageContent,
  MessageActionEnum,
  MessageEventData,
  MessageEventEnum,
} from "@/types";
import { useI18n } from "vue-i18n";
import { MessageRoleEnum } from "@/types";
import { awaitWrapper, exportToWord } from "@/api";
import { Base64 } from "js-base64";
import { message } from "ant-design-vue";
import MarkdownIt from "markdown-it";
import { useChat, useExport } from "@/hooks";

// Props
const props = defineProps<{
  chatList: any[];
  userInfo: any;
  stepCollapsedState: Record<string, boolean>;
  isShareMode?: boolean; // 是否为分享模式，分享模式下禁用删除功能
  isCollapse?: boolean; // 是否折叠
}>();

// Emits
const emit = defineEmits<{
  deleteMessage: [item: any, index: number];
  copyMessage: [content: string];
  exportToWord: [content: string];
  toggleStepCollapsed: [messageIndex: number, stepIndex: number | string];
  jumpToMindSpace: [stepType: string, toolCallId: string];
  retryMessage: [item: any, index: number];
}>();

// 使用useChat hook
const { getProcessSteps } = useChat();
const { exportAsWord } = useExport();


//导出word
const exportWord = async (words: string) => {
  await exportAsWord(words);
};

// Ref
const chatListRef = ref<HTMLElement>();

// 获取当前索引的内容
const currentMessageContent = computed(() => {
  return (message: AIMessage): AIMessageContent => {
    return message.contentList[message.currentIndex];
  };
});



// 检查是否有处理步骤
const hasProcessSteps = (events: MessageEventData[]): boolean => {
  return getProcessSteps(events).length > 0;
};

// 获取步骤折叠状态的key
const getStepKey = (messageIndex: number, stepIndex: number | string) =>
  `${messageIndex}-${stepIndex}`;

// 检查步骤是否折叠 (大步骤默认展开)
const isStepCollapsed = (messageIndex: number, stepIndex: number | string) => {
  const key = getStepKey(messageIndex, stepIndex);
  return props.stepCollapsedState[key] ?? false;
};

function handlePrev(message: AIMessage) {
  if (message.currentIndex > 0) {
    message.currentIndex--;
  }
}
function handleNext(message: AIMessage) {
  if (message.currentIndex < message.contentList.length - 1) {
    message.currentIndex++;
  }
}

// 暴露 ref 给父组件
defineExpose({
  chatListRef,
});

const { t } = useI18n();
</script>

<style scoped lang="scss">
@keyframes rotate {
  0% {
    -webkit-transform: rotate(0deg);
  }

  25% {
    -webkit-transform: rotate(90deg);
  }

  50% {
    -webkit-transform: rotate(180deg);
  }

  75% {
    -webkit-transform: rotate(270deg);
  }

  100% {
    -webkit-transform: rotate(360deg);
  }
}

// 放大缩小动画
@keyframes scale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.8);
  }
}
/* 聊天区域样式 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;

  .img-user,
  .img-assistant {
    width: 24px;
    height: 24px;
  }

  .img-user {
    margin-left: 8px;
    background-color: #69c0ff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    font-size: 14px;
  }

  .img-assistant {
    margin-right: 8px;

    &.streaming {
      animation: scale 2.5s linear infinite;
    }
  }

  .user-box {
    width: 100%;
    margin-bottom: 20px;

    .user-chat {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;

      &-left {
        max-width: 85%;
        display: flex;
        align-items: baseline;

        &-box {
          border-radius: 16px;
          text-align: right;
          background: #69c0ff;
          color: #fff;
          overflow: hidden;
          padding: 12px 16px;
          box-shadow: 0 4px 12px rgba(105, 192, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.2);

          .label-user {
            white-space: pre-line;
            word-break: break-all;
            display: inline-block;
            text-align: justify;
            line-height: 1.5;
            font-size: 14px;
            font-weight: 500;
            color: #fff;
          }
        }
      }
    }
  }

  .assistant-box {
    width: 100%;
    margin-bottom: 20px;

    .assistant-chat {
      display: flex;
      align-items: flex-start;
      width: 100%;
      overflow: hidden;
      &-content {
        width: 100%;
      }
      &-left {
        width: 24px;
        height: 36px;
        position: relative;
        &-outside {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
        }
        &-inside {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
        }
      }

      &-label {
        flex: 1;
        background: $main-bg;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 2px 2px $shadow-color;
        border: 1px solid $border-color;
        display: flex;
        flex-direction: column;
        padding: 16px;
        color: #334155;
        // line-height: 1.6;

        .assistant-content {
          white-space: pre-line;
          word-break: break-word;
        }
      }

      &-loading {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 8px;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: $primary-color;
          animation: dotPulse 1.4s infinite ease-in-out both;

          &:nth-child(1) {
            animation-delay: -0.32s;
          }
          &:nth-child(2) {
            animation-delay: -0.16s;
          }
          &:nth-child(3) {
            animation-delay: 0s;
          }
        }
      }
      .assistant-pagination {
        &-btn {
          font-size: 12px;
        }
      }

      // AI消息操作按钮（下方显示）
      .assistant-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;

        .ant-btn {
          // color: #6b7280;
          // background-color: #f8f9fa;

          // &:hover {
          //   color: #374151;
          //   background-color: #e9ecef;
          // }

          &.delete-message-btn {
            &:hover {
              color: #dc2626;
              background-color: #fef2f2;
            }
          }
        }
      }
    }
  }
}

// 处理步骤样式
.process-steps {
  margin-bottom: 16px;

  .process-step {
    margin-bottom: 16px;
    position: relative;

    &:last-child {
      margin-bottom: 0;

      .step-content .child-steps::before {
        height: calc(100% - 24px);
      }
    }

    .step-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
      cursor: pointer;
      transition: opacity 0.2s ease;

      &:hover {
        opacity: 0.8;
      }

      .step-info {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;

        .step-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          flex-shrink: 0;

          &.thinking-step-icon {
            background-color: #10b981;
          }

          &.search-step-icon {
            background-color: #3b82f6;
          }

          &.error-step-icon {
            background-color: #ef4444;
          }

          &.terminal-step-icon {
            background-color: #6b7280;
          }
        }

        .step-title {
          font-size: 14px;
          font-weight: 500;
          color: #374151;

          .child-count {
            font-size: 12px;
            color: #6b7280;
            font-weight: 400;
            margin-left: 4px;
          }
        }
      }

      .step-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        .mind-jump-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          color: #6b7280;
          background-color: transparent;
          border: 1px solid #e1e5e9;
          border-radius: 4px;
          transition: all 0.2s ease;

          &:hover {
            color: #3b82f6;
            background-color: #f8faff;
            border-color: #3b82f6;
            transform: translateY(-1px);
          }

          .anticon {
            font-size: 12px;
          }
        }

        .collapse-icon {
          color: #6b7280;
          font-size: 12px;
          transition: transform 0.2s ease;
        }
      }
    }

    .step-content {
      margin-left: 36px;
      padding: 0 0 16px 16px;
      font-size: 14px;
      line-height: 1.5;
      color: #4b5563;
      white-space: pre-wrap;
      word-break: break-word;
      border-left: 1px dashed #d1d5db;

      &.error-content {
        color: #dc2626;
      }

      &.terminal-content {
        color: #7c3aed;
        font-style: italic;
      }

      // 子步骤样式
      .child-steps {
        margin-top: 12px;

        .child-step {
          margin-bottom: 6px;
          margin-left: 8px;
          background-color: #fafbfc;
          border: 1px solid #e1e5e9;
          border-radius: 16px;
          padding: 6px 12px;
          transition: all 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          width: fit-content;

          &:last-child {
            margin-bottom: 0;
          }

          &.child-step-search {
            border-color: #3b82f6;
            background-color: #f8faff;
          }

          &.child-step-terminal {
            border-color: #6b7280;
            background-color: #fafbfc;
          }

          &.child-step-error {
            border-color: #ef4444;
            background-color: #fffbfa;
          }

          &.child-step-clickable {
            cursor: pointer;

            &:hover {
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

              &.child-step-search {
                border-color: #1d4ed8;
                background-color: #eff6ff;
              }

              &.child-step-terminal {
                border-color: #374151;
                background-color: #f3f4f6;
              }
            }
          }

          .child-step-icon {
            width: 16px;
            height: 16px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: white;
            flex-shrink: 0;

            &.anticon-search {
              background-color: #3b82f6;
            }

            &.anticon-more {
              background-color: #6b7280;
            }

            &.anticon-exclamation-circle {
              background-color: #ef4444;
            }
          }

          .child-step-title {
            font-size: 12px;
            font-weight: 500;
            color: #374151;
          }

          .child-step-mind-icon {
            font-size: 10px;
            color: #6b7280;
            margin-left: auto;
            opacity: 0.7;
            transition: all 0.2s ease;

            .child-step-clickable:hover & {
              opacity: 1;
              color: #3b82f6;
            }
          }
        }
      }
    }
  }
}

// 助手内容样式
.assistant-content {
  margin-top: 8px;
}

// 消息操作按钮样式
.message-actions {
  display: flex;
  gap: 8px;

  .ant-btn {
    padding: 4px 8px;
    height: auto;
    border: none;
    border-radius: 6px;
    opacity: 0.8;
    transition: all 0.2s ease;

    &:hover {
      opacity: 1;
      transform: translateY(-1px);
    }
  }

  // 用户消息操作按钮（左侧显示，hover时出现）
  &.user-actions {
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    flex-direction: row;
    align-items: center;
    margin-right: 8px;

    .ant-btn {
      color: #6b7280;
      background-color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 4px;

      &:hover {
        color: #374151;
        background-color: #f3f4f6;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.delete-message-btn {
        &:hover {
          color: #dc2626;
          background-color: #fef2f2;
        }
      }
    }
  }

  // 删除按钮特殊样式
  .delete-message-btn {
    &:hover {
      color: #dc2626 !important;
      background-color: #fef2f2 !important;
    }
  }
}

// 用户消息hover时显示操作按钮
.user-box:hover .user-actions {
  opacity: 1;
  visibility: visible;
}

@keyframes dotPulse {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
