<template>
  <div class="whiteboard-content">
    <div class="whiteboard-header">
      <!-- <div class="header-title">{{ t("mind.title") }}</div> -->
      <div class="header-title">KedoMind</div>

      <a-button type="text" size="small" @click="$emit('close')">
        <CloseOutlined />
      </a-button>
    </div>
    <div class="whiteboard-body">
      <!-- 白板标签页 -->
      <div
        v-if="searchItems.length > 0 || terminalItems.length > 0"
        class="whiteboard-tabs"
      >
        <div
          v-if="searchItems.length > 0"
          class="whiteboard-tab"
          :class="{ active: activeTab === 'search' }"
          @click="setActiveTab('search')"
        >
          <SearchOutlined />
          <span>{{ t("mind.tabSearch") }}</span>
        </div>
        <div
          v-if="terminalItems.length > 0"
          class="whiteboard-tab"
          :class="{ active: activeTab === 'terminal' }"
          @click="setActiveTab('terminal')"
        >
          <MoreOutlined />
          <span>{{ t("mind.tabTerminal") }}</span>
        </div>
      </div>

      <!-- 白板内容 -->
      <div class="whiteboard-content-area">
        <!-- 空状态 -->
        <div
          v-if="searchItems.length === 0 && terminalItems.length === 0"
          class="empty-state"
        >
          <p>{{ t("common.noData") }}</p>
        </div>
        <!-- 搜索内容 -->
        <div
          v-if="activeTab === 'search' && !selectedSearchItem"
          class="search-list"
        >
          <div
            v-for="(item, index) in searchItems"
            :key="index"
            class="search-item search-item-row"
            @click="selectSearchItem(item, index)"
          >
            <SearchOutlined class="search-icon" />
            <span class="search-title-ellipsis" :title="item.query">{{
              item.query
            }}</span>
            <span
              class="terminal-meta"
              :class="{
                'meta-pending': item?.state === 'calling',
                'meta-success': item?.state === 'success',
                'meta-error':
                  item && item.state !== 'calling' && item.state !== 'success',
              }"
            >
              {{ getSearchListText(item) }}
            </span>
          </div>
        </div>
        <!-- 搜索详情 -->
        <div
          v-if="activeTab === 'search' && selectedSearchItem"
          class="search-detail"
        >
          <div class="detail-header">
            <a-button type="text" size="small" @click="backToSearchList">
              <LeftOutlined />
            </a-button>
            <span class="detail-title">{{ selectedSearchItem.query }}</span>
          </div>
          <div class="detail-content">
            <div>
              <div
                v-for="(result, index) in getSearchResults(selectedSearchItem)"
                :key="index"
                class="search-result-item"
              >
                <h5>{{ result.title }}</h5>
                <a :href="result.url" target="_blank" class="search-url">{{
                  result.url
                }}</a>
                <a-typography-paragraph
                  :ellipsis="{ rows: 2, expandable: false }"
                  class="search-content"
                >
                  {{ result.content }}
                </a-typography-paragraph>
              </div>
            </div>
          </div>
        </div>
        <!-- 终端内容 -->
        <div
          v-if="activeTab === 'terminal' && !selectedTerminalItem"
          class="terminal-list"
        >
          <div
            v-for="(item, index) in terminalItems"
            :key="index"
            class="terminal-item terminal-item-row"
            :class="{
              'terminal-item-clickable': canClickTerminalItem(item),
              'terminal-item-disabled': !canClickTerminalItem(item),
            }"
            @click="
              canClickTerminalItem(item) && selectTerminalItem(item, index)
            "
            style="min-width: 0"
          >
            <MoreOutlined class="terminal-icon" />
            <span
              class="terminal-title-ellipsis"
              :title="
                item?.mcpName
                  ? `${item.mcpName}: ${item.apiName}`
                  : item?.apiName
              "
            >
              <template v-if="item?.mcpName">{{ item.mcpName }}: </template
              >{{ item?.apiName }}
            </span>
            <span
              class="terminal-meta"
              :class="{
                'meta-error':
                  item?.isError === true || item?.status === 'error',
                'meta-pending': item?.status === 'pending',
                'meta-no-result': !item?.isError && !item?.result,
                'meta-success': !item?.isError && item?.result,
              }"
            >
              {{ getTerminalStatus(item) }}
            </span>
          </div>
        </div>
        <!-- 终端详情 -->
        <div
          v-if="activeTab === 'terminal' && selectedTerminalItem"
          class="terminal-detail"
        >
          <div class="detail-header">
            <a-button type="text" size="small" @click="backToTerminalList">
              <LeftOutlined />
            </a-button>
            <span class="detail-title">
              <template v-if="selectedTerminalItem.mcpName"
                >{{ selectedTerminalItem.mcpName }}: </template
              >{{ selectedTerminalItem.apiName }}
            </span>
          </div>
          <div class="detail-content">
            <a-collapse>
              <a-collapse-panel
                key="arguments"
                :header="t('mind.callArguments')"
              >
                <template #extra>
                  <a-button
                    type="text"
                    size="small"
                    @click.stop="copyArguments"
                    :title="t('common.copy')"
                  >
                    <CopyOutlined />
                  </a-button>
                </template>
                <vue-json-pretty
                  :data="selectedTerminalItem.arguments"
                  :show-length="true"
                  :deep="3"
                />
              </a-collapse-panel>
              <a-collapse-panel
                v-if="selectedTerminalItem.result"
                key="result"
                :header="t('mind.execResult')"
              >
                <template #extra>
                  <a-button
                    type="text"
                    size="small"
                    @click.stop="copyResult"
                    :title="t('common.copy')"
                  >
                    <CopyOutlined />
                  </a-button>
                </template>
                <vue-json-pretty
                  :data="selectedTerminalItem.result"
                  :show-length="true"
                  :deep="3"
                />
              </a-collapse-panel>
              <a-collapse-panel
                v-else-if="
                  selectedTerminalItem.error ||
                  selectedTerminalItem.errorMessage
                "
                key="error"
                :header="t('mind.execError')"
              >
                <template #extra>
                  <a-button
                    type="text"
                    size="small"
                    @click.stop="copyError"
                    :title="t('common.copy')"
                  >
                    <CopyOutlined />
                  </a-button>
                </template>
                <div class="error-content">
                  {{
                    selectedTerminalItem.error ||
                    selectedTerminalItem.errorMessage
                  }}
                </div>
              </a-collapse-panel>
            </a-collapse>
            <div
              v-if="
                !selectedTerminalItem.result &&
                !selectedTerminalItem.error &&
                !selectedTerminalItem.errorMessage
              "
              class="terminal-no-result"
            >
              <p>{{ t("mind.noResult") }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from "vue";
import {
  SearchOutlined,
  MoreOutlined,
  CloseOutlined,
  LeftOutlined,
  CopyOutlined,
} from "@ant-design/icons-vue";
// @ts-ignore
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useI18n } from "vue-i18n";
import { ToolCallStateEnum } from "@/types";
import { notification } from "ant-design-vue";
const { t } = useI18n();

const props = defineProps({
  thinkingItems: Array,
  searchItems: {
    type: Array as () => any[],
    default: () => [],
  },
  terminalItems: {
    type: Array as () => any[],
    default: () => [],
  },
});

// 计算搜索结果（仅在 success 时统计）
const getSearchResults = (item: any) => {
  console.log("getSearchResults", item);

  if (!item || item.state !== ToolCallStateEnum.SUCCESS || !item.result)
    return [];
  try {
    const result: any[] = [];
    if (item.result && Array.isArray(item.result)) {
      for (const serachItem of item.result) {
        if (serachItem.type === "text") {
          try {
            const parsed = JSON.parse(serachItem.text);
            // 直接合并
            if(parsed.search_results){
              result.push(...parsed.search_results);
            }
          } catch {}
        }
      }
    }
    console.log('result',result);
    
    return result;
  } catch {
    return [];
  }
};

const getSearchResultsCount = (item: any) => {
  return getSearchResults(item).length;
};

// 搜索列表展示文案
const getSearchListText = (item: any) => {
  console.log("item->", item);

  if (!item) return t("mind.unknownStatus");
  if (item.state === ToolCallStateEnum.CALLING) return t("mind.pending");
  if (item.state === ToolCallStateEnum.STOP) return t("mind.stopped");
  if (item.state === ToolCallStateEnum.SUCCESS) {
    const count = getSearchResultsCount(item);
    return `${count} ${t("mind.resultCount")}`;
  }
  if (item.state === ToolCallStateEnum.ERROR) return t("mind.execError");
  console.log("getSearchListText", item.state);

  return t("mind.unknownStatus");
};

defineEmits(["close"]);

const activeTab = ref("search");
const selectedSearchItem = ref<any>(null);
const selectedTerminalItem = ref<any>(null);

const setActiveTab = (tab: string) => {
  activeTab.value = tab;
  selectedSearchItem.value = null;
  selectedTerminalItem.value = null;
};
const selectSearchItem = (item: any, index: number) => {
  selectedSearchItem.value = { ...item, index };
};
const backToSearchList = () => {
  selectedSearchItem.value = null;
};
const selectTerminalItem = (item: any, index: number) => {
  selectedTerminalItem.value = { ...item, index };
};
const backToTerminalList = () => {
  selectedTerminalItem.value = null;
};
const canClickTerminalItem = (item: any) => {
  return (
    item?.state === ToolCallStateEnum.CALLING ||
    item?.state === ToolCallStateEnum.SUCCESS ||
    item?.state === ToolCallStateEnum.ERROR ||
    item?.state === ToolCallStateEnum.STOP
  );
};
const getTerminalStatus = (item: any) => {
  if (!item) return t("mind.unknownStatus");
  if (item.state === ToolCallStateEnum.ERROR) return t("mind.execError");
  if (item.state === ToolCallStateEnum.CALLING) return t("mind.pending");
  if (item.state === ToolCallStateEnum.STOP) return t("mind.stopped");
  if (item.state === ToolCallStateEnum.SUCCESS)
    return item?.result ? t("mind.hasResult") : t("mind.noResult");
  return t("mind.unknownStatus");
};

watchEffect(() => {
  const searchItems: any[] = props.searchItems ?? [];
  const terminalItems: any[] = props.terminalItems ?? [];
  const hasSearch = Array.isArray(searchItems) && searchItems.length > 0;
  const hasTerminal = Array.isArray(terminalItems) && terminalItems.length > 0;
  if (!hasSearch && hasTerminal) {
    activeTab.value = "terminal";
  } else if (hasSearch && !hasTerminal) {
    activeTab.value = "search";
  }
  if (selectedSearchItem.value) {
    const searchExists = searchItems.find(
      (item) => item?.toolCallId === selectedSearchItem.value?.toolCallId
    );
    if (!searchExists) {
      selectedSearchItem.value = null;
    }
  }
  if (selectedTerminalItem.value) {
    const terminalExists = terminalItems.find(
      (item) => item?.toolCallId === selectedTerminalItem.value?.toolCallId
    );
    if (!terminalExists) {
      selectedTerminalItem.value = null;
    }
  }
});

// 暴露清空方法给父组件
const clearAll = () => {
  selectedSearchItem.value = null;
  selectedTerminalItem.value = null;
  const searchItems: any[] = props.searchItems ?? [];
  const terminalItems: any[] = props.terminalItems ?? [];
  if (searchItems.length > 0) {
    activeTab.value = "search";
  } else if (terminalItems.length > 0) {
    activeTab.value = "terminal";
  }
};
// 根据toolCallId定位并选中对应的项目
const locateByToolCallId = (stepType: string, toolCallId: string) => {
  const searchItems: any[] = props.searchItems ?? [];
  const terminalItems: any[] = props.terminalItems ?? [];
  if (stepType === "search") {
    activeTab.value = "search";
    const searchIndex = searchItems.findIndex(
      (item) => item?.toolCallId === toolCallId
    );
    if (searchIndex !== -1) {
      selectSearchItem(searchItems[searchIndex], searchIndex);
    }
  } else if (stepType === "terminal") {
    activeTab.value = "terminal";
    const terminalIndex = terminalItems.findIndex(
      (item) => item?.toolCallId === toolCallId
    );
    if (terminalIndex !== -1) {
      selectTerminalItem(terminalItems[terminalIndex], terminalIndex);
    }
  }
};

defineExpose({ clearAll, locateByToolCallId });

// 复制功能
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    notification.success({
      message: t("common.copySuccess"),
      description: t("common.copyToClipboard"),
    });
  } catch (error) {
    notification.error({
      message: t("common.copyFailed"),
      description: t("common.cannotCopyToClipboard"),
    });
  }
};

const copyArguments = async () => {
  const args = selectedTerminalItem.value?.arguments;
  if (args == null) return;
  const text = typeof args === "string" ? args : JSON.stringify(args, null, 2);
  await copyText(text);
};

const copyResult = async () => {
  const result = selectedTerminalItem.value?.result;
  if (result == null) return;
  const text =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);
  await copyText(text);
};

const copyError = async () => {
  const text =
    selectedTerminalItem.value?.error ||
    selectedTerminalItem.value?.errorMessage;
  if (!text) return;
  await copyText(String(text));
};
</script>

<style scoped lang="scss">
.whiteboard-content {
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  // border-radius: 16px;
  overflow: hidden;
  border-left: 1px solid $border-color;
  background-color: $main-bg;
}
.whiteboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-radius: 16px 16px 0 0;
  .header-title {
    color: $primary-color;
    font-size: 16px;
    font-weight: 600;
  }
  .ant-btn {
    color: $text-color;
    &:hover {
      color: $primary-color;
      border-color: $primary-color;
    }
  }
}
.whiteboard-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  color: $text-color;
  overflow: hidden;
}
.whiteboard-tabs {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid $border-color;
}
.whiteboard-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  background-color: $main-bg;
  color: $text-color;
  transition: all 0.3s ease;
  border-radius: 20px;
  border: 1px solid $border-color;
  width: fit-content;
  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
  &.active {
    color: $primary-color;
    background-color: $primary-bg;
    border-color: $primary-color;
  }
  .anticon {
    font-size: 14px;
  }
  span {
    font-size: 13px;
    font-weight: 500;
  }
}
.whiteboard-content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: $text-color;
  p {
    margin: 0;
    font-size: 14px;
    opacity: 0.6;
  }
}
.search-list,
.terminal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search-item-row,
.terminal-item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid $border-color;
  cursor: pointer;
  transition: all 0.3s ease;
  color: $text-color;
  min-width: 0;
  &:hover {
    color: $primary-color;
    border-color: $primary-color;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .search-icon,
  .terminal-icon {
    color: $primary-color;
    font-size: 16px;
    flex-shrink: 0;
  }
  .search-title-ellipsis,
  .terminal-title-ellipsis {
    font-size: 14px;
    margin-right: 8px;
    flex: 2;
    min-width: 0;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }
  .search-meta-count {
    font-size: 12px;
    color: $primary-color;
    background: rgba(30, 156, 255, 0.1);
    border-radius: 8px;
    padding: 2px 8px;
    margin-right: 12px;
    flex-shrink: 0;
    display: inline-block;
  }
  .search-time,
  .terminal-time {
    font-size: 12px;
    color: $text-color;
    flex-shrink: 0;
    white-space: nowrap;
  }
}
.terminal-item-row {
  &.terminal-item-clickable {
    &:hover {
      border-color: $primary-color;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
  &.terminal-item-disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background-color: #f5f5f5;
    border-color: #d9d9d9;
    &:hover {
      background-color: #f5f5f5;
      border-color: #d9d9d9;
      transform: none;
      box-shadow: none;
    }
  }
}
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 16px;
}
.detail-title {
  font-size: 14px;
  font-weight: 400;
  color: $text-color;
  // line-height: 1.6;
}
.detail-content {
  flex: 1;
  overflow-y: auto;
}

.search-result-item {
  margin-bottom: 20px;
  padding: 16px;
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
.terminal-meta {
  font-size: 12px;
  border-radius: 8px;
  padding: 2px 8px;
  margin-right: 12px;
  flex-shrink: 0;
  display: inline-block;
  &.meta-success {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
  }
  &.meta-error {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
  }
  &.meta-pending {
    color: #faad14;
    background: rgba(250, 173, 20, 0.1);
  }
  &.meta-no-result {
    color: #8c8c8c;
    background: rgba(140, 140, 140, 0.1);
  }
}
.error-content {
  padding: 16px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  color: #a8071a;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
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
</style>
