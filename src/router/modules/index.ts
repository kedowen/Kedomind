/**
 * 路由模块统一导出
 */

// 导出登录路由
export * from '../login'

// 导出支付路由
export * from '../payment'

// 路由模块类型定义
export interface RouteModule {
  path: string
  name: string
  component: () => Promise<any>
  meta?: {
    title?: string
    requiresAuth?: boolean
    icon?: string
    hidden?: boolean
  }
  children?: RouteModule[]
}

// 路由模块注册器
export class RouteModuleRegistry {
  private static modules: RouteModule[] = []

  static register(module: RouteModule) {
    this.modules.push(module)
  }

  static getModules(): RouteModule[] {
    return this.modules
  }

  static clear() {
    this.modules = []
  }
} 