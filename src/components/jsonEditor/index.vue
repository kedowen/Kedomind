<template>
  <div class="json-editor-container">
    <div class="json-editor-header">
      <div class="json-editor-title">
        <slot name="title">{{ t('jsonEditor.title') }}</slot>
      </div>
      <div class="json-editor-buttons">
        <slot name="actions"></slot>
      </div>
    </div>
    <JsonEditorVue
      v-model="value"
      :mode="mode"
      :main-menu-bar="false"
      :navigation-bar="false"
      :status-bar="false"
      :ask-to-format="true"
      :locale="currentLocale"
      class="json-editor"
      ref="jsonEditorRef"
      @error="onError"
      @change="onChange"
    />
  </div>
</template>

<script lang="ts" setup>
import JsonEditorVue from "json-editor-vue";
import { Mode } from "vanilla-jsoneditor";
import { ref, defineModel, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";

const { t, locale } = useI18n();

const value = defineModel("value");
const jsonEditorRef = ref();
const mode = ref<Mode>(Mode.text);

// 计算当前语言环境
const currentLocale = computed(() => {
  const localeMap: Record<string, string> = {
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'en-US': 'en',
    'ja-JP': 'ja',
    'ru-RU': 'ru'
  };
  return localeMap[locale.value] || 'en';
});

// 获取内部的jsoneditor实例
onMounted(() => {
  if (jsonEditorRef.value) {
    console.log("JSON Editor mounted:", jsonEditorRef.value);
  }
});

// 错误处理
const onError = (error: any) => {
  console.error("JSON 编辑器错误:", error);
  message.error(t('jsonEditor.formatError'));
};

// 变化处理
const onChange = (content: any) => {
  console.log("JSON 内容变化:", content);
};
</script>

<style lang="scss" scoped>
.json-editor-container {
  position: relative;
  height: 100%;
  transition: all 0.3s ease;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .json-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e8e8e8;
  }

  .json-editor-title {
    font-weight: 500;
    color: #262626;
  }

  .json-editor-buttons {
    display: flex;
    gap: 8px;
  }

  .json-editor {
    height: 100%;
    flex: 1;
    overflow: hidden;

    // 使用 deep 选择器修改 vanilla-jsoneditor 内部样式
    :deep(.jse-main) {
      border: none;
      height: 100%;
    }

    // 文本模式样式
    :deep(.jse-text) {
      .cm-editor {
        border: none;
        
        .cm-focused {
          outline: none;
        }
        
        .cm-scroller {
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.4;
        }
        
        .cm-activeLine {
          background-color: rgba(24, 144, 255, 0.05);
        }
        
        .cm-cursor {
          border-left-color: #1890ff;
        }
      }
    }

    // 树模式样式
    :deep(.jse-tree) {
      .jse-contents {
        background-color: #fff;
        
        .jse-key {
          color: #1890ff;
        }
        
        .jse-value {
          color: rgba(0, 0, 0, 0.85);
          
          &.jse-string {
            color: #52c41a;
          }
          
          &.jse-number {
            color: #fa8c16;
          }
          
          &.jse-boolean {
            color: #722ed1;
          }
          
          &.jse-null {
            color: #ff4d4f;
          }
        }
      }
    }

    // 隐藏不需要的元素
    :deep(.jse-status-bar) {
      display: none;
    }
    
    :deep(.jse-main-menu-bar) {
      display: none;
    }
    
    :deep(.jse-navigation-bar) {
      display: none;
    }
  }
}
</style>
