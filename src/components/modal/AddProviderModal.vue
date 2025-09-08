<template>
  <MoveModal
    v-model:open="openModel"
    title="添加提供商"
    :width="400"
    @ok="handleConfirm"
    @cancel="handleCancel"
    :confirm-loading="loading"
  >
    <div class="add-provider-content">
      <div class="form-item">
        <label class="form-label">提供商名称</label>
        <a-input
          v-model:value="providerName"
          placeholder="请输入提供商名称"
          size="large"
          @keyup.enter="handleConfirm"
        />
      </div>
      
      <!-- 模型配置区域 -->
      <div class="form-item">
        <label class="form-label">模型配置</label>
        <div class="config-panel-wrapper">
          <ModelConfigPanel v-model="providerConfig" />
        </div>
      </div>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref, defineModel, watch } from 'vue';
import { message } from 'ant-design-vue';
import { MoveModal } from './index';
import type { Provider } from '@/types';
import { getDefaultModelConfig } from '@/store/model';
import ModelConfigPanel from '@/components/model/ModelConfigPanel.vue';

// Modal显示状态
const openModel = defineModel<boolean>("open");

// 表单数据
const providerName = ref<string>('');
const providerConfig = ref(getDefaultModelConfig());
const loading = ref<boolean>(false);

// 生成随机ID
const generateRandomId = (): string => {
  return 'na' + Math.random().toString(36).substr(2, 9);
};

// 定义emit
const emit = defineEmits<{
  confirm: [provider: Provider]
}>();

// 处理确认
const handleConfirm = async () => {
  if (!providerName.value.trim()) {
    message.error('请输入提供商名称');
    return;
  }

  loading.value = true;
  
  const newProvider: Provider = {
    id: generateRandomId(),
    name: providerName.value.trim(),
    icon: '',
    enabled: false,
    apiKey: '',
    apiUrl: '',
    keyLink: '',
    models: [],
    config: providerConfig.value
  };

  // 通过emit发送确认事件
  emit('confirm', newProvider);
  
  // 重置表单并关闭模态框
  providerName.value = '';
  openModel.value = false;
  
  loading.value = false;
};

// 处理取消
const handleCancel = () => {
  providerName.value = '';
  providerConfig.value = getDefaultModelConfig();
  openModel.value = false;
};

// 监听模态框打开状态，重置表单
watch(openModel, (newVal) => {
  if (newVal) {
    providerName.value = '';
    providerConfig.value = getDefaultModelConfig();
  }
});
</script>

<style lang="scss" scoped>
.add-provider-content {
  .form-item {
    margin-bottom: 20px;
    
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: $text-color;
      margin-bottom: 8px;
    }
  }
  
  .config-panel-wrapper {
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: 16px;
    background-color: $secondary-bg;
  }
}
</style> 