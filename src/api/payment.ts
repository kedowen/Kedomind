import request from '@/utils/request'

/**
 * 创建支付订单
 */
export const createPaymentOrder = (data: {
  planId: string
  amount: number
  currency: string
  paymentMethod: string
}) => {
  return request.post('/Payment/CreateOrder', data)
}

/**
 * PayPal支付完成确认
 */
export const capturePayPalPayment = (data: {
  orderId: string
  paypalOrderId: string
  payerInfo: any
}) => {
  return request.post('/Payment/PayPalCapture', data)
}

/**
 * 获取用户支付历史
 */
export const getPaymentHistory = () => {
  return request.get('/Payment/GetHistory')
}

/**
 * 获取订单详情
 */
export const getOrderDetails = (orderId: string) => {
  return request.get('/Payment/GetOrder', { params: { orderId } })
}

/**
 * 取消订单
 */
export const cancelOrder = (data: { orderId: string }) => {
  return request.post('/Payment/CancelOrder', data)
}

/**
 * 退款请求
 */
export const requestRefund = (data: { orderId: string; reason?: string }) => {
  return request.post('/Payment/RequestRefund', data)
}

/**
 * 验证PayPal Webhook
 */
export const verifyPayPalWebhook = (data: any) => {
  return request.post('/Payment/VerifyWebhook', data)
} 