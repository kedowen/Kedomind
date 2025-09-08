import request from '@/utils/request'
import axios from 'axios'
import { useStorage } from '@/hooks/useStorage'

// 查询产品服务套餐
export const queryProductServices = (params: { F_ProdId: string }) => {
  return request.get('/Order/QueryOnionProdServices', { params })
}

// 获取Token价格信息
export const getTokenPrice = (params?: { userId?: string }) => {
  return request.get('/Finance/GetOnionTokenPrice', { params }  )
}

// 创建订单
export const createOrder = (params: any) => {
  return request.post('/Order/Create_Order', params)
}

// 执行支付
export const doPayment = (params: any) => {
  return request.post('/Order/Do_Payment', params)
}

// 获取微信支付二维码 - 使用特定的基础URL
export const getWeChatPayQRCode = (params: {
  userId: string
  body: string
  description: string
  amount: number
  prodId: string
  payProject: string
  ip: string
}) => {
  const { getToken } = useStorage()
  const token = getToken()
  
  const headers: any = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return axios.post('https://www.kedowen.com:8008/api/WxPay/WeChatV3PayQRCode', params, {
    headers,
    timeout: 15000
  })
}

// 查询订单支付状态
export const checkOrderPaymentStatus = (params: { OrderId: string }) => {
  const { getToken } = useStorage()
  const token = getToken()
  
  const headers: any = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return axios.get('https://www.kedowen.com:8008/api/Order/OrderPaymentCompleted', {
    params,
    headers,
    timeout: 15000
  })
}

// 获取用户Token余额
export const getUserTokenBalance = (params: { userId: string }) => {
  return request.post('/Order/GetUserTokenBalance', params)
}


