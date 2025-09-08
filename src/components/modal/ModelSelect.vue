<template>
  <MoveModal
    v-model:open="isOpen"
    @cancel="handleCancel"
    title="选择模型"
    :footer="null"
    width="1000px"
    :bodyStyle="{ padding: 0, height: '600px' }"
  >
    <div class="model-select-container">
      <div class="model-select-content">
        <div class="search-section">
          <a-input
            v-model:value="modelSearchKeyword"
            placeholder="搜索模型..."
            class="search-section-input"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>

        <div class="models-by-provider">
          <div
            v-for="provider in groupedProviders || []"
            :key="provider.id"
            class="provider-section"
          >
            <div class="provider-section-header">
              <div class="provider-section-title">
                <img
                  v-if="getProviderIcon(provider)"
                  :src="getProviderIcon(provider)!"
                  :alt="provider.name"
                  class="provider-section-icon"
                />
                <div
                  v-else
                  class="provider-section-icon provider-section-icon-text"
                >
                  {{ getProviderInitial(provider) }}
                </div>
                <span>{{ provider.name }}</span>
              </div>
            </div>

            <div class="models-grid">
              <div
                v-for="model in provider.filteredModels"
                :key="model.id"
                class="model-card"
                :class="{ selected: isModelSelected(model) }"
                @click="selectModel(model)"
              >
                <div class="model-card-header">
                  <div class="model-icon">
                    <img
                      v-if="model.icon && model.icon.trim() !== ''"
                      :src="model.icon"
                      :alt="model.name"
                    />
                    <div v-else class="model-icon-text">
                      {{ model.name.charAt(0).toUpperCase() }}
                    </div>
                  </div>
                </div>

                <div class="model-card-body">
                  <div class="model-name">{{ model.name }}</div>
                  <div class="model-tags">
                    <a-tag
                      v-for="tag in model.tags"
                      :key="tag"
                      :color="getTagColor(tag)"
                      size="small"
                    >
                      {{ tag }}
                    </a-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!groupedProviders || groupedProviders.length === 0"
          class="no-models"
        >
          <a-empty description="暂无已启用的模型" />
        </div>
      </div>
    </div>
  </MoveModal>
</template>

<script lang="ts" setup>
import { ref, computed, watchEffect, onMounted } from "vue";
import { MoveModal } from "./index";
import type { Provider, Model } from "@/types";
import { useModelStore } from "@/store/model";
import { message } from "ant-design-vue";
import { SearchOutlined } from "@ant-design/icons-vue";

// 扩展Model类型，包含providerId
interface ModelWithProvider extends Model {
  providerId: string;
}

const modelStore = useModelStore();
const isOpen = defineModel<boolean>("open");
const emit = defineEmits<{
  "update:open": [value: boolean];
  "model-selected": [model: Model | null];
}>();

const modelSearchKeyword = ref("");
const selectedModel = ref<ModelWithProvider | null>(null);

// 回显选中的模型
watchEffect(() => {
  if (modelStore.selectedModel && !selectedModel.value) {
    const { providerId, modelId } = modelStore.selectedModel;
    const provider = modelStore.providers.find((p) => p.id === providerId);
    if (provider && provider.models) {
      const model = provider.models.find((m) => m.id === modelId);
      if (model) {
        selectedModel.value = {
          ...model,
          providerId: provider.id,
        };
      }
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

// 按提供商分组的已启用提供商
const groupedProviders = computed(() => {
  if (!modelStore.providers) return [];

  return modelStore.providers
    .filter(
      (provider) =>
        provider.enabled && provider.models && provider.models.length > 0
    )
    .map((provider) => {
      // 过滤该提供商的模型
      let filteredModels = provider.models.map((model) => ({
        ...model,
        providerId: provider.id,
      }));

      // 如果有搜索关键词，进一步过滤模型
      if (modelSearchKeyword.value) {
        filteredModels = filteredModels.filter((model) =>
          model.name
            .toLowerCase()
            .includes(modelSearchKeyword.value.toLowerCase())
        );
      }

      // 只返回有过滤后模型的提供商
      if (filteredModels.length > 0) {
        return {
          ...provider,
          filteredModels,
        };
      }
      return null;
    })
    .filter(
      (provider): provider is NonNullable<typeof provider> => provider !== null
    );
});

// 判断模型是否被选中
const isModelSelected = (model: ModelWithProvider) => {
  return (
    selectedModel.value?.id === model.id &&
    selectedModel.value?.providerId === model.providerId
  );
};

const getTagColor = (tag: string) => {
  const colorMap: Record<string, string> = {
    vision: "green",
    tool: "orange",
    global: "blue",
    creative: "purple",
  };
  return colorMap[tag] || "orange";
};

const selectModel = async (model: ModelWithProvider) => {
  // 如果点击的是已选中的模型
  if (isModelSelected(model)) {
    // selectedModel.value = null;
    // modelStore.clearSelectedModel();
    // emit("model-selected", null);
    // 关闭当前弹窗
    handleCancel();
    return;
  }

  selectedModel.value = model;

  // 保存选中的模型到store
  const provider = modelStore.providers.find((p) => p.id === model.providerId);
  if (provider) {
    // 确保提供商的API配置同步到store
    modelStore.updateProviderApiKey(provider.id, provider.apiKey);
    modelStore.updateProviderApiUrl(provider.id, provider.apiUrl);

    modelStore.setSelectedModel({
      modelId: model.id,
      providerId: model.providerId,
    });

    // 调用Electron的setModel方法
    try {
    } catch (error) {
      console.error("调用setModel失败:", error);
    }
  }

  emit("model-selected", model);
};

const handleCancel = () => {
  emit("update:open", false);
};

// 组件挂载时初始化选中状态
onMounted(() => {
  // 确保在组件挂载时重新检查store中的选中模型
  if (modelStore.selectedModel && !selectedModel.value) {
    const { providerId, modelId } = modelStore.selectedModel;
    const provider = modelStore.providers.find((p) => p.id === providerId);
    if (provider && provider.models) {
      const model = provider.models.find((m) => m.id === modelId);
      if (model) {
        selectedModel.value = {
          ...model,
          providerId: provider.id,
        };
      }
    }
  }
});
</script>
<style lang="scss" scoped>
.model-select-container {
  height: 600px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.model-select-content {
  flex: 1;
  padding: 24px;
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

.search-section {
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  &-input {
    flex: 1;
  }
}

.models-by-provider {
  .provider-section {
    margin-bottom: 32px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .provider-section-header {
    margin-bottom: 16px;

    .provider-section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: $text-color;

      .provider-section-icon {
        width: 20px;
        height: 20px;
        border-radius: 4px;

        &.provider-section-icon-text {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: $primary-color;
          color: white;
          font-size: 10px;
          font-weight: 600;
          border-radius: 50%;
        }
      }
    }
  }
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.model-card {
  background-color: $main-bg;
  border: 1px solid $border-color;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: $primary-color;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  &.selected {
    border-color: $primary-color;
    background-color: $primary-bg;
  }

  .model-card-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 8px;

    .model-icon {
      img {
        width: 24px;
        height: 24px;
        border-radius: 4px;
      }
      
      .model-icon-text {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: $primary-color;
        color: white;
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px;
      }
    }
  }

  .model-card-body {
    .model-name {
      font-size: 14px;
      font-weight: 500;
      color: $text-color;
      margin-bottom: 6px;
      text-align: center;
      line-height: 1.2;
    }

    .model-tags {
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
      justify-content: center;
      :deep(.ant-tag) {
        margin-right: 0;
      }
    }
  }
}

.no-models {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
