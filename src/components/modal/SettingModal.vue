<template>
  <MoveModal
    v-model:open="openModel"
    :title="t('header.systemSettings')"
    :width="500"
    :footer="null"
  >
    <div class="setting-content">
      <div class="setting-section">
        <h3 class="section-title">
          <TranslationOutlined />
          {{ t('settings.language') }}
        </h3>
        <p class="section-desc">{{ t('settings.languageDesc') }}</p>
        <a-select
          v-model:value="currentLanguage"
          @change="handleLanguageChange"
          style="width: 100%"
          size="large"
        >
          <a-select-option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.key" :value="lang.key">
            <span class="lang-row">
              <span class="lang-name">{{ lang.label }}</span>
            </span>
          </a-select-option>
        </a-select>
      </div>
      
      <div class="setting-section">
        <h3 class="section-title">
          <BulbOutlined />
          {{ t('settings.theme') }}
        </h3>
        <p class="section-desc">{{ t('settings.themeDesc') }}</p>
        <a-select
          v-model:value="currentTheme"
          @change="handleThemeChange"
          style="width: 100%"
          size="large"
        >
          <a-select-option value="dark">
            <span class="theme-row">
              <span class="theme-name">{{ t('settings.darkMode') }}</span>
            </span>
          </a-select-option>
          <a-select-option value="light">
            <span class="theme-row">
              <span class="theme-name">{{ t('settings.lightMode') }}</span>
            </span>
          </a-select-option>
        </a-select>
      </div>
    </div>
  </MoveModal>
</template>

<script setup lang="ts">
import { ref, watch, defineModel } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLanguageStore, useThemeStore } from '@/store';
import { MoveModal } from './index';
import type { Language } from '@/store/language';
import type { Theme } from '@/store/theme';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { TranslationOutlined, BulbOutlined } from '@ant-design/icons-vue';

const { t, locale } = useI18n();
const languageStore = useLanguageStore();
const themeStore = useThemeStore();

// Modal显示状态
const openModel = defineModel<boolean>("open");

// 当前选中的语言
const currentLanguage = ref<Language>(locale.value as Language);

// 当前选中的主题
const currentTheme = ref<Theme>(themeStore.theme);

// 处理语言切换
const handleLanguageChange = (value: Language) => {
  languageStore.setLanguage(value);
  // 同步更新i18n语言
  if (locale.value !== value) {
    locale.value = value;
  }
};

// 处理主题切换
const handleThemeChange = (value: Theme) => {
  themeStore.setTheme(value);
  currentTheme.value = value;
};

// 监听主题store变化
watch(() => themeStore.theme, (newTheme) => {
  currentTheme.value = newTheme;
});
</script>

<style lang="scss" scoped>
.setting-content {
  .setting-section {
    margin-bottom: 32px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: $text-color;
      margin-bottom: 8px;
      
      .anticon {
        color: #2fc0ff;
        font-size: 18px;
      }
    }
    
    .section-desc {
      color: $text-color;
      opacity: 0.7;
      margin-bottom: 20px;
      font-size: 14px;
    }
  }
  
  .lang-row,
  .theme-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 4px;
  }
  
  .lang-name,
  .theme-name {
    font-weight: 500;
  }
  
  .lang-native {
    color: #888;
    font-size: 13px;
  }
}
</style> 