import { createApp } from 'vue'
import router from './router'
import Antd from 'ant-design-vue'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css'
import pinia from './store'
import { useLanguageStore, useThemeStore } from './store'
import i18n from './i18n'

// 扩展Window接口以包含i18n
declare global {
  interface Window {
    i18n: typeof i18n
  }
}


const app = createApp(App)
app.use(Antd)
app.use(router)
app.use(pinia)
app.use(i18n)

// 将i18n实例挂载到全局，以便在App.vue中访问
window.i18n = i18n

// 初始化语言设置（在pinia初始化之后）
const languageStore = useLanguageStore()
languageStore.initLanguage()

// 初始化主题设置
const themeStore = useThemeStore()
themeStore.initTheme()

app.mount('#app')
