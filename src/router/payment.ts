/**
 * 支付路由模块
 */

export const PaymentRoutesConfig = [
  {
    path: '/payment',
    name: 'payment',
    component: () => import('@/view/pay/layout.vue'),
    meta: { title: 'payment.title', requiresAuth: true },
    children: [
      {
        path: '',
        name: 'payment-select',
        component: () => import('@/view/pay/select.vue'),
        meta: { title: 'payment.title', requiresAuth: true, keepAlive: true }
      },
      {
        path: 'confirm',
        name: 'payment-confirm',
        component: () => import('@/view/pay/confirm.vue'),
        meta: { title: 'payment.confirm.title', requiresAuth: true }
      }
    ]
  }
]

export default PaymentRoutesConfig 