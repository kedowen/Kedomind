import { defineStore } from "pinia";

export type Language = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ru-RU';

export interface LanguageState {
  currentLanguage: Language;
}

export const useLanguageStore = defineStore(
  "language",
  {
    state: (): LanguageState => {
      return {
        currentLanguage: 'en-US' // 默认英文
      }
    },
    getters: {
      getCurrentLanguage: (state) => {
        return state.currentLanguage
      },
      isChinese: (state) => {
        return state.currentLanguage === 'zh-CN' || state.currentLanguage === 'zh-TW'
      },
      isEnglish: (state) => {
        return state.currentLanguage === 'en-US'
      },
      isJapanese: (state) => {
        return state.currentLanguage === 'ja-JP'
      },
      isRussian: (state) => {
        return state.currentLanguage === 'ru-RU'
      }
    },
    actions: {
      setLanguage(language: Language) {
        this.currentLanguage = language;
        // 设置HTML lang属性
        document.documentElement.lang = language;
        // 保存到localStorage
        try {
          localStorage.setItem('kedo-language', language);
        } catch (error) {
          console.warn('Failed to save language to localStorage:', error);
        }
      },
      // 检测用户浏览器语言
      detectUserLanguage() {
        const browserLang = navigator.language || navigator.languages?.[0] || 'en-US';
        
        // 检查是否支持中文
        if (browserLang.startsWith('zh')) {
          if (browserLang.includes('TW') || browserLang.includes('HK')) {
            this.setLanguage('zh-TW');
          } else {
            this.setLanguage('zh-CN');
          }
        } else if (browserLang.startsWith('ja')) {
          this.setLanguage('ja-JP');
        } else if (browserLang.startsWith('ru')) {
          this.setLanguage('ru-RU');
        } else {
          this.setLanguage('en-US');
        }
      },
      // 初始化语言设置
      initLanguage() {
        // 如果store中没有保存的语言设置，则检测用户语言
        if (!this.currentLanguage) {
          this.detectUserLanguage();
        } else {
          // 确保HTML lang属性与store中的语言一致
          document.documentElement.lang = this.currentLanguage;
        }
      }
    },
    persist: {
      key: 'kedo-mind-language',
      storage: localStorage
    }
  }
); 