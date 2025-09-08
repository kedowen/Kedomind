import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import ruRU from './locales/ru-RU.json';

// 检测用户浏览器语言
const getDefaultLocale = () => {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en-US';
  if (browserLang.startsWith('zh')) {
    return browserLang.includes('TW') || browserLang.includes('HK') ? 'zh-TW' : 'zh-CN';
  }
  if (browserLang.startsWith('ja')) {
    return 'ja-JP';
  }
  if (browserLang.startsWith('ru')) {
    return 'ru-RU';
  }
  return 'en-US';
};

// 从localStorage获取保存的语言设置
const getSavedLocale = () => {
  try {
    const saved = localStorage.getItem('kedo-language');
    if (saved && ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ru-RU'].includes(saved)) {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
  }
  return getDefaultLocale();
};

const i18n = createI18n({
  legacy: false, // 使用Composition API
  locale: getSavedLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'en-US': enUS,
    'ja-JP': jaJP,
    'ru-RU': ruRU
  },
  missingWarn: false,
  fallbackWarn: false
});

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en-US', label: 'English' },
  { key: 'ja-JP', label: '日本語' },
  { key: 'ru-RU', label: 'Русский' },
  { key: 'zh-TW', label: '繁體中文' },
]; 