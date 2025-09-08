<template>
  <!-- 聊天对话列表 -->
  <div v-if="chatList.length > 0" class="chat-area">
    <div
      ref="chatListRef"
      class="chat-list"
      :class="{ 'is-collapse': isCollapse }"
      @scroll="handleScroll"
    >
      <!-- 用户消息 -->
      <div v-for="(message, index) in chatList" :key="index">
        <div v-if="message.type === MessageRoleEnum.USER" class="user-box">
          <div class="user-chat">
            <!-- 用户消息操作按钮 -->
            <div class="message-actions user-actions">
              <a-popconfirm
                v-if="!props.isShareMode"
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
                type="text"
                size="small"
                @click="$emit('copyMessage', getUserText(message.content))"
                :title="t('common.copy')"
              >
                <CopyOutlined />
              </a-button>
            </div>
            <div class="user-chat-left">
              <div class="user-chat-left-box">
                <div
                  class="label-user"
                  v-if="typeof message.content === 'string'"
                >
                  {{ message.content }}
                </div>
                <div
                  class="label-user"
                  v-else-if="Array.isArray(message.content)"
                >
                  <div class="user-text-top" v-if="userText(message.content)">
                    {{ userText(message.content) }}
                  </div>
                  <div
                    class="user-image-grid"
                    v-if="userImages(message.content).length"
                  >
                    <ImagePreviewer
                      v-for="(src, pIdx) in userImages(message.content)"
                      :key="pIdx"
                      :src="src"
                      alt="image"
                      :theme="currentTheme"
                      class="user-inline-image"
                    />
                  </div>
                </div>
              </div>
            </div>
            <!-- <div class="img-user">
              {{ userInfo?.name?.charAt(0) || "U" }}
            </div> -->
          </div>
        </div>
        <!-- AI回复 --> 
        <!-- 调试: 显示消息类型信息 -->
        <!-- <div style="background: {{ message.type === MessageRoleEnum.AI ? 'lightgreen' : 'lightcoral' }}; padding: 3px; margin: 2px; font-size: 11px; border: 1px solid #333;">
          🔍 MSG[{{ message.id }}]: type='{{ message.type }}' | isAI={{ message.type === MessageRoleEnum.AI }}
        </div> -->
        <div v-if="isAIMessage(message)" class="assistant-box">
          <div class="assistant-chat">
            <img
              class="img-assistant"
              alt=""
              :class="{ streaming: message.isStreaming }"
              src="@/assets/images/brain.png"
            />
            <div class="assistant-chat-content">
              <div class="assistant-chat-label">
                <!-- 渲染当前索引的内容（保持顺序） -->
                <template v-if="getCurrentMessageContent(message) !== null">
                  <!-- 存在 kedomind：kedomind 之后作为子步骤，之前正常显示 -->
                  <template
                    v-if="getCurrentMessageContent(message) && getCurrentMessageContent(message).length > 0 && hasKedomind(getCurrentMessageContent(message))"
                  >
                    <!-- 1) kedomind 之前的普通块（保持原来展示） -->
                    <div
                      v-for="(block, pbIndex) in getPreKedomindBlocks(
                        getCurrentMessageContent(message)
                      )"
                      :key="`pre-${pbIndex}`"
                      class="assistant-content"
                    >
                      <template v-if="block.type === 'text'">
                        <MarkdownParser :msg="block.content" :theme="currentTheme" />
                      </template>
                      <template v-else-if="block.type === 'tool'">
                        <div class="process-steps">
                          <div class="process-step">
                            <div
                              class="step-header tool-header"
                              @click.stop="
                                block.toolData?.toolId &&
                                  $emit(
                                    'jumpToMindSpace',
                                    'terminal',
                                    block.toolData.toolId
                                  )
                              "
                            >
                              <div class="step-info">
                                <MoreOutlined
                                  class="step-icon terminal-step-icon"
                                />
                                <span class="step-title">
                                  <template v-if="block.toolData?.mcpName"
                                    >{{ block.toolData.mcpName }}:
                                  </template>
                                  {{
                                    block.toolData?.apiName ||
                                    block.toolData?.toolId ||
                                    ""
                                  }}
                                </span>
                              </div>
                              <div class="step-actions">
                                <a
                                  class="status-badge clickable"
                                  :class="{
                                    'status-error':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR,
                                    'status-success':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS,
                                    'status-loading':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.CALLING,
                                    'status-stopped':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP,
                                  }"
                                  @click.stop="
                                    block.toolData?.toolId &&
                                      $emit(
                                        'jumpToMindSpace',
                                        'terminal',
                                        block.toolData.toolId
                                      )
                                  "
                                >
                                  <ExclamationCircleOutlined
                                    v-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR
                                    "
                                  />
                                  <CheckCircleOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS
                                    "
                                  />
                                  <StopOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP
                                    "
                                  />
                                  <LoadingOutlined v-else />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template v-else-if="block.type === 'base64'">
                        <MarkdownParser
                          :msg="buildImageMarkdown(block.content)"
                          :theme="currentTheme"
                        />
                      </template>
                    </div>

                    <!-- 2) kedomind 组（仅 kedo step 开组；仅吸收文本与 Tavily 搜索） -->
                    <div
                      v-for="(kg, kgIndex) in getKedomindGroups(
                        getCurrentMessageContent(message)
                      )"
                      :key="`kedo-group-${kgIndex}`"
                      class="assistant-content"
                    >
                      <div class="process-steps">
                        <div class="process-step">
                          <div class="step-header">
                            <div class="step-info">
                              <BulbOutlined
                                class="step-icon thinking-step-icon"
                              />
                              <span class="step-title">
                                <span>
                                  {{ kg.instruction || t("chat.thinking") }}
                                  <span
                                    v-if="kg.children && kg.children.length > 0"
                                    class="child-count"
                                  >
                                    ({{ kg.children.length }}
                                    {{ t("chat.subSteps") }})
                                  </span>
                                </span>
                              </span>
                            </div>
                          </div>
                          <div class="step-content">
                            <!-- kedo step 本身的文字 -->
                            <MarkdownParser :msg="kg.header || ''" :theme="currentTheme" />

                            <!-- 流式按顺序渲染：文本与子步骤混排，保证顺序正确 -->
                            <template
                              v-for="(seg, sIdx) in kg.stream"
                              :key="`seg-${kgIndex}-${sIdx}`"
                            >
                              <div v-if="seg.kind === 'text'">
                                <MarkdownParser :msg="seg.content || ''" :theme="currentTheme" />
                              </div>
                              <div v-else-if="seg.kind === 'base64'">
                                <MarkdownParser
                                  :msg="buildImageMarkdown(seg.content || '')"
                                  :theme="currentTheme"
                                />
                              </div>
                              <div
                                v-else-if="seg.kind === 'child'"
                                class="child-steps"
                              >
                                <div
                                  class="child-step child-step-clickable"
                                  :class="{
                                    'child-step-search':
                                      seg.child.type === 'search',
                                    'child-step-terminal':
                                      seg.child.type === 'terminal',
                                    'child-step-error':
                                      seg.child.type === 'error',
                                  }"
                                  @click.stop="
                                    seg.child.toolCallId &&
                                      $emit(
                                        'jumpToMindSpace',
                                        seg.child.type,
                                        seg.child.toolCallId
                                      )
                                  "
                                >
                                  <SearchOutlined
                                    v-if="seg.child.type === 'search'"
                                    class="child-step-icon"
                                  />
                                  <MoreOutlined
                                    v-if="seg.child.type === 'terminal'"
                                    class="child-step-icon"
                                  />
                                  <ExclamationCircleOutlined
                                    v-if="seg.child.type === 'error'"
                                    class="child-step-icon"
                                  />
                                  <div class="child-step-title">
                                    <span v-if="seg.child.type === 'search'"
                                      >{{ t("chat.search") }}
                                      {{ seg.child.content }}</span
                                    >
                                    <span
                                      v-else-if="seg.child.type === 'terminal'"
                                    >
                                      <template v-if="seg.child.mcpName"
                                        >{{ seg.child.mcpName }}:
                                      </template>
                                      {{
                                        seg.child.apiName || seg.child.content
                                      }}
                                    </span>
                                    <span v-else-if="seg.child.type === 'error'"
                                      >{{ t("chat.error") }}:
                                      {{ seg.child.content }}</span
                                    >
                                  </div>
                                  <span class="child-step-mind-icon">
                                    <ExclamationCircleOutlined
                                      v-if="seg.child.isError"
                                      class="status-icon error"
                                    />
                                    <CheckCircleOutlined
                                      v-else-if="seg.child.hasResult === true"
                                      class="status-icon success"
                                    />
                                    <LoadingOutlined
                                      v-else
                                      class="status-icon loading"
                                    />
                                  </span>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 3) KEDOMIND_STEP 之后但未被组吸收的普通块（包括 KEDOMIND_START/KEDOMIND_FINALIZE/其它工具） -->
                    <div
                      v-for="(block, nbIndex) in getNormalBlocksAfterKedo(
                        getCurrentMessageContent(message)
                      )"
                      :key="`normal-after-${nbIndex}`"
                      class="assistant-content"
                    >
                      <template v-if="block.type === 'text'">
                        <MarkdownParser :msg="block.content" :theme="currentTheme" />
                      </template>
                      <template v-else-if="block.type === 'tool'">
                        <div class="process-steps">
                          <div class="process-step">
                            <div
                              class="step-header tool-header"
                              @click.stop="
                                block.toolData?.toolId &&
                                  $emit(
                                    'jumpToMindSpace',
                                    'terminal',
                                    block.toolData.toolId
                                  )
                              "
                            >
                              <div class="step-info">
                                <MoreOutlined
                                  class="step-icon terminal-step-icon"
                                />
                                <span class="step-title">
                                  <template v-if="block.toolData?.mcpName"
                                    >{{ block.toolData.mcpName }}: </template
                                  >{{
                                    block.toolData?.apiName ||
                                    block.toolData?.toolId ||
                                    ""
                                  }}
                                </span>
                              </div>
                              <div class="step-actions">
                                <a
                                  class="status-badge clickable"
                                  :class="{
                                    'status-error':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR,
                                    'status-success':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS,
                                    'status-loading':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.CALLING,
                                    'status-stopped':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP,
                                  }"
                                  @click.stop="
                                    block.toolData?.toolId &&
                                      $emit(
                                        'jumpToMindSpace',
                                        'terminal',
                                        block.toolData.toolId
                                      )
                                  "
                                >
                                  <ExclamationCircleOutlined
                                    v-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR
                                    "
                                  />
                                  <CheckCircleOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS
                                    "
                                  />
                                  <StopOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP
                                    "
                                  />
                                  <LoadingOutlined v-else />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template v-else-if="block.type === 'base64'">
                        <MarkdownParser
                          :msg="buildImageMarkdown(block.content)"
                          :theme="currentTheme"
                        />
                      </template>
                    </div>
                  </template>

                  <!-- 不存在 kedomind：保持原来的逐块展示 -->
                  <template v-else>
                    <!-- 如果没有内容，显示加载或空状态提示 -->
                    <div v-if="!getCurrentMessageContent(message) || getCurrentMessageContent(message).length === 0" class="assistant-content">
                      <div class="empty-content-message">
                        <span>{{ message.isStreaming ? t('common.loading') : t('common.noHistoryMessageRecord') }}</span>
                      </div>
                    </div>
                    <div
                      v-else
                      v-for="(block, bIndex) in getBlocks(
                        getCurrentMessageContent(message)
                      )"
                      :key="`block-${bIndex}`"
                      class="assistant-content"
                    >
                      <template
                        v-if="block.type === AIMessageContentBlocksType.TEXT"
                      >
                        <MarkdownParser :msg="block.content" :theme="currentTheme" />
                      </template>
                      <template
                        v-else-if="
                          block.type === AIMessageContentBlocksType.TOOL
                        "
                      >
                        <div class="process-steps">
                          <div class="process-step">
                            <div
                              class="step-header tool-header"
                              @click.stop="
                                block.toolData?.toolId &&
                                  $emit(
                                    'jumpToMindSpace',
                                    'terminal',
                                    block.toolData.toolId
                                  )
                              "
                            >
                              <div class="step-info">
                                <MoreOutlined
                                  class="step-icon terminal-step-icon"
                                />
                                <span class="step-title">
                                  <template v-if="block.toolData?.mcpName"
                                    >{{ block.toolData.mcpName }}: </template
                                  >{{
                                    block.toolData?.apiName ||
                                    block.toolData?.toolId ||
                                    t("chat.retry")
                                  }}
                                </span>
                              </div>
                              <div class="step-actions">
                                <a
                                  class="status-badge clickable"
                                  :class="{
                                    'status-error':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR,
                                    'status-success':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS,
                                    'status-loading':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.CALLING,
                                    'status-stopped':
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP,
                                  }"
                                  @click.stop="
                                    block.toolData?.toolId &&
                                      $emit(
                                        'jumpToMindSpace',
                                        'terminal',
                                        block.toolData.toolId
                                      )
                                  "
                                >
                                  <ExclamationCircleOutlined
                                    v-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.ERROR
                                    "
                                  />
                                  <CheckCircleOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.SUCCESS
                                    "
                                  />
                                  <StopOutlined
                                    v-else-if="
                                      block.toolData?.state ===
                                      ToolCallStateEnum.STOP
                                    "
                                  />
                                  <LoadingOutlined v-else />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template
                        v-else-if="
                          block.type === AIMessageContentBlocksType.BASE64
                        "
                      >
                        <MarkdownParser
                          :msg="buildImageMarkdown(block.content)"
                          :theme="currentTheme"
                        />
                      </template>
                    </div>
                  </template>
                </template>
                <!-- 流式加载动画 -->
                <div v-if="message.isStreaming" class="assistant-chat-loading">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div v-if="!message.isStreaming && message.content[message.currentIndex].tokenUsage" class="token-usage-display">
                  <span class="token-usage-text"
                    >{{ message.content[message.currentIndex].tokenUsage }} tokens</span
                  >
                </div>
              </div>
              <!-- AI消息操作按钮 -->
              <div
                v-if="!message.isStreaming"
                class="message-actions assistant-actions"
              >
                <!-- Token消耗量显示 -->

                <div class="assistant-pagination">
                  <a-space align="center" v-if="message.content.length > 1">
                    <a-button
                      class="assistant-pagination-btn"
                      type="text"
                      size="small"
                      :disabled="message.currentIndex === 0"
                      @click="handlePrev(message)"
                      :title="t('common.prev')"
                    >
                      <LeftOutlined />
                    </a-button>
                    <span>
                      {{ message.currentIndex + 1 }} /
                      {{ message.content.length }}
                    </span>
                    <a-button
                      class="assistant-pagination-btn"
                      type="text"
                      size="small"
                      :disabled="
                        message.currentIndex === message.content.length - 1
                      "
                      @click="handleNext(message)"
                      :title="t('common.next')"
                    >
                      <RightOutlined />
                    </a-button>
                  </a-space>
                </div>
                <a-space>
                  <a-button
                    v-if="computedIsShowRetry(message, index)"
                    type="text"
                    size="small"
                    @click="$emit('retryMessage', message, index)"
                    :title="t('chat.retry')"
                  >
                    <RedoOutlined />
                  </a-button>
                  <a-popconfirm
                    v-if="!props.isShareMode"
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
                    type="text"
                    size="small"
                    @click="copyMessageText(message)"
                    :title="t('common.copy')"
                  >
                    <CopyOutlined />
                  </a-button>
                  <a-button
                    type="text"
                    size="small"
                    @click="exportMessageText(message)"
                    :title="t('chat.exportWord')"
                  >
                    <FileWordOutlined />
                  </a-button>
                </a-space>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 一键直达底部悬浮按钮 -->
    <div
      v-if="showBackToBottom"
      class="back-to-bottom-btn"
      @click="scrollToBottom"
    >
      <div class="back-to-bottom-content">
        <DownOutlined />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  nextTick,
  onMounted,
  onUnmounted,
  onUpdated,
  watch,
} from "vue";
// @ts-ignore
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
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
  RedoOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons-vue";
import MarkdownParser from "@/components/markdownParser/MarkdownParser.vue";
import {
  AIMessage,
  ApiNameEnum,
  MessageActionEnum,
  MessageEventData,
  MessageEventEnum,
  ToolCallStateEnum,
  AIMessageContentBlocksType,
  Message,
} from "@/types";
import { useI18n } from "vue-i18n";
import { MessageRoleEnum } from "@/types";
import { awaitWrapper, exportToWord } from "@/api";
import { Base64 } from "js-base64";
import { message } from "ant-design-vue";
import MarkdownIt from "markdown-it";
import { useChat, useExport } from "@/hooks";
import { useThemeStore } from "@/store";
import { ImagePreviewer } from "../markdownParser";

// Props
const props = defineProps<{
  chatList: any[];
  userInfo: any;
  stepCollapsedState: Record<string, boolean>;
  isShareMode?: boolean; // 是否为分享模式，分享模式下禁用删除功能
  isCollapse?: boolean; // 是否折叠
  autoScroll?: boolean; // 是否启用自动滚动
  isLoading?: boolean; // 是否正在加载
}>();

// Emits
const emit = defineEmits<{
  deleteMessage: [item: any, index: number];
  copyMessage: [content: string];
  exportToWord: [content: string];
  toggleStepCollapsed: [messageIndex: number, stepIndex: number | string];
  jumpToMindSpace: [stepType: string, toolCallId: string];
  retryMessage: [item: any, index: number];
  scrollToBottom: []; // 新增滚动到底部事件
}>();

// 使用useChat hook
const { getProcessSteps } = useChat();
const { exportAsWord } = useExport();

// 获取主题
const themeStore = useThemeStore();
const currentTheme = computed(() => themeStore.theme);

// 滚动相关状态（精简重写）
const chatListRef = ref<HTMLElement>();
const showBackToBottom = ref(false);
const lastScrollTop = ref(0);
const isAutoScrolling = ref(false);
const userPinnedAway = ref(false); // 是否用户已离开底部（向上滚动或不在底部）
const resumeTimer = ref<number | null>(null); // loading 期间 10s 后恢复自动滚动

// 是否在底部（严格判定）
const isAtBottom = (): boolean => {
  if (!chatListRef.value) return true;
  const { scrollTop, scrollHeight, clientHeight } = chatListRef.value;
  return scrollHeight - scrollTop - clientHeight <= 1;
};

// 清理和设置 10s 恢复定时器（仅在 loading=true 且用户离开底部时生效）
const clearResumeTimer = () => {
  if (resumeTimer.value) {
    clearTimeout(resumeTimer.value);
    resumeTimer.value = null;
  }
};

const scheduleResume = () => {
  clearResumeTimer();
  if (!props.isLoading) return;
  resumeTimer.value = setTimeout(() => {
    userPinnedAway.value = false;
    showBackToBottom.value = false;
    // 恢复自动滚动到底部（无 smooth）
    if (chatListRef.value) {
      isAutoScrolling.value = true;
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight;
      setTimeout(() => (isAutoScrolling.value = false), 100);
    }
  }, 10000) as unknown as number;
};

// 处理滚动事件
const handleScroll = () => {
  if (!chatListRef.value || isAutoScrolling.value) return;

  const { scrollTop } = chatListRef.value;
  const delta = scrollTop - lastScrollTop.value;
  const atBottomNow = isAtBottom();

  // 用户有滚动行为
  if (Math.abs(delta) > 1) {
    if (delta < 0 || !atBottomNow) {
      // 向上滚动 或 已离开底部
      userPinnedAway.value = true;
      showBackToBottom.value = true;
      // loading 期间 10s 后恢复自动到底
      if (props.isLoading) scheduleResume();
      else clearResumeTimer();
    } else if (atBottomNow) {
      // 回到底部
      userPinnedAway.value = false;
      showBackToBottom.value = false;
      clearResumeTimer();
    }
  } else if (atBottomNow) {
    // 无明显滚动但在底部
    userPinnedAway.value = false;
    showBackToBottom.value = false;
    clearResumeTimer();
  }

  lastScrollTop.value = scrollTop;
};

// 滚动到底部方法（平滑滚动，用于一键直达）
const scrollToBottom = () => {
  nextTick(() => {
    if (chatListRef.value) {
      isAutoScrolling.value = true;
      chatListRef.value.scrollTo({
        top: chatListRef.value.scrollHeight,
        behavior: "smooth",
      });
      showBackToBottom.value = false;
      userPinnedAway.value = false;
      // 监控到达底部后再重置，避免中途被打断
      const start = Date.now();
      const checkDone = () => {
        if (!chatListRef.value) {
          isAutoScrolling.value = false;
          return;
        }
        if (isAtBottom()) {
          isAutoScrolling.value = false;
          return;
        }
        // 最长2秒保护
        if (Date.now() - start > 2000) {
          isAutoScrolling.value = false;
          return;
        }
        requestAnimationFrame(checkDone);
      };
      requestAnimationFrame(checkDone);
    }
  });
};

// 暴露滚动到底部方法给父组件
const exposeScrollToBottom = () => {
  scrollToBottom();
};

// 强制滚动到底部（无平滑，用于内部自动滚动）
const forceScrollToBottom = () => {
  nextTick(() => {
    if (chatListRef.value) {
      isAutoScrolling.value = true;
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight;
      showBackToBottom.value = false;
      userPinnedAway.value = false;

      setTimeout(() => {
        isAutoScrolling.value = false;
      }, 100);
    }
  });
};

// 在组件更新后，如果处于 loading 且未被用户固定，自动保持底部
onUpdated(() => {
  // 避免在平滑滚动过程中被打断
  if (isAutoScrolling.value) return;
  if (props.isLoading && !userPinnedAway.value) {
    forceScrollToBottom();
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  clearResumeTimer();
});

onMounted(() => {
  // 初始时尽量保持在底部
  forceScrollToBottom();
});

// 监听 loading 状态变化，按规则处理
watch(
  () => props.isLoading,
  (now) => {
    if (now) {
      if (!userPinnedAway.value) forceScrollToBottom();
      else scheduleResume();
    } else {
      clearResumeTimer();
    }
  }
);

// 检查消息是否为AI类型的计算属性
const isAIMessage = (message: Message) => {
  const result = message.type === MessageRoleEnum.AI;
  // console.log(`🎯 [AI_CHECK] 消息 ${message.id} - type: "${message.type}", MessageRoleEnum.AI: "${MessageRoleEnum.AI}", 结果: ${result}`);
  // console.log(`🎯 [AI_CHECK] 类型检查详情:`, {
  //   messageType: message.type,
  //   enumValue: MessageRoleEnum.AI,
  //   typeOfMessage: typeof message.type,
  //   typeOfEnum: typeof MessageRoleEnum.AI,
  //   strictEqual: message.type === MessageRoleEnum.AI,
  //   looseEqual: message.type == MessageRoleEnum.AI
  // });
  return result;
};

// 获取当前消息内容的 computed
const getCurrentMessageContent = (message: Message) => {
  // 添加类型检查日志
  // console.log(`🔍 [MSG_TYPE] 检查消息类型 - ID: ${message.id}, type: ${message.type}, MessageRoleEnum.AI: ${MessageRoleEnum.AI}, 是否匹配: ${message.type === MessageRoleEnum.AI}`);
  
  if (message.type !== MessageRoleEnum.AI) return null;
  
  if (!message.content || message.content.length === 0) {
    console.log(`⚠️ [ChatListBlock] message.content 为空 - messageId: ${message.id}`);
    return null;
  }
  
  if (typeof message.currentIndex !== 'number' || message.currentIndex < 0 || message.currentIndex >= message.content.length) {
    console.log(`⚠️ [ChatListBlock] currentIndex 无效 - messageId: ${message.id}, currentIndex: ${message.currentIndex}, content长度: ${message.content.length}`);
    return null;
  }
  
  const currentContent = message.content[message.currentIndex];
  const contentList = currentContent?.contentList || [];
  
  // 只为空contentList输出警告，但仍然返回数组以确保组件能渲染
  if (!contentList || contentList.length === 0) {
    console.log(`⚠️ [ChatListBlock] getMessage ${message.id} - contentList为空，但仍然返回空数组以确保显示`);
    return []; // 返回空数组而不是null，这样组件仍然会渲染
  }
  
  return contentList;
};

//导出word
const exportWord = async (words: string) => {
  await exportAsWord(words);
};

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

// 工具折叠状态管理
const toolCollapsedState = ref<Record<string, boolean>>({});

// 获取工具折叠状态的key（支持字符串索引，避免不同区域索引冲突）
const getToolKey = (messageIndex: number, toolIndex: number | string) =>
  `tool-${messageIndex}-${toolIndex}`;

// 检查工具是否折叠
const isToolCollapsed = (messageIndex: number, toolIndex: number | string) => {
  const key = getToolKey(messageIndex, toolIndex);
  return toolCollapsedState.value[key] ?? false;
};

// 切换工具折叠状态
const toggleToolCollapsed = (
  messageIndex: number,
  toolIndex: number | string
) => {
  const key = getToolKey(messageIndex, toolIndex);
  toolCollapsedState.value[key] = !toolCollapsedState.value[key];
};

function handlePrev(message: AIMessage) {
  if (message.currentIndex > 0) {
    message.currentIndex--;
  }
}
function handleNext(message: AIMessage) {
  if (message.currentIndex < message.content.length - 1) {
    message.currentIndex++;
  }
}

// 提取当前消息的纯文本内容
const extractMessageText = (message: any): string => {
  const content = getCurrentMessageContent(message);
  if (!content) return "";

  const blocks = getBlocks(content);
  const textParts: string[] = [];

  for (const block of blocks) {
    if (block.type === "text") {
      textParts.push(block.content || "");
    }
  }

  return textParts.join("\n\n");
};

// 复制消息文本
const copyMessageText = async (msg: any) => {
  const text = extractMessageText(msg);
  if (!text) {
    message.warning("没有可复制的内容");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    message.success("内容已复制到剪贴板");
  } catch (error) {
    console.error("复制失败:", error);
    message.error("复制失败");
  }
};

// 导出消息文本
const exportMessageText = async (msg: any) => {
  const text = extractMessageText(msg);
  if (!text) {
    message.warning("没有可导出的内容");
    return;
  }

  await exportWord(text);
};

// 判断是否显示重试按钮
const computedIsShowRetry = (message: any, index: number): boolean => {
  // 必须是最后一条消息
  if (index !== props.chatList.length - 1) return false;

  // 必须是AI类型
  if (message.type !== MessageRoleEnum.AI) return false;

  return true;
};

// 暴露 ref 和方法给父组件
defineExpose({
  chatListRef,
  scrollToBottom: exposeScrollToBottom,
  forceScrollToBottom,
});

const { t } = useI18n();

// 将用户 content 规整为纯文本，用于复制
function getUserText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (p?.type === "text" ? p.text || "" : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// 提取用户消息的文本（顶部显示）
function userText(content: any[]): string {
  return content
    .filter((p) => p && p.type === "text")
    .map((p) => p.text || "")
    .join("\n");
}

// 提取用户消息的图片列表（底部网格显示）
function userImages(content: any[]): string[] {
  return content
    .filter((p) => p && (p.type === "image_url" || p.type === "image"))
    .map((p) => p.image_url?.url || p.data || "")
    .filter((src) => typeof src === "string" && src);
}

// 判断是否为 blocks 渲染模式（contentList 为二维数组）
function isBlocksMode(contentList: any) {
  return Array.isArray(contentList) && Array.isArray(contentList[0]);
}

// 获取所有块（拍平成一维，保持顺序）
function getBlocks(contentList: any) {
  if (!contentList) return [];
  // 如果是一维数组，直接返回
  if (Array.isArray(contentList) && !Array.isArray(contentList[0])) {
    return contentList;
  }
  // 如果是二维数组，拍平
  if (isBlocksMode(contentList)) {
    return (contentList as any[][]).flat();
  }
  return [];
}

function isKedoStepApi(apiName?: string): boolean {
  if (!apiName) return false;
  return apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_STEP);
}

function firstKedomindIndex(blocks: any[]): number {
  // 仅以 KEDOMIND_STEP 作为分组起点
  return blocks.findIndex(
    (b) =>
      b?.type === "tool" &&
      isKedoStepApi(b?.toolData?.apiName || b?.toolData?.toolId)
  );
}

function getPreKedomindBlocks(contentList: any) {
  const blocks = getBlocks(contentList);
  const idx = firstKedomindIndex(blocks);
  if (idx <= 0) return idx === 0 ? [] : blocks; // 没有或开头即 kedomind
  return blocks.slice(0, idx);
}

function hasKedomind(contentList: any) {
  const blocks = getBlocks(contentList);
  return firstKedomindIndex(blocks) !== -1;
}

function getKedomindGroup(contentList: any) {
  const blocks = getBlocks(contentList);
  const idx = firstKedomindIndex(blocks);
  if (idx === -1) return null;

  const kedo = blocks[idx];
  const args = safeParseJson(kedo?.toolData?.arguments);
  const result = safeParseJson(kedo?.toolData?.result);
  const thought: string =
    args && typeof args === "object" && args.completion_note
      ? args.completion_note
      : "";
  const instruction: string =
    result && typeof result === "object" && result.instruction
      ? result.instruction
      : "";

  const group: any = {
    type: "thinking-group",
    content: thought || "",
    instruction: instruction || "",
    children: [] as any[],
  };

  // 将 kedomind 之后的块，按规则转成子步骤
  for (let i = idx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "text") {
      const extra = String(b.content ?? "");
      if (extra.trim()) {
        group.content = group.content ? `${group.content}\n\n${extra}` : extra;
      }
      continue;
    }
    if (b.type === "tool") {
      const apiName: string | undefined =
        b.toolData?.apiName || b.toolData?.toolId;
      if (isTavilySearch(apiName)) {
        const a = safeParseJson(b.toolData?.arguments);
        const query = a && typeof a === "object" ? a.query || "" : "";
        group.children.push({ type: "search", content: query });
      } else if (isKedomindApi(apiName)) {
        // 新的 kedomind 出现，合并其文本
        const a2 = safeParseJson(b.toolData?.arguments);
        const thought2: string =
          a2 && typeof a2 === "object" && a2.completion_note
            ? a2.completion_note
            : "";
        if (thought2) {
          group.content = group.content
            ? `${group.content}\n\n${thought2}`
            : thought2;
        }
      } else {
        group.children.push({ type: "terminal", content: apiName });
      }
    }
  }
  return group;
}

// 切分成多组：仅 kedomind_step 开组；组内吸收后续所有内容（文本与所有工具），直到遇到新的 kedomind_step 或 kedomind_finalize
function getKedomindGroups(contentList: any) {
  const blocks = getBlocks(contentList);
  const groups: any[] = [];
  let current: any | null = null;

  const pushTextTo = (grp: any, text: string) => {
    if (!text) return;
    // 将文本作为流式片段，保证原始顺序
    grp.stream.push({ kind: "text", content: text });
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "tool") {
      const apiName: string | undefined =
        b?.toolData?.apiName || b?.toolData?.toolId;
      if (isKedomindApi(apiName)) {
        const args = safeParseJson(b.toolData?.arguments);
        const result = safeParseJson(b.toolData?.result);
        const thought: string =
          args && typeof args === "object" && args.completion_note
            ? args.completion_note
            : "";
        const instruction: string =
          result && typeof result === "object" && result.instruction
            ? result.instruction
            : "";
        if (
          apiName &&
          apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_STEP)
        ) {
          // 新开一组（仅 step 开组）
          current = {
            type: "thinking-group",
            header: thought || "",
            content: "",
            instruction: instruction || "",
            children: [],
            stream: [],
          };
          groups.push(current);
        } else if (
          apiName &&
          apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_FINALIZE)
        ) {
          // finalize 作为边界，不被吸收
          current = null;
        } else {
          // 其它 kedomind_*（start/status等）在组内作为子步骤吸收
          if (current) {
            current.stream.push({
              kind: "child",
              child: { type: "terminal", content: apiName },
            });
          }
        }
        continue;
      }
    }

    if (!current) {
      // kedomind 出现之前的内容不纳入组，这部分已在模板前段按原逻辑展示
      continue;
    }

    if (b.type === "text") {
      // 若下一个 kedomind 边界是 finalize，则该文本不被吸收
      const boundary = findNextKedoBoundary(blocks, i + 1);
      if (boundary === "finalize") {
        continue;
      }
      pushTextTo(current, String(b.content ?? ""));
    } else if (b.type === "base64") {
      current.stream.push({ kind: "base64", content: String(b.content ?? "") });
    } else if (b.type === "tool") {
      const apiName: string | undefined =
        b.toolData?.apiName || b.toolData?.toolId;
      // 组内吸收所有工具（除边界），Tavily 标识为 search，其余标识 terminal
      if (
        apiName &&
        apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_FINALIZE)
      ) {
        // 边界，结束组
        current = null;
      } else if (
        apiName &&
        apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_STEP)
      ) {
        // 新的 step 将在外循环创建新组，这里结束当前组
        current = null;
      } else if (isTavilySearch(apiName)) {
        const a = safeParseJson(b.toolData?.arguments);
        const query = a && typeof a === "object" ? a.query || "" : "";
        current.stream.push({
          kind: "child",
          child: {
            type: "search",
            content: query,
            toolCallId: b.toolData?.toolId,
            hasResult: !isResultEmpty(b.toolData?.result),
            isError: isToolError(b.toolData),
          },
        });
      } else {
        current.stream.push({
          kind: "child",
          child: {
            type: "terminal",
            content: apiName,
            toolCallId: b.toolData?.toolId,
            hasResult: !isResultEmpty(b.toolData?.result),
            isError: isToolError(b.toolData),
          },
        });
      }
    }
  }

  return groups;
}

// 查找从某索引开始的下一个 kedomind 边界（step 或 finalize）
function findNextKedoBoundary(
  blocks: any[],
  startIndex: number
): "step" | "finalize" | null {
  for (let j = startIndex; j < blocks.length; j++) {
    const bb = blocks[j];
    if (bb?.type === "tool") {
      const name = (
        bb.toolData?.apiName ||
        bb.toolData?.toolId ||
        ""
      ).toLowerCase();
      if (name.includes(ApiNameEnum.KEDOMIND_STEP)) return "step";
      if (name.includes(ApiNameEnum.KEDOMIND_FINALIZE)) return "finalize";
    }
  }
  return null;
}

// 提取在出现 kedomind_step 之后、但未被组吸收的普通块，保持原始顺序
function getNormalBlocksAfterKedo(contentList: any) {
  const blocks = getBlocks(contentList);
  const normal: any[] = [];
  let seenStep = false;
  let inGroup = false;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "tool") {
      const apiName: string | undefined =
        b?.toolData?.apiName || b?.toolData?.toolId;
      if (
        apiName &&
        apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_STEP)
      ) {
        seenStep = true;
        inGroup = true;
        continue; // 该块由组渲染
      }
      if (!seenStep) {
        continue; // 组出现之前的普通块由“pre”渲染
      }
      if (
        apiName &&
        apiName.toLowerCase().includes(ApiNameEnum.KEDOMIND_FINALIZE)
      ) {
        // finalize 作为普通块，并结束当前组
        normal.push(b);
        inGroup = false;
        continue;
      }
      if (inGroup) {
        // 组内工具已被吸收（任何类型，包括 tavily 与其它终端）
        continue;
      }
      // seenStep 且非组内 → finalize 之后直到下一次 step 的普通块
      normal.push(b);
      continue;
    }
    // 文本/base64 处理
    if (b.type === "text" || b.type === "base64") {
      if (!seenStep) {
        continue; // 组出现之前的文本/图片由“pre”渲染
      }
      if (inGroup) {
        // 若下一个 kedomind 边界是 finalize，则该内容不被组吸收，作为普通块渲染
        const boundary = findNextKedoBoundary(blocks, i + 1);
        if (boundary === "finalize") {
          normal.push(b);
        }
        continue;
      }
      // finalize 之后的文本/图片
      normal.push(b);
    }
  }
  return normal;
}

function safeParseJson(value: any): any {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isKedomindApi(apiName?: string): boolean {
  if (!apiName) return false;
  const normalized = apiName.toLowerCase();
  return (
    normalized.includes(ApiNameEnum.KEDOMIND_START) ||
    normalized.includes(ApiNameEnum.KEDOMIND_STEP) ||
    normalized.includes(ApiNameEnum.KEDOMIND_FINALIZE) ||
    normalized.includes("kedomind_status") ||
    normalized.includes("kedomind")
  );
}

function isTavilySearch(apiName?: string): boolean {
  if (!apiName) return false;
  const normalized = apiName.toLowerCase();
  return normalized === "tavily_search" || normalized.includes("tavily");
}

// 结果判空与状态
function isResultEmpty(raw: any): boolean {
  const val = safeParseJson(raw);
  if (val === undefined || val === null) return true;
  if (typeof val === "string") return val.trim().length === 0;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

function hasToolResult(toolData: any): boolean {
  return !isResultEmpty(toolData?.result);
}

function isToolError(toolData: any): boolean {
  const val = safeParseJson(toolData?.result);
  return !!(
    val &&
    typeof val === "object" &&
    (val.isError === true || val.error === true)
  );
}

// 将 base64 内容转为 Markdown 图片（若已是 data:URI 则直接使用）
function buildImageMarkdown(url: string): string {
  if (!url) return "";
  return `![工具生成的图片](${url})`;
}

// 将 blocks 分组为“思考组 + 子步骤”，样式与 ChatList.vue 对齐
function getGroupedItems(message: any) {
  const blocks = getBlocks(message);
  const grouped: Array<any> = [];
  let currentGroup: any = null;

  for (const block of blocks) {
    if (block.type === "text") {
      if (currentGroup) {
        const extra = String(block.content ?? "");
        if (extra.trim()) {
          currentGroup.content = currentGroup.content
            ? `${currentGroup.content}\n\n${extra}`
            : extra;
        }
      } else {
        grouped.push({ type: "text", content: block.content });
      }
      continue;
    }

    if (block.type === "tool") {
      const apiName: string | undefined =
        block.toolData?.apiName || block.toolData?.toolId;

      if (isKedomindApi(apiName)) {
        const args = safeParseJson(block.toolData?.arguments);
        const result = safeParseJson(block.toolData?.result);
        const thought: string =
          args && typeof args === "object" && args.completion_note
            ? args.completion_note
            : "";
        const instruction: string =
          result && typeof result === "object" && result.instruction
            ? result.instruction
            : "";

        currentGroup = {
          type: "thinking-group",
          content: thought || "",
          instruction: instruction || "",
          children: [] as any[],
        };
        grouped.push(currentGroup);
        continue;
      }

      // Tavily 搜索作为子步骤
      if (isTavilySearch(apiName)) {
        const args = safeParseJson(block.toolData?.arguments);
        const query = args && typeof args === "object" ? args.query || "" : "";
        const child = { type: "search", content: query };

        if (currentGroup) {
          currentGroup.children.push(child);
        } else {
          // 无思考组时，单独作为“思考组”展示，保持统一视觉
          grouped.push({
            type: "thinking-group",
            content: "",
            instruction: "",
            children: [child],
          });
        }
        continue;
      }

      // 其他工具作为终端子步骤，仅展示名称（忽略参数与结果）
      const child = { type: "terminal", content: apiName };
      if (currentGroup) {
        currentGroup.children.push(child);
      } else {
        grouped.push({
          type: "thinking-group",
          content: "",
          instruction: "",
          children: [child],
        });
      }
    }
  }

  return grouped;
}

function formatJson(val: any) {
  try {
    if (typeof val === "string") {
      // 优先尝试作为 JSON 字符串格式化
      return JSON.stringify(JSON.parse(val), null, 2);
    }
    return JSON.stringify(val ?? {}, null, 2);
  } catch {
    // 不是 JSON，原样输出
    return String(val ?? "");
  }
}
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
  position: relative;
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
            text-align: justify;
            line-height: 1.5;
            font-size: 14px;
            font-weight: 500;
            color: #fff;
          }
          .user-text-top {
            margin-bottom: 8px;
          }
          .user-image-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            :deep(.md-image-thumb) {
              max-width: 200px;
              max-height: 200px;
            }
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
        position: relative;
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
        color: $text-color;
        // line-height: 1.6;

        .assistant-content {
          white-space: pre-line;
          word-break: break-word;
        }

        /* 工具参数/结果外层滚动容器（限定高度，内部滚动） */
        .tool-json-scroll {
          max-height: 280px;
          overflow: auto;
          padding-right: 8px;
          margin-top: 8px;
          border: 1px dashed rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.02);
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

// Token消耗量显示样式
.token-usage-display {
  position: absolute;
  bottom: 6px;
  right: 12px;
  z-index: 10;

  .token-usage-text {
    font-size: 11px;
    color: $text-color;
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

      &.tool-header {
        background: $main-bg;
        border: 1px solid $border-color;
        border-radius: 10px;
        padding: 8px 12px;
        transition: all 0.3s;
        &:hover {
          color: $primary-color;
          border-color: $primary-color;
        }
      }

      .step-info {
        display: flex;
        align-items: center;
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
          color: #fff;
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
          display: inline-flex;
          align-items: center;
          gap: 8px;

          .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            padding: 2px;
            &.loading {
              background: #fff7e6;
              color: #faad14;
              border: 1px solid rgba(250, 173, 20, 0.25);
            }
            &.success {
              background: #e6fffb;
              color: #13c2c2;
              border: 1px solid rgba(19, 194, 194, 0.25);
            }
          }

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

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          color: $primary-color; // 默认主题色用于loading
          transition: color 0.2s ease;

          &.clickable {
            cursor: pointer;
          }
          &:hover {
            opacity: 0.9;
          }

          &.status-success {
            color: #52c41a;
          }
          &.status-error {
            color: #ff4d4f;
          }
          &.status-loading {
            color: $primary-color;
          }
          &.status-stopped {
            color: #faad14;
          }
        }

        .mind-jump-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          color: $text-color;
          background-color: transparent;
          border: 1px solid $border-color;
          border-radius: 4px;
          transition: all 0.2s ease;

          &:hover {
            background-color: $primary-bg;
            border-color: $primary-color;
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
            border-color: $border-color;
            background-color: $main-bg;
          }

          &.child-step-terminal {
            border-color: $border-color;
            background-color: $main-bg;
          }


          &.child-step-clickable {
            cursor: pointer;

            &:hover {
              box-shadow: 0 4px 12px $shadow-color;
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
            color: $text-color;
          }

          .child-step-mind-icon {
            font-size: 12px;
            color: #6b7280;
            margin-left: auto;
            opacity: 0.7;
            transition: all 0.2s ease;

            .child-step-clickable:hover & {
              opacity: 1;
              color: $primary-color;
            }

            .status-icon.success {
              color: #52c41a;
            }
            .status-icon.error {
              color: #ff4d4f;
            }
            .status-icon.loading {
              color: $primary-color;
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
  position: relative;

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
        color: $text-color;
        background-color: #f3f4f6;
        box-shadow: 0 4px 12px $shadow-color;
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

// 一键直达底部按钮样式
.back-to-bottom-btn {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  cursor: pointer;

  .back-to-bottom-content {
    width: 48px;
    height: 48px;
    background: $main-bg;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $primary-color;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(105, 192, 255, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(105, 192, 255, 0.4);
    }

    .anticon {
      font-size: 18px;
    }
  }
}
</style>
