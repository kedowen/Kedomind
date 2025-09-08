import { createRouter, createWebHashHistory } from 'vue-router'
import { LoginRoutesConfig } from './login'
import { PaymentRoutesConfig } from './payment'
import { useStorage } from "@/hooks"


export const RouteHomeRedirectPath = '/chat'

const routes = [
  {
    path: '/',
    redirect: RouteHomeRedirectPath
  },
  // 登录相关路由
  ...LoginRoutesConfig,
  // 支付相关路由
  ...PaymentRoutesConfig,
  // 异常页面路由
  {
    path: '/401',
    name: '401',
    component: () => import('@/view/exception/401.vue'),
    meta: { title: '未授权', requiresAuth: false }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/view/chat/chat.vue'),
    meta: { title: '会话', requiresAuth: true, keepAlive: true }
  },
  // 分享页面路由
  {
    path: '/share/:id',
    name: 'share',
    component: () => import('@/view/share/share.vue'),
    meta: { title: '会话分享', requiresAuth: false }
  },
  // 404 兜底路由
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/401'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes
})

/**
 * 验证登录状态
 * @returns boolean
 */
function checkIsLogin() {
  const { getToken } = useStorage()
  return !!getToken()
}

// 路由导航守卫
router.beforeEach((to, from, next) => {
  try {
    // 设置页面标题
    if (to.meta?.title) {
      document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE}`
    }
    
    // 检查登录状态（只检查一次）
    const isLogin = checkIsLogin()
    
    // 检查路由是否需要认证
    const requiresAuth = to.meta?.requiresAuth !== false // 默认为true，除非明确设置为false
    
    // 如果路由不需要认证
    if (!requiresAuth) {
      // 如果已登录且访问登录相关页面（但绑定手机号页面例外），重定向到首页
      if (to.path.startsWith('/login') && to.path !== '/login/bind_phonenum' && isLogin) {
        next(RouteHomeRedirectPath)
        return
      }
      next()
      return
    }
    
    // 如果路由需要认证但用户未登录
    if (!isLogin) {
      // 保存当前路径并重定向到登录页
      if (to.path !== '/login/wechat') {
        sessionStorage.setItem('needLoginFromPath', to.fullPath)
      }
      next('/login/wechat')
      return
    }
    
    // 用户已登录且路由需要认证，正常访问
    next()
  } catch (err) {
    console.error('路由守卫错误:', err)
    next('/login/wechat')
  }
})


// 路由后置守卫
router.afterEach((to) => {
  const loadingElement = document.querySelector('.app-loading')
  if (loadingElement) {
    // 添加一个短暂延迟，确保页面已经渲染
    setTimeout(() => {
      loadingElement.classList.add('loaded')
      // 延迟移除元素，让动画完成
      setTimeout(() => {
        if (loadingElement.parentNode) {
          loadingElement.parentNode.removeChild(loadingElement)
        }
      }, 500)
    }, 100)
  }

})

export default router
export * from './login'