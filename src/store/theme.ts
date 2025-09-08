import { defineStore } from 'pinia'
import { THEME_COLORS, type ThemeMode } from '@/constants/theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'light' as ThemeMode
  }),
  
  getters: {
    isDarkMode: (state) => state.theme === 'dark',
    currentColors: (state) => THEME_COLORS[state.theme]
  },
  
  actions: {
    setTheme(theme: ThemeMode) {
      this.theme = theme
      this.applyTheme()
    },
    
    toggleTheme() {
      this.setTheme(this.theme === 'dark' ? 'light' : 'dark')
    },
    
    applyTheme() {
      const colors = THEME_COLORS[this.theme]
      const root = document.documentElement
      
      // 将颜色变量应用到根元素
      Object.entries(colors).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })
    },
    
    initTheme() {
      // persist插件已经自动恢复了state，应用主题
      this.applyTheme()
    }
  },
  
  persist: {
    key: 'kedo-theme',
    storage: localStorage
  }
})
