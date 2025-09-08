<template>
  <MoveModal
    v-model:open="openModel"
    :title="modalTitle"
    :width="400"
    @ok="handleConfirm"
    @cancel="handleCancel"
    :confirm-loading="loading"
  >
    <div class="add-model-content">
      <div class="form-item">
        <label class="form-label">模型ID</label>
        <a-input
          v-model:value="modelId"
          placeholder="请输入模型ID"
          size="large"
          @keyup.enter="handleConfirm"
        />
      </div>
      <div class="form-item">
        <label class="form-label">模型名称</label>
        <a-input
          v-model:value="modelName"
          placeholder="请输入模型名称"
          size="large"
          @keyup.enter="handleConfirm"
        />
      </div>      
      <!-- 模型配置区域 -->
      <div class="form-item">
        <label class="form-label">模型配置</label>
        <div class="config-panel-wrapper">
          <ModelConfigPanel v-model="modelConfig" />
        </div>
      </div>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref, defineModel, watch, computed } from 'vue';
import { message } from 'ant-design-vue';
import { MoveModal } from './index';
import type { Model, ModelTag } from '@/types';
import { getDefaultModelConfig } from '@/store/model';
import ModelConfigPanel from '@/components/model/ModelConfigPanel.vue';

// Modal显示状态
const openModel = defineModel<boolean>("open");

// 编辑模式相关
const props = defineProps<{
  editModel?: Model | null;
  providerConfig?: any; // 当前提供商的配置
}>();

// 表单数据
const modelId = ref<string>('');
const modelName = ref<string>('');
const selectedTags = ref<ModelTag[]>([]);
const modelConfig = ref(getDefaultModelConfig());
const loading = ref<boolean>(false);

// 预定义标签选项
const tagOptions = [
  { label: '推荐', value: '推荐' },
  { label: '最新', value: '最新' },
  { label: '经济', value: '经济' },
  { label: '高级', value: '高级' },
  { label: '实验性', value: '实验性' }
];

// 定义emit
const emit = defineEmits<{
  confirm: [model: Model]
}>();

// 计算属性：是否为编辑模式
const isEditMode = computed(() => !!props.editModel);

// 计算属性：模态框标题
const modalTitle = computed(() => isEditMode.value ? '编辑模型' : '添加模型');

// 处理标签变化
const handleTagChange = (tags: ModelTag[]) => {
  selectedTags.value = tags;
};

// 处理确认
const handleConfirm = async () => {
  if (!modelId.value.trim()) {
    message.error('请输入模型ID');
    return;
  }

  if (!modelName.value.trim()) {
    message.error('请输入模型名称');
    return;
  }

  loading.value = true;
  
  const newModel: Model = {
    id: modelId.value.trim(),
    name: modelName.value.trim(),
    icon: '',
    config: modelConfig.value
  };

  // 通过emit发送确认事件
  emit('confirm', newModel);
  
  // 重置表单并关闭模态框
  modelId.value = '';
  modelName.value = '';
  selectedTags.value = [];
  modelConfig.value = getDefaultModelConfig();
  openModel.value = false;
  
  loading.value = false;
};

// 处理取消
const handleCancel = () => {
  modelId.value = '';
  modelName.value = '';
  selectedTags.value = [];
  modelConfig.value = getDefaultModelConfig();
  openModel.value = false;
};

// 监听模态框打开状态和编辑模型变化，重置或填充表单
watch([openModel, () => props.editModel], ([newOpenVal, newEditModel]) => {
  if (newOpenVal) {
    if (newEditModel && isEditMode.value) {
      // 编辑模式：填充现有数据
      modelId.value = newEditModel.id;
      modelName.value = newEditModel.name;
      modelConfig.value = { ...newEditModel.config };
    } else {
      // 添加模式：使用提供商配置或默认配置
      modelId.value = '';
      modelName.value = '';
      modelConfig.value = props.providerConfig ? { ...props.providerConfig } : getDefaultModelConfig();
    }
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.add-model-content {
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