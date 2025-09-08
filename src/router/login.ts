/**
 * 登录相关路由配置
 */

// 登录路由枚举
export const LoginRouteEnum = {
  LOGIN: 'login',
  LOGIN_PASSWORD: 'loginPassword',
  LOGIN_VER_CODE: 'loginVerCode',
  SIGN_UP: 'signUp',
  FORGET_PASSWORD: 'forgetPassword',
  WECHAT_LOGIN: 'wechatLogin',
  BIND_PHONENUM: 'bindPhonenum',
  USE_AGREEMENT: 'useAgreement',
  PRIVACY_POLICY: 'privacyPolicy',
}

// 登录路由配置 - 直接定义为数组，避免动态计算
export const LoginRoutesConfig = [
  {
    path: '/login',
    name: 'login',
    redirect: '/login/account/password',
    component: () => import('@/view/login/Index.vue'),
    meta: { title: '登录', requiresAuth: false },
    children: [
      {
        path: 'account/:type',
        name: 'loginAccount',
        component: () => import('@/view/login/AccountLogin.vue'),
        meta: { title: '账户登录', requiresAuth: false }
      },
      {
        path: 'sign_up',
        name: 'signUp',
        component: () => import('@/view/login/signUp.vue'),
        meta: { title: '免费注册', requiresAuth: false }
      },
      {
        path: 'forget_password',
        name: 'forgetPassword',
        component: () => import('@/view/login/forgetPassword.vue'),
        meta: { title: '找回密码', requiresAuth: false }
      },
      {
        path: 'wechat',
        name: 'wechatLogin',
        component: () => import('@/view/login/wechatLogin.vue'),
        meta: { title: '微信登录', requiresAuth: false }
      },
      {
        path: 'bind_phonenum',
        name: 'bindPhonenum',
        component: () => import('@/view/login/bindPhonenum.vue'),
        meta: { title: '绑定手机号', requiresAuth: false }
      }
    ],
  },
  {
    path: '/doc/use_agreement',
    name: 'useAgreement',
    component: () => import('@/view/doc/useAgreement.vue'),
    meta: { title: '使用协议', requiresAuth: false }
  },
  {
    path: '/doc/privacy_policy',
    name: 'privacyPolicy',
    component: () => import('@/view/doc/privacyPolicy.vue'),
    meta: { title: '隐私政策', requiresAuth: false }
  }
]