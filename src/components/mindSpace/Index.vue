<template>
  <!-- 右侧白板 -->
  <transition name="whiteboard-slide">
    <Drawer
      v-if="isMobile"
      :open="isOpen"
      :closable="false"
      :headerStyle="{ display: 'none' }"
      :footerStyle="{ display: 'none' }"
      placement="right"
      width="60vw"
      :bodyStyle="{ padding: 0 }"
      :maskClosable="true"
      :keyboard="true"
      :zIndex="2000"
      :getContainer="false"
      style="position: absolute"
      @close="$emit('close')"
    >
      <MindSpaceContent
        :thinkingItems="thinkingItems"
        :searchItems="searchItems"
        :terminalItems="terminalItems"
        @close="$emit('close')"
        ref="contentRef"
      />
    </Drawer>
    <MindSpaceContent
      v-else-if="isOpen"
      style="width: 400px"
      :thinkingItems="thinkingItems"
      :searchItems="searchItems"
      :terminalItems="terminalItems"
      @close="$emit('close')"
      ref="contentRef"
    />
  </transition>
</template>

<script setup lang="ts">
import { ref, watchEffect, onMounted, onUnmounted } from "vue";
import { Drawer } from "ant-design-vue";
import MindSpaceContent from "./MindSpaceContent.vue";

const props = defineProps<{
  isOpen: boolean;
  thinkingItems: any[];
  searchItems: any[];
  terminalItems: any[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const isMobile = ref(false);
function checkMobile() {
  isMobile.value = window.innerWidth <= 1200;
}
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});
onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

const contentRef = ref();

defineExpose({
  clearAll: () => contentRef.value?.clearAll(),
  locateByToolCallId: (...args: any[]) =>
    contentRef.value?.locateByToolCallId(...args),
});
</script>

<style scoped lang="scss">
// 仅保留过渡动画和白板容器样式
.whiteboard-slide-enter-active,
.whiteboard-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.whiteboard-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.whiteboard-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
