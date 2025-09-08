<template>
  <div>
    <a-modal
      v-model:open="isOpen"
      ref="modalRef"
      :mask="true"
      :mask-style="{
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(2px)',
      }"
      :maskClosable="true"
      :destroyOnClose="true"
      @ok="handleOk"
      v-bind="$attrs"
      class="custom-modal"
    >
      <template #title>
        <div
          ref="modalTitleRef"
          style="width: 100%; cursor: move"
          class="modal-title"
        >
          {{ title }}
        </div>
      </template>
      <template #extra>
        <slot name="extra"></slot>
      </template>
      <slot></slot>
      <template #modalRender="{ originVNode }">
        <div :style="transformStyle">
          <component :is="originVNode" />
        </div>
      </template>
      <div class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </a-modal>
  </div>
</template>
<script lang="ts" setup>
import {
  ref,
  computed,
  CSSProperties,
  watch,
  watchEffect,
  useAttrs,
  defineModel,
  onMounted,
} from "vue";
import { useDraggable } from "@vueuse/core";

const open = ref<boolean>(false);
const modalTitleRef = ref<HTMLElement | null>(null);
const modalRef = ref<HTMLElement | null>(null);

defineProps<{
  title: string;
}>();

const isOpen = defineModel<boolean>("open");

const showModal = () => {
  open.value = true;
};

const { x, y, isDragging } = useDraggable(modalTitleRef);

const handleOk = (e: MouseEvent) => {
  console.log(e);
  open.value = false;
};

const startX = ref<number>(0);
const startY = ref<number>(0);
const startedDrag = ref(false);
const transformX = ref(0);
const transformY = ref(0);
const preTransformX = ref(0);
const preTransformY = ref(0);
const dragRect = ref({ left: 0, right: 0, top: 0, bottom: 0 });

watch([x, y], () => {
  if (!startedDrag.value) {
    startX.value = x.value;
    startY.value = y.value;
    const bodyRect = document.body.getBoundingClientRect();
    const titleRect = modalTitleRef.value?.getBoundingClientRect();
    if (titleRect) {
      dragRect.value.right = bodyRect.width - titleRect.width;
      dragRect.value.bottom = bodyRect.height - titleRect.height;
    }
    preTransformX.value = transformX.value;
    preTransformY.value = transformY.value;
  }
  startedDrag.value = true;
});

watch(isDragging, () => {
  if (!isDragging) {
    startedDrag.value = false;
  }
});

watchEffect(() => {
  if (startedDrag.value) {
    transformX.value =
      preTransformX.value +
      Math.min(Math.max(dragRect.value.left, x.value), dragRect.value.right) -
      startX.value;
    transformY.value =
      preTransformY.value +
      Math.min(Math.max(dragRect.value.top, y.value), dragRect.value.bottom) -
      startY.value;
  }
});

const transformStyle = computed<CSSProperties>(() => {
  return {
    transform: `translate(${transformX.value}px, ${transformY.value}px)`,
  };
});
</script>

<style lang="scss" scoped>
:deep(.custom-modal) {
  .ant-modal-content {
    background-color: #f8f9fa;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .ant-modal-header {
    background-color: #f8f9fa;
    border-bottom: 1px solid #eaeaea;
    padding: 16px 24px;
    margin-bottom: 0;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .ant-modal-body {
    padding: 20px 24px;
  }

  .ant-modal-footer {
    border-top: 1px solid #eaeaea;
    padding: 16px 24px;
    margin-top: 8px;
  }

  .ant-btn-primary {
    background-color: #2fc0ff;
    border-color: #2fc0ff;

    &:hover,
    &:focus {
      background-color: #28a7e0;
      border-color: #28a7e0;
    }

    &[disabled],
    &[disabled]:hover {
      background-color: #b5e3fa;
      border-color: #b5e3fa;
    }
  }

  .ant-modal-close {
    color: #999;

    &:hover {
      color: #666;
    }
  }
}
.modal-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
