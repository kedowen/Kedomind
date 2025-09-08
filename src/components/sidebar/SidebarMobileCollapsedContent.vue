<template>
  <div class="mobile-collapsed-bar">
    <div class="mobile-button-group">
      <a-button class="mobile-btn" @click="$emit('toggle-sidebar')" type="text">
        <MenuUnfoldOutlined />
      </a-button>
      <a-button class="add-btn" @click="$emit('new-task')" type="primary">
        <PlusOutlined />
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MenuUnfoldOutlined, PlusOutlined } from "@ant-design/icons-vue";

defineEmits(["toggle-sidebar", "new-task"]);
</script>

<style scoped lang="scss">


.mobile-collapsed-bar {
  z-index: 2;
  position: fixed;
  top: 40px;
  left: 8px;
}

.mobile-button-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: $text-color;
  transition: all 0.3s;
  border-radius: 8px;
  margin: 0 2px;

  &:hover {
    color: $primary-color;
    transform: translateY(-1px);
  }

  .anticon {
    font-size: 16px;
  }
}
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  transition: all 0.3s;
  border-radius: 8px;
  margin: 0 2px;
}
</style>
