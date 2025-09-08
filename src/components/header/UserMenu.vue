<template>
  <div class="user-menu">
    <a-dropdown>
      <a-avatar class="user-avatar">
        {{ getUserDisplayName() }}
      </a-avatar>
      <template #overlay>
        <a-menu @click="handleMenuClick">
          <a-menu-item key="1">
            <UserOutlined /> {{ userStore.getUserName || "user" }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="payment">
            <CreditCardOutlined /> {{ t("payment.title") }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="model-settings">
            <div class="menu-item-content">
              <RobotOutlined />
              {{ t("header.modelSettings") }}
            </div>
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="settings">
            <SettingOutlined /> {{ t("header.systemSettings") }}
          </a-menu-item>
          <a-menu-divider />
          <a-menu-item key="logout">
            <LogoutOutlined /> {{ t("header.logout") }}
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <!-- 设置Modal -->
    <SettingModal v-model:open="showSettingsModal" />
    <!-- 模型设置Modal -->
    <ModelConfigModal v-model:open="showModelConfigModal" />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, inject, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import { useUserStore, useLanguageStore, useConversationStore } from "@/store";
import { useStorage } from "@/hooks";
import { useI18n } from "vue-i18n";
import { SettingModal, ModelConfigModal } from "@/components/modal/index";
import {
  UserOutlined,
  BulbOutlined,
  RobotOutlined,
  SlidersOutlined,
  SettingOutlined,
  CreditCardOutlined,
  LogoutOutlined,
} from "@ant-design/icons-vue";

const props = defineProps({
  title: {
    type: String,
    default: "聊天会话",
  },
});

const router = useRouter();
const userStore = useUserStore();
const languageStore = useLanguageStore();
const conversationStore = useConversationStore();
const storage = useStorage();
const showSettingsModal = ref(false);
const showModelConfigModal = ref(false);
const { t } = useI18n();

// 计算正在处理的会话数量
const processingCount = computed(() => {
  return conversationStore.processingConversations.length;
});
// 获取用户显示名称的首字母
const getUserDisplayName = () => {
  const userName = userStore.getUserName;
  if (userName) {
    return userName.charAt(0).toUpperCase();
  }
  return "U";
};

// 处理菜单点击
const handleMenuClick = ({ key }) => {
  if (key === "payment") {
    router.push("/payment");
  } else if (key === "settings") {
    showSettingsModal.value = true;
  } else if (key === "model-settings") {
    showModelConfigModal.value = true;
  } else if (key === "logout") {
    handleLogout();
  }
};

// 退出登录
const handleLogout = () => {
  Modal.confirm({
    title: t("header.confirmLogout"),
    content: t("header.logoutConfirm"),
    okText: t("common.confirm"),
    cancelText: t("common.cancel"),
    onOk() {
      // 清除本地存储
      storage.clearAll();

      // 清除用户状态
      userStore.clearUserInfo();

      // 清除会话存储
      sessionStorage.removeItem("needLoginFromPath");

      message.success(t("header.logoutSuccess"));

      // 跳转到登录页
      router.replace("/login");
    },
  });
};
</script>

<style lang="scss" scoped>
.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .processing-status {
    position: relative;
    display: flex;
    align-items: center;
    background-color: #52c41a;
    border-radius: 12px;
    padding: 2px 8px;
    
    .processing-count {
      font-size: 12px;
      font-weight: 600;
      color: white;
      margin-right: 4px;
    }
    
    .processing-pulse {
      width: 6px;
      height: 6px;
      background-color: white;
      border-radius: 50%;
      animation: processingPulse 1.5s ease-in-out infinite;
    }
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: $primary-color;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(47, 192, 255, 0.2);
  }
}

// 处理状态指示器动画
@keyframes processingPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.8);
  }
}
</style>
