<template>
  <MoveModal
    v-model:open="visible"
    :title="t('conversation.allConversations')"
    width="800px"
    :footer="null"
    @cancel="handleClose"
  >
    <div class="chat-list-modal">
      <!-- 顶部工具栏：搜索 + 删除全部 -->
      <div class="toolbar">
        <a-input
          v-model:value="searchQuery"
          allow-clear
          :placeholder="
            t('conversation.searchPlaceholder') || '搜索话题或消息...'
          "
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <a-popconfirm
          :title="t('conversation.deleteAllConversationsConfirm')"
          :description="t('conversation.deleteAllConversationsDesc')"
          :ok-text="t('common.confirm')"
          :cancel-text="t('common.cancel')"
          @confirm="handleDeleteAllChats"
        >
          <a-button v-if="chatList.length > 0" type="text" class="delete-all-btn">
            <DeleteOutlined />
          </a-button>
        </a-popconfirm>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <a-spin size="large" />
        <p>{{ t("common.loading") }}</p>
      </div>

      <!-- 会话列表 -->
      <div v-else class="chat-container">
        <div
          v-if="chatList.length > 0"
          class="chat-list"
          ref="scrollContainer"
          @scroll="handleScroll"
        >
          <div
            v-for="group in groupedChats"
            :key="group.date"
            class="date-group"
          >
            <div class="group-header">{{ group.date }}</div>
            <ChatRecordItem
              v-for="chat in group.items"
              :key="chat.id"
              :chat="chat"
              :is-active="selectedChatId === chat.id"
              @click="selectChat"
              @refresh="handleItemRefresh"
            />
          </div>
          <div v-if="isLoading" class="loading-more">
            <a-spin size="small" /> <span>{{ t("common.loading") }}</span>
          </div>
          <div v-else-if="noMoreData" class="no-more">
            {{ t("common.noMore") }}
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <a-empty :description="t('conversation.noConversationRecord')" />
        </div>
      </div>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, nextTick, computed, onUnmounted } from "vue";
import { debounce } from "lodash-es";
import { useI18n } from "vue-i18n";
import ChatRecordItem from "@/components/chatRecord/ChatRecordListItem.vue";
import { useHistory } from "@/hooks";
import { ChatRecordItem as ChatItem } from "@/types/history";
import { message } from "ant-design-vue";
import { MoveModal } from "./index";
import { DeleteOutlined, SearchOutlined } from "@ant-design/icons-vue";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  select: [chat: ChatItem, currentList: ChatItem[]];
  refresh: [];
}>();

const { t } = useI18n();
const { actGetChatList, actRemoveAllChat } = useHistory();

// 响应式数据
const visible = ref(false);
const loading = ref(false);
const chatList = ref<ChatItem[]>([]);
const selectedChatId = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const isLoading = ref(false);
const noMoreData = ref(false);
const scrollContainer = ref<HTMLDivElement | null>(null);
const searchQuery = ref("");

// 实时搜索（防抖）
const debouncedSearch = debounce(async () => {
  currentPage.value = 1;
  noMoreData.value = false;
  await fetchChatList(1, false);
  nextTick(() => {
    if (scrollContainer.value) scrollContainer.value.scrollTop = 0;
  });
}, 300);

watch(searchQuery, () => {
  debouncedSearch();
});

onUnmounted(() => {
  debouncedSearch.cancel();
});

// 监听 open 变化
watch(
  () => props.open,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      currentPage.value = 1;
      noMoreData.value = false;
      fetchChatList(1, false);
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = 0;
        }
      });
    }
  }
);

// 监听 visible 变化
watch(visible, (newVal) => {
  emit("update:open", newVal);
});

// 获取会话列表（支持加载更多）
const fetchChatList = async (
  page: number = 1,
  isLoadMore: boolean = false,
  withDelay: boolean = false
) => {
  loading.value = !isLoadMore;
  isLoading.value = isLoadMore;
  if (withDelay) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  try {
    const [err, data] = await actGetChatList({
      pageIndex: page,
      pageSize: pageSize.value,
      keyword: searchQuery.value.trim() || undefined,
    });

    if (!err && data) {
      const list = (data.items || data.list || []).map((item: any) => ({
        id: item.f_Id,
        title: item.f_Caption,
        updateTime: item.f_UpdateDate || item.f_CreateDate,
        editing: false,
        editTitle: item.f_Caption,
      }));

      if (isLoadMore) {
        chatList.value.push(...list);
      } else {
        chatList.value = list;
      }
      total.value = data.total || data.totalCount || 0;
      currentPage.value = page;
      // 判断是否还有更多
      if (
        list.length < pageSize.value ||
        chatList.value.length >= total.value
      ) {
        noMoreData.value = true;
      }
    } else {
      if (!isLoadMore) {
        chatList.value = [];
        total.value = 0;
      }
      noMoreData.value = true;
    }
  } catch (error) {
    console.error("获取会话列表异常:", error);
    if (!isLoadMore) {
      chatList.value = [];
      total.value = 0;
    }
    noMoreData.value = true;
  } finally {
    loading.value = false;
    isLoading.value = false;
  }
};

// 选择会话
const selectChat = (chat: ChatItem) => {
  selectedChatId.value = chat.id;
  emit("select", chat, chatList.value);
  visible.value = false;
};

// 切换编辑状态
const toggleEdit = (chat: ChatItem) => {
  chat.editing = !chat.editing;
  if (chat.editing) {
    chat.editTitle = chat.title;
  }
};

// 更新会话标题
const updateChatTitle = (chat: ChatItem, newTitle: string) => {
  chat.title = newTitle;
  chat.editTitle = newTitle;
  chat.editing = false;
  console.log("更新会话标题:", chat.id, newTitle);
};

// 删除会话
const deleteChat = (chat: ChatItem) => {
  const index = chatList.value.findIndex((c) => c.id === chat.id);
  if (index > -1) {
    chatList.value.splice(index, 1);
    total.value = Math.max(0, total.value - 1);
  }
};

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchChatList(page, false);
};

// 删除全部会话
const handleDeleteAllChats = async () => {
  try {
    const [err] = await actRemoveAllChat();

    if (!err) {
      message.success(t("conversation.deleteAllConversationsSuccess"));
      // 清空本地列表
      chatList.value = [];
      total.value = 0;
      // 通知父组件刷新列表
      emit("refresh");
      // 延时重新加载列表
      fetchChatList(1, false, true);
    } else {
      message.error(t("conversation.deleteAllConversationsFailed"));
    }
  } catch (error) {
    console.error("删除全部会话失败:", error);
    message.error(t("conversation.deleteAllConversationsFailed"));
  }
};

// 关闭模态框
const handleClose = () => {
  visible.value = false;
  // 重置状态
  currentPage.value = 1;
  chatList.value = [];
  total.value = 0;
  selectedChatId.value = "";
  noMoreData.value = false;
};

// 触底加载
const handleScroll = async () => {
  if (!scrollContainer.value || isLoading.value || noMoreData.value) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  if (scrollHeight - scrollTop - clientHeight < 100) {
    await fetchChatList(currentPage.value + 1, true);
  }
};

// 将会话按日期分组（MM/DD）
const groupedChats = computed(() => {
  const groups: Record<string, ChatItem[]> = {};
  for (const item of chatList.value) {
    const time: any = (item as any).updateTime;
    const dateObj = time ? new Date(time) : new Date();
    const label = `${String(dateObj.getMonth() + 1).padStart(2, "0")}/${String(
      dateObj.getDate()
    ).padStart(2, "0")}`;
    if (!groups[label]) groups[label] = [] as ChatItem[];
    groups[label].push(item);
  }
  const ordered = Object.entries(groups)
    .sort((a, b) => {
      const [am, ad] = a[0].split("/").map(Number);
      const [bm, bd] = b[0].split("/").map(Number);
      if (am !== bm) return bm - am;
      return bd - ad;
    })
    .map(([date, items]) => ({ date, items }));
  return ordered;
});

// 子项编辑/删除后刷新当前列表
const handleItemRefresh = async () => {
  currentPage.value = 1;
  noMoreData.value = false;
  await fetchChatList(1, false);
};


</script>

<style scoped lang="scss">
.chat-list-modal {
  min-height: 400px;

  .toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 0 12px;
    position: sticky;
    top: 0;
    z-index: 2;

    .delete-all-btn {
      border-radius: 10px;
      height: 36px;
      &:hover {
        color: #ff4d4f;
      }
    }
  }

  .action-header {
    padding: 8px 0 12px;
    display: flex;
    justify-content: flex-end;
    border-bottom: 1px solid #f0f0f0;

    .delete-all-btn {
      font-size: 12px;
      height: 32px;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 500;

      &:hover {
        background-color: rgba(255, 77, 79, 0.9) !important;
      }
    }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;

    p {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
    }
  }

  .chat-container {
    min-height: 400px;
    display: flex;
    flex-direction: column;

    .chat-list {
      flex: 1;
      min-height: 300px;
      max-height: 480px;
      overflow-y: auto;
    }

    .date-group {
      padding: 8px 0 4px;
    }

    .group-header {
      font-size: 16px;
      color: $primary-color;
      font-weight: 600;
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    .loading-more,
    .no-more {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
      padding: 12px 0;
      color: #888;
      font-size: 12px;
    }
  }
}
</style>
