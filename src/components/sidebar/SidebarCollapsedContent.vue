<template>
  <div class="collapsed-content">
    <!-- 折叠状态下的logo区域 -->
    <div class="logo-section">
      <div class="logo">
        <img src="@/assets/logo/logo-mind.png" alt="Logo" />
      </div>
    </div>
    <!-- 新任务按钮（仅图标） -->
    <a-button class="new-task-btn-collapsed" @click="$emit('new-task')" type="primary" shape="circle">
      <PlusOutlined />
    </a-button>
    <!-- 底部header区域 -->
    <div class="header-section-collapsed">
      <Header />
    </div>
    <!-- 展开按钮 -->
    <a-button class="collapse-btn collapse-btn-bottom" @click="$emit('toggle-sidebar')" type="text" size="small">
      <MenuUnfoldOutlined />
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons-vue';
import Header from '@/components/header/UserMenu.vue';

defineProps({
  appTitle: String,
});

defineEmits(['toggle-sidebar', 'new-task']);
</script>

<style scoped lang="scss">


.collapsed-content {
  position: relative;
  width: 60px;
  height: 100%;
  background-color: $secondary-bg;
  color: $text-color;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.logo-section {
  padding: 20px 10px 0 10px;
  display: flex;
  justify-content: center;
  border-bottom: none;
}
.logo {
  display: flex;
  align-items: center;
  img {
    width: 28px;
    height: 28px;
  }
}
.new-task-btn-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px auto 0 auto;
  width: 32px;
  height: 32px;
  font-size: 14px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.header-section-collapsed {
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
}
.collapse-btn {
  position: absolute;
  bottom: 16px;
  right: 50%;
  transform: translateX(50%);
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
</style> 