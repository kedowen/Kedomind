<template>
  <div class="sidebar">
    <!-- 移动端内容 -->
    <div v-show="isMobile" class="mobile-sidebar">
      <!-- 移动端收起状态 -->
      <SidebarMobileCollapsedContent
        v-if="!isDrawerOpen"
        @toggle-sidebar="toggleDrawer"
        @new-task="$emit('new-task')"
      />
      <!-- 移动端展开状态 -->
      <Drawer
        :open="isDrawerOpen"
        :headerStyle="{ display: 'none' }"
        :footerStyle="{ display: 'none' }"
        :bodyStyle="{ padding: 0 }"
        placement="left"
        width="280px"
        :maskClosable="true"
        :keyboard="true"
        :zIndex="2000"
        @close="toggleDrawer"
      >
        <SidebarExpandedContent
          ref="mobileExpandedContentRef"
          :conversationId="conversationId"
          :appTitle="appTitle"
          @new-task="$emit('new-task')"
          @show-all-history="$emit('show-all-history')"
          @select-chat="handleMobileSelectChat"
          @refresh-chat-list="$emit('refresh-chat-list')"
          @toggle-sidebar="toggleDrawer"
          @delete-active="$emit('delete-active', $event)"
        />
      </Drawer>
    </div>

    <!-- PC端内容 -->
    <div
      v-show="!isMobile"
      class="pc-sidebar"
      :style="{ width: isSidebarCollapsed ? '60px' : '280px' }"
    >
      <div class="sidebar-content-wrapper">
        <SidebarCollapsedContent
          v-if="isSidebarCollapsed"
          :appTitle="appTitle"
          @toggle-sidebar="toggleSlideBar"
          @new-task="$emit('new-task')"
        />
        <SidebarExpandedContent
          v-else
          ref="expandedContentRef"
          :conversationId="conversationId"
          :appTitle="appTitle"
          @new-task="$emit('new-task')"
          @show-all-history="$emit('show-all-history')"
          @select-chat="$emit('select-chat', $event)"
          @refresh-chat-list="$emit('refresh-chat-list')"
          @toggle-sidebar="toggleSlideBar"
          @delete-active="$emit('delete-active', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  SidebarExpandedContent,
  SidebarCollapsedContent,
  SidebarMobileCollapsedContent,
} from "./index";
import { Drawer } from "ant-design-vue";

const props = defineProps({
  conversationId: String,
  appTitle: String,
});

const emits = defineEmits([
  "new-task",
  "show-all-history",
  "select-chat",
  "refresh-chat-list",
  "toggle-sidebar",
  "delete-active",
]);

const isMobile = ref(false);
const isSidebarCollapsed = ref(false);
const isDrawerOpen = ref(false);
const expandedContentRef = ref();
const mobileExpandedContentRef = ref();

function checkMobile() {
  isMobile.value = window.innerWidth <= 1200;
}

function toggleDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value;
}

function handleMobileSelectChat(chat: any) {
  emits("select-chat", chat);
  // 关闭 Drawer
  isDrawerOpen.value = false;
}

function toggleSlideBar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

// 刷新聊天记录列表
const refreshChatList = () => {
  // PC端：只有在侧边栏展开状态下才刷新
  if (!isMobile.value) {
    if (expandedContentRef.value?.refreshChatList) {
      expandedContentRef.value.refreshChatList();
    }
  } else {
    // 移动端：如果抽屉打开且内容可用则刷新
    if (mobileExpandedContentRef.value?.refreshChatList) {
      mobileExpandedContentRef.value.refreshChatList();
    }
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

// 暴露方法给父组件
defineExpose({
  refreshChatList,
});
</script>

<style scoped lang="scss">
.sidebar {
  /* 主容器不需要特殊样式 */
  // height: 100vh;
}

.mobile-sidebar {
  /* 移动端容器，不需要宽度控制 */
}

.pc-sidebar {
  height: 100%;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: $secondary-bg;
  overflow: hidden;
  min-width: 0;
}

.sidebar-content-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
