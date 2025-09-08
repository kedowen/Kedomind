<template>
  <MoveModal
    v-model:open="visible"
    title="角色管理"
    width="1200px"
    @cancel="handleCancel"
    @ok="handleConfirm"
    :confirm-loading="loading"
  >
    <div class="role-modal-container">
      <a-tabs
        v-model:activeKey="activeTab"
        class="role-modal-tabs"
        :tabBarStyle="{ padding: '0 16px', margin: '0' }"
      >
        <a-tab-pane :key="TabKey.PROMPT" tab="提示词设置">
          <div class="role-edit-section">
            <div class="edit-content">
              <div class="config-section">
                <div class="section-title">角色名称</div>
                <a-input
                  v-model:value="editingRole.name"
                  placeholder="请输入角色名称"
                />
              </div>

              <div class="config-section">
                <div class="section-title">角色内容</div>
                <a-textarea
                  v-model:value="editingRole.prompt"
                  placeholder="请输入角色内容"
                  :rows="18"
                />
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane :key="TabKey.MCP" tab="MCP设置">
          <div class="mcp-section">
            <div class="mcp-list-container">
              <div class="mcp-list-scroll">
                <div class="mcp-list">
                  <div
                    class="mcp-list-item"
                    :class="{
                      selected: isMcpSelected(item.id),
                    }"
                    v-for="(item, index) in connectedMcpList"
                    :key="(item.id || '') + index"
                    @click="handleMcpClick(item)"
                  >
                    
                    <div class="item-content">
                      <div class="item-header">
                        <div class="item-title">{{ item.name }}</div>
                        <span class="item-type">{{ item.type }}</span>
                      </div>
                      <div class="item-desc">
                        <span class="desc-text">{{
                          item.description || "暂无描述"
                        }}</span>
                        <span class="tools-info">
                          <span class="tools-count">
                            {{ item.tools && item.tools.length }}个工具
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-if="connectedMcpList.length === 0" class="mcp-empty">
                    <a-empty description="暂无已连接的MCP服务" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { message } from "ant-design-vue";

import { useRoleStore } from "@/store/role";
import type { Role } from "@/store/role";
import { McpConfigItem, McpConnectStatus } from "@/types";
import { useMcp } from "@/hooks";
import { MoveModal } from "./index";

// 枚举管理 TabKey，避免魔法字符串
enum TabKey {
  PROMPT = 'prompt',
  MCP = 'mcp',
}

interface Props {
  open: boolean;
  currentRole?: Role | null;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "confirm", role: Role): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const roleStore = useRoleStore();
const { addRole, updateRole } = roleStore;

// MCP相关
const { getMcpConfigList } = useMcp();

// 响应式状态
const visible = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const loading = ref(false);
const originalName = ref("");
const activeTab = ref<TabKey>(TabKey.PROMPT);

// 编辑中的角色数据
const editingRole = ref<Role>({
  id: 0,
  name: "",
  prompt: "",
  mcpList: [],
});

// MCP列表
const connectedMcpList = ref<McpConfigItem[]>([]);

// 方法
const handleCancel = () => {
  resetForm();
  visible.value = false;
};

const handleConfirm = async () => {
  if (!editingRole.value.name.trim()) {
    message.warning("角色名称不能为空");
    return;
  }

  loading.value = true;
  try {
    // 通过emit回传数据给父组件
    emit("confirm", editingRole.value);
    visible.value = false;
  } catch (error) {
    console.error("操作失败:", error);
    message.error("操作失败");
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  // 如果传入了当前角色，使用它来初始化表单
  if (props.currentRole) {
    editingRole.value = {
      ...props.currentRole,
      // 深拷贝 mcpList，避免直接修改到原始数据
      mcpList: Array.isArray(props.currentRole.mcpList)
        ? [...props.currentRole.mcpList]
        : [],
    };
    originalName.value = props.currentRole.name;
  } else {
    // 新建模式，使用默认值
    editingRole.value = {
      id: 0,
      name: "",
      prompt: "",
      mcpList: [],
    };
    originalName.value = "";
  }
};

// MCP相关方法
const loadConnectedMcpList = async () => {
  try {
    const result = await getMcpConfigList();
    if (result && Array.isArray(result)) {
      const [error, data] = result;
      if (!error && data && data.items) {
        // 过滤只显示连接成功的MCP
        connectedMcpList.value = data.items.filter(
          (item: McpConfigItem) =>
            item.connectStatus === McpConnectStatus.CONNECTED
        );
      }
    }
    // 验证当前的mcplist是否都存在，有不存在的清除掉
    const mcpList = editingRole.value.mcpList;
    const validMcpList = connectedMcpList.value.filter((item) =>
      mcpList.includes(item.id || "")
    );
    editingRole.value.mcpList = validMcpList.map((item) => item.id || "");
  } catch (error) {
    console.error("加载MCP列表失败:", error);
  }
};

const isMcpSelected = (mcpId: string | undefined) => {
  if (!mcpId) return false;
  return editingRole.value.mcpList.includes(mcpId);
};

const handleMcpClick = (item: McpConfigItem) => {
  if (!item.id) return;

  const index = editingRole.value.mcpList.indexOf(item.id);
  if (index > -1) {
    // 取消选择
    editingRole.value.mcpList.splice(index, 1);
  } else {
    // 选择
    editingRole.value.mcpList.push(item.id);
  }
};

// 监听打开状态
watch(visible, (newValue) => {
  if (newValue) {
    resetForm();
    loadConnectedMcpList();
    // 切换到提示词标签
    activeTab.value = TabKey.PROMPT;
  }
});

// 组件挂载时加载MCP列表
onMounted(() => {
  loadConnectedMcpList();
});
</script>

<style scoped lang="scss">
.role-modal-container {
  height: 600px;
  border-radius: 8px;
}

.role-modal-tabs {
  height: 100%;

  :deep(.ant-tabs-content-holder) {
    height: calc(100% - 48px);
    overflow-y: auto;
    overflow-x: hidden;
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
    padding: 16px;
  }
}

.role-edit-section {
  height: 100%;
  display: flex;
  flex-direction: column;

  .edit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
}

.mcp-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mcp-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.mcp-list-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0; // 确保可以正确缩放
}

.mcp-list {
  padding-top: 2px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.mcp-list-item {
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

  .mcp-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  }
}

.section-header {
  padding: 16px;
  border-bottom: 1px solid $border-color;
}

.config-header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-color;
}

.preset-list-content {
  flex: 1;
  padding: 16px 16px 8px 16px;
  overflow-y: auto;

  .preset-item {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;

    &:hover {
      background-color: $primary-bg;
      border-color: $primary-color;
    }

    &.active {
      background-color: $primary-bg;
      border-color: $primary-color;
    }

    .preset-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      .preset-name {
        font-weight: 500;
        color: $text-color;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .preset-preview {
        font-size: 12px;
        color: $text-color;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  }
}

.preset-list-footer {
  padding: 8px 16px 16px 16px;
  border-top: 1px solid $border-color;

  .add-preset-btn {
    width: 100%;
  }
}

.preset-edit-section {
  flex: 1;
  padding: 16px;
  background-color: $main-bg;
  border: 1px solid $border-color;
  border-left: none;
  border-radius: 0 8px 8px 0;
  overflow-y: auto;
}

.edit-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.config-section {
  .section-title-with-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-color;
      position: relative;

      &::after {
        content: "";
        position: absolute;
        bottom: -4px;
        left: 0;
        width: 40px;
        height: 2px;
        background-color: $primary-color;
        border-radius: 1px;
      }
    }

    .delete-btn {
      color: #ff4d4f;

      &:hover {
        background-color: rgba(255, 77, 79, 0.1);
      }
    }
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: $text-color;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 40px;
      height: 2px;
      background-color: $primary-color;
      border-radius: 1px;
    }
  }
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
