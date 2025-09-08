<template>
  <div class="slide-content">
    <!-- Logo区域（展开状态） -->
    <div class="logo-section">
      <div class="logo">
        <img src="@/assets/logo/logo-mind.png" alt="Logo" />
        <span class="logo-text">{{ appTitle }}</span>
        <span class="beta-tag">{{ t("common.beta") || "Beta" }}</span>
      </div>
    </div>

    <!-- 新任务按钮 -->
    <div class="new-task-section">
      <a-button class="new-task-btn" @click="$emit('new-task')" type="primary">
        <PlusOutlined />
        <span>{{ t("chat.newTask") }}</span>
      </a-button>
    </div>

    <!-- Tab栏 -->
    <div class="tab-container">
      <a-tabs
        v-model:activeKey="activeTabKey"
        size="small"
        :tabBarStyle="{ margin: 0, padding: '0 20px' }"
      >
        <template #tabBarExtraContent>
          <!-- 历史会话tab显示搜索按钮 -->
          <a-button
            v-if="activeTabKey === TabType.HISTORY"
            class="search-btn"
            @click="$emit('show-all-history')"
            type="text"
            size="small"
          >
            <SearchOutlined />
          </a-button>
          <!-- 角色管理tab显示添加角色按钮 -->
          <a-button
            v-if="activeTabKey === TabType.ROLES"
            class="add-role-btn"
            @click="addNewRole"
            type="text"
            size="small"
          >
            <PlusOutlined />
          </a-button>
        </template>

        <a-tab-pane
          :key="TabType.HISTORY"
          :tab="t('chat.historyConversations')"
        >
          <div class="tab-content">
            <ChatRecordList
              ref="chatRecordListRef"
              :auto-load="true"
              :conversation-id="conversationId"
              @record-click="$emit('select-chat', $event)"
            />
          </div>
        </a-tab-pane>

        <a-tab-pane :key="TabType.ROLES" :tab="t('role.title')">
          <div class="tab-content">
            <div class="role-section">
              <!-- 角色列表 -->
              <div class="role-list">
                <a-dropdown
                  v-for="(role, index) in sortedRolesList"
                  :key="role.id"
                  :trigger="['contextmenu']"
                  placement="bottomLeft"
                >
                  <div
                    @click="selectRole(role)"
                    class="role-item"
                    :class="{ 
                      active: selectedRole?.id === role.id,
                      pinned: role.pinned 
                    }"
                  >
                    <div class="normal-mode">
                      <div class="role-info">
                        <div class="role-name" :title="role.name">
                          <!-- 置顶图标 -->
                          <PushpinOutlined
                            v-if="role.pinned"
                            class="pin-icon"
                          />
                          <!-- MCP图标，当角色有MCP列表时显示 -->
                          <ToolOutlined
                            v-if="
                              role.mcpList &&
                              Array.isArray(role.mcpList) &&
                              role.mcpList.length > 0
                            "
                            class="mcp-icon"
                          />
                          {{ role.name }}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <template #overlay>
                    <a-menu @click="({ key }) => handleRoleMenuClick(key, role, index)">
                      <a-menu-item key="pin">
                        <PushpinOutlined style="margin-right: 8px;" />
                        <span>{{ role.pinned ? t('common.unpin') : t('common.pin') }}</span>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="edit">
                        <EditOutlined style="margin-right: 8px;" />
                        <span>{{ t('common.edit') }}</span>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="delete" danger>
                        <DeleteOutlined style="margin-right: 8px;" />
                        <span>{{ t('common.delete') }}</span>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>

                <div v-if="rolesList.length === 0" class="empty-state">
                  <span class="empty-text">暂无角色</span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 底部header区域 -->
    <div class="header-section">
      <Header />
    </div>

    <!-- 折叠按钮 -->
    <a-button
      class="collapse-btn"
      @click="$emit('toggle-sidebar')"
      type="text"
      size="small"
    >
      <MenuFoldOutlined />
    </a-button>

    <!-- 角色设置模态框 -->
    <RoleModal
      v-model:open="roleModalVisible"
      :current-role="currentEditingRole"
      @confirm="handleRoleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  PlusOutlined,
  MenuFoldOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  PushpinOutlined,
} from "@ant-design/icons-vue";

// Tab类型枚举
enum TabType {
  HISTORY = "history",
  ROLES = "roles",
}
import { ChatRecordList } from "@/components/chatRecord";
import Header from "@/components/header/UserMenu.vue";
import { RoleModal } from "@/components/modal";
import { useModelStore } from "@/store/model";
import { useRoleStore } from "@/store/role";
import type { Role } from "@/store/role";
import ModelConfigPanel from "@/components/model/ModelConfigPanel.vue";
import { storeToRefs } from "pinia";
import { Modal } from "ant-design-vue";

const { t } = useI18n();

defineProps({
  conversationId: String,
  appTitle: String,
});

defineEmits([
  "new-task",
  "show-all-history",
  "select-chat",
  "refresh-chat-list",
  "toggle-sidebar",
]);

// 添加对聊天记录列表的引用
const chatRecordListRef = ref();

// 当前激活的tab
const activeTabKey = ref<TabType>(TabType.HISTORY);

// 模型store
const modelStore = useModelStore();

// 角色store
const roleStore = useRoleStore();
const { rolesList, addRole, removeRole, updateRole, togglePinRole, getSortedRolesList } = roleStore;
const { selectedRole } = storeToRefs(roleStore);

// 获取排序后的角色列表
const sortedRolesList = computed(() => getSortedRolesList());

// 角色模态框
const roleModalVisible = ref(false);
const currentEditingRole = ref<Role | null>(null);

// 刷新聊天列表方法
const refreshChatList = () => {
  if (chatRecordListRef.value?.refresh) {
    chatRecordListRef.value.refresh();
  }
};

const selectRole = (role: Role) => {
  if (selectedRole.value?.id === role.id) {
    roleStore.selectRole(null); // 取消选中
  } else {
    roleStore.selectRole(role); // 选中
  }
};

// 角色相关方法
const addNewRole = () => {
  currentEditingRole.value = null; // 新建模式
  roleModalVisible.value = true;
};

const editRole = (role: Role) => {
  currentEditingRole.value = role;
  roleModalVisible.value = true;
};

const deleteRole = (index: number) => {
  removeRole(index);
};

const handleRoleConfirm = (role: Role) => {
  console.log("更新角色", role);
  if (currentEditingRole.value) {
    // 编辑模式
    const index = rolesList.findIndex(
      (r) => r.id === currentEditingRole.value?.id
    );
    if (index !== -1) {
      updateRole(index, role);
    }
  } else {
    // 新建模式
    addRole({
      name: role.name,
      prompt: role.prompt,
      mcpList: role.mcpList,
    });
  }
  currentEditingRole.value = null;
};

// 角色右键菜单处理
const handleRoleMenuClick = (key: string, role: Role, index: number) => {
  switch (key) {
    case 'pin':
      // 切换置顶状态
      togglePinRole(role.id);
      break;
    case 'edit':
      editRole(role);
      break;
    case 'delete':
      // 显示删除确认对话框
      Modal.confirm({
        title: t('role.deleteRole'),
        content: t('role.deleteRoleDesc', { name: role.name }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => {
          // 找到角色在原始列表中的索引
          const originalIndex = rolesList.findIndex(r => r.id === role.id);
          if (originalIndex !== -1) {
            deleteRole(originalIndex);
          }
        }
      });
      break;
  }
};

// 暴露方法给父组件
defineExpose({
  refreshChatList,
});
</script>

<style scoped lang="scss">
.slide-content {
  position: relative;
  width: 280px;
  height: 100%;
  background-color: $secondary-bg;
  color: $text-color;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}
.logo-section {
  padding: 20px;
  border-bottom: 1px solid $border-color;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  img {
    width: 28px;
    height: 28px;
  }
  .logo-text {
    font-size: 22px;
    font-weight: 600;
    color: $primary-color;
    transition: opacity 0.3s ease;
  }
  .beta-tag {
    background-color: $primary-color;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    margin-left: 8px;
  }
}
.new-task-section {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .new-task-btn {
    width: 100%;
  }
}
.tab-container {
  height: calc(100% - 200px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;

    .ant-tabs-content-holder {
      flex: 1;
      overflow: hidden;
    }

    .ant-tabs-tabpane {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .ant-tabs-tab {
      color: $text-color !important;
      font-size: 14px;

      &.ant-tabs-tab-active {
        color: $primary-color !important;
      }
    }

    .ant-tabs-ink-bar {
      background-color: $primary-color;
    }
    .ant-tabs-content {
      margin-top: 12px;
      height: 100%;
    }
  }
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 20px 0;

  .search-btn {
    color: $text-color;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      color: $primary-color;
      background-color: rgba(0, 123, 255, 0.1);
    }
  }
}

.tab-content {
  flex: 1;
  padding: 0 20px 12px;
  overflow: hidden;

  :deep(.chat-record-list) {
    height: 100%;
    overflow-y: auto;
  }
}
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: $text-color;
  .loading-text {
    font-size: 12px;
  }
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  .empty-text {
    font-size: 13px;
    color: $text-color;
    opacity: 0.6;
  }
}
.header-section {
  position: absolute;
  bottom: 16px;
  left: 16px;
}
.collapse-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: $text-color;
  background-color: $main-bg;
  border: 1px solid $border-color;
  border-radius: 6px;
  &:hover {
    color: $primary-color;
    border-color: $primary-color;
  }
}

// 模型参数设置样式
.model-params-container {
  .param-item {
    margin-bottom: 18px;

    &:last-child {
      margin-bottom: 0;
    }

    .param-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: $text-color;

      .param-title {
        display: flex;
        align-items: center;
        gap: 6px;

        .param-help-icon {
          font-size: 12px;
          color: $text-color;
          opacity: 0.6;
          cursor: help;
          transition: all 0.2s ease;

          &:hover {
            opacity: 1;
            color: $primary-color;
          }
        }
      }

      .param-value {
        font-size: 12px;
        color: $primary-color;
        background-color: rgba($primary-color, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
    }

    // 滑块样式
    :deep(.ant-slider) {
      margin: 8px 0;

      .ant-slider-rail {
        background-color: rgba($border-color, 0.3);
      }

      .ant-slider-track {
        background-color: $primary-color;
      }

      .ant-slider-handle {
        border-color: $primary-color;

        &:hover,
        &:focus {
          border-color: $primary-color;
          box-shadow: 0 0 0 4px rgba($primary-color, 0.2);
        }
      }
    }

    // 数字输入框样式
    :deep(.ant-input-number) {
      background-color: $main-bg;
      border-color: $border-color;
      color: $text-color;

      &:hover {
        border-color: $primary-color;
      }

      &:focus {
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba($primary-color, 0.2);
      }

      .ant-input-number-input {
        color: $text-color;
      }

      .ant-input-number-handler-wrap {
        background-color: $secondary-bg;
        border-left-color: $border-color;

        .ant-input-number-handler {
          color: $text-color;
          border-color: $border-color;

          &:hover {
            color: $primary-color;
          }
        }
      }
    }
  }
}

// 折叠面板样式
:deep(.ant-collapse) {
  background-color: transparent;
  // border: none;
  height: 100%;
  overflow: auto;
  padding-right: 3px;

  .ant-collapse-item {
    // border: none !important;
    border-radius: 12px !important;
    // margin-bottom: 0 !important;
    background-color: $main-bg;
    margin-bottom: 6px;

    .ant-collapse-header {
      color: $text-color;
      font-weight: 550;
      .ant-collapse-arrow {
        color: $text-color;
      }
    }
  }
}

// 参数面板样式
.param-item {
  margin-bottom: 16px;

  .param-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .param-label {
      flex: 1;
      margin-right: 8px;
    }

    &.stream-row {
      margin-bottom: 0;
    }
  }

  .param-title {
    display: flex;
    align-items: center;
    gap: 4px;

    .param-help-icon {
      color: $text-color;
      opacity: 0.6;
      font-size: 12px;
    }
  }

  .param-value {
    color: $primary-color;
    font-size: 12px;
    opacity: 0.8;
    margin-left: 8px;
    min-width: 12px;
    text-align: right;
  }

  .param-control-row {
    display: flex;
    align-items: center;
    margin-top: 8px;
  }
}

// 角色面板样式
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .edit-btn {
    color: $text-color;
    opacity: 0.6;
    transition: all 0.2s ease;

    &:hover {
      opacity: 1;
      color: $primary-color;
    }
  }
}

.role-section {
  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-color;
    }

    .add-role-btn {
      color: $primary-color;
      transition: all 0.2s ease;

      &:hover {
        background-color: rgba($primary-color, 0.1);
      }
    }
  }

  .role-list {
    .role-item {
      margin-bottom: 8px;
      border-radius: 8px;
      background-color: $main-bg;
      border: 1px solid $border-color;
      transition: all 0.3s ease;
      color: $text-color;
      position: relative;

      &:hover {
        border-color: $primary-color;
        color: $primary-color;
      }

      &.active {
        border-color: $primary-color;
        color: $primary-color;
      }

      &.pinned {
        .pin-icon {
          color: #faad14;
          margin-right: 6px;
          font-size: 12px;
        }
      }

              .normal-mode {
          display: flex;
          align-items: center;
          padding: 12px;
          cursor: pointer;

          .role-info {
            flex: 1;
            min-width: 0;

            .role-name {
              font-size: 14px;
              font-weight: 500;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;

              //padding-left: 20px; // 为图标留出空间

              .mcp-icon {
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 12px;
                color: $primary-color;
                opacity: 0.8;
              }
            }
          }
        }
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      .empty-text {
        font-size: 13px;
        color: $text-color;
        opacity: 0.6;
      }
    }
  }
}
</style>
