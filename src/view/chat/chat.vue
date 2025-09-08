<template>
  <div class="chat-container">
    <!-- 左侧边栏 -->
    <Sidebar
      ref="sidebarRef"
      :conversationId="conversationId"
      :appTitle="appTitle"
      @new-task="handleNewTask"
      @show-all-history="showAllHistory"
      @select-chat="selectChat"
      @delete-active="handleDeleteActiveChat"
    />
    <div class="main-content">
      <WindowControls />
      <!-- 主聊天区域 -->
      <div class="main-content-inner">
        <div class="main-content-inner-left">
          <!-- 右上角操作按钮 -->
          <div v-if="chatList.length > 0" class="top-action-buttons">
            <!-- 分享按钮（改为下拉菜单） -->
            <a-dropdown v-if="conversationId">
              <a-button class="share-btn" type="text" size="large">
                <ShareAltOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="handleShareMenuClick">
                  <a-menu-item :key="ShareMenuItems.exportTxt"
                    >导出为TXT</a-menu-item
                  >
                  <a-menu-item :key="ShareMenuItems.exportWord"
                    >导出为Word</a-menu-item
                  >
                </a-menu>
              </template>
            </a-dropdown>

            <!-- 白板按钮 -->
            <a-button
              v-show="isShowWhiteboard"
              class="whiteboard-toggle-btn"
              @click="toggleWhiteboard"
              type="text"
              size="large"
            >
              <LayoutOutlined />
            </a-button>
          </div>

          <!-- 聊天对话列表组件 -->
          <ChatListBlock
            :key="`chat-list-${conversationId}`"
            :isCollapse="isWhiteboardOpen"
            ref="chatListComponentRef"
            :chatList="chatList"
            :userInfo="userInfo"
            :stepCollapsedState="stepCollapsedState"
            :autoScroll="true"
            :isLoading="isCurrentConversationProcessing"
            @deleteMessage="deleteMessage"
            @copyMessage="copyMessage"
            @exportToWord="exportToWord"
            @toggleStepCollapsed="toggleStepCollapsed"
            @jumpToMindSpace="handleJumpToMindSpace"
            @retryMessage="getChatWithAI(true)"
          />
          <!-- 欢迎插图 -->
          <div v-if="chatList.length === 0" class="welcome-illustration">
            <img
              :src="welcomeIllustrationSrc"
              :alt="t('chat.aiThinkingIllustration')"
              class="illustration-image"
            />
          </div>

          <!-- 输入框区域 -->
          <div
            class="input-section"
            :class="{ 'with-whiteboard': isWhiteboardOpen }"
          >
            <div class="input-container">
              <div v-if="pastedImages.length > 0" class="pasted-attachments">
                <a-tag
                  v-for="(img, idx) in pastedImages"
                  :key="idx"
                  closable
                  @close="removePastedImage(idx)"
                >
                  {{ img.name }}
                </a-tag>
              </div>
              <a-textarea
                v-model:value="chatInput"
                type="text"
                :bordered="false"
                :auto-size="{ minRows: 2, maxRows: 4 }"
                :placeholder="t('chat.assignTask')"
                class="chat-input"
                @keydown.enter="handleKeyDown"
                @paste="handlePaste"
              />
              <div class="input-actions">
                <div class="input-actions-left">
                  <a-button class="expand-btn" @click="handleOpenMcpConfig">
                    <ToolOutlined />
                    <span>{{ t("common.expand") }}</span>
                    <span
                      v-if="selectedMcpItems.length > 0"
                      class="expand-count"
                      >{{ selectedMcpItems.length }}</span
                    >
                  </a-button>
                  <a-upload
                    :show-upload-list="false"
                    :before-upload="handleBeforeUpload"
                    accept="image/*"
                    multiple
                  >
                    <a-button class="upload-btn">
                      <PaperClipOutlined />
                      <span>{{ t("common.attachment") }}</span>
                    </a-button>
                  </a-upload>
                  <a-button
                    class="model-btn"
                    @click="showModelSelectModal = true"
                  >
                    <RobotOutlined />
                    <span>{{
                      selectedModel?.modelId || t("common.model")
                    }}</span>
                  </a-button>
                </div>
                <div class="input-actions-right">
                  <a-button
                    @click="handleStartRecord"
                    type="text"
                    :danger="isRecordOpen"
                    class="record-btn"
                    :class="{ recording: isRecordOpen }"
                  >
                    <AudioOutlined v-if="!isRecordOpen" />
                    <AudioMutedOutlined v-else />
                  </a-button>
                  <a-button
                    v-if="!isCurrentConversationProcessing"
                    class="send-btn"
                    @click="handleSendMessage"
                    :disabled="!canSend"
                    type="primary"
                  >
                    <SendOutlined />
                  </a-button>
                  <a-button
                    v-if="isCurrentConversationProcessing"
                    class="stop-btn"
                    @click="stopConversation"
                    type="default"
                    danger
                  >
                    <StopOutlined />
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧白板组件 -->
        <MindSpace
          ref="mindSpaceRef"
          :isOpen="isWhiteboardOpen"
          :thinkingItems="thinkingItems"
          :searchItems="searchItems"
          :terminalItems="terminalItems"
          @close="toggleWhiteboard"
        />
      </div>
    </div>

    <!-- MCP配置弹窗 -->
    <McpConfigModal
      v-model:open="showMcpConfig"
      v-model:selectedMcpItems="selectedMcpItems"
    />
    <!-- 会话记录弹窗 -->
    <ChatHistoryModal
      v-model:open="showChatHistoryModal"
      @select="handleSelectChatFromModal"
    />
    <!-- 模型选择弹窗 -->
    <ModelSelectModal v-model:open="showModelSelectModal" />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onActivated,
  onDeactivated,
  nextTick,
  computed,
  defineComponent,
  h,
  reactive,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  PaperClipOutlined,
  ExpandOutlined,
  ThunderboltOutlined,
  SendOutlined,
  StopOutlined,
  BulbOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  RightOutlined,
  CopyOutlined,
  FileWordOutlined,
  LayoutOutlined,
  CloseOutlined,
  LeftOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ShareAltOutlined,
  CreditCardOutlined,
  RobotOutlined,
  BulbFilled,
  AudioOutlined,
  AudioMutedOutlined,
  ToolOutlined,
} from "@ant-design/icons-vue";
import {
  McpConfigModal,
  ChatHistoryModal,
  ModelSelectModal,
} from "@/components/modal/index";
import MindSpace from "@/components/mindSpace/Index.vue";
import { ChatListBlock, ChatList } from "@/components/chatList";
import {
  awaitWrapper,
  chatByCustomModel,
  chatByDeepThinking,
  exportToWord,
  summarizeToolResult,
} from "@/api";
import MarkdownIt from "markdown-it";
import {
  useUserStore,
  useModelStore,
  useRoleStore,
  useConversationStore,
} from "@/store";
import { useHistory, useChat, useMcp, useExport } from "@/hooks";

import {
  MessageEventData,
  MessageRoleEnum,
  MessageActionEnum,
  ChatRecordItem,
  UserMessage,
  Message,
  AIMessage,
  ApiNameEnum,
  McpConfigItemType,
  AIMessageContentBlocksType,
  ToolCallStateEnum,
} from "@/types";
// MCP功能现在通过Electron IPC调用
import { message as AntdMessage, notification } from "ant-design-vue";
// @ts-ignore
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css"; // 引入样式
import welcomeIllustrationEn from "@/assets/images/welcome_illustration_en.svg";
import welcomeIllustrationZh from "@/assets/images/welcome_illustration.svg";
import welcomeIllustrationZhTw from "@/assets/images/welcome_illustration_zh-TW.svg";
import welcomeIllustrationJa from "@/assets/images/welcome_illustration_ja-JP.svg";
import welcomeIllustrationRu from "@/assets/images/welcome_illustration_ru-RU.svg";
import Sidebar from "@/components/sidebar/Index.vue";
import { WindowControls } from "@/components/header";
import { RECORD_STATE_ENUM, xFlyIatManager } from "@/utils/xFlyIat";

const { t, locale } = useI18n();
const router = useRouter();
const appTitle = import.meta.env.VITE_APP_TITLE;
const userStore = useUserStore();
const userInfo = computed(() => userStore.getUserInfo);
const modelStore = useModelStore();
const roleStore = useRoleStore();
const conversationStore = useConversationStore();
const selectedRole = computed(() => roleStore.selectedRole);
const selectedModel = computed(() => modelStore.selectedModel);
const { getModelById } = modelStore;

// 更健壮的 Base64 判定（支持 data URI、URL-safe 变体、去空白校验与解码验证）
function isProbablyBase64(input: string): boolean {
  if (typeof input !== "string" || input.length === 0) return false;

  let content = input.trim();
  let fromDataUri = false;

  // 处理 data URI（需包含 ;base64 标记）
  if (content.startsWith("data:")) {
    const commaIndex = content.indexOf(",");
    if (commaIndex === -1) return false;
    const header = content.slice(0, commaIndex).toLowerCase();
    if (!header.includes(";base64")) return false;
    content = content.slice(commaIndex + 1);
    fromDataUri = true;
  }

  // 去除所有空白与换行
  content = content.replace(/\s+/g, "");

  // 允许 URL-safe 形式（- 和 _）
  const normalized = content.replace(/-/g, "+").replace(/_/g, "/");

  // 基础长度与字符集校验
  if (!fromDataUri && normalized.length < 64) return false; // 避免将普通短文本误判
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) return false; // 仅允许 Base64 合法字符

  // 填充到 4 的倍数长度
  const paddingNeeded = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingNeeded);

  // 解码验证（仅使用浏览器 atob，若不存在则退化为正则判断）
  try {
    const atobFn = (globalThis as any).atob;
    if (typeof atobFn !== "function") {
      // 无 atob 时，无法进一步验证，基于规则判断结果返回
      return true;
    }
    atobFn(padded);
    return true;
  } catch {
    return false;
  }
}
// 根据当前语言选择欢迎插图
const welcomeIllustrationSrc = computed(() => {
  switch (locale.value) {
    case "en-US":
      return welcomeIllustrationEn;
    case "zh-TW":
      return welcomeIllustrationZhTw;
    case "ja-JP":
      return welcomeIllustrationJa;
    case "ru-RU":
      return welcomeIllustrationRu;
    default:
      return welcomeIllustrationZh; // 简体中文作为默认
  }
});
const {
  actCreateChat,
  actGetChatList,
  actQueryChatHistory,
  actSaveChatHistory,
  actRemoveChatHistory,
  actUpdateChatHistory,
} = useHistory();

const {
  processWhiteboardEvent,
  parseWhiteboardDataFromHistory: parseWhiteboardDataFromHistoryHook,
  parseWhiteboardDataFromCustomModel,
  uploadImage,
} = useChat();

const {
  callMcpTool,
  getMcpToolByToolName,
  getToolsByMcpConfig,
  getProcessedConfig,
  getMcpConfigById
} = useMcp();
const { exportChatAsTxt, exportChatAsWord } = useExport();

// 响应式数据
const chatInput = ref("");
const showMcpConfig = ref(false);
const chatListComponentRef = ref();
const mindSpaceRef = ref();
const sidebarRef = ref();
const isLoading = ref(false);
const isSidebarCollapsed = ref(false);
const abortController = ref<AbortController | null>(null);
const isWhiteboardOpen = ref(false);

// 白板相关状态 - 改为会话级别的状态管理
const thinkingItems = ref<any[]>([]);
const searchItems = ref<any[]>([]);
const terminalItems = ref<any[]>([]);

// 会话级别的白板状态缓存
const conversationWhiteboardCache = ref<
  Map<
    string,
    {
      thinkingItems: any[];
      searchItems: any[];
      terminalItems: any[];
    }
  >
>(new Map());

const isShowWhiteboard = computed(() => {
  return (
    // thinkingItems.value.length > 0 ||
    searchItems.value.length > 0 || terminalItems.value.length > 0
  );
});

// 获取当前会话的白板数据
const getCurrentWhiteboardData = () => {
  if (!conversationId.value) {
    return {
      thinkingItems: [],
      searchItems: [],
      terminalItems: [],
    };
  }

  return (
    conversationWhiteboardCache.value.get(conversationId.value) || {
      thinkingItems: [],
      searchItems: [],
      terminalItems: [],
    }
  );
};

// 保存当前会话的白板数据
const saveCurrentWhiteboardData = () => {
  if (!conversationId.value) return;

  conversationWhiteboardCache.value.set(conversationId.value, {
    thinkingItems: [...thinkingItems.value],
    searchItems: [...searchItems.value],
    terminalItems: [...terminalItems.value],
  });

  console.log(`💾 [WHITEBOARD] 保存会话 ${conversationId.value} 的白板数据`);
};

// 恢复当前会话的白板数据
const restoreCurrentWhiteboardData = () => {
  if (!conversationId.value) {
    // 没有会话ID时清空
    thinkingItems.value = [];
    searchItems.value = [];
    terminalItems.value = [];
    return;
  }

  const cached = conversationWhiteboardCache.value.get(conversationId.value);
  if (cached) {
    thinkingItems.value = [...cached.thinkingItems];
    searchItems.value = [...cached.searchItems];
    terminalItems.value = [...cached.terminalItems];
    console.log(`💾 [WHITEBOARD] 恢复会话 ${conversationId.value} 的白板数据`);
  } else {
    // 没有缓存时清空
    thinkingItems.value = [];
    searchItems.value = [];
    terminalItems.value = [];
    console.log(
      `💾 [WHITEBOARD] 会话 ${conversationId.value} 无白板缓存，清空显示`
    );
  }
};

// 聊天列表 - 直接使用Message类型
const chatList = ref<Message[]>([]);

// 会话ID
const conversationId = ref<string>("");

// 会话聊天记录缓存（用于切换会话时保留数据）
const conversationChatCache = ref<Map<string, Message[]>>(new Map());

// 当前会话是否正在处理（用于替代全局isLoading）
const isCurrentConversationProcessing = computed(() => {
  return conversationId.value
    ? conversationStore.isConversationProcessing(conversationId.value)
    : false;
});

// 是否有任何会话正在处理
const hasAnyConversationProcessing = computed(() => {
  return conversationStore.hasAnyProcessing;
});

// 会话列表相关状态（保留用于兼容性）
const historyList = ref<any[]>([]);

// 查看全部会话记录模态框
const showChatHistoryModal = ref(false);
// 模型选择弹窗
const showModelSelectModal = ref(false);

// MCP相关状态
const selectedMcpItems = ref<any[]>([]);

// 当前录音开启或关闭的状态
const isRecordOpen = ref(false);


// 粘贴图片支持
type PastedImage = {
  name: string;
  dataUrl: string;
  mime: string;
  size: number;
};
const pastedImages = ref<PastedImage[]>([]);
// 监听selectedRole变化，自动设置对应的MCP项目
watch(
  selectedRole,
  async (newRole, oldRole) => {
    console.log("selectedRole changed", newRole, oldRole);

    // 如果有旧角色，先清除旧角色的MCP
    if (oldRole && oldRole.mcpList && oldRole.mcpList.length > 0) {
      try {
        // 获取旧角色的MCP配置
        const oldRoleMcpConfigs = await Promise.all(
          oldRole.mcpList.map(async (mcpId) => {
            const [err, config] = await getMcpConfigById(mcpId);
            return !err && config ? config : null;
          })
        );

        // 过滤掉无效的配置
        const validOldConfigs = oldRoleMcpConfigs.filter(Boolean);

        // 获取旧角色MCP的ID集合
        const oldRoleMcpIds = new Set(
          validOldConfigs
            .map((config) => config.id || config.serverName)
            .filter(Boolean)
        );

        // 从当前选择中移除属于旧角色的MCP
        selectedMcpItems.value = selectedMcpItems.value.filter((item) => {
          const itemId = item.id || item.serverName;
          return !itemId || !oldRoleMcpIds.has(itemId);
        });
      } catch (error) {
        console.error("移除旧角色MCP配置失败:", error);
      }
    }

    // 如果有新角色，添加新角色的MCP
    if (newRole && newRole.mcpList && newRole.mcpList.length > 0) {
      try {
        // 根据角色的mcpList获取完整的MCP配置
        const mcpConfigs = await Promise.all(
          newRole.mcpList.map(async (mcpId) => {
            const [err, config] = await getMcpConfigById(mcpId);
            return !err && config ? config : null;
          })
        );

        // 过滤掉无效的配置
        const validConfigs = mcpConfigs.filter(Boolean);

        // 获取当前已选择的MCP ID集合
        const currentSelectedIds = new Set(
          selectedMcpItems.value
            .map((item) => item.id || item.serverName)
            .filter(Boolean)
        );

        // 只添加不在当前选择中的角色MCP
        const newMcpItems = validConfigs.filter((config) => {
          const configId = config.id || config.serverName;
          return configId && !currentSelectedIds.has(configId);
        });

        // 在现有选择基础上叠加新的MCP项目
        selectedMcpItems.value = [...selectedMcpItems.value, ...newMcpItems];
      } catch (error) {
        console.error("获取新角色MCP配置失败:", error);
      }
    }
  },
  { immediate: true }
);

const canSend = computed(() => {
  return chatInput.value.trim().length > 0 || pastedImages.value.length > 0;
});

function removePastedImage(index: number) {
  pastedImages.value.splice(index, 1);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePaste(e: ClipboardEvent) {
  const clipboard = e.clipboardData || (window as any).clipboardData;
  if (!clipboard) return;
  const items: DataTransferItem[] = clipboard.items
    ? Array.from(clipboard.items as unknown as DataTransferItemList)
    : [];

  console.log(items);

  const imageItems = items.filter(
    (it) => it.type && it.type.startsWith("image")
  );
  if (imageItems.length === 0) return;

  // 有图片时，阻止默认将不可见字符插入文本域
  e.preventDefault();

  for (const it of imageItems) {
    const file = (it as DataTransferItem).getAsFile?.();
    if (!file) continue;
    console.log(file);
    const fileType = file.type.split("/")[1];
    // name后面要加上唯一值,使用时间 加上 nanoid
    const name = `${file.name}_${new Date()
      .toISOString()
      .slice(0, 10)}_${nanoid()}.${fileType}`;
    // 替换文件名

    const dataUrl = await uploadImage(file, name);
    if (!dataUrl) {
      AntdMessage.error("上传失败");
      return;
    }
    pastedImages.value.push({
      name: file.name || name,
      dataUrl,
      mime: file.type || "image/png",
      size: file.size || 0,
    });
  }
}

// 选择文件（使用 antd 上传但不发服务端）
function dataUrlFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const handleBeforeUpload = async (file: any) => {
  try {
    const f: File = file as File;
    const dataUrl = await uploadImage(f);
    if (!dataUrl) {
      AntdMessage.error("上传失败");
      return false;
    }
    pastedImages.value.push({
      name: f.name,
      dataUrl,
      mime: f.type || "image/png",
      size: f.size || 0,
    });
  } catch (e) {}
  // 阻止 antd 自动上传
  return false;
};

// 切换白板显示状态
const toggleWhiteboard = () => {
  isWhiteboardOpen.value = !isWhiteboardOpen.value;
};

// 将当前 AI 消息中所有未产生结果的工具标记为 STOP
const markToolsWithoutResultAsStopped = (aiMessage: AIMessage) => {
  try {
    if (!aiMessage || aiMessage.type !== MessageRoleEnum.AI) return;
    if (!Array.isArray(aiMessage.content)) return;

    // 遍历所有content项
    aiMessage.content.forEach((contentItem: any) => {
      if (!Array.isArray(contentItem.contentList)) return;

      // 遍历每个content项中的contentList
      contentItem.contentList.forEach((block: any) => {
        if (
          block &&
          (block.type === "tool" ||
            block.type === AIMessageContentBlocksType.TOOL) &&
          block.toolData &&
          (!block.toolData.result || block.toolData.result === "")
        ) {
          block.toolData.state = ToolCallStateEnum.STOP;
        }
      });
    });
  } catch (e) {
    console.warn("标记未完成工具为 STOP 失败:", e);
  }
};

enum ShareMenuItems {
  exportTxt = "exportTxt",
  exportWord = "exportWord",
}

// 分享菜单点击
const handleShareMenuClick = ({ key }: { key: string }) => {
  switch (key) {
    case ShareMenuItems.exportTxt:
      exportChatAsTxt(chatList.value);
      break;
    case ShareMenuItems.exportWord:
      exportChatAsWord(chatList.value);
      break;
  }
};

// 停止对话
const stopConversation = async () => {
  if (!conversationId.value) return;

  // 停止当前会话的处理
  conversationStore.stopProcessing(conversationId.value);

  // 清理该会话的缓存（停止后不需要继续保留）
  if (conversationChatCache.value.has(conversationId.value)) {
    conversationChatCache.value.delete(conversationId.value);
    console.log(`🧹 [CACHE] 手动停止，清理会话 ${conversationId.value} 的缓存`);
  }

  // 检查是否有有效的中断控制器
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
  }

  // 更新最后一条AI消息状态，停止旋转动画
  const lastMessage = chatList.value[chatList.value.length - 1];
  if (
    lastMessage &&
    (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI)
  ) {
    try {
      lastMessage.isStreaming = false;
      (lastMessage as any).isProcessing = false; // 清除处理中标记
      // 本轮所有没有结果的工具状态标记为 STOP
      markToolsWithoutResultAsStopped(lastMessage);
      if (lastMessage?.content && lastMessage?.content.length > 1) {
        await actUpdateChatHistory({
          id: lastMessage.id,
          chatId: conversationId.value,
          roleType: MessageRoleEnum.AI,
          content: lastMessage.content,
          tokenUsage: lastMessage.content.reduce(
            (sum, item) => sum + (item.tokenUsage || 0),
            0
          ),
        });
      } else {
        const [err, savedId] = await actSaveChatHistory({
          chatId: conversationId.value,
          roleType: MessageRoleEnum.AI,
          content: lastMessage?.content || "",
          tokenUsage:
            lastMessage?.content?.[lastMessage.currentIndex]?.tokenUsage || 0,
        });
        if (!err && savedId) {
          // 更新AI消息的id为保存后返回的id
          lastMessage.id = savedId;
        }
      }
    } catch (error) {
      console.error("停止对话时保存AI消息失败:", error);
    }
  }
};

// 打开MCP配置弹窗
const handleOpenMcpConfig = () => {
  showMcpConfig.value = true;
};

// 开始/停止录音
const handleStartRecord = () => {
  if (isRecordOpen.value) {
    // 如果正在录音，则停止录音
    console.log("停止录音");
    xFlyIatManager.stopRecord();
    isRecordOpen.value = false;
  } else {
    // 如果未录音，则开始录音
    console.log("开始录音");
    xFlyIatManager.startRecord((str, state) => {
      console.log("str", str);
      if (state === RECORD_STATE_ENUM.OPEN) {
        isRecordOpen.value = true;
      }
      if (state === RECORD_STATE_ENUM.CLOSED) {
        isRecordOpen.value = false;
      }
      // 如果有识别结果，添加到输入框
      if (str && str.trim()) {
        chatInput.value += str;
      }
    });
  }
};

// 新任务
const handleNewTask = () => {
  // 如果当前会话正在处理中，提示用户但允许创建新任务（支持多会话并行）
  if (isCurrentConversationProcessing.value) {
    AntdMessage.info(t("conversation.canSwitchWhileProcessing"));

    // 保存当前正在处理的会话到缓存
    if (conversationId.value && chatList.value.length > 0) {
      console.log(
        `💾 [CACHE] 新建任务时保存正在处理的会话 ${conversationId.value} 到缓存`
      );
      conversationChatCache.value.set(conversationId.value, [
        ...chatList.value,
      ]);
    }
  }

  // 保存当前会话的白板状态
  if (conversationId.value) {
    saveCurrentWhiteboardData();
  }

  // 清空聊天内容和会话ID
  chatList.value = [];
  // chatInput.value = ""; // 新任务下不重置输入框
  conversationId.value = "";

  // 清空白板内容（会在restoreCurrentWhiteboardData中处理）
  restoreCurrentWhiteboardData();

  // 清空白板组件状态
  if (mindSpaceRef.value) {
    mindSpaceRef.value.clearAll();
  }

  // 关闭白板
  isWhiteboardOpen.value = false;
};

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
  // 如果是shift+enter 则在光标处换行
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value =
      textarea.value.slice(0, start) + "\n" + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  }
};

const parseChatListForSend = (chatList: Message[]) => {
  return chatList
    .slice(0, -1)
    .map((item: Message) => {
      return (
        item.type +
        ":" +
        (item.type === "ai" || item.type === MessageRoleEnum.AI
          ? item.content[item.currentIndex].contentList
          : item.content)
      );
    })
    .join(";");
};

// 处理事件数据
const processEventData = (text: string): MessageEventData | null => {
  // 检查文本是否看起来像JSON格式（以{开头，以}结尾）
  const trimmedText = text.trim();
  if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
    return null; // 不是JSON格式，直接返回null
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed.event && parsed.data) {
      return {
        event: parsed.event,
        data:
          typeof parsed.data === "string"
            ? JSON.parse(parsed.data)
            : parsed.data,
      };
    }
  } catch (error) {
    // 只在控制台输出错误，不抛出异常
    console.warn("Failed to parse event data:", error);
  }
  return null;
};

// 处理丢出的消息数据
const handleLostMsg = (message: string) => {
  // 检查文本是否看起来像JSON格式（以{开头，以}结尾）
  const trimmedText = message.trim();
  if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
    return null; // 不是JSON格式，直接返回null
  }

  try {
    const parsed = JSON.parse(message);
    return parsed;
  } catch (error) {
    // 只在控制台输出错误，不抛出异常
    console.warn("Failed to parse event data:", error);
  }
  return null;
};

// 为每个消息存储步骤折叠状态
const stepCollapsedState = ref<Record<string, boolean>>({});

// 获取步骤折叠状态的key
const getStepKey = (messageIndex: number, stepIndex: number | string) =>
  `${messageIndex}-${stepIndex}`;

// 检查步骤是否折叠
const isStepCollapsed = (messageIndex: number, stepIndex: number | string) => {
  const key = getStepKey(messageIndex, stepIndex);
  return stepCollapsedState.value[key] || false;
};

// 切换单个步骤折叠状态
const toggleStepCollapsed = (
  messageIndex: number,
  stepIndex: number | string
) => {
  const key = getStepKey(messageIndex, stepIndex);
  stepCollapsedState.value[key] = !stepCollapsedState.value[key];
};

// 跳转到Mind空间（确保白板打开并在内容挂载后定位）
const handleJumpToMindSpace = (stepType: string, toolCallId: string) => {
  const attemptLocate = (retries = 20) => {
    if (mindSpaceRef.value?.locateByToolCallId) {
      mindSpaceRef.value.locateByToolCallId(stepType, toolCallId);
      return;
    }
    if (retries > 0) {
      setTimeout(() => attemptLocate(retries - 1), 50);
    }
  };

  if (!isWhiteboardOpen.value) {
    isWhiteboardOpen.value = true;
    nextTick(() => {
      // 再次延迟，确保子组件完成挂载
      setTimeout(() => attemptLocate(), 0);
    });
    return;
  }
  attemptLocate();
};

// 复制消息内容
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    notification.success({
      message: t("common.copySuccess"),
      description: t("common.copyToClipboard"),
    });
  } catch (error) {
    console.error("复制失败:", error);
    notification.error({
      message: t("common.copyFailed"),
      description: t("common.cannotCopyToClipboard"),
    });
  }
};

// 将 base64 内容转为 Markdown 图片（若已是 data:URI 则直接使用）
function buildBase64(raw: string): string {
  if (!raw) return "";
  const trimmed = String(raw).trim();
  const isDataUri = trimmed.startsWith("data:") && trimmed.includes(";base64,");
  return isDataUri ? trimmed : `data:image/png;base64,${trimmed}`;
}

function base64ToBlob(base64: string, mimeType?: string) {
  // 去除 data URL 前缀（如 'data:image/png;base64,'）
  const byteString = atob(base64.split(",")[1]);
  const mimeString =
    mimeType || base64.split(",")[0].split(":")[1].split(";")[0];

  // 创建字节数组
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  // 返回 Blob 对象
  return new Blob([arrayBuffer], { type: mimeString });
}
// 发送消息
const handleSendMessage = async () => {
  if (!selectedModel.value) {
    AntdMessage.warning("当前无可用模型,请选择");
    return;
  }
  if (isCurrentConversationProcessing.value) {
    AntdMessage.warning(t("common.currentTaskExecuting"));
    return;
  }
  if (!canSend.value) return;
  // 如果是第一条消息，先创建会话
  if (!conversationId.value) {
    try {
      const [err, chatId] = await actCreateChat({
        title: chatInput.value.trim(),
      });
      if (err || !chatId) {
        notification.error({
          message: t("common.createConversationFailed"),
          description: t("common.cannotCreateConversation"),
        });
        return;
      }

      conversationId.value = chatId;

      // 刷新会话列表
      if (sidebarRef.value?.refreshChatList) {
        sidebarRef.value.refreshChatList();
      }
    } catch (error) {
      console.error("创建会话失败:", error);
      notification.error({
        message: t("common.createConversationFailed"),
        description: t("common.cannotCreateConversation"),
      });
      return;
    }
  }

  // 组装文本与粘贴图片（以 Markdown 形式嵌入，后续可被解析）
  let composedContent;
  if (pastedImages.value.length > 0) {
    const images = pastedImages.value.map((img) => {
      return {
        type: "image_url",
        image_url: {
          url: img.dataUrl,
        },
      };
    });
    composedContent = [
      {
        type: "text",
        text: chatInput.value.trim(),
      },
      ...images,
    ];
  } else {
    composedContent = chatInput.value.trim();
  }
  const userMessage: UserMessage = {
    id: Date.now(),
    type: MessageRoleEnum.USER,
    content: composedContent,
  };

  console.log(
    `👤 [USER_MSG] 创建用户消息 - ID: ${userMessage.id}, type: ${userMessage.type}, MessageRoleEnum.USER: ${MessageRoleEnum.USER}`
  );

  // 添加用户消息到列表
  chatList.value.push(userMessage);
  // console.log(`📝 [CHAT_LIST] 添加用户消息后，chatList长度: ${chatList.value.length}`);
  // 用户发送后，父组件立刻请求子组件平滑滚动到底部
  nextTick(() => {
    try {
      chatListComponentRef.value?.scrollToBottom?.();
    } catch {}
  });

  // 保存用户消息
  try {
    const [err, savedId] = await actSaveChatHistory({
      chatId: conversationId.value,
      roleType: MessageRoleEnum.USER,
      content: userMessage.content,
      tokenUsage: 0, // 用户消息没有token消耗
    });

    if (!err && savedId) {
      // 更新用户消息的id为保存后返回的id
      userMessage.id = savedId;
    }
  } catch (error) {
    console.error("保存用户消息失败:", error);
    // 即使保存失败，也继续执行AI对话，避免用户体验中断
  }
  chatInput.value = "";
  pastedImages.value = [];
  getChatWithAI();
};

// 与AI对话
const getChatWithAI = async (isRetry: boolean = false) => {
  // 在函数开始时输出MessageRoleEnum的值
  console.log(`🔍 [ENUM_CHECK] MessageRoleEnum值检查:`);
  console.log(
    `  - MessageRoleEnum.AI = "${
      MessageRoleEnum.AI
    }" (typeof: ${typeof MessageRoleEnum.AI})`
  );
  console.log(
    `  - MessageRoleEnum.USER = "${
      MessageRoleEnum.USER
    }" (typeof: ${typeof MessageRoleEnum.USER})`
  );
  console.log(`  - MessageRoleEnum对象:`, MessageRoleEnum);

  // 锁定当前会话ID，确保整个对话过程中sessionId一致
  const lockedSessionId = conversationId.value;
  console.log(`🔒 [SESSION] 锁定sessionId: ${lockedSessionId}`);

  // 添加AI回复占位符
  let lastMessage: Message;
  if (isRetry) {
    lastMessage = chatList.value[chatList.value.length - 1];
    console.log(
      `🔄 [RETRY] 重试模式 - 最后一条消息类型: ${lastMessage?.type}, ID: ${lastMessage?.id}`
    );
    if (
      lastMessage &&
      (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI)
    ) {
      // 确保重试时AI消息标记为streaming
      (lastMessage as any).isStreaming = true;
      lastMessage.content.push({
        tokenUsage: 0,
        contentList: [],
      });
      lastMessage.currentIndex = lastMessage.content.length - 1;
      lastMessage.isStreaming = true;
      console.log(
        `🔄 [RETRY] 已更新AI消息 - 新currentIndex: ${lastMessage.currentIndex}, isStreaming: ${lastMessage.isStreaming}`
      );
    } else {
      console.log(`❌ [RETRY] 最后一条消息不是AI类型或不存在`);
    }
  } else {
    lastMessage = {
      id: Date.now() + 1,
      type: "ai", // 直接使用字符串 'ai' 确保类型一致性
      currentIndex: 0,
      content: [
        {
          tokenUsage: 0,
          contentList: [],
        },
      ],
      isStreaming: true, // 标记为正在生成，确保被识别为AI消息
      isProcessing: true, // 标记为处理中
    };
    console.log(
      `🤖 [AI_MSG] 创建新AI消息 - ID: ${lastMessage.id}, type: "${
        lastMessage.type
      }", 类型检查: ${lastMessage.type === "ai"}`
    );
    console.log(`🤖 [AI_MSG] MessageRoleEnum.AI的值: "${MessageRoleEnum.AI}"`);
    chatList.value.push(lastMessage);
    // console.log(`📝 [CHAT_LIST] 当前chatList长度: ${chatList.value.length}`);
    // chatList.value.forEach((msg, idx) => {
    //   console.log(`📝 [CHAT_LIST][${idx}] type: ${msg.type}, id: ${msg.id}`);
    // });
  }
  // 创建AI占位后也确保滚动到底部（若用户未向上滚动，子组件会接管）
  nextTick(() => {
    try {
      chatListComponentRef.value?.scrollToBottom?.();
    } catch {}
  });
  // 创建新的AbortController并开始处理当前会话
  abortController.value = new AbortController();
  conversationStore.startProcessing(lockedSessionId, abortController.value);
  try {
    // 判断用户有没有自定义模型
    if (selectedModel.value) {
      const message = chatList.value.slice(0, -1).map((item: Message) => {
        if (item.type === "ai" || item.type === MessageRoleEnum.AI) {
          return {
            role: "assistant",
            content: JSON.stringify(
              item.content[item.currentIndex].contentList
            ),
          };
        } else {
          return {
            role: "user",
            content: item.content,
          };
        }
      });
      const lastMessage = chatList.value[
        chatList.value.length - 1
      ] as AIMessage;
      // 使用二维数组作为本轮的块容器
      lastMessage.content[lastMessage.currentIndex].contentList = [] as any[];

      // 历史消息，后续会回灌助手文本与工具结果
      let historyMessages: any[] = message;
      lastMessage.isStreaming = true;
      // 反复请求直到本轮没有工具调用
      while (true) {
        // 检查是否已经被停止（用户点击了停止按钮）
        if (!conversationStore.isConversationProcessing(lockedSessionId)) {
          console.log("循环开始时检测到停止状态，退出循环");
          break;
        }

        const blocks = lastMessage.content[lastMessage.currentIndex]
          .contentList as any[];
        const roundStartIndex = blocks.length;
        let sawToolInThisRound = false;
        const toolBlocksById: Record<string, any> = {};
        const toolBlocksByIndex: Record<number, any> = {};
        const toolOrder: string[] = [];
        // 简化MCP处理逻辑：只需要判断是否是深度思考
        const mcpItems = selectedMcpItems.value;
        console.log(mcpItems);
        await chatByCustomModel({
          model: {
            url: getModelById(
              selectedModel.value!.providerId,
              selectedModel.value!.modelId
            )?.apiUrl,
            key: getModelById(
              selectedModel.value!.providerId,
              selectedModel.value!.modelId
            )?.apiKey,
            modelId: selectedModel.value?.modelId,
            config: getModelById(
              selectedModel.value!.providerId,
              selectedModel.value!.modelId
            )?.config,
          },
          messages: historyMessages,
          mcpItems,
          role: selectedRole.value,
          sessionId: lockedSessionId,
          onLostMsg: async (text: string) => {
            if (
              !(
                lastMessage &&
                (lastMessage.type === "ai" ||
                  lastMessage.type === MessageRoleEnum.AI)
              )
            )
              return;
            const parsed = handleLostMsg(text);
            if (parsed) {
              const fn = parsed.function || {};
              if (parsed.id) {
                const toolId = parsed.id as string;
                const toolIdx: number | undefined =
                  typeof parsed.index === "number" ? parsed.index : undefined;
                let toolBlock = toolBlocksById[toolId];
                if (!toolBlock) {
                  // 新的工具调用（出现 function.name 时即可识别工具）
                  toolBlock = {
                    type: AIMessageContentBlocksType.TOOL,
                    content: "",
                    timestamp: Date.now(),
                    toolData: {
                      toolId: toolId,
                      apiName: fn.name,
                      arguments:
                        typeof fn.arguments === "string" ? fn.arguments : "",
                      result: "",
                      state: ToolCallStateEnum.CALLING,
                      index: toolIdx,
                    },
                  } as any;
                  blocks.push(toolBlock);
                  toolBlocksById[toolId] = toolBlock;
                  if (typeof toolIdx === "number") {
                    toolBlocksByIndex[toolIdx] = toolBlock;
                  }
                  toolOrder.push(toolId);
                  sawToolInThisRound = true;
                } else {
                  // 已存在的工具，追加参数分片；若后来补到 name 则更新
                  if (typeof fn.arguments === "string") {
                    toolBlock.toolData.arguments += fn.arguments;
                  }
                  if (!toolBlock.toolData.apiName && fn.name) {
                    toolBlock.toolData.apiName = fn.name;
                  }
                  if (
                    typeof toolIdx === "number" &&
                    !toolBlocksByIndex[toolIdx]
                  ) {
                    toolBlocksByIndex[toolIdx] = toolBlock;
                  }
                }
                // 增量解析白板数据
                parseWhiteboardDataFromCustomModel(
                  chatList.value as any,
                  thinkingItems,
                  searchItems,
                  terminalItems
                );
              } else {
                // 无 id 的参数分片：拼到最近一个已知工具
                const fragIdx: number | undefined =
                  typeof parsed.index === "number" ? parsed.index : undefined;
                let targetBlock =
                  typeof fragIdx === "number"
                    ? toolBlocksByIndex[fragIdx]
                    : undefined;
                if (!targetBlock) {
                  const lastId = toolOrder[toolOrder.length - 1];
                  targetBlock = lastId ? toolBlocksById[lastId] : undefined;
                }
                if (
                  targetBlock &&
                  targetBlock.type === AIMessageContentBlocksType.TOOL
                ) {
                  if (typeof fn.arguments === "string") {
                    targetBlock.toolData.arguments += fn.arguments;
                  }
                  parseWhiteboardDataFromCustomModel(
                    chatList.value as any,
                    thinkingItems,
                    searchItems,
                    terminalItems
                  );
                }
              }
            } else {
              // 纯文本增量
              const lastBlock = blocks[blocks.length - 1];
              if (
                lastBlock &&
                lastBlock.type === AIMessageContentBlocksType.TEXT
              ) {
                lastBlock.content += text;
              } else {
                blocks.push({
                  type: AIMessageContentBlocksType.TEXT,
                  content: text,
                  timestamp: Date.now(),
                });
              }
              // 增量解析白板数据（文本通常不影响，但保持同步）
              parseWhiteboardDataFromCustomModel(
                chatList.value as any,
                thinkingItems,
                searchItems,
                terminalItems
              );
            }
          },
          onFinish: async (totalTokens?: number) => {
            // 保存token消耗量到AI消息中
            if (
              lastMessage &&
              (lastMessage.type === "ai" ||
                lastMessage.type === MessageRoleEnum.AI) &&
              totalTokens
            ) {
              // 保存到当前索引位置
              lastMessage.content[lastMessage.currentIndex].tokenUsage +=
                totalTokens;
            }
          },
          signal: abortController.value?.signal,
        });

        // 在本轮结束时，查找并调用本轮的全部工具；等待全部返回后再进入下一轮
        const toolBlocksThisRound = (
          lastMessage.content[lastMessage.currentIndex].contentList as any[]
        )
          .slice(roundStartIndex)
          .filter((b) => b.type === AIMessageContentBlocksType.TOOL);
        console.log(toolBlocksThisRound);
        await Promise.all(
          toolBlocksThisRound.map(async (tb: any) => {
            if (!tb.toolData || tb.toolData.result) return;
            try {
              const toolInfo = getMcpToolByToolName(
                tb.toolData.apiName,
                selectedMcpItems.value
              );
              if (!toolInfo || !toolInfo.id) return;
              const args = (() => {
                try {
                  return JSON.parse(tb.toolData.arguments);
                } catch {
                  return tb.toolData.arguments;
                }
              })();
              // 使用完整的MCP配置信息，确保包含URL等关键配置
              // 需要处理并传递完整的工具配置，而不是只传递timeout
              const fullConfig = getProcessedConfig(toolInfo);
              console.log(
                `🔧 [CHAT] 使用完整配置调用MCP工具 ${tb.toolData.apiName}:`,
                JSON.stringify(fullConfig, null, 2)
              );
              console.log(
                `🔧 [CHAT] 原始toolInfo:`,
                JSON.stringify(toolInfo, null, 2)
              );

              const result = await callMcpTool(
                toolInfo.id,
                tb.toolData.apiName,
                args,
                fullConfig, // 使用完整配置而不是只传递timeout
                lockedSessionId
              );

              // 详细日志记录工具调用结果
              console.log(
                `🎯 [CHAT] MCP工具 ${tb.toolData.apiName} 调用完成:`,
                JSON.stringify(result, null, 2)
              );
              console.log(`🎯 [CHAT] result?.content:`, result?.content);
              console.log(`🎯 [CHAT] result 类型:`, typeof result);

              tb.toolData.result = result?.content;
              if (toolInfo && toolInfo.name) {
                tb.toolData.mcpName = toolInfo.name;
              }

              // 验证结果是否正确设置
              console.log(
                `🎯 [CHAT] 设置后的 tb.toolData.result:`,
                tb.toolData.result
              );
              console.log(
                `🎯 [CHAT] tb.toolData 完整状态:`,
                JSON.stringify(tb.toolData, null, 2)
              );
              try {
                const parsedRes = result;
                tb.toolData.state =
                  parsedRes && parsedRes.isError === true
                    ? ToolCallStateEnum.ERROR
                    : ToolCallStateEnum.SUCCESS;
              } catch {
                tb.toolData.state = ToolCallStateEnum.SUCCESS;
              }
              // 渲染更新白板数据
              console.log(
                `🎨 [CHAT] 开始渲染白板数据 - 工具: ${tb.toolData.apiName}`
              );
              parseWhiteboardDataFromCustomModel(
                chatList.value as any,
                thinkingItems,
                searchItems,
                terminalItems
              );
              // 保存更新后的白板数据到当前会话缓存
              if (conversationId.value) {
                saveCurrentWhiteboardData();
              }
              console.log(
                `✅ [CHAT] 白板数据渲染完成 - 工具: ${tb.toolData.apiName}`
              );
            } catch (e) {
              console.error(
                `❌ [CHAT] MCP工具调用异常 - ${tb.toolData.apiName}:`,
                e
              );
              console.error(
                `❌ [CHAT] 错误堆栈:`,
                e instanceof Error ? e.stack : String(e)
              );

              tb.toolData.result = `{"isError":true,"message":"${String(e)}"}`;
              tb.toolData.state = ToolCallStateEnum.ERROR;

              // 即使出错也要更新渲染
              console.log(
                `🎨 [CHAT] 渲染错误状态 - 工具: ${tb.toolData.apiName}`
              );
              parseWhiteboardDataFromCustomModel(
                chatList.value as any,
                thinkingItems,
                searchItems,
                terminalItems
              );
              // 保存更新后的白板数据到当前会话缓存
              if (conversationId.value) {
                saveCurrentWhiteboardData();
              }
            }
          })
        );

        // Promise.all 完成后的状态检查
        console.log(
          `🔄 [CHAT] Promise.all 工具调用完成 - 会话: ${lockedSessionId}`
        );
        console.log(
          `🔄 [CHAT] 会话处理状态: ${conversationStore.isConversationProcessing(
            lockedSessionId
          )}`
        );

        // 若本轮没有工具，跳出循环
        if (!sawToolInThisRound) {
          console.log(
            `🔄 [CHAT] 本轮无工具调用，跳出循环 - 会话: ${lockedSessionId}`
          );
          break;
        }

        // 检查是否已经被停止（用户点击了停止按钮）
        if (!conversationStore.isConversationProcessing(lockedSessionId)) {
          console.log("检测到停止状态，退出循环");
          break;
        }

        // 组装回灌消息：助手文本 + 工具结果
        const newBlocks = (
          lastMessage.content[lastMessage.currentIndex].contentList as any[]
        ).slice(roundStartIndex);
        const assistantTextThisRound = newBlocks
          .filter((b) => b.type === AIMessageContentBlocksType.TEXT)
          .map((b) => b.content)
          .join("");

        const nextMessages: any[] = [];
        // 回灌所有工具调用与结果
        const toolBlocksForBackfill = (
          lastMessage.content[lastMessage.currentIndex].contentList as any[]
        )
          .slice(roundStartIndex)
          .filter((b) => b.type === AIMessageContentBlocksType.TOOL);

        if (toolBlocksForBackfill.length > 0) {
          // 若为搜索工具且结果过长，先用AI总结以减少历史回灌负担
          try {
            // 默认仅在回灌时替换内容；对于图片类工具，直接更新原始工具数据的 result
            const backfillResultOverride: Record<string, string> = {};
            let modelConfig: {
              url: string;
              key: string;
              modelId: string;
            } | null = null;
            if (selectedModel.value) {
              const modelDetail = getModelById(
                selectedModel.value!.providerId,
                selectedModel.value!.modelId
              );
              if (modelDetail && modelDetail.apiUrl && modelDetail.apiKey) {
                modelConfig = {
                  url: modelDetail.apiUrl,
                  key: modelDetail.apiKey,
                  modelId: selectedModel.value!.modelId,
                };
              }
            }

            if (modelConfig) {
              await Promise.all(
                toolBlocksForBackfill.map(async (tb: any) => {
                  try {
                    const apiName = tb.toolData?.apiName;
                    const toolId = tb.toolData?.toolId;

                    let result = tb.toolData?.result || "";
                    if (result && Array.isArray(result)) {
                      let toParsed = "";
                      for (const item of result) {
                        toParsed = item?.data || item?.text;
                        if (isProbablyBase64(toParsed)) {
                          const toSaveBase64 = buildBase64(toParsed);
                          // 将base64转为文件,图片名称是时间戳
                          const file = new File(
                            [base64ToBlob(toSaveBase64, "image/png")],
                            `${Date.now()}.png`,
                            { type: "image/png" }
                          );
                          const dataUrl = await uploadImage(file);
                          if (!dataUrl) {
                            AntdMessage.error("上传失败");
                            return;
                          }
                          const imageBlock = {
                            type: AIMessageContentBlocksType.BASE64,
                            content: dataUrl,
                            timestamp: Date.now(),
                          } as any;
                          (lastMessage as any).contentList[
                            (lastMessage as any).currentIndex
                          ].push(imageBlock);
                          // 回灌给 AI 的内容替换为 input_image
                          const backfillImagePayload = [
                            {
                              type: "image",
                              image_url: dataUrl,
                            },
                          ];
                          // 直接修改原始工具数据：找到对应的 tool，然后修改对应的 result
                          tb._backfillResult = backfillImagePayload;
                          const blocksAtIndex = (lastMessage as any)
                            .contentList[
                            (lastMessage as any).currentIndex
                          ] as any[];
                          const targetToolBlock = Array.isArray(blocksAtIndex)
                            ? blocksAtIndex.find(
                                (blk: any) =>
                                  blk &&
                                  blk.type ===
                                    AIMessageContentBlocksType.TOOL &&
                                  blk.toolData &&
                                  blk.toolData.toolId === toolId
                              )
                            : null;
                          if (targetToolBlock && targetToolBlock.toolData) {
                            targetToolBlock.toolData.result = {
                              type: "image",
                              url: dataUrl,
                            };
                          } else if (tb && tb.toolData) {
                            // 兜底：直接写当前引用（通常已指向原始块）
                            tb.toolData.result = {
                              type: "image",
                              url: dataUrl,
                            };
                          }
                        }
                      }
                    }
                    if (apiName === ApiNameEnum.TAVILY_SEARCH) {
                      console.log("result", result);
                      if (result && Array.isArray(result)) {
                        let resultText = "";
                        for (const item of result) {
                          if (item.type === "text") {
                            resultText += item.text || "";
                          }
                        }
                        console.log(
                          "resultText",
                          resultText,
                          resultText.length
                        );
                        if (resultText.length > 5000) {
                          let purpose = "搜索相关内容";
                          try {
                            const argsObj =
                              typeof tb.toolData.arguments === "string"
                                ? JSON.parse(tb.toolData.arguments)
                                : tb.toolData.arguments;
                            if (argsObj && argsObj.query)
                              purpose = argsObj.query;
                          } catch {}
                          const summarizedResult = await summarizeToolResult(
                            resultText,
                            modelConfig,
                            purpose
                          );
                          // 计入token消耗量
                          lastMessage.content[
                            lastMessage.currentIndex
                          ].tokenUsage += summarizedResult.tokenUsage;
                          if (toolId)
                            backfillResultOverride[toolId] = [
                              {
                                type: "text",
                                text: summarizedResult.content || resultText,
                              },
                            ];
                        }
                      }
                    }
                  } catch {}
                })
              );
            }

            // 使用覆盖内容进行回灌（AI侧优先用覆盖内容）
            toolBlocksForBackfill.forEach((tb: any) => {
              if (backfillResultOverride[tb.toolData.toolId]) {
                tb._backfillResult = backfillResultOverride[tb.toolData.toolId];
              }
            });
          } catch {}

          nextMessages.push({
            role: "assistant",
            content:
              assistantTextThisRound && assistantTextThisRound.trim()
                ? assistantTextThisRound
                : "",
            tool_calls: toolBlocksForBackfill.map((tb: any) => ({
              id: tb.toolData.toolId,
              type: "function",
              function: {
                name: tb.toolData.apiName,
                arguments:
                  typeof tb.toolData.arguments === "string"
                    ? tb.toolData.arguments
                    : (() => {
                        try {
                          return JSON.stringify(tb.toolData.arguments);
                        } catch {
                          return String(tb.toolData.arguments);
                        }
                      })(),
              },
            })),
          });
          toolBlocksForBackfill.forEach((tb: any) => {
            nextMessages.push({
              role: "tool",
              tool_call_id: tb.toolData.toolId,
              name: tb.toolData.apiName,
              content: JSON.stringify(tb._backfillResult || tb.toolData.result),
            });
          });
        } else if (assistantTextThisRound && assistantTextThisRound.trim()) {
          // 没有工具，仅有文本
          nextMessages.push({
            role: "assistant",
            content: assistantTextThisRound,
          });
        }

        historyMessages = historyMessages.concat(nextMessages);
        console.log("historyMessages", historyMessages);
      }
      lastMessage.isStreaming = false;
      (lastMessage as any).isProcessing = false; // 清除处理中标记
      console.log(
        `✅ [AI_MSG] AI消息处理完成 - ID: ${lastMessage.id}, type: ${
          lastMessage.type
        }, 最终内容数量: ${
          lastMessage.content[lastMessage.currentIndex].contentList.length
        }`
      );
    } else {
      // 这里要对mcp过滤一遍，线上不支持stdio类型
      const mcpItems = selectedMcpItems.value.filter(
        (item) => item.type !== McpConfigItemType.STDIO
      );
      await chatByDeepThinking(
        {
          conversationId: lockedSessionId,
          model: "deepseek",
          modelname: "deepseek-chat",
          userId: userInfo.value?.id,
          chatContent: parseChatListForSend(chatList.value),
          mcpServers: mcpItems?.map((item) => ({
            mcpName: item.name,
            mcpUrl: item.url,
            mcpType: item.type,
          })),
        },
        (text: string) => {
          // onLostMsg 回调 - 处理事件数据
          const lastMessage = chatList.value[chatList.value.length - 1];
          if (
            lastMessage &&
            (lastMessage.type === "ai" ||
              lastMessage.type === MessageRoleEnum.AI)
          ) {
            const eventData = processEventData(text);
            if (eventData) {
              lastMessage.content[lastMessage.currentIndex].contentList.push({
                type: AIMessageContentBlocksType.TEXT,
                content: eventData.data.answer || text,
                timestamp: Date.now(),
              });

              // 使用hook处理白板事件
              processWhiteboardEvent(
                eventData,
                thinkingItems,
                searchItems,
                terminalItems
              );
            } else {
              lastMessage.content[lastMessage.currentIndex].contentList.push({
                type: AIMessageContentBlocksType.TEXT,
                content: text,
                timestamp: Date.now(),
              });
            }
          }
        },
        async (totalTokens?: number) => {
          // onFinish 回调 - 完成回复
          const lastMessage = chatList.value[chatList.value.length - 1];
          if (
            lastMessage &&
            (lastMessage.type === "ai" ||
              lastMessage.type === MessageRoleEnum.AI)
          ) {
            lastMessage.isStreaming = false;
            (lastMessage as any).isProcessing = false; // 清除处理中标记
            // 保存token消耗量到AI消息中（累加而不是替换）
            if (totalTokens) {
              // 累加到当前索引位置
              lastMessage.content[lastMessage.currentIndex].tokenUsage +=
                totalTokens;
            }
          }
        },
        abortController.value?.signal
      );
    }
  } catch (error) {
    console.error(
      `❌ [CHAT] getChatWithAI 主要错误 - 会话: ${lockedSessionId}`,
      error
    );
    console.error(
      `❌ [CHAT] 错误堆栈:`,
      error instanceof Error ? error.stack : String(error)
    );
    // 停止处理当前会话
    console.log(`🛑 [CHAT] 因错误停止处理会话: ${lockedSessionId}`);
    conversationStore.stopProcessing(lockedSessionId);
    const lastMessage = chatList.value[chatList.value.length - 1];
    if (
      lastMessage &&
      (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI) &&
      lastMessage.isStreaming
    ) {
      lastMessage.isStreaming = false;
      (lastMessage as any).isProcessing = false; // 清除处理中标记
    }
    if ((error as any)?.name !== "AbortError") {
      notification.error({
        message: t("common.chatFailed"),
        description: (error as any)?.message || t("common.networkError"),
      });
    }
    if (
      lastMessage &&
      (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI)
    ) {
      markToolsWithoutResultAsStopped(lastMessage);
    }
  } finally {
    const lastMessage = chatList.value[chatList.value.length - 1];
    if (
      lastMessage &&
      (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI)
    ) {
      try {
        try {
          if (selectedModel.value) {
            parseWhiteboardDataFromCustomModel(
              chatList.value as any,
              thinkingItems,
              searchItems,
              terminalItems
            );
          }
        } catch {}
        if (isRetry) {
          await actUpdateChatHistory({
            id: lastMessage.id,
            chatId: conversationId.value,
            roleType: MessageRoleEnum.AI,
            content: lastMessage.content,
            tokenUsage: lastMessage.content.reduce(
              (sum, item) => sum + (item.tokenUsage || 0),
              0
            ),
          });
        } else {
          const [err, savedId] = await actSaveChatHistory({
            chatId: conversationId.value,
            roleType: MessageRoleEnum.AI,
            content: lastMessage.content,
            tokenUsage:
              lastMessage.content[lastMessage.currentIndex].tokenUsage || 0,
          });
          if (!err && savedId) {
            // 更新AI消息的id为保存后返回的id
            lastMessage.id = savedId;
          }
        }
      } catch (error) {
        console.error("保存AI消息失败:", error);
      }
    }

    // 解析白板数据 - 适配 byCustomModel 格式
    if (selectedModel.value) {
      parseWhiteboardDataFromCustomModel(
        chatList.value,
        thinkingItems,
        searchItems,
        terminalItems
      );
    }

    // 停止处理当前会话
    console.log(`🏁 [CHAT] 在finally中停止处理会话: ${lockedSessionId}`);
    console.log(
      `🏁 [CHAT] 停止前会话状态: ${conversationStore.isConversationProcessing(
        lockedSessionId
      )}`
    );
    conversationStore.stopProcessing(lockedSessionId);
    console.log(
      `🏁 [CHAT] 停止后会话状态: ${conversationStore.isConversationProcessing(
        lockedSessionId
      )}`
    );

    // 处理完成后，如果当前显示的是该会话，清理缓存
    if (conversationId.value === lockedSessionId) {
      // 当前会话处理完成，可以清理缓存
      if (conversationChatCache.value.has(lockedSessionId)) {
        conversationChatCache.value.delete(lockedSessionId);
        console.log(`🧹 [CACHE] 清理已完成会话 ${lockedSessionId} 的缓存`);
      }
    }

    abortController.value = null;
    console.log(
      `🏁 [CHAT] getChatWithAI 函数完全结束 - 会话: ${lockedSessionId}`
    );
  }
};

// 选择会话
const selectChat = async (chat: any) => {
  // 如果id和当前一样，拦截
  if (chat.id === conversationId.value) {
    return;
  }

  // 多会话并行支持：允许在其他会话处理时切换会话
  if (isCurrentConversationProcessing.value) {
    AntdMessage.info(t("conversation.canSwitchWhileProcessing"));
  }

  console.log(`🔄 [CHAT] 切换会话: ${conversationId.value} -> ${chat.id}`);
  console.log(`🔄 [CHAT] 切换前chatList长度: ${chatList.value.length}`);

  // 保存当前会话的聊天记录到缓存（如果有的话）
  if (conversationId.value && chatList.value.length > 0) {
    // 如果当前会话正在处理，保存完整的聊天记录
    const isProcessing = conversationStore.isConversationProcessing(
      conversationId.value
    );
    if (isProcessing) {
      console.log(
        `💾 [CACHE] 保存正在处理的会话 ${conversationId.value} 到缓存，消息数: ${chatList.value.length}`
      );
      conversationChatCache.value.set(conversationId.value, [
        ...chatList.value,
      ]);
    }
  }

  // 保存当前会话的白板状态
  if (conversationId.value) {
    saveCurrentWhiteboardData();
  }

  const previousConversationId = conversationId.value;
  conversationId.value = chat.id;

  // 先检查缓存中是否有该会话的数据
  if (conversationChatCache.value.has(chat.id)) {
    const cachedMessages = conversationChatCache.value.get(chat.id);
    console.log(
      `💾 [CACHE] 从缓存恢复会话 ${chat.id}，消息数: ${
        cachedMessages?.length || 0
      }`
    );
    chatList.value = cachedMessages || [];

    // 如果会话正在处理，确保标记正确
    const isProcessing = conversationStore.isConversationProcessing(chat.id);
    if (isProcessing && chatList.value.length > 0) {
      const lastMessage = chatList.value[chatList.value.length - 1];
      if (
        lastMessage &&
        (lastMessage.type === "ai" || lastMessage.type === MessageRoleEnum.AI)
      ) {
        (lastMessage as any).isProcessing = true;
        (lastMessage as any).isStreaming = true;
        console.log(`💾 [CACHE] 恢复处理状态: 消息 ${lastMessage.id}`);
      }
    }

    // 如果从缓存恢复了数据，不需要重新加载历史记录
    console.log(`💾 [CACHE] 已从缓存恢复数据，跳过历史记录加载`);

    // 恢复当前会话的白板状态
    restoreCurrentWhiteboardData();

    // 清空白板组件状态（如果切换到新会话）
    if (mindSpaceRef.value) {
      mindSpaceRef.value.clearAll();
    }

    // 关闭白板（用户可手动打开查看当前会话的白板）
    isWhiteboardOpen.value = false;

    return; // 直接返回，不加载历史记录
  } else {
    // 没有缓存，清空聊天内容
    chatList.value = [];
    console.log(`🔄 [CHAT] 已清空chatList，准备加载历史记录`);
  }

  // 先恢复当前会话的白板状态（如果有缓存）
  restoreCurrentWhiteboardData();

  // 清空白板组件状态
  if (mindSpaceRef.value) {
    mindSpaceRef.value.clearAll();
  }

  // 关闭白板
  isWhiteboardOpen.value = false;

  // 显示加载提示
  const loadingKey = `loading_${Date.now()}`;
  notification.open({
    key: loadingKey,
    message: t("common.loading"),
    description: t("conversation.loadingConversationContent"),
    icon: () => h(LoadingOutlined, { spin: true }),
    duration: 0, // 不自动关闭
  });

  // 查询历史记录
  try {
    console.log(`📥 [CHAT] 开始查询会话历史记录: ${chat.id}`);
    const [err, historyData] = await actQueryChatHistory({
      pageIndex: 1,
      pageSize: 100,
      chatId: chat.id,
    });

    console.log(
      `📥 [CHAT] 历史记录查询结果 - 错误: ${err}, 数据:`,
      historyData
    );

    // 🔍 调试：检查原始历史数据中的消息类型
    if (!err && historyData && historyData.items) {
      console.log(`🔍 [HISTORY] 原始历史数据消息类型分析:`);
      historyData.items.forEach((msg: any, idx: number) => {
        console.log(
          `🔍 [HISTORY][${idx}] ID: ${msg.id}, type: "${msg.type}", role: "${
            msg.role || "N/A"
          }"`
        );
      });
    }

    // 关闭加载提示
    notification.close(loadingKey);

    if (!err && historyData && historyData.items) {
      console.log(`📥 [CHAT] 查询到 ${historyData.items.length} 条历史记录`);

      // 检查是否有数据
      if (historyData.items.length === 0) {
        console.log(`📥 [CHAT] 无历史记录，显示提示信息`);
        notification.info({
          message: t("common.noHistoryRecord"),
          description: t("common.noHistoryMessageRecord"),
          duration: 3,
        });
        return;
      }
      // 检查当前会话是否正在处理中（提前检查）
      const isCurrentProcessing = conversationStore.isConversationProcessing(
        chat.id
      );
      console.log(
        `🔍 [PRE-FIX] 会话 ${chat.id} 是否正在处理: ${isCurrentProcessing}`
      );

      // 修复和标准化历史数据结构
      const fixedItems = historyData.items.map(
        (message: any, index: number) => {
          // 如果会话正在处理且这是最后一条消息，可能是正在生成的AI消息
          const isLastMessage = index === historyData.items.length - 1;
          const shouldBeAI = isCurrentProcessing && isLastMessage;

          console.log(
            `🔧 [FIX] 处理消息 ${message.id} - 原始type: "${
              message.type
            }", role: "${
              message.role || "N/A"
            }", 是最后一条: ${isLastMessage}, 应为AI: ${shouldBeAI}`
          );
          console.log(
            `🔧 [FIX] MessageRoleEnum.AI的值: "${MessageRoleEnum.AI}", MessageRoleEnum.USER的值: "${MessageRoleEnum.USER}"`
          );
          console.log(`🔧 [FIX] 完整消息对象:`, message);

          // 如果应该是AI消息（正在处理的最后一条），直接设置
          if (shouldBeAI) {
            message.type = "ai";
            (message as any).isProcessing = true;
            (message as any).isStreaming = true;

            // 确保有基本的AI消息结构
            if (
              message.currentIndex === undefined ||
              message.currentIndex === null
            ) {
              message.currentIndex = 0;
              console.log(`🔧 [FIX] 设置currentIndex为0`);
            }

            // 如果content不是数组，初始化为空数组结构
            if (!Array.isArray(message.content)) {
              if (typeof message.content === "string") {
                // 如果是字符串，转换为数组格式
                message.content = [
                  {
                    tokenUsage: 0,
                    contentList: [
                      {
                        type: "text",
                        content: message.content,
                        timestamp: Date.now(),
                      },
                    ],
                  },
                ];
              } else {
                // 否则创建空结构
                message.content = [
                  {
                    tokenUsage: 0,
                    contentList: [],
                  },
                ];
              }
            } else {
              // 如果content是数组但可能结构不完整，确保每个项都有contentList
              message.content = message.content.map((item: any) => {
                if (!item.contentList) {
                  return {
                    tokenUsage: item.tokenUsage || 0,
                    contentList: [],
                  };
                }
                return item;
              });
            }

            console.log(`🔧 [FIX] 强制设置最后一条消息为AI（会话正在处理中）`);
            console.log(`🔧 [FIX] content结构:`, message.content);
          }

          // 如果已经被标记为AI（在上面的shouldBeAI处理中），跳过类型判断
          if (message.type === "ai" && (message as any).isProcessing) {
            console.log(
              `🔧 [FIX] 消息 ${message.id} 已被强制设置为AI（处理中），跳过类型映射`
            );
          } else {
            // 🔧 类型映射修复：将各种AI消息类型统一为 MessageRoleEnum.AI
            // 检查可能的AI消息类型
            const possibleAITypes = ["assistant", "ai", "system", "bot"];
            const possibleUserTypes = ["user", "human"];

            // 重要：正在生成的消息(isStreaming=true)或处理中的消息(isProcessing=true)一定是AI消息
            const isStreamingMessage = (message as any).isStreaming === true;
            const isProcessingMessage = (message as any).isProcessing === true;

            const isAIMessage =
              possibleAITypes.includes(message.type) ||
              possibleAITypes.includes(message.role) ||
              message.type === MessageRoleEnum.AI ||
              isStreamingMessage || // 正在生成的消息一定是AI消息
              isProcessingMessage; // 处理中的消息一定是AI消息

            const isUserMessage =
              possibleUserTypes.includes(message.type) ||
              possibleUserTypes.includes(message.role) ||
              message.type === MessageRoleEnum.USER;

            if (isAIMessage) {
              const oldType = message.type;
              message.type = "ai"; // 直接设置为字符串 'ai'
              console.log(
                `✅ [FIX] 消息 ${message.id} 识别为AI："${oldType}" -> "${message.type}" (isStreaming: ${isStreamingMessage}, isProcessing: ${isProcessingMessage})`
              );
              console.log(
                `✅ [FIX] 验证: message.type === 'ai': ${message.type === "ai"}`
              );
              console.log(
                `✅ [FIX] 验证: message.type === MessageRoleEnum.AI: ${
                  message.type === MessageRoleEnum.AI
                }`
              );
            } else if (isUserMessage) {
              const oldType = message.type;
              message.type = "user"; // 直接设置为字符串 'user'
              console.log(
                `✅ [FIX] 消息 ${message.id} 识别为用户："${oldType}" -> "${message.type}"`
              );
            } else {
              console.log(
                `❌ [FIX] 消息 ${message.id} 类型未知: "${
                  message.type
                }", role: "${message.role || "N/A"}"`
              );
              console.log(`❌ [FIX] 完整未知消息:`, message);

              // 🔧 兜底策略：根据消息内容结构判断
              if (message.content && Array.isArray(message.content)) {
                console.log(`🔧 [FIX] 尝试根据content结构判断消息类型`);
                message.type = "ai"; // 直接设置为字符串 'ai'
                console.log(`🔧 [FIX] 根据content结构推断为AI消息`);
              } else if (typeof message.content === "string") {
                console.log(`🔧 [FIX] 根据content类型推断为用户消息`);
                message.type = "user"; // 直接设置为字符串 'user'
              }
            }
          }

          console.log(
            `🔧 [FIX] 最终类型: "${message.type}", MessageRoleEnum.AI: "${
              MessageRoleEnum.AI
            }", 匹配: ${message.type === MessageRoleEnum.AI}`
          );
          console.log(
            `🔧 [FIX] 字符串比较: message.type === 'ai': ${
              message.type === "ai"
            }`
          );

          // 如果消息已经是 AI 类型，跳过后续的二次处理
          if (message.type === "ai") {
            console.log(
              `🔧 [FIX] 消息 ${message.id} 已经是AI类型，跳过二次处理`
            );
          } else {
            // 使用更宽松的判断条件，支持多种AI消息类型
            // 重要：如果消息正在生成(isStreaming=true)或处理中(isProcessing=true)，则一定是AI消息
            const isStreamingMessage = (message as any).isStreaming === true;
            const isProcessingMessage = (message as any).isProcessing === true;

            const isAIType =
              message.type === "ai" ||
              message.type === MessageRoleEnum.AI ||
              message.type === "assistant" ||
              message.type === "bot" ||
              isStreamingMessage || // 正在生成的消息一定是AI消息
              isProcessingMessage; // 处理中的消息一定是AI消息

            if (isAIType) {
              // 统一设置AI消息类型为'ai'
              const oldType = message.type;
              message.type = "ai"; // 使用字符串'ai'确保兼容性
              console.log(
                `🔧 [FIX] 统一AI消息类型: ${oldType} -> ai (isStreaming: ${isStreamingMessage}, isProcessing: ${isProcessingMessage})`
              );

              // 恢复AI消息的streaming状态（如果消息还未完成）
              // 通过检查是否有空的contentList或正在处理的标记来判断
              if ((message as any).isStreaming === undefined) {
                // 检查是否是未完成的AI消息（比如刚创建还没内容）
                const hasEmptyContent =
                  message.content &&
                  message.content.some(
                    (c: any) => !c.contentList || c.contentList.length === 0
                  );
                if (hasEmptyContent) {
                  (message as any).isStreaming = true;
                  console.log(
                    `🔧 [FIX] 恢复AI消息 ${message.id} 的isStreaming状态为true`
                  );
                }
              }
            }
          }

          // 如果是AI消息，确保有正确的数据结构
          if (message.type === "ai") {
            // 确保AI消息有正确的数据结构
            if (
              message.currentIndex === undefined ||
              message.currentIndex === null
            ) {
              message.currentIndex = 0;
              console.log(`🔧 [FIX] 修正currentIndex为0 (消息${message.id})`);
            }

            // 确保content是数组格式
            if (!Array.isArray(message.content)) {
              // 如果content不是数组，可能是旧格式，需要转换
              if (typeof message.content === "string") {
                message.content = [
                  {
                    tokenUsage: 0,
                    contentList: [
                      {
                        type: "text",
                        content: message.content,
                        timestamp: Date.now(),
                      },
                    ],
                  },
                ];
              } else if (
                message.content &&
                typeof message.content === "object"
              ) {
                // 如果是对象但不是数组，包装成数组
                message.content = [message.content];
              } else {
                // 完全没有content，创建空结构
                message.content = [
                  {
                    tokenUsage: 0,
                    contentList: [],
                  },
                ];
              }
            }

            // 确保每个content项都有contentList
            message.content.forEach((contentItem: any, index: number) => {
              if (!contentItem.contentList) {
                if (contentItem.content) {
                  // 旧格式转换
                  contentItem.contentList = [
                    {
                      type: "text",
                      content: contentItem.content,
                      timestamp: Date.now(),
                    },
                  ];
                } else {
                  contentItem.contentList = [];
                }
              }

              // 修复空的contentList - 检查是否有其他格式的内容
              if (
                Array.isArray(contentItem.contentList) &&
                contentItem.contentList.length === 0
              ) {
                // 检查是否有直接的content字段
                if (
                  contentItem.content &&
                  typeof contentItem.content === "string"
                ) {
                  contentItem.contentList = [
                    {
                      type: "text",
                      content: contentItem.content,
                      timestamp: Date.now(),
                    },
                  ];
                  console.log(
                    `🔧 [CHAT] 修复空contentList - 从content字段恢复内容`
                  );
                }
                // 检查是否有旧格式的events
                else if (
                  contentItem.events &&
                  Array.isArray(contentItem.events)
                ) {
                  contentItem.contentList = contentItem.events;
                  console.log(
                    `🔧 [CHAT] 修复空contentList - 从events字段恢复内容`
                  );
                }
              }

              if (typeof contentItem.tokenUsage !== "number") {
                contentItem.tokenUsage = 0;
              }
            });

            // 确保currentIndex在有效范围内
            if (message.content && message.content.length > 0) {
              if (message.currentIndex >= message.content.length) {
                message.currentIndex = message.content.length - 1;
                console.log(
                  `🔧 [FIX] currentIndex超出范围，调整为${message.currentIndex}`
                );
              }
              if (message.currentIndex < 0) {
                message.currentIndex = 0;
                console.log(`🔧 [FIX] currentIndex为负数，调整为0`);
              }
            }
          }
          return message;
        }
      );

      // 更新聊天列表
      // 先置空再赋值，强制Vue检测到变化
      chatList.value = [];
      await nextTick(); // 等待DOM更新
      chatList.value = fixedItems;
      console.log(`✅ [CHAT] 成功恢复chatList，长度: ${chatList.value.length}`);

      // 🔍 详细检查最终的chatList
      console.log(`🔍 [FINAL] 最终chatList消息类型分析:`);
      chatList.value.forEach((msg: any, idx: number) => {
        const isAI = msg.type === "ai" || msg.type === MessageRoleEnum.AI;
        const isUser = msg.type === "user" || msg.type === MessageRoleEnum.USER;
        console.log(
          `🔍 [FINAL][${idx}] ID: ${msg.id}, type: "${msg.type}", isAI: ${isAI}, isUser: ${isUser}`
        );
      });

      // 检查当前会话是否正在处理中
      const isProcessing = conversationStore.isConversationProcessing(
        conversationId.value
      );
      console.log(
        `🔍 [CHAT] 当前会话 ${conversationId.value} 是否正在处理: ${isProcessing}`
      );

      // 详细检查AI消息的数据结构，重点关注空contentList
      const aiMessages = chatList.value.filter(
        (msg) => msg.type === "ai" || msg.type === MessageRoleEnum.AI
      );
      console.log(`✅ [CHAT] 恢复了 ${aiMessages.length} 条AI消息`);

      // 如果会话正在处理，确保最后一条AI消息标记为streaming和processing
      if (isProcessing && aiMessages.length > 0) {
        const lastAIMessage = aiMessages[aiMessages.length - 1];
        if (lastAIMessage) {
          (lastAIMessage as any).isStreaming = true;
          (lastAIMessage as any).isProcessing = true; // 同时标记为处理中
          // 清除_debugged标记，以便重新输出调试信息
          delete (lastAIMessage as any)._debugged;
          console.log(
            `🔧 [CHAT] 设置最后一条AI消息 ${lastAIMessage.id} 为streaming和processing状态`
          );
          console.log(
            `🔧 [CHAT] 消息详情: type="${lastAIMessage.type}", isStreaming=${
              (lastAIMessage as any).isStreaming
            }, isProcessing=${(lastAIMessage as any).isProcessing}`
          );
          console.log(`🔧 [CHAT] 消息content结构:`, lastAIMessage.content);
          console.log(
            `🔧 [CHAT] 消息currentIndex: ${lastAIMessage.currentIndex}`
          );

          // 确保content结构正确
          if (lastAIMessage.content && lastAIMessage.content.length > 0) {
            const currentContent =
              lastAIMessage.content[lastAIMessage.currentIndex];
            console.log(`🔧 [CHAT] currentContent:`, currentContent);
            if (currentContent && currentContent.contentList) {
              console.log(
                `🔧 [CHAT] contentList长度: ${currentContent.contentList.length}`
              );
              if (currentContent.contentList.length > 0) {
                console.log(
                  `🔧 [CHAT] 第一个content块:`,
                  currentContent.contentList[0]
                );
              }
            }
          }
        }
      }

      // 清除所有消息的_debugged标记，以便切换后重新输出调试信息
      chatList.value.forEach((msg) => {
        delete (msg as any)._debugged;
      });

      aiMessages.forEach((message, index) => {
        const hasContent = message.content && message.content.length > 0;
        if (hasContent) {
          const currentContent = message.content[message.currentIndex];
          const contentListLength = currentContent?.contentList?.length || 0;
          console.log(
            `✅ [CHAT] AI消息[${index}] - ID: ${message.id}, contentList长度: ${contentListLength}`
          );

          // 如果contentList为空，输出更多调试信息
          if (contentListLength === 0) {
            console.log(`⚠️ [CHAT] 空contentList详细信息 - ID: ${message.id}`);
            console.log(`⚠️ [CHAT] - currentIndex: ${message.currentIndex}`);
            console.log(`⚠️ [CHAT] - content项数量: ${message.content.length}`);
            console.log(`⚠️ [CHAT] - currentContent:`, currentContent);
            console.log(`⚠️ [CHAT] - 原始message:`, message);
          }
        } else {
          console.log(
            `❌ [CHAT] AI消息[${index}] - ID: ${message.id}, 无content`
          );
        }
      });

      // 解析历史记录中的白板数据并更新到当前会话
      // 优先使用 byCustomModel 格式解析，如果没有数据则使用原有格式
      parseWhiteboardDataFromCustomModel(
        historyData.items,
        thinkingItems,
        searchItems,
        terminalItems
      );

      // 如果 byCustomModel 格式没有解析到数据，则使用原有格式
      if (
        thinkingItems.value.length === 0 &&
        searchItems.value.length === 0 &&
        terminalItems.value.length === 0
      ) {
        parseWhiteboardDataFromHistoryHook(
          historyData.items,
          thinkingItems,
          searchItems,
          terminalItems
        );
      }

      // 将解析后的白板数据保存到当前会话的缓存中
      if (conversationId.value) {
        saveCurrentWhiteboardData();
        console.log(
          `💾 [WHITEBOARD] 从历史记录解析并保存会话 ${conversationId.value} 的白板数据`
        );
      }

      // 滚动到底部显示最新消息并强制重新渲染
      nextTick(() => {
        // 滚动逻辑已由ChatListBlock组件内部处理

        // 强制触发组件重新渲染，解决assistant-chat-content不显示的问题
        if (chatListComponentRef.value) {
          console.log(`🔄 [CHAT] 强制触发ChatListBlock重新渲染`);
          chatListComponentRef.value.$forceUpdate?.();
        }

        // 双重保险：再次检查DOM结构
        setTimeout(() => {
          const assistantContents = document.querySelectorAll(
            ".assistant-chat-content"
          );
          console.log(
            `🔍 [CHAT] DOM检查 - 找到 ${assistantContents.length} 个 assistant-chat-content 元素`
          );

          assistantContents.forEach((el, index) => {
            const isVisible = el.offsetParent !== null;
            console.log(
              `🔍 [CHAT] assistant-chat-content[${index}] 可见性: ${isVisible}`
            );
            if (!isVisible) {
              console.log(
                `⚠️ [CHAT] assistant-chat-content[${index}] 被隐藏，检查样式:`,
                window.getComputedStyle(el)
              );
            }
          });
        }, 100);
      });

      console.log(
        t("common.loadHistorySuccess"),
        historyData.items.length,
        t("common.loadHistorySuccessDesc")
      );
    } else {
      console.error(
        `❌ [CHAT] 查询历史记录失败 - 会话: ${chat.id}, 错误:`,
        err
      );
      notification.error({
        message: t("common.loadingFailed"),
        description: t("common.queryHistoryFailed"),
        duration: 3,
      });
      console.error("查询历史记录失败:", err);
    }
  } catch (error) {
    console.error(`❌ [CHAT] 查询历史记录异常 - 会话: ${chat.id}:`, error);
    // 关闭加载提示
    notification.close(loadingKey);

    notification.error({
      message: t("common.loadingException"),
      description: t("common.networkException"),
      duration: 3,
    });
    console.error("查询历史记录异常:", error);
  }
};

// 会话操作方法

// 显示全部会话列表
const showAllHistory = () => {
  showChatHistoryModal.value = true;
};

// 从模态框选择会话
const handleSelectChatFromModal = (
  chat: ChatRecordItem,
  list: ChatRecordItem[]
) => {
  selectChat(chat);
  historyList.value = list;
};

// 处理删除当前活跃会话
const handleDeleteActiveChat = (deletedChatId: string) => {
  // 如果要删除的会话正在处理中，需要先停止处理
  if (conversationStore.isConversationProcessing(deletedChatId)) {
    conversationStore.abortConversation(deletedChatId);
    AntdMessage.info("已停止会话处理并删除");
  }

  // 清理会话状态
  conversationStore.removeConversation(deletedChatId);

  // 清理该会话的缓存
  if (conversationChatCache.value.has(deletedChatId)) {
    conversationChatCache.value.delete(deletedChatId);
    console.log(`🧹 [CACHE] 删除会话，清理 ${deletedChatId} 的聊天缓存`);
  }

  // 清理该会话的白板缓存
  if (conversationWhiteboardCache.value.has(deletedChatId)) {
    conversationWhiteboardCache.value.delete(deletedChatId);
    console.log(`🧹 [WHITEBOARD] 删除会话，清理 ${deletedChatId} 的白板缓存`);
  }

  // 如果删除的是当前显示的会话，清空聊天内容
  if (conversationId.value === deletedChatId) {
    // 清空聊天内容和会话ID
    chatList.value = [];
    conversationId.value = "";

    // 清空白板内容（通过恢复逻辑处理）
    restoreCurrentWhiteboardData();

    // 清空白板组件状态
    if (mindSpaceRef.value) {
      mindSpaceRef.value.clearAll();
    }

    // 关闭白板
    isWhiteboardOpen.value = false;

    console.log("当前活跃会话已被删除，聊天内容已清空");
  }
};

// 处理分享功能
const handleShare = async () => {
  if (!conversationId.value) {
    notification.error({
      message: t("common.shareFailed"),
      description: t("common.noShareableConversation"),
    });
    return;
  }
  const baseUrl = "https://www.kedoai.com:8321";
  const shareUrl = `${baseUrl}#/share/${conversationId.value}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    notification.success({
      message: t("common.shareLinkCopied"),
      description: t("common.shareLinkCopiedDesc"),
      duration: 3,
    });
  } catch (error) {
    console.error("复制分享链接失败:", error);
    // 如果复制失败，显示链接让用户手动复制
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#/share/${conversationId.value}`;

    notification.info({
      message: t("common.shareLink"),
      description: shareUrl,
      duration: 0, // 不自动关闭
    });
  }
};

// 删除消息
const deleteMessage = async (messageItem: Message, messageIndex: number) => {
  if (!messageItem.id || typeof messageItem.id !== "string") {
    return;
  }

  try {
    const [err] = await actRemoveChatHistory({
      chatId: messageItem.id,
    });

    if (!err) {
      // 从聊天列表中移除消息
      chatList.value.splice(messageIndex, 1);

      // 如果删除的是AI消息且有事件数据，需要清理白板数据
      if (
        (messageItem.type === "ai" ||
          messageItem.type === MessageRoleEnum.AI) &&
        messageItem.content
      ) {
        // cleanWhiteboardDataByEvents(messageItem.contentList);
        // 白板数据
        parseWhiteboardDataFromCustomModel(
          chatList.value,
          thinkingItems,
          searchItems,
          terminalItems
        );
      }
      //

      notification.success({
        message: t("common.deleteSuccess"),
        description: t("common.messageDeleted"),
      });
    } else {
      notification.error({
        message: t("common.deleteFailed"),
        description: t("common.cannotDeleteMessage"),
      });
    }
  } catch (error) {
    console.error("删除消息失败:", error);
    notification.error({
      message: t("common.deleteFailed"),
      description: t("common.networkException"),
    });
  }
};

// 监控chatList变化的watcher，用于调试会话切换问题
watch(
  () => chatList.value,
  (newChatList, oldChatList) => {
    console.log(`🔍 [WATCH] chatList变化监控:`);
    console.log(
      `🔍 [WATCH] 旧长度: ${oldChatList?.length || 0}, 新长度: ${
        newChatList?.length || 0
      }`
    );
    console.log(`🔍 [WATCH] 当前会话ID: ${conversationId.value}`);
    console.log(
      `🔍 [WATCH] 新chatList:`,
      newChatList?.map((item) => ({
        id: item.id,
        type: item.type,
        contentLength: item.content?.length || 0,
      }))
    );
  },
  { deep: true, immediate: true }
);

// 监控conversationId变化，自动切换白板数据
watch(
  () => conversationId.value,
  (newId, oldId) => {
    console.log(`🔍 [WATCH] conversationId变化: ${oldId} -> ${newId}`);
    console.log(`🔍 [WATCH] 变化时chatList长度: ${chatList.value.length}`);

    // 当conversationId变化时，恢复对应会话的白板数据
    if (newId !== oldId) {
      console.log(`🔍 [WATCH] 会话切换，恢复新会话的白板数据`);
      nextTick(() => {
        restoreCurrentWhiteboardData();
      });
    }
  }
);

// 监听聊天列表变化，记录消息类型
watch(
  () => chatList.value,
  (newChatList) => {
    console.log(`👁️ [WATCH] chatList变化 - 总数: ${newChatList.length}`);
    newChatList.forEach((msg, idx) => {
      console.log(
        `👁️ [WATCH][${idx}] ID: ${msg.id}, type: ${msg.type}, isStreaming: ${
          (msg as any).isStreaming || "N/A"
        }`
      );
    });
  },
  { deep: true }
);

onMounted(async () => {

});

// keep-alive组件激活时
onActivated(() => {
  console.log("chat组件被激活");
  // 可以在这里添加组件重新激活时的逻辑
  // 比如刷新数据或恢复某些状态
});

// keep-alive组件失活时
onDeactivated(() => {
  console.log("chat组件被缓存");
  // 注意：这里不要停止正在进行的对话
  // 对话应该在后台继续进行
});
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

.chat-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  background-color: $secondary-bg;
  overflow: auto;
  &-inner {
    width: 100%;
    height: calc(100vh - 32px);
    background-color: $main-bg;
    color: $text-color;
    overflow: hidden;
    position: relative;
    border-radius: 16px;
    display: flex;

    overflow-y: auto;
    &-left {
      position: relative;
      height: 100%;
      flex: 1;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
  }
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-list {
  flex: 1;
  overflow-y: auto;

  .img-user,
  .img-assistant {
    width: 32px;
    height: 32px;
    border-radius: 12px;
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
      animation: rotate 2s linear infinite;
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
      width: 100%;
      overflow: hidden;

      &-label {
        flex: 1;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        border: 1px solid rgba(232, 244, 248, 0.6);
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
          background-color: #69c0ff;
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
    }
  }
}

// 处理步骤样式
.process-steps {
  margin-bottom: 16px;

  .process-step {
    margin-bottom: 16px;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    background-color: #f8f9fa;
    overflow: hidden;

    &:last-child {
      margin-bottom: 0;
    }

    .step-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background-color: #f1f3f4;
      border-bottom: 1px solid #e1e5e9;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: #e8eaed;
      }

      .step-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .step-icon {
          font-size: 16px;

          &.thinking-step-icon {
            color: #10b981;
          }

          &.search-step-icon {
            color: #3b82f6;
          }

          &.error-step-icon {
            color: #ef4444;
          }

          &.terminal-step-icon {
            color: #8b5cf6;
          }
        }

        .step-title {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }
      }

      .collapse-icon {
        color: #6b7280;
        font-size: 12px;
        transition: transform 0.2s ease;
      }
    }

    .step-content {
      padding: 16px;
      background-color: #ffffff;
      font-size: 14px;
      line-height: 1.5;
      color: #4b5563;
      white-space: pre-wrap;
      word-break: break-word;

      &.error-content {
        background-color: #fef2f2;
        color: #dc2626;
        border-top: 1px solid #fecaca;
      }

      &.terminal-content {
        background-color: #f3f0ff;
        color: #7c3aed;
        border-top: 1px solid #ddd6fe;
        font-style: italic;
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

  // AI消息操作按钮（下方显示）
  &.assistant-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;

    .ant-btn {
      color: #6b7280;
      background-color: #f8f9fa;

      &:hover {
        color: #374151;
        background-color: #e9ecef;
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

.greeting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;

  h1 {
    font-size: 32px;
    font-weight: 400;
    color: $text-color;
    margin: 0;
  }
}

.avatar {
  display: flex;
  align-items: center;
  gap: 12px;

  .avatar-icon {
    width: 48px;
    height: 48px;
    background-color: $main-bg;
    border: 1px solid $border-color;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $text-color;
    font-weight: 500;
  }

  .avatar-character {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #ff6b9d, #ff8e88);
    border-radius: 50%;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      width: 24px;
      height: 24px;
      background: white;
      border-radius: 50%;
      top: 8px;
      left: 12px;
    }

    &::after {
      content: "";
      position: absolute;
      width: 16px;
      height: 8px;
      background: #ff6b9d;
      border-radius: 0 0 8px 8px;
      bottom: 8px;
      left: 16px;
    }
  }
}

.input-section {
  flex-shrink: 0;
  padding: 10px;
}

.input-container {
  background-color: $main-bg;
  border-radius: 16px;
  padding: 12px 12px 4px 12px;
  border: 1px solid $border-color;
}

.pasted-attachments {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: $text-color;
  font-size: 16px;
  margin-bottom: 16px;

  &::placeholder {
    color: $text-color;
  }
}

.input-actions {
  display: flex;
  justify-content: space-between;
  &-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  &-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.deepthink-btn {
  transition: all 0.3s ease;
  &.active {
    color: $primary-color;
    border-color: $primary-color;
  }
}

.attach-btn,
.expand-btn,
.auto-btn {
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    opacity: 0.8;
  }
}

.expand-count {
  background-color: $primary-color;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  margin-left: 4px;
}

.send-btn,
.stop-btn {
  border-radius: 8px;
  margin-left: auto;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.stop-btn {
  background-color: #ff4d4f;
  border-color: #ff4d4f;
  color: white;

  &:hover {
    background-color: #ff7875;
    border-color: #ff7875;
    color: white;
  }
}

.experts-section,
.templates-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  span {
    font-size: 16px;
    font-weight: 500;
    color: $text-color;
  }

  .more-link {
    color: $text-color;
    text-decoration: none;
    font-size: 14px;

    &:hover {
      opacity: 0.8;
    }
  }
}

.experts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.expert-card {
  background-color: $main-bg;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #9ca3af;

  &:hover {
    opacity: 0.8;
  }

  .expert-name {
    font-size: 14px;
    color: $text-color;
  }
}

.template-tags {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.template-tag {
  background-color: $primary-color;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.template-card {
  background-color: $main-bg;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #9ca3af;

  &:hover {
    opacity: 0.8;
    // transform: translateY(-2px);
  }

  h3 {
    font-size: 16px;
    font-weight: 500;
    color: $text-color;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    color: $text-color;
    line-height: 1.5;
    margin: 0 0 16px 0;
  }
}

/* 欢迎插图样式 */
.welcome-illustration {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.95;
  min-height: 0;
  width: 100%;
  height: 100%;
  padding: 10px;

  .illustration-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: all 0.3s ease;

    &:hover {
      opacity: 1;
    }
  }
}

/* 右上角操作按钮组样式 */
.top-action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: 6px;
}

.share-btn,
.whiteboard-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: $main-bg;
  // border: 1px solid $border-color;
  border-radius: 8px;
  color: $text-color;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  .anticon {
    font-size: 14px;
  }
  &:hover {
    color: $primary-color;
    border-color: $primary-color;
  }
}

/* 白板过渡动画 */
.whiteboard-slide-enter-active,
.whiteboard-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.whiteboard-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.whiteboard-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 右侧白板样式 */
.whiteboard-panel {
  max-width: 400px;
  height: calc(100vh - 12px);
  margin: 6px 6px 6px 0;
  background-color: $main-bg;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;

  .whiteboard-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    overflow: hidden;
  }

  .whiteboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid $border-color;
    background-color: $main-bg;
    border-radius: 16px 16px 0 0;

    .header-title {
      background-color: $primary-color;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      display: inline-block;
    }

    .ant-btn {
      color: $text-color;

      &:hover {
        color: $text-color;
      }
    }
  }

  .whiteboard-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: $main-bg;
    color: $text-color;
    overflow: hidden;
  }

  .whiteboard-tabs {
    display: flex;
    border-bottom: 1px solid $border-color;
    background-color: $main-bg;
  }

  .whiteboard-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    background-color: transparent;
    color: $text-color;
    transition: all 0.3s ease;
    border-bottom: 2px solid transparent;

    &:hover {
      background-color: $border-color;
      color: $text-color;
    }

    &.active {
      color: $primary-color;
      background-color: $primary-bg;
      border-bottom-color: $primary-color;
    }

    .anticon {
      font-size: 16px;
    }

    span {
      font-size: 14px;
      font-weight: 500;
    }
  }

  .whiteboard-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .thinking-list,
  .search-list,
  .terminal-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .thinking-item,
  .search-item,
  .terminal-item {
    padding: 16px;
    background-color: $main-bg;
    border-radius: 8px;
    border: 1px solid $border-color;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }

  .thinking-item-header,
  .search-item-header,
  .terminal-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .thinking-icon,
  .search-icon,
  .terminal-icon {
    color: $primary-color;
    font-size: 16px;
  }

  .thinking-title,
  .search-title,
  .terminal-title {
    font-size: 14px;
    font-weight: 500;
    color: $text-color;
  }

  .thinking-time,
  .search-time,
  .terminal-time {
    margin-left: auto;
    font-size: 12px;
    color: $text-color;
  }

  .thinking-preview,
  .search-preview,
  .terminal-preview {
    font-size: 13px;
    color: $text-color;
    line-height: 1.4;
  }

  .search-meta,
  .terminal-meta {
    font-size: 12px;
    color: $text-color;
    margin-top: 4px;
  }

  .thinking-detail,
  .search-detail,
  .terminal-detail {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid $border-color;
    margin-bottom: 20px;
  }

  .detail-title {
    font-size: 16px;
    font-weight: 500;
    color: $text-color;
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
  }

  .thinking-content {
    background-color: $main-bg;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid $border-color;
    font-size: 14px;
    // line-height: 1.6;
    color: $text-color;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .instruction-content {
    margin-top: 16px;
    padding: 16px;
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #0369a1;
    }

    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #0c4a6e;
    }
  }

  .search-query {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: $text-color;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: $text-color;
      background-color: $main-bg;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid $border-color;
    }
  }

  .search-results {
    h4 {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: $text-color;
    }
  }

  .search-result-item {
    margin-bottom: 20px;
    padding: 16px;
    background-color: $main-bg;
    border-radius: 8px;
    border: 1px solid $border-color;

    h5 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: $text-color;
      line-height: 1.4;
    }

    .search-url {
      display: block;
      margin-bottom: 8px;
      font-size: 12px;
      color: $primary-color;
      text-decoration: none;
      word-break: break-all;

      &:hover {
        text-decoration: underline;
      }
    }

    .search-content {
      margin: 8px 0 0 0 !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      color: $text-color !important;
    }
  }

  .terminal-arguments,
  .terminal-results {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: $text-color;
    }
  }

  .terminal-no-result {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;

    p {
      margin: 0;
      font-size: 14px;
      color: $text-color;
      opacity: 0.6;
    }
  }
}
</style>
