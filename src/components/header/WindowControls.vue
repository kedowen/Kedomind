<template>
  <div class="window-controls">
    <div class="window-controls-container">
      <div class="window-controls-left">
        <!-- <div class="window-title">KedoMind</div> -->
      </div>
      <div class="window-controls-right">
        <div
          class="control-button devtools-btn"
          @click="handleOpenDevTools"
          title="打开调试器"
        >
          <BugOutlined />
        </div>
        <div
          class="control-button minimize-btn"
          @click="handleMinimize"
          title="最小化"
        >
          <MinusOutlined />
        </div>

        <div
          class="control-button maximize-btn"
          @click="handleMaximize"
          :title="isMaximized ? '还原' : '最大化'"
        >
          <CompressOutlined v-if="isMaximized" />
          <BorderOutlined v-else />
        </div>
        <div
          class="control-button close-btn"
          @click="handleClose"
          title="最小化到托盘"
        >
          <CloseOutlined />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  MinusOutlined,
  BorderOutlined,
  CloseOutlined,
  CompressOutlined,
  BugOutlined,
} from "@ant-design/icons-vue";

const isMaximized = ref(false);

const handleMinimize = () => {
  if (window.electronAPI) {
    window.electronAPI.windowMinimize();
  }
};

const handleMaximize = () => {
  if (window.electronAPI) {
    window.electronAPI.windowMaximize();
  }
};

const handleClose = () => {
  if (window.electronAPI) {
    window.electronAPI.windowClose(); // 这会隐藏到托盘
  }
};

const handleOpenDevTools = () => {
  console.log('调试器按钮被点击');
  if (window.electronAPI) {
    console.log('electronAPI 可用，调用 openDevTools');
    window.electronAPI.openDevTools();
  } else {
    console.log('electronAPI 不可用');
  }
};

// 监听窗口状态变化
onMounted(async () => {
  if (window.electronAPI) {
    // 获取初始窗口状态
    try {
      const state = await window.electronAPI.getWindowState();
      isMaximized.value = state.isMaximized;
    } catch (error) {
      console.error("获取窗口状态失败:", error);
    }

    // 监听窗口状态变化
    window.electronAPI.onWindowStateChange((event, state) => {
      isMaximized.value = state.isMaximized;
    });
  }
});
</script>

<style scoped lang="scss">
.window-controls {
  width: 100%;
  height: 32px;
  background-color: $secondary-bg;
  // border-bottom: 1px solid $border-color;
  -webkit-app-region: drag; // 允许拖拽窗口
  user-select: none;
}

.window-controls-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
}

.window-controls-left {
  display: flex;
  align-items: center;

  .window-title {
    font-size: 14px;
    font-weight: 500;
    color: $text-color;
    margin-left: 8px;
  }
}

.window-controls-right {
  z-index:99999;
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag; // 按钮区域不允许拖拽
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: $text-color;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: $text-color;
  }

  .anticon {
    font-size: 12px;
  }
}

.minimize-btn {
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.maximize-btn {
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.devtools-btn {
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.close-btn {
  &:hover {
    background-color: #ff4d4f;
    color: #ffffff;
  }
}
</style>
