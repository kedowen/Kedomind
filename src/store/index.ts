import { createPinia } from "pinia" //引入pinia
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate' //引入持久化插件
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
const pinia = createPinia() //创建pinia实例
pinia.use(piniaPluginPersistedstate) //将插件添加到 pinia 实例上
// 在使用前先声明持久化插件的类型扩展
declare module 'pinia' {
  interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistenceOptions<S> | PersistenceOptions<S>[];
  }
}

export default pinia
export * from "./user"
export * from "./language"
export * from "./model"
export * from "./theme"
export * from "./conversation"
export * from "./role"
