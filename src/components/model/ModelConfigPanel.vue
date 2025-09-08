<template>
  <div class="model-config-panel">
    <!-- 温度设置 -->
    <div class="param-item">
      <div class="param-row">
        <div class="param-title">
          <span>{{ t('modelSetting.temperature') || 'Temperature' }}</span>
          <a-tooltip
            :title="t('modelSetting.temperatureHelp') || 'Controls randomness; higher = more random'"
            placement="right"
          >
            <QuestionCircleOutlined class="param-help-icon" />
          </a-tooltip>
        </div>
                 <a-switch
           v-model:checked="modelValue.temperature.enable"
           size="small"
           @change="onTemperatureEnableChange"
         />
      </div>
             <div
         v-if="modelValue.temperature.enable"
         class="param-control-row"
       >
         <a-slider
           v-model:value="modelValue.temperature.value"
           :min="0"
           :max="2"
           :step="0.1"
           @change="onTemperatureChange"
           style="flex: 1; margin-right: 12px"
         />
         <span class="param-value">{{
           modelValue.temperature.value
         }}</span>
       </div>
    </div>

    <!-- 流式输出开关 -->
    <div class="param-item">
      <div class="param-row stream-row">
        <div class="param-title">
          <span>{{ t('modelSetting.streamOutput') || 'Stream output' }}</span>
          <a-tooltip
            :title="t('modelSetting.streamHelp') || 'Enable real-time output'"
            placement="right"
          >
            <QuestionCircleOutlined class="param-help-icon" />
          </a-tooltip>
        </div>
                 <a-switch
           v-model:checked="modelValue.stream"
           size="small"
           @change="onStreamChange"
         />
      </div>
    </div>

    <!-- 最大Token数 -->
    <div class="param-item">
      <div class="param-row">
        <div class="param-title">
          <span>{{ t('modelSetting.maxTokens') || 'Max Tokens' }}</span>
          <a-tooltip
            :title="t('modelSetting.maxTokensHelp') || 'Maximum output length per chat'"
            placement="right"
          >
            <QuestionCircleOutlined class="param-help-icon" />
          </a-tooltip>
        </div>
                 <a-switch
           v-model:checked="modelValue.maxTokens.enable"
           size="small"
           @change="onMaxTokensEnableChange"
         />
       </div>
       <a-input-number
         v-if="modelValue.maxTokens.enable"
         v-model:value="modelValue.maxTokens.value"
         :min="1"
         :step="512"
         @change="onMaxTokensChange"
         style="width: 100%"
       />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import type { ModelConfig } from '@/types'

const { t } = useI18n()

interface Props {
  modelValue: ModelConfig
}

interface Emits {
  (e: 'update:modelValue', value: ModelConfig): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 模型参数修改方法
const onTemperatureChange = (value: number) => {
  emit('update:modelValue', {
    ...props.modelValue,
    temperature: { ...props.modelValue.temperature, value }
  })
}

const onTemperatureEnableChange = (checked: boolean) => {
  emit('update:modelValue', {
    ...props.modelValue,
    temperature: { ...props.modelValue.temperature, enable: checked }
  })
}

const onStreamChange = (checked: boolean) => {
  emit('update:modelValue', {
    ...props.modelValue,
    stream: checked
  })
}

const onMaxTokensChange = (value: number | null) => {
  if (value !== null) {
    emit('update:modelValue', {
      ...props.modelValue,
      maxTokens: { ...props.modelValue.maxTokens, value }
    })
  }
}

const onMaxTokensEnableChange = (checked: boolean) => {
  emit('update:modelValue', {
    ...props.modelValue,
    maxTokens: { ...props.modelValue.maxTokens, enable: checked }
  })
}
</script>

<style scoped lang="scss">
.model-config-panel {
  .param-item {
    margin-bottom: 18px;

    &:last-child {
      margin-bottom: 0;
    }

    .param-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      &.stream-row {
        margin-bottom: 0;
      }
    }

    .param-title {
      display: flex;
      align-items: center;
      gap: 4px;

      .param-help-icon {
        color: $text-color;
        opacity: 0.6;
        font-size: 12px;
      }
    }

    .param-value {
      color: $primary-color;
      font-size: 12px;
      opacity: 0.8;
      margin-left: 8px;
      min-width: 12px;
      text-align: right;
    }

    .param-control-row {
      display: flex;
      align-items: center;
      margin-top: 8px;
    }

    // 滑块样式
    :deep(.ant-slider) {
      margin: 8px 0;

      .ant-slider-rail {
        background-color: rgba($border-color, 0.3);
      }

      .ant-slider-track {
        background-color: $primary-color;
      }

      .ant-slider-handle {
        border-color: $primary-color;

        &:hover,
        &:focus {
          border-color: $primary-color;
          box-shadow: 0 0 0 4px rgba($primary-color, 0.2);
        }
      }
    }

    // 数字输入框样式
    :deep(.ant-input-number) {
      background-color: $main-bg;
      border-color: $border-color;
      color: $text-color;

      &:hover {
        border-color: $primary-color;
      }

      &:focus {
        border-color: $primary-color;
        box-shadow: 0 0 0 2px rgba($primary-color, 0.2);
      }

      .ant-input-number-input {
        color: $text-color;
      }

      .ant-input-number-handler-wrap {
        background-color: $secondary-bg;
        border-left-color: $border-color;

        .ant-input-number-handler {
          color: $text-color;
          border-color: $border-color;

          &:hover {
            color: $primary-color;
          }
        }
      }
    }
  }
}
</style>
