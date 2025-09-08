<template>
  <a-watermark content="KedoMind">
    <div class="share-container">
      <!-- 主聊天区域 -->
      <div
        class="main-content"
        :class="{ 'with-whiteboard': isWhiteboardOpen && hasWhiteboardData }"
      >
        <!-- 右上角白板按钮 -->
        <div class="top-actions">
          <a-button
            v-if="hasWhiteboardData"
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
          ref="chatListComponentRef"
          :chatList="chatList"
          :userInfo="{ name: '用户' }"
          :stepCollapsedState="stepCollapsedState"
          :isShareMode="true"
          :isCollapse="isWhiteboardOpen"
          :autoScroll="false"
          @deleteMessage="() => {}"
          @copyMessage="copyMessage"
          @exportToWord="() => {}"
          @toggleStepCollapsed="toggleStepCollapsed"
          @jumpToMindSpace="handleJumpToMindSpace"
        />

        <!-- 头部问候区域 -->
        <div v-if="chatList.length === 0 && !isLoading" class="greeting">
          <div class="greeting-text">
            <h1>{{ t("conversation.conversationShare") }}</h1>
            <p>
              {{
                shareId
                  ? t("conversation.loadingConversationContent")
                  : t("conversation.conversationNotFound")
              }}
            </p>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <a-spin size="large" />
          <p>{{ t("conversation.loadingConversationContent") }}</p>
        </div>

        <!-- 错误状态 -->
        <div v-if="hasError && !isLoading" class="error-container">
          <a-result
            status="error"
            :title="t('conversation.loadFailed')"
            :sub-title="t('conversation.cannotLoadConversationContent')"
          >
            <template #extra>
              <a-button type="primary" @click="loadShareData">{{
                t("conversation.reload")
              }}</a-button>
            </template>
          </a-result>
        </div>
      </div>

      <!-- 右侧白板组件 -->
      <MindSpace
        v-if="hasWhiteboardData"
        ref="mindSpaceRef"
        :isOpen="isWhiteboardOpen"
        :thinkingItems="thinkingItems"
        :searchItems="searchItems"
        :terminalItems="terminalItems"
        @close="toggleWhiteboard"
      />
    </div>
  </a-watermark>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { LayoutOutlined } from "@ant-design/icons-vue";
import MindSpace from "@/components/mindSpace/Index.vue";
import { ChatListBlock } from "@/components/chatList";
import { awaitWrapper, exportToWord } from "@/api";
import MarkdownIt from "markdown-it";
import { useHistory, useChat } from "@/hooks";
import {
  Message,
} from "@/types";
import { notification } from "ant-design-vue";

const { t } = useI18n();
const route = useRoute();
const { actQueryChatHistory } = useHistory();
const {
  parseWhiteboardDataFromCustomModel,
} = useChat();

// 响应式数据
const chatListComponentRef = ref();
const mindSpaceRef = ref();
const isWhiteboardOpen = ref(false); // 分享页面白板初始关闭，根据数据决定是否展开
const isLoading = ref(false);
const hasError = ref(false);

// 白板相关状态
const thinkingItems = ref<any[]>([]);
const searchItems = ref<any[]>([]);
const terminalItems = ref<any[]>([]);

// 聊天列表
const chatList = ref<Message[]>([]);

// 分享ID
const shareId = computed(() => route.params.id as string);

// 检查是否有Mind空间数据
const hasWhiteboardData = computed(() => {
  return (
    thinkingItems.value.length > 0 ||
    searchItems.value.length > 0 ||
    terminalItems.value.length > 0
  );
});

// 为每个消息存储步骤折叠状态
const stepCollapsedState = ref<Record<string, boolean>>({});

// 切换白板显示状态
const toggleWhiteboard = () => {
  isWhiteboardOpen.value = !isWhiteboardOpen.value;
};

// 切换单个步骤折叠状态
const toggleStepCollapsed = (
  messageIndex: number,
  stepIndex: number | string
) => {
  const key = `${messageIndex}-${stepIndex}`;
  stepCollapsedState.value[key] = !stepCollapsedState.value[key];
};

// 跳转到Mind空间
const handleJumpToMindSpace = (stepType: string, toolCallId: string) => {
  // 打开白板
  if (!isWhiteboardOpen.value) {
    isWhiteboardOpen.value = true;
  }

  // 通过MindSpace组件定位到对应的结果
  if (mindSpaceRef.value) {
    mindSpaceRef.value.locateByToolCallId(stepType, toolCallId);
  }
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

function encodeStringToBase64(str: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const blob = new Blob([data]);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === "string") {
        resolve(
          reader.result.replace("data:application/octet-stream;base64,", "")
        );
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 加载分享数据
const loadShareData = async () => {
  if (!shareId.value) {
    hasError.value = true;
    return;
  }

  isLoading.value = true;
  hasError.value = false;

  try {
    const [err, historyData] = await actQueryChatHistory({
      pageIndex: 1,
      pageSize: 100,
      chatId: shareId.value,
    });

    if (!err && historyData && historyData.items) {
      if (historyData.items.length === 0) {
        hasError.value = true;
        notification.error({
          message: t("common.shareConversationNotExist"),
          description: t("common.shareConversationDeleted"),
        });
        return;
      }

      // 更新聊天列表
      chatList.value = historyData.items;

      // 解析历史记录中的白板数据
      parseWhiteboardDataFromCustomModel(
        historyData.items,
        thinkingItems,
        searchItems,
        terminalItems
      );

      // 如果有白板数据，自动展开Mind空间
      if (hasWhiteboardData.value) {
        isWhiteboardOpen.value = true;
      }

      console.log(
        t("common.loadShareDataSuccess"),
        historyData.items.length,
        t("common.loadShareDataSuccessDesc")
      );
    } else {
      hasError.value = true;
      notification.error({
        message: t("common.loadShareDataFailed"),
        description: t("common.cannotLoadShareContent"),
      });
    }
  } catch (error) {
    hasError.value = true;
    console.error("加载分享数据失败:", error);
    notification.error({
      message: t("common.loadShareDataException"),
      description: t("common.networkException"),
    });
  } finally {
    isLoading.value = false;
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatListComponentRef.value?.scrollToBottom) {
      chatListComponentRef.value.scrollToBottom();
    }
  });
};

onMounted(async () => {
  // 设置页面标题
  document.title = `会话分享 - ${import.meta.env.VITE_APP_TITLE}`;

  // 加载分享数据
  await loadShareData();

  // 滚动到底部
  scrollToBottom();
});
</script>

<style scoped lang="scss">
.share-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: $primary-bg;
  overflow: hidden;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  margin-right: 6px;
  background-color: $main-bg;
  color: $text-color;
  position: relative;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.greeting {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100%;
  text-align: center;

  h1 {
    font-size: 32px;
    font-weight: 400;
    color: $text-color;
    margin: 0 0 16px 0;
  }

  p {
    font-size: 16px;
    color: $text-color;
    margin: 0;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 16px;

  p {
    font-size: 16px;
    color: $text-color;
    margin: 0;
  }
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.top-actions {
  display: flex;
  flex-direction: row-reverse;
  margin-right: 6px;
}

/* 右上角白板按钮样式 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    padding: 20px;

    &.with-whiteboard {
      padding: 20px;
    }
  }

  .whiteboard-toggle-btn {
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;

    .anticon {
      font-size: 14px;
    }
  }
}
</style>
