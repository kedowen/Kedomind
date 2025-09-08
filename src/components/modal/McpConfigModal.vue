<template>
  <MoveModal
    v-model:open="isOpen"
    :title="t('mcp.mcpServiceConfiguration')"
    width="1200px"
    :footer="null"
    :bodyStyle="{ padding: 0, height: '700px' }"
    @cancel="handleModalCancel"
  >
    <div class="mcp-config">
      <div class="mcp-config-content">
        <a-spin :spinning="loading">
          <!-- 编辑表单 -->
          <div v-if="showEditForm" class="mcp-config-edit-form">
            <a-tabs
              v-model:value="activeTab"
              class="mcp-config-edit-form-body"
              :tabBarStyle="{ padding: '0 16px', margin: '0' }"
              size="large"
            >
              <template #tabBarExtraContent>
                <div class="mcp-config-edit-form-actions">
                  <a-button @click="handleCancelEdit">{{
                    t("common.cancel")
                  }}</a-button>
                  <a-button type="primary" @click="handleSave">
                    {{ formMode === "add" ? t("mcp.add") : t("mcp.save") }}
                  </a-button>
                </div>
              </template>
              <a-tab-pane :key="'general'" :tab="t('mcp.general')">
                <a-form
                  class="mcp-config-edit-form-body-tab-content"
                  layout="vertical"
                  :model="formData"
                  :rules="rules"
                  ref="formRef"
                >
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item :label="t('mcp.name')" name="name" required>
                        <a-input
                          v-model:value="formData.name"
                          :placeholder="t('mcp.mcpServer')"
                        />
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item :label="t('mcp.type')" name="type" required>
                        <a-select
                          v-model:value="formData.type"
                          style="width: 100%"
                          :options="typeOptions"
                        />
                      </a-form-item>
                    </a-col>
                  </a-row>
                  <a-form-item :label="t('mcp.description')" name="desc">
                    <a-textarea
                      v-model:value="formData.description"
                      :placeholder="t('mcp.descriptionPlaceholder')"
                      :auto-size="{ minRows: 3, maxRows: 5 }"
                    />
                  </a-form-item>
                  <!-- 根据类型显示不同的字段 -->
                  <template v-if="formData.type === McpConfigItemType.STDIO">
                    <a-form-item
                      :label="t('mcp.command')"
                      name="command"
                      required
                    >
                      <a-input
                        v-model:value="formData.command"
                        :placeholder="'uvx or npx'"
                      />
                    </a-form-item>
                    <a-form-item :label="t('mcp.params')" name="params">
                      <a-textarea
                        v-model:value="formData.params"
                        :placeholder="'arg1\narg2'"
                        :auto-size="{ minRows: 2, maxRows: 5 }"
                      />
                    </a-form-item>
                    <a-form-item :label="t('mcp.env')" name="env">
                      <a-textarea
                        v-model:value="formData.env"
                        :placeholder="'KEY1=value1\nKEY2=value2'"
                        :auto-size="{ minRows: 2, maxRows: 5 }"
                      />
                    </a-form-item>
                  </template>
                  <template v-else>
                    <a-form-item label="Url" name="url" required>
                      <a-input
                        v-model:value="formData.url"
                        :placeholder="t('mcp.urlPlaceholder')"
                      />
                    </a-form-item>
                  </template>

                  <a-form-item
                    v-if="formData.type !== McpConfigItemType.STDIO"
                    :label="t('mcp.requestHeaders')"
                    name="headers"
                  >
                    <a-textarea
                      v-model:value="formData.headers"
                      :placeholder="'Content-Type=application/json\nAuthorization=Bearer token'"
                      :auto-size="{ minRows: 3, maxRows: 5 }"
                    />
                  </a-form-item>

                  <a-form-item
                    :label="t('mcp.timeout')"
                    name="timeout"
                    required
                  >
                    <a-input-number
                      v-model:value="formData.timeout"
                      :min="1"
                      :max="300"
                      style="width: 100px"
                    />
                    <span style="margin-left: 8px; color: #8c8c8c">{{
                      t("mcp.timeoutSeconds")
                    }}</span>
                  </a-form-item>
                </a-form>
              </a-tab-pane>
              <a-tab-pane
                :key="'tools'"
                :tab="t('mcp.tools')"
                force-render
                v-if="formData.tools && formData.tools.length > 0"
              >
                <div class="mcp-config-edit-form-body-tab-content">
                  <a-collapse collapsible="header">
                    <a-collapse-panel
                      v-for="tool in formData.tools"
                      :key="tool.name"
                    >
                      <template #header>
                        <div>
                          <span
                            class="mcp-config-edit-form-body-tab-content-tool-name"
                            >{{ tool.name }}</span
                          >
                        </div>
                        <div
                          class="mcp-config-edit-form-body-tab-content-tool-desc"
                        >
                          <a-typography-paragraph
                            :ellipsis="{
                              rows: 2,
                              expandable: true,
                              symbol: '展开',
                            }"
                            :content="tool.description"
                          >
                          </a-typography-paragraph>
                        </div>
                      </template>
                      <div
                        class="mcp-config-edit-form-body-tab-content-tool-schemas"
                      >
                        <!-- 输入参数 -->
                        <div class="schema-section">
                          <h4 class="input-schema-title">输入参数</h4>
                          <a-descriptions bordered :column="1">
                            <a-descriptions-item
                              v-for="(paramValue, paramKey) in tool.inputSchema
                                .properties"
                              :key="paramKey"
                              :span="4"
                              :labelStyle="{ width: '25%' }"
                              :contentStyle="{ width: '75%' }"
                            >
                              <template #label>
                                <div>
                                  {{ paramKey }}
                                  <span
                                    v-if="
                                      tool.inputSchema.required &&
                                      tool.inputSchema.required.includes(
                                        paramKey
                                      )
                                    "
                                    class="required-mark"
                                    >*</span
                                  >
                                </div>
                              </template>
                              <div>
                                <a-badge
                                  status="processing"
                                  :text="paramValue.type"
                                />
                                <div class="param-description">
                                  <a-typography-paragraph
                                    :ellipsis="{
                                      rows: 2,
                                      expandable: true,
                                      symbol: '展开',
                                    }"
                                  >
                                    {{ paramValue.description }}
                                  </a-typography-paragraph>
                                </div>
                                <div v-if="paramValue.enum" class="param-enum">
                                  可选值: {{ paramValue.enum.join(", ") }}
                                </div>
                                <div
                                  v-if="paramValue.default !== undefined"
                                  class="param-default"
                                >
                                  默认值: {{ paramValue.default }}
                                </div>
                              </div>
                            </a-descriptions-item>
                          </a-descriptions>
                        </div>

                        <!-- 输出参数 -->
                        <div
                          v-if="tool.outputSchema"
                          class="schema-section output-schema-section"
                        >
                          <h4 class="output-schema-title">输出参数</h4>
                          <a-descriptions bordered :column="1">
                            <a-descriptions-item
                              v-for="(paramValue, paramKey) in tool.outputSchema
                                .properties"
                              :key="paramKey"
                              :span="4"
                              :labelStyle="{ width: '25%' }"
                              :contentStyle="{ width: '75%' }"
                            >
                              <template #label>
                                <div>
                                  {{ paramKey }}
                                  <span
                                    v-if="
                                      tool.outputSchema.required &&
                                      tool.outputSchema.required.includes(
                                        paramKey
                                      )
                                    "
                                    class="required-mark"
                                    >*</span
                                  >
                                </div>
                              </template>
                              <div>
                                <a-badge
                                  status="success"
                                  :text="paramValue.type"
                                />
                                <div class="param-description">
                                  <a-typography-paragraph
                                    :ellipsis="{
                                      rows: 1,
                                      expandable: true,
                                      symbol: '展开',
                                      tooltip: false,
                                    }"
                                    style="margin: 0"
                                  >
                                    {{ paramValue.description }}
                                  </a-typography-paragraph>
                                </div>
                              </div>
                            </a-descriptions-item>
                          </a-descriptions>
                        </div>
                      </div>
                    </a-collapse-panel>
                  </a-collapse>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>

          <!-- 服务列表 -->
          <template v-else>
            <a-tabs v-model:activeKey="activeTabKey" class="mcp-config-tabs">
              <!-- 我的标签页 -->
              <a-tab-pane key="my" :tab="t('mcp.my')">
                <div v-if="mcpList.length === 0" class="mcp-config-empty">
                  <div class="mcp-config-empty-content">
                    <p class="mcp-config-empty-text">
                      {{ t("mcp.noMCPService") }}
                    </p>
                    <a-button type="primary" @click="handleAddServer">{{
                      t("mcp.addFirstService")
                    }}</a-button>
                    <a-button
                      type="text"
                      :loading="loading"
                      @click="handleSyncAll"
                    >
                      <SyncOutlined /> {{ "同步" }}
                    </a-button>
                  </div>
                </div>

                <div v-else class="mcp-config-list-container">
                  <!-- 固定头部：已选择数量和添加更多MCP按钮 -->
                  <div class="mcp-config-list-header">
                    <div class="selected-info">
                      <span
                        v-if="selectedMcpItems.length > 0"
                        class="selected-count"
                      >
                        {{
                          t("mcp.selectedServices", [selectedMcpItems.length])
                        }}
                      </span>
                      <span
                        v-if="selectedMcpItems.length > 0"
                        @click="handleClearSelection"
                        class="clear-selection-btn"
                      >
                        {{ t("mcp.clearSelection") }}
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px">
                      <a-button
                        type="text"
                        :loading="loading"
                        @click="handleSyncAll"
                      >
                        <SyncOutlined /> {{ "同步" }}
                      </a-button>
                      <a-dropdown>
                        <a-button type="link" class="add-more-btn">
                          {{ t("mcp.addMoreMCP") }}
                        </a-button>
                        <template #overlay>
                          <a-menu @click="handleMenuClick">
                            <a-menu-item key="quick">
                              <PlusOutlined />
                              {{ t("mcp.quickCreate") }}
                            </a-menu-item>
                            <a-menu-item key="json">
                              <CodeOutlined />
                              {{ t("mcp.jsonCreate") }}
                            </a-menu-item>
                          </a-menu>
                        </template>
                      </a-dropdown>
                    </div>
                  </div>

                  <!-- 可滚动的列表区域 -->
                  <div class="mcp-config-list-scroll">
                    <div class="mcp-config-list">
                      <div
                        class="mcp-config-list-item"
                        :class="{
                          selected: isItemSelected(item),
                        }"
                        v-for="(item, index) in mcpList"
                        :key="item.name + index"
                        @click="handleItemClick(item, index)"
                      >
                        <!-- 中间内容 -->
                        <div class="item-content">
                          <div class="item-header">
                            <div class="item-title">{{ item.name }}</div>
                            <span class="item-type">{{ item.type }}</span>
                          </div>
                          <div class="item-desc">
                            <span class="desc-text">{{
                              item.description || t("mcp.noDescription")
                            }}</span>
                            <span class="tools-info">
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.NOT_CONNECTED
                                "
                                class="status-not-connected"
                              >
                                <DisconnectOutlined />
                                <span>未连接</span>
                              </span>
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECTING
                                "
                                class="status-connecting"
                              >
                                <LoadingOutlined />
                                <span>连接中...</span>
                              </span>
                              <a-tooltip
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECT_FAILED
                                "
                                :title="item.error"
                                placement="bottom"
                              >
                                <span class="error-text">错误</span>
                              </a-tooltip>
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECTED
                                "
                                class="tools-count"
                              >
                                {{ item.tools && item.tools.length }}个工具
                              </span>
                            </span>
                          </div>
                        </div>

                        <!-- 操作按钮组（hover时显示）：编辑 / 删除 / 重连 -->
                        <div class="item-actions item-actions-abs">
                          <a-tooltip :title="t('mcp.edit')">
                            <a-button
                              type="text"
                              @click.stop="handleEdit(item, index)"
                              class="action-btn edit-btn"
                              size="small"
                            >
                              <EditOutlined />
                            </a-button>
                          </a-tooltip>

                          <a-popconfirm
                            :title="t('mcp.confirmDelete')"
                            :ok-text="t('common.confirm')"
                            :cancel-text="t('common.cancel')"
                            @confirm="handleDelete(index)"
                          >
                            <a-tooltip :title="t('mcp.delete')">
                              <a-button
                                type="text"
                                @click.stop
                                class="action-btn delete-btn"
                                size="small"
                              >
                                <DeleteOutlined />
                              </a-button>
                            </a-tooltip>
                          </a-popconfirm>

                          <a-tooltip :title="'重连'">
                            <a-button
                              type="text"
                              @click.stop="reconnectMcpItem(item, index)"
                              class="action-btn retry-btn"
                              size="small"
                            >
                              <ReloadOutlined />
                            </a-button>
                          </a-tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </a-tab-pane>

              <!-- 市场标签页 -->
              <a-tab-pane key="market" :tab="t('mcp.market')">
                <div v-if="marketMcpList.length === 0" class="mcp-config-empty">
                  <div class="mcp-config-empty-content">
                    <p class="mcp-config-empty-text">
                      {{ t("mcp.noMarketService") }}
                    </p>
                  </div>
                </div>

                <div v-else class="mcp-config-list-container">
                  <!-- 可滚动的列表区域 -->
                  <div class="mcp-config-list-scroll">
                    <div class="mcp-config-list">
                      <div
                        class="mcp-config-list-item market-item"
                        v-for="(item, index) in marketMcpList"
                        :key="item.name + index"
                      >
                        <!-- 添加按钮 - 绝对定位到右上角 -->
                        <div
                          v-if="
                            item.connectStatus === McpConnectStatus.CONNECTED &&
                            item.tools &&
                            item.tools.length > 0
                          "
                          class="item-actions item-actions-abs"
                        >
                          <a-tooltip :title="t('mcp.add')">
                            <a-button
                              type="text"
                              @click.stop="handleAddFromMarket(item, index)"
                              class="action-btn add-btn"
                              size="small"
                            >
                              <PlusOutlined />
                            </a-button>
                          </a-tooltip>
                        </div>

                        <!-- 中间内容 -->
                        <div class="item-content">
                          <div class="item-header">
                            <div class="item-title">{{ item.name }}</div>
                            <span class="item-type">{{ item.type }}</span>
                          </div>
                          <div class="item-desc">
                            <span class="desc-text">{{
                              item.description || t("mcp.noDescription")
                            }}</span>
                            <span class="tools-info">
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.NOT_CONNECTED
                                "
                                class="status-not-connected"
                              >
                                <DisconnectOutlined />
                                <span>未连接</span>
                              </span>
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECTING
                                "
                                class="status-connecting"
                              >
                                <LoadingOutlined />
                                <span>连接中...</span>
                              </span>
                              <a-tooltip
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECT_FAILED
                                "
                                :title="item.error"
                              >
                                <span class="error-text">错误</span>
                              </a-tooltip>
                              <span
                                v-if="
                                  item.connectStatus ===
                                  McpConnectStatus.CONNECTED
                                "
                                class="tools-count"
                              >
                                {{ item.tools && item.tools.length }}个工具
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>
          </template>
        </a-spin>
      </div>
      <!-- 移除底部确认区域 -->
    </div>
  </MoveModal>

  <!-- JSON 编辑器 Modal -->
  <JsonEditorModal
    v-model:open="showJsonEditorModal"
    @refresh="loadMyMcpData(true)"
  />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, toRaw } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import {
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  LoadingOutlined,
  DisconnectOutlined,
  DownOutlined,
  CodeOutlined,
  ReloadOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";
import { MoveModal, JsonEditorModal } from "./index";
import JsonEditor from "@/components/jsonEditor/index.vue";
import {
  createMcpServer,
  updateMcpServer,
  deleteMcpServer,
  getMcpServerList,
  awaitWrapper,
  getUserMcpList,
} from "@/api";
import { useMcp } from "@/hooks";
import { mcpConfigLocal } from "@/local/mcpConfigLocal";
import { McpConfigItem, McpConfigItemType, McpConnectStatus } from "@/types";
import { useUserStore } from "@/store";

const { t } = useI18n();
const {
  getToolsByMcpConfig,
  convertToFrontendParams,
  convertToBackendParams,
  addMcpConfig,
  updateMcpConfig,
  getMcpConfigList,
  deleteMcpConfig,
} = useMcp();
const { getUserId } = useUserStore();

// 定义组件接口
const isOpen = defineModel<boolean>("open");
const selectedMcpItems = defineModel<McpConfigItem[]>("selectedMcpItems", {
  default: () => [],
});

// 状态管理
const loading = ref(false);
const showEditForm = ref(false);
const editingIndex = ref(-1);
const formRef = ref();
const formMode = ref<"add" | "edit">("edit");
const activeTab = ref<"general" | "tools">("general");
const activeTabKey = ref<string>("my");
const showJsonEditorModal = ref(false);

// 表单数据
const formData = reactive<McpConfigItem>({} as McpConfigItem);

const mcpList = ref<McpConfigItem[]>([]);
const marketMcpList = ref<McpConfigItem[]>([]);
const typeOptions = ref([
  { label: "http", value: McpConfigItemType.HTTP },
  { label: "stdio", value: McpConfigItemType.STDIO },
  { label: "sse", value: McpConfigItemType.SSE },
]);

// 表单校验规则
const rules = {
  title: [
    { required: true, message: t("mcp.nameRequired"), trigger: "blur" },
    { min: 1, max: 50, message: t("mcp.nameLengthLimit"), trigger: "blur" },
  ],
  type: [{ required: true, message: t("mcp.typeRequired"), trigger: "change" }],
  url: [
    { required: true, message: t("mcp.urlRequired"), trigger: "blur" },
    {
      pattern: /^https?:\/\/.+/,
      message: t("mcp.invalidURL"),
      trigger: "blur",
    },
  ],
  command: [
    { required: true, message: t("mcp.commandRequired"), trigger: "blur" },
  ],
  params: [
    { required: true, message: t("mcp.paramsRequired"), trigger: "blur" },
  ],
  timeout: [
    { required: true, message: t("mcp.timeoutRequired"), trigger: "blur" },
    {
      type: "number",
      min: 1,
      max: 300,
      message: t("mcp.timeoutRange"),
      trigger: "blur",
    },
  ],
};

// 重置表单数据
const resetFormData = () => {
  Object.assign(formData, {
    name: "",
    description: "",
    type: "",
    url: "",
    command: "",
    params: "",
    env: "",
    headers: "",
    timeout: 60,
    tools: [],
    error: "",
    connectStatus: McpConnectStatus.NOT_CONNECTED,
  });
};

// 同步已选择的项目，移除无效项目并更新有效项目的信息
const syncSelectedItems = () => {
  if (selectedMcpItems.value.length === 0) return;

  const validSelectedItems: McpConfigItem[] = [];

  selectedMcpItems.value.forEach((selectedItem) => {
    // 在新的服务列表中查找对应的项目
    const foundItem = mcpList.value.find((item) => item.id === selectedItem.id);
    if (foundItem) {
      // 如果找到，使用最新的信息
      validSelectedItems.push(foundItem);
    }
    // 如果没找到，说明该项目已被删除，不添加到新的选中列表中
  });

  // 更新选中的项目列表
  selectedMcpItems.value = validSelectedItems;
};

// 服务器类型固定为本地三种：HTTP / STDIO / SSE

// 加载用户MCP服务器列表（使用hook：优先本地，失败回退远程）
const loadUserMcpServers = async () => {
  const [err, res] = (await getMcpConfigList()) as any;
  if (!err && res && res.items) {
    mcpList.value = res.items.map((it: any) => ({ ...it }));
  }
  // 清空所有的选中
  selectedMcpItems.value = [];
};

// 加载市场MCP服务器列表
const loadMarketMcpServers = async () => {
  const [listErr, list] = await awaitWrapper(getMcpServerList());

  if (list && list.data) {
    marketMcpList.value = list.data.map((item: any) => ({
      ...convertToFrontendParams(item),
      mcpServerId: item.mcpServerId,
    }));
    console.log("list", list.data);

    // 异步加载工具信息
    marketMcpList.value.forEach(async (item) => {
      try {
        item.connectStatus = McpConnectStatus.CONNECTING;
        const tools = await getToolsByMcpConfig({
          ...item,
          id: item.mcpServerId,
        });
        item.tools = tools;
        item.connectStatus = McpConnectStatus.CONNECTED;
      } catch (error) {
        item.error = error as string;
        item.tools = [];
        item.connectStatus = McpConnectStatus.CONNECT_FAILED;
        console.error("加载市场MCP工具失败:", error);
      }
    });
  }
};

// 延迟等待函数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 加载我的MCP数据
const loadMyMcpData = async (withDelay: boolean = false) => {
  loading.value = true;

  try {
    // 仅加载用户服务器列表（类型为本地固定值）
    await loadUserMcpServers();
  } catch (error) {
    message.error(t("mcp.loadDataFailed"));
  } finally {
    loading.value = false;
  }
};

// 重连指定的 MCP 服务
const reconnectMcpItem = async (item: McpConfigItem, index: number) => {
  try {
    item.connectStatus = McpConnectStatus.CONNECTING;
    item.error = "" as string;
    const tools = await getToolsByMcpConfig(item);
    item.tools = tools;
    item.connectStatus = McpConnectStatus.CONNECTED;
  } catch (error) {
    item.error = error as string;
    item.tools = [];
    item.connectStatus = McpConnectStatus.CONNECT_FAILED;
  } finally {
    // 持久化更新（本地优先，远程同步）
    await updateMcpConfig(item, true);
  }
};

// 加载市场MCP数据
const loadMarketMcpData = async (withDelay: boolean = false) => {
  try {
    if (withDelay) {
      await delay(2000); // 等待2秒后再加载（后台缓存）
    }
    await loadMarketMcpServers();
  } catch (error) {
    console.error("加载市场MCP数据失败:", error);
    message.error(t("mcp.loadMarketDataFailed"));
  }
};

// 检查item是否被选中
const isItemSelected = (item: McpConfigItem) => {
  return selectedMcpItems.value.some((selected) => selected.id === item.id);
};

// 处理item点击 - 直接更新v-model
const handleItemClick = (item: McpConfigItem, index: number) => {
  // 如果有错误，不允许选中
  if (item.error) {
    return;
  }

  //如果item.tools 不存在 或者长度为0都不能选中
  if (!item.tools || item.tools?.length === 0) {
    return;
  }

  // 切换选中状态，直接更新v-model
  const selectedIndex = selectedMcpItems.value.findIndex(
    (selected) => selected.id === item.id
  );
  if (selectedIndex > -1) {
    selectedMcpItems.value.splice(selectedIndex, 1);
  } else {
    selectedMcpItems.value.push(item);
  }
};

// 清空选择
const handleClearSelection = () => {
  selectedMcpItems.value = [];
};

// 菜单点击事件处理
const handleMenuClick = ({ key }: { key: string }) => {
  if (key === "quick") {
    handleAddServer();
  } else if (key === "json") {
    showJsonEditorModal.value = true;
  }
};

// 添加服务器按钮点击事件
const handleAddServer = () => {
  formMode.value = "add";
  editingIndex.value = -1;
  resetFormData();
  activeTab.value = "general";
  showEditForm.value = true;
};

// 编辑按钮点击事件
const handleEdit = async (item: McpConfigItem, index: number) => {
  formMode.value = "edit";
  editingIndex.value = index;
  console.log("item", item);

  // 将当前项目数据填充到表单
  Object.assign(formData, item);
  showEditForm.value = true;
  activeTab.value = "general";
};

// 取消编辑
const handleCancelEdit = () => {
  showEditForm.value = false;
  editingIndex.value = -1;
  formMode.value = "edit";
  formRef.value?.resetFields();
};

// 保存编辑
const handleSave = async () => {
  try {
    // 表单校验
    await formRef.value?.validate();
    loading.value = true;

    if (formMode.value === "add") {
      // 新增模式
      await addMcpConfig(formData);
      message.success(t("mcp.addServerSuccess"));
      // 移除当前表单数据
      resetFormData();
      // 重新加载列表
      await loadMyMcpData(true);
    } else if (editingIndex.value >= 0) {
      // 编辑模式
      await updateMcpConfig(formData);
      message.success(t("mcp.saveSuccess"));
      // 移除当前表单数据
      resetFormData();
      // 重新加载列表
      await loadMyMcpData(true);
    }
    showEditForm.value = false;
    editingIndex.value = -1;
  } catch (error) {
    console.error("保存失败:", error);
    message.error(t("mcp.addServerFailed"));
  } finally {
    loading.value = false;
  }
};

// 删除服务器
const handleDelete = async (index: number) => {
  loading.value = true;
  try {
    const item = mcpList.value[index];
    await deleteMcpConfig(item.id!);
    message.success(t("common.deleteSuccess"));
    // 重新加载列表
    await loadMyMcpData(true);
  } catch (error) {
    console.error("删除失败:", error);
    message.error(t("common.deleteFailed"));
  } finally {
    loading.value = false;
  }
};

// 从市场添加服务到我的
const handleAddFromMarket = async (item: McpConfigItem, index: number) => {
  loading.value = true;
  try {
    await addMcpConfig(item);
    message.success(t("mcp.addServerSuccess"));
    // 重新加载我的列表
    await loadMyMcpData(true);
    // 切换到我的标签页
    activeTabKey.value = "my";
  } catch (error) {
    console.error("添加市场服务失败:", error);
    message.error(t("mcp.addServerFailed"));
  } finally {
    loading.value = false;
  }
};

// 处理模态框取消
const handleModalCancel = () => {
  isOpen.value = false;
};

// 监听类型变化，重置相关字段
watch(
  () => formData.type,
  (newType) => {
    if (newType === McpConfigItemType.STDIO) {
      // 切换到 stdio 类型时，清空 url 字段
      formData.url = "";
    } else {
      // 切换到其他类型时，清空 command、params 和 env 字段
      formData.command = "";
      formData.params = "";
      formData.env = "";
    }
  }
);

// 监听tab切换
watch(activeTabKey, (newTab) => {
  if (newTab === "market" && marketMcpList.value.length === 0) {
    loadMarketMcpData();
  }
});

// 初始化数据
onMounted(() => {
  loadMyMcpData();
});

// 同步远程配置列表到本地（仅配置，不拉工具）
const handleSyncAll = async () => {
  try {
    loading.value = true;
    const [listErr, list] = await awaitWrapper(
      getUserMcpList({ userId: getUserId })
    );
    if (list && list.data) {
      const remoteItems = list.data.map((item: any) => ({
        ...convertToFrontendParams(item),
        mcpServerId: item.mcpServerId,
      }));

      const userIdStr = String(getUserId);
      for (const cfg of remoteItems) {
        const basePatch = {
          description: cfg.description || "",
          command: cfg.command || "",
          params: cfg.params || "",
          env: cfg.env || "",
          name: cfg.name || "",
          headers: cfg.headers || "",
          timeout: cfg.timeout ?? 60,
          type: cfg.type || "",
          url: cfg.url || "",
          tools: [] as any[],
          error: undefined as any,
          connectStatus: McpConnectStatus.NOT_CONNECTED as any,
        };

        const [updErr] = await mcpConfigLocal.updateMcpConfig({
          userId: userIdStr,
          configId: cfg.id!,
          patch: basePatch,
        });
        if (updErr) {
          await mcpConfigLocal.createMcpConfig({
            id: cfg.id!,
            userId: userIdStr,
            ...basePatch,
          });
        }
      }
      // 刷新界面列表（用远程的最新数据展示）
      mcpList.value = remoteItems;
      message.success("同步成功");
      // 依次调用获取工具
      for (let i = 0; i < remoteItems.length; i++) {
        const item = remoteItems[i];
        reconnectMcpItem(item, i);
      }
    }
  } catch (e) {
    message.error("同步失败");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
// Modal额外操作区域样式
.modal-extra-actions {
  display: flex;
  align-items: center;
  gap: 8px;

  .add-server-btn {
    background: $primary-color;
    border: none;
    border-radius: 6px;
    font-weight: 500;

    &:hover {
      opacity: 0.9;
    }
  }

  .toggle-add-btn {
    border-radius: 6px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;

    &.cancel {
      background: #f5f5f5;
      color: #666;
      border-color: #d9d9d9;
    }
  }
}

.mcp-config {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  // background-color: $main-bg;

  // Tab样式

  // 内容区域
  &-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  // 列表容器样式
  &-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  // 列表头部样式（固定不滚动）
  &-list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .selected-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .selected-count {
        color: $primary-color;
        font-weight: 500;
        font-size: 14px;
      }

      .no-selected {
        color: #999;
        font-size: 14px;
      }

      .clear-selection-btn {
        color: #ff4d4f;
        transition: all 0.3s;

        &:hover {
          cursor: pointer;
          opacity: 0.8;
        }
      }
    }

    .add-more-btn {
      color: $primary-color;
      font-weight: 500;
      padding: 4px 8px;

      &:hover {
        color: $primary-color;
        opacity: 0.8;
      }
    }
  }

  // 可滚动的列表区域
  &-list-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0; // 确保可以正确缩放
  }

  // 头部区域样式（保留原有的用于其他地方）
  &-header {
    display: flex;
    justify-content: flex-end;

    .add-more-btn {
      color: $primary-color;
      font-size: 14px;
      padding: 0;
      height: auto;

      &:hover {
        color: $primary-color;
        opacity: 0.8;
      }
    }
  }

  // 服务列表样式
  &-list {
    padding-top: 2px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    &-item {
      background: $main-bg;
      border: 1px solid $border-color;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      position: relative;
      cursor: pointer;

      &:hover {
        border-color: $primary-color;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

        .item-actions-abs {
          opacity: 1 !important;
          visibility: visible !important;
        }
      }

      // 市场标签页的+号图标常驻显示
      &.market-item .item-actions-abs {
        opacity: 1 !important;
        visibility: visible !important;
      }

      &.selected {
        border-color: $primary-color;
        background: rgba(24, 144, 255, 0.05);

        .selection-indicator {
          background: $primary-color;
          color: white;
        }
      }

      // 选中指示器
      .selection-indicator {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #f5f5f5;
        border: 1px solid #d9d9d9;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s ease;

        .check-icon {
          color: white;
          font-size: 12px;
        }
      }

      // 中间内容
      .item-content {
        flex: 1;
        min-width: 0;

        .item-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;

          .item-title {
            font-size: 15px;
            font-weight: 600;
            color: $text-color;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .item-type {
            font-size: 11px;
            background: #f0f0f0;
            color: #666;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
            flex-shrink: 0;
          }
        }

        .item-desc {
          font-size: 13px;
          color: $text-color;
          line-height: 1.4;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 8px;

          .desc-text {
            flex: 1;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            line-clamp: 2;
          }

          .tools-info {
            flex-shrink: 0;
            display: flex;
            align-items: center;

            .error-text {
              color: #ff4d4f;
              font-size: 12px;
              font-weight: 500;
              cursor: help;
              background: rgba(255, 77, 79, 0.1);
              padding: 2px 8px;
              border-radius: 12px;
              border: 1px solid rgba(255, 77, 79, 0.2);
            }

            .tools-count {
              color: #52c41a;
              font-size: 12px;
              font-weight: 500;
              background: rgba(82, 196, 26, 0.1);
              padding: 2px 8px;
              border-radius: 12px;
              border: 1px solid rgba(82, 196, 26, 0.2);
            }
          }
        }
      }

      // 右侧操作按钮组
      .item-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        // 绝对定位的操作按钮组
        &.item-actions-abs {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
          z-index: 2;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;

          .action-btn {
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: $text-color;
            transition: all 0.2s ease;

            &:hover {
              color: $text-color;
              border-color: $primary-color;
            }

            &.edit-btn:hover {
              background: rgba(24, 144, 255, 0.08);
            }

            &.delete-btn:hover {
              background: rgba(255, 77, 79, 0.08);
              color: #ff4d4f;
            }

            &.add-btn:hover {
              background: rgba(82, 196, 26, 0.08);
              color: #52c41a;
            }
          }
        }
      }

      // 移除重连按钮常亮样式后，无需为其预留位置
    }
  }

  // 编辑表单样式
  &-edit-form {
    // background: $main-bg;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    &-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      :deep(.ant-tabs-content-holder) {
        flex: 1;
        overflow: hidden;
      }

      :deep(.ant-tabs-tabpane) {
        height: 100%;
        overflow: hidden;
      }

      &-tab-content {
        padding: 24px;
        height: 100%;
        overflow-y: auto;

        &-tool {
          &-name {
            font-size: 16px;
            font-weight: 600;
            color: $text-color;
          }
          &-desc {
            font-size: 14px;
            color: $text-color;
          }
          &-params {
            font-size: 14px;
            color: $text-color;
          }

          &-schemas {
            .schema-section {
              margin-bottom: 20px;

              &:last-child {
                margin-bottom: 0;
              }
            }

            .input-schema-title {
              margin-bottom: 12px;
              color: #1890ff;
              font-size: 16px;
              font-weight: 600;
            }

            .output-schema-section {
              margin-top: 20px;
            }

            .output-schema-title {
              margin-bottom: 12px;
              color: #52c41a;
              font-size: 16px;
              font-weight: 600;
            }

            .param-description {
              margin-bottom: 4px;
            }

            .param-enum {
              margin-top: 4px;
              font-size: 12px;
              color: #666;
            }

            .param-default {
              margin-top: 4px;
              font-size: 12px;
              color: #666;
            }

            .required-mark {
              color: #ff4d4f;
              font-size: 18px;
            }
          }
        }
      }
    }

    &-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-right: 16px;

      .ant-btn {
        border-radius: 6px;
        font-weight: 500;
      }
    }

    :deep(.ant-form-item-label) {
      font-weight: 500;
      color: $text-color;
    }

    :deep(.ant-input),
    :deep(.ant-select-selector),
    :deep(.ant-input-number) {
      border-radius: 8px;
      border: 1px solid $border-color;

      &:hover {
        border-color: $primary-color;
      }

      &:focus,
      &.ant-input-focused,
      &.ant-select-focused .ant-select-selector {
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba(30, 156, 255, 0.2);
      }
    }

    :deep(.ant-collapse) {
      background-color: $main-bg;
    }
  }

  // 空状态样式
  &-empty {
    background: $main-bg;
    border-radius: 8px;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
    align-items: center;

    &-content {
      text-align: center;
    }

    &-text {
      font-size: 15px;
      color: $text-color;
      margin-bottom: 20px;
    }
  }

  // 底部按钮区域
  &-footer {
    border-top: 1px solid $border-color;
    padding: 16px 24px;
    background: $main-bg;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .selected-count {
      font-size: 14px;
      color: $text-color;
      font-weight: 500;
    }

    .footer-actions {
      display: flex;
      gap: 12px;

      .ant-btn {
        border-radius: 8px;
        font-weight: 500;
      }
    }
  }

  // 状态样式
  .tools-info {
    .status-not-connected {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #999;
      font-size: 12px;

      .anticon {
        font-size: 12px;
        color: #d9d9d9;
      }
    }

    .status-connecting {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #1890ff;
      font-size: 12px;

      .anticon {
        font-size: 12px;
        color: #1890ff;
      }
    }

    .error-text {
      color: #ff4d4f;
      font-size: 12px;
    }

    .tools-count {
      color: #52c41a;
      font-size: 12px;
      font-weight: 500;
    }
  }
}

:deep(.ant-collapse-header-text) {
  flex: 1 !important;
}
</style>
