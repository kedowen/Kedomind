<template>
  <MoveModal
    v-model:open="isOpen"
    @cancel="handleCancel"
    :title="t('model.modelSettings')"
    :footer="null"
    width="1200px"
    :bodyStyle="{ padding: 0, height: '700px' }"
  >
    <div class="model-config-container">
      <!-- 左侧模型列表 -->
      <div class="provider-list">
        <div class="provider-list-header">
          <div class="provider-list-content">
            <div
              v-for="provider in modelStore.providers || []"
              :key="provider.id"
              class="model-provider-item"
              :class="{ active: selectedProvider?.id === provider.id }"
              @click="selectProvider(provider)"
            >
              <div class="provider-icon">
                <img
                  v-if="getProviderIcon(provider)"
                  :src="getProviderIcon(provider)!"
                  :alt="provider.name"
                />
                <div v-else class="provider-icon-text">
                  {{ getProviderInitial(provider) }}
                </div>
              </div>
              <div class="provider-info">
                <div class="provider-name">{{ provider.name }}</div>
                <div
                  class="provider-status"
                  :class="provider.enabled ? 'connected' : 'disconnected'"
                >
                  {{ provider.enabled ? "ON" : "OFF" }}
                </div>
              </div>
            </div>
            <a-button
              class="add-provider-btn"
              type="dashed"
              @click="addProvider"
            >
              <PlusOutlined />
              {{ t('model.addProvider') }}
            </a-button>
          </div>
        </div>
      </div>

      <!-- 右侧配置区域 -->
      <div class="model-config">
        <div v-if="selectedProvider" class="config-content">
          <div class="config-header">
            <div class="provider-title">{{ selectedProvider.name }}</div>
            <a-switch 
              v-model:checked="selectedProvider.enabled" 
              @change="handleProviderToggle"
            />
          </div>

          <!-- API配置区域 -->
          <div class="config-section">
            <div class="section-title">{{ t('model.apiKey') }}</div>
            <a-form layout="vertical">
              <a-form-item>
                <a-input-group compact>
                  <a-input-password
                    v-model:value="selectedProvider.apiKey"
                    :placeholder="t('model.enterApiKey')"
                    @change="onApiConfigChange"
                  />
                </a-input-group>
              </a-form-item>

              <a-form-item>
                <div class="section-title">{{ t('model.apiUrl') }}</div>
                <a-input
                  v-model:value="selectedProvider.apiUrl"
                  :placeholder="t('model.apiUrl')"
                  class="api-input"
                  @change="onApiConfigChange"
                />
              </a-form-item>
            </a-form>
          </div>

          <!-- 模型列表区域 -->
          <div class="config-section">
            <div class="section-title">{{ t('model.models') }}</div>
            <div class="model-list">
              <div
                v-for="model in selectedProvider.models"
                :key="model.id"
                class="model-item"
              >
                <div class="model-info">
                  <img
                    v-if="model.icon && model.icon.trim() !== ''"
                    :src="model.icon"
                    :alt="model.name"
                    class="model-icon"
                  />
                  <div v-else class="model-icon model-icon-text">
                    {{ model.name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="model-name">{{ model.name }}</span>
                </div>
                <div class="model-actions">
                  <a-tooltip :title="t('common.edit')">
                    <a-button
                      type="text"
                      size="small"
                      @click.stop="editModel(model)"
                      class="action-btn edit-btn"
                    >
                      <EditOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-popconfirm
                    :title="t('model.confirmDeleteModel')"
                    :ok-text="t('common.confirm')"
                    :cancel-text="t('common.cancel')"
                    @confirm="deleteModel(model)"
                  >
                    <a-tooltip :title="t('common.delete')">
                      <a-button
                        type="text"
                        size="small"
                        @click.stop
                        class="action-btn delete-btn"
                      >
                        <DeleteOutlined />
                      </a-button>
                    </a-tooltip>
                  </a-popconfirm>
                </div>
              </div>
            </div>
              <!-- 底部操作区域 -->
          <div class="config-footer">
            <div>
              <a
                v-if="selectedProvider.keyLink"
                class="footer-info"
                :href="selectedProvider.keyLink"
                target="_blank"
              >
                {{ t('model.viewDocumentation', { provider: selectedProvider.name }) }}
              </a>
            </div>
            <div class="footer-actions">
              <a-button @click="addModel">
                <PlusOutlined />
                {{ t('model.addModel') }}
              </a-button>
            </div>
          </div>
            
            <!-- 模型配置显示区域 -->
            <div  class="model-config-section">
              <div class="section-title">{{ t('modelSetting.title') }}</div>
              <div class="config-display">
                <ModelConfigPanel v-model="selectedProvider.config" />
              </div>
            </div>
          </div>

        
        </div>

        <!-- 未选择提供商时的提示 -->
        <div v-else class="no-selection">
          <a-empty :description="t('model.selectProvider')" />
        </div>
      </div>
    </div>
    <!-- 添加提供商模态框 -->
    <AddProviderModal
      v-model:open="showAddProviderModal"
      @confirm="handleAddProviderConfirm"
    />
    <!-- 添加/编辑模型模态框 -->
    <AddModelModal
      v-model:open="showAddModelModal"
      :edit-model="editingModel"
      :provider-config="selectedProvider?.config"
      @confirm="handleAddModelConfirm"
    />
  </MoveModal>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from "vue";
import { MoveModal } from "./index";
import type { Provider, Model } from "@/types";
import { useModelStore } from "@/store/model";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import { AddProviderModal, AddModelModal } from "./index";
import ModelConfigPanel from '@/components/model/ModelConfigPanel.vue';

const modelStore = useModelStore();
const { t } = useI18n();
const isOpen = defineModel<boolean>("open");
const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const selectedProvider = ref<Provider | null>(null);
const showAddProviderModal = ref<boolean>(false);
const showAddModelModal = ref<boolean>(false);
const editingModel = ref<Model | null>(null);

// 设置默认选中的提供商
watchEffect(() => {
  if (modelStore.providers && modelStore.providers.length > 0) {
    if (!selectedProvider.value) {
      selectedProvider.value = modelStore.providers[0];
    }
  }
});

// 处理图标显示
const getProviderIcon = (provider: Provider) => {
  if (!provider.icon || provider.icon.trim() === "") {
    return null;
  }
  return provider.icon;
};

const getProviderInitial = (provider: Provider) => {
  if (!provider.icon || provider.icon.trim() === "") {
    return provider.name.charAt(0).toUpperCase();
  }
  return null;
};

const selectProvider = (provider: Provider) => {
  selectedProvider.value = provider;
};

const addProvider = () => {
  showAddProviderModal.value = true;
};

const handleAddProviderConfirm = (provider: Provider) => {
  modelStore.addProvider(provider);
  message.success(t("model.providerAddedSuccess"));
  showAddProviderModal.value = false;
};

const addModel = () => {
  if (!selectedProvider.value) {
    message.warning(t("model.selectProviderFirst"));
    return;
  }
  editingModel.value = null; // 确保是添加模式
  showAddModelModal.value = true;
};

const handleAddModelConfirm = (model: Model) => {
  if (selectedProvider.value) {
    if (editingModel.value) {
      // 编辑模式：更新现有模型
      const success = modelStore.updateModel(selectedProvider.value.id, editingModel.value.id, model);
      if (success) {
        message.success(t("model.modelUpdatedSuccess"));
        editingModel.value = null;
        showAddModelModal.value = false;
      } else {
        message.error(t("model.modelUpdateFailed"));
      }
    } else {
      // 添加模式：添加新模型
      const success = modelStore.addModel(selectedProvider.value.id, model);
      if (success) {
        message.success(t("model.modelAddedSuccess"));
        showAddModelModal.value = false;
      } else {
        message.error(t("model.modelIdExists"));
      }
    }
  }
};

// 编辑模型
const editModel = (model: Model) => {
  editingModel.value = model;
  showAddModelModal.value = true;
};

// 删除模型
const deleteModel = (model: Model) => {
  if (selectedProvider.value) {
    // 检查要删除的模型是否是当前选中的模型
    if (modelStore.selectedModel && 
        modelStore.selectedModel.providerId === selectedProvider.value.id && 
        modelStore.selectedModel.modelId === model.id) {
      // 清除选中的模型，因为它将被删除
      modelStore.clearSelectedModel();
      // message.info(t('model.selectedModelCleared'));
    }
    
    const success = modelStore.removeModel(selectedProvider.value.id, model.id);
    if (success) {
      message.success(t("model.modelDeletedSuccess"));
      
      // 如果删除后没有模型了，提示用户
      if (selectedProvider.value.models.length === 0) {
        message.warning(t("model.allModelsDeleted"));
      }
    } else {
      message.error(t("model.modelDeleteFailed"));
    }
  }
};

// 处理提供商开关切换
const handleProviderToggle = (checked: boolean) => {
  if (!selectedProvider.value) return;
  
  if (checked) {
    // 开启时进行验证
    // 1. 检查API URL是否填写
    if (!selectedProvider.value.apiUrl || selectedProvider.value.apiUrl.trim() === '') {
      message.error(t('model.fillApiUrlFirst'));
      selectedProvider.value.enabled = false;
      return;
    }
    
    // 2. 检查API Key是否填写
    if (!selectedProvider.value.apiKey || selectedProvider.value.apiKey.trim() === '') {
      message.error(t('model.fillApiKeyFirst'));
      selectedProvider.value.enabled = false;
      return;
    }
    
    // 3. 检查是否有模型
    if (!selectedProvider.value.models || selectedProvider.value.models.length === 0) {
      message.error(t('model.addAtLeastOneModel'));
      selectedProvider.value.enabled = false;
      return;
    }
    
    // 验证通过，直接设置状态（这样开关能正常响应）
    selectedProvider.value.enabled = true;
    message.success(t('model.providerEnabledSuccess'));
  } else {
    // 关闭时需要检查当前选中的模型是否属于该提供商
    if (modelStore.selectedModel && modelStore.selectedModel.providerId === selectedProvider.value.id) {
      // 清除选中的模型，因为它的提供商被禁用了
      modelStore.clearSelectedModel();
      // message.info(t('model.selectedModelCleared'));
    }
    
    // 关闭时直接设置状态
    selectedProvider.value.enabled = false;
    message.success(t('model.providerDisabledSuccess'));
  }
};

// API配置变化时的处理函数
const onApiConfigChange = () => {
  if (selectedProvider.value) {
    // 更新提供商的API配置到store
    modelStore.updateProviderApiKey(
      selectedProvider.value.id,
      selectedProvider.value.apiKey
    );
    modelStore.updateProviderApiUrl(
      selectedProvider.value.id,
      selectedProvider.value.apiUrl
    );
    
    // 如果提供商已启用但配置不完整，自动禁用
    if (selectedProvider.value.enabled) {
      const hasApiUrl = selectedProvider.value.apiUrl && selectedProvider.value.apiUrl.trim() !== '';
      const hasApiKey = selectedProvider.value.apiKey && selectedProvider.value.apiKey.trim() !== '';
      const hasModels = selectedProvider.value.models && selectedProvider.value.models.length > 0;
      
      if (!hasApiUrl || !hasApiKey || !hasModels) {
        // 直接禁用提供商
        selectedProvider.value.enabled = false;
        message.warning(t('model.configIncomplete'));
      }
    }
  }
};

const handleCancel = () => {
  emit("update:open", false);
};
</script>

<style lang="scss" scoped>
.model-config-container {
  border-radius: 8px;
  display: flex;
  height: 700px;
}

.provider-list {
  width: 320px;
  display: flex;
  height: 100%;
  flex-direction: column;

  &-header {
    padding: 16px;
    border: 1px solid $border-color;
    background-color: $main-bg;
    border-radius: 8px 0 0 8px;
    height: 100%;
    overflow-y: auto;
  }
}

.config-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 16px;
}

.model-provider-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  color: $text-color;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;

  &:hover {
    background-color: $primary-bg;
  }

  &.active {
    background-color: $primary-bg;
    border: 1px solid $primary-color;
  }

  .provider-icon {
    img {
      width: 24px;
      height: 24px;
      border-radius: 4px;
    }

    .provider-icon-text {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: $primary-color;
      color: white;
      font-size: 12px;
      font-weight: 600;
      border-radius: 50%;
    }
  }

  .provider-info {
    margin-left: 12px;
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .provider-name {
    font-weight: 500;
    color: $text-color;
    font-size: 14px;
  }

  .provider-status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;

    &.connected {
      background-color: $primary-color;
      color: $main-bg;
    }

    &.disconnected {
      background-color: $text-color;
      color: $main-bg;
    }
  }
}

.add-provider-btn {
  width: 100%;
  margin-top: 8px;
  border-color: $border-color;
  color: $text-color;

  &:hover {
    border-color: $primary-color;
    color: $primary-color;
  }
}

.model-config {
  flex: 1;
  padding: 12px;
  background-color: $main-bg;
  border: 1px solid $border-color;
  border-left: none;
  border-radius: 0 8px 8px 0;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 2px;

    &:hover {
      background: $text-color;
    }
  }
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;

  .provider-title {
    font-size: 20px;
    font-weight: 600;
    color: $text-color;
  }
}

.config-section {
  margin-bottom: 32px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 20px;
    color: $text-color;
    position: relative;

    &::after {
      content: "";
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 40px;
      height: 2px;
      background-color: $primary-color;
      border-radius: 1px;
    }
  }
}

.model-list {
  .model-item {
    margin-bottom: 12px;
    padding: 12px;
    border: 1px solid $border-color;
    border-radius: 8px;
    background-color: $primary-bg;
    transition: all 0.2s ease;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:hover {
      border-color: $primary-color;
      background-color: $primary-bg;
    }

    .model-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .model-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;

        &.model-icon-text {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: $primary-color;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }
      }

      .model-name {
        color: $text-color;
        font-weight: 500;
        font-size: 14px;
        flex: 1;
      }
    }
    
    .model-actions {
      display: flex;
      gap: 4px;
      margin-left: auto;
      
      .action-btn {
        padding: 2px;
        border-radius: 4px;
        
        &.edit-btn {
          color: $primary-color;
          
          &:hover {
            background-color: rgba(30, 156, 255, 0.1);
          }
        }
        
        &.delete-btn {
          color: #ff4d4f;
          
          &:hover {
            background-color: rgba(255, 77, 79, 0.1);
          }
        }
      }
    }
  }
}

.model-config-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid $border-color;
  
  .config-display {
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: 16px;
    background-color: $secondary-bg;
  }
}

.config-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid $border-color;

  .footer-info {
    font-size: 12px;
  }

  .footer-actions {
    display: flex;
    gap: 12px;
  }
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style> 