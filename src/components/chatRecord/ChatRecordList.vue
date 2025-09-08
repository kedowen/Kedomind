<template>
  <div class="chat-record-list" ref="scrollContainer" @scroll="handleScroll">
    <!-- 聊天记录列表 -->
    <template v-if="recordList.length > 0">
      <ChatRecordListItem
        v-for="item in recordList"
        :key="item.id"
        :chat="item"
        :is-active="props.conversationId === item.id"
        @click="handleRecordClick(item)"
        @refresh="refresh"
      />
    </template>

    <!-- 骨架屏 -->
    <a-skeleton
      v-if="isLoading"
      :loading="true"
      active
      :title="false"
      :paragraph="{ rows: 3 }"
    />

    <!-- 没有更多数据 -->
    <div
      v-if="noMoreData && recordList.length > 0 && !isLoading"
      class="no-more"
    >
      {{ $t("chat.noMoreData") }}
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && recordList.length === 0" class="empty-container">
      <a-empty
        :description="$t('chat.noConversationRecords')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { Empty } from "ant-design-vue";
import { ChatRecordListItem } from "./index";
import type { ChatRecordItem } from "@/types/history";
import { useHistory } from "@/hooks";

interface Props {
  autoLoad?: boolean;
  conversationId?: string;
}

interface Emits {
  (e: "recordClick", record: ChatRecordItem): void;
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true,
});

const emit = defineEmits<Emits>();

// 使用历史记录hook
const { actGetChatList } = useHistory();

// 响应式数据
const scrollContainer = ref<HTMLElement>();
const recordList = ref<ChatRecordItem[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const isLoading = ref(false);
const noMoreData = ref(false);

// 加载聊天记录
const loadRecords = async (page: number = 1, isLoadMore: boolean = false) => {
  try {
    isLoading.value = true;
    if (page === 1) {
      recordList.value = [];
      noMoreData.value = false;
    }
    // 延时两秒
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    const [err, res] = await actGetChatList({
      pageIndex: page,
      pageSize: pageSize.value,
    });
    console.log(err,res);
    

    if (!err && res && res.items && res.items.length > 0) {
      const formattedData = res.items.map((item: any) => ({
        id: item.f_Id,
        title: item.f_Caption,
        editing: false,
        editTitle: item.f_Caption,
      }));

      if (isLoadMore) {
        recordList.value.push(...formattedData);
      } else {
        recordList.value = formattedData;
      }

      // 检查是否还有更多数据
      if (res.items.length < pageSize.value) {
        noMoreData.value = true;
      }
    } else {
      if (page === 1) {
        recordList.value = [];
      }
      noMoreData.value = true;
    }

    currentPage.value = page;
  } catch (error) {
    console.error("加载聊天记录失败:", error);
  } finally {
    isLoading.value = false;
  }
};

// 触底加载检测
const handleScroll = async () => {
  if (!scrollContainer.value || isLoading.value || noMoreData.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;

  // 距离底部小于100px时触发加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    await loadMore();
  }
};

// 加载更多
const loadMore = async () => {
  if (isLoading.value || noMoreData.value) return;
  await loadRecords(currentPage.value + 1, true);
};

// 刷新列表
const refresh = async () => {
  currentPage.value = 1;
  noMoreData.value = false;
  await loadRecords(1, false);
};

// 处理记录点击
const handleRecordClick = (record: ChatRecordItem) => {
  emit("recordClick", record);
};

// 节流函数
const throttle = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  let lastExecTime = 0;
  return function (...args: any[]) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// 节流处理滚动事件
const throttledScroll = throttle(handleScroll, 200);

onMounted(async () => {
  if (props.autoLoad) {
    await loadRecords();
  }

  // 添加滚动事件监听
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener("scroll", throttledScroll);
  }
});

onUnmounted(() => {
  // 移除滚动事件监听
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener("scroll", throttledScroll);
  }
});

// 暴露方法给父组件
defineExpose({
  refresh,
  loadMore,
  recordList,
});
</script>

<style scoped lang="scss">
.chat-record-list {
  height: 100%;
  overflow-y: auto;
  padding-right: 3px;
}

// 骨架屏样式
.skeleton-list {
  .skeleton-item {
    padding: 12px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);

    &:last-child {
      border-bottom: none;
    }
  }
}

// 空状态样式
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

// 没有更多数据样式
.no-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}
</style>
