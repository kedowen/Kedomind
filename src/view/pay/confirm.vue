<template>
  <div class="payment-confirm-container">
    <!-- 支付成功状态 -->
    <div v-if="paymentSuccess" class="success-content">
      <div class="success-container">
        <!-- 成功图标 -->
        <div class="success-icon">
          <CheckCircleFilled />
        </div>
        
        <!-- 成功信息 -->
        <div class="success-info">
          <h1 class="success-title">{{ $t('payment.success') }}</h1>
          <p class="success-desc">{{ $t('pay.tokenRechargeSuccess') }}</p>
        </div>
        
        <!-- 订单信息 -->
        <div v-if="orderData" class="order-info">
          <div class="order-item">
            <span class="label">{{ $t('pay.paymentAmount') }}：</span>
            <span class="value">¥{{ planAmount }}</span>
          </div>
          <div class="order-item">
            <span class="label">{{ $t('pay.purchaseContent') }}：</span>
            <span class="value">{{ orderData?.list[0]?.time || '' }}</span>
          </div>
        </div>
        
        <!-- 倒计时信息 -->
        <div class="countdown-info">
          <p class="countdown-text">
            <ClockCircleOutlined />
            {{ $t('pay.autoRedirect', { seconds: countdown }) }}
          </p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="action-buttons">
          <a-button
            size="large"
            @click="goToHome"
            class="home-btn"
          >
            {{ $t('pay.backToHome') }}
          </a-button>
        </div>
        
        <!-- 温馨提示 -->
        <div class="tips-section">
          <div class="tip-item">
            <InfoCircleOutlined />
            <span>{{ $t('pay.tokenRechargeSuccess') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 支付确认状态 -->
    <div v-else>
      <!-- 更改套餐按钮 - 左上角 -->
      <div class="top-nav">
        <a-button 
          type="text"
          size="large"
          @click="goBack"
          class="back-button"
        >
          <ArrowLeftOutlined />
          {{ $t('payment.confirm.changePlan') }}
        </a-button>
      </div>
      
      <div class="confirm-header">
        <h1 class="confirm-title">{{ $t('payment.confirm.title') }}</h1>
        <p class="confirm-subtitle">{{ $t('payment.confirm.subtitle') }}</p>
      </div>

    <div class="confirm-content">
      <!-- 套餐信息卡片 -->
      <a-card class="plan-info-card">
        <template #title>
          <div class="card-title">
            <CheckCircleOutlined class="title-icon" />
            <span>{{ $t('payment.confirm.selectedPlan') }}</span>
          </div>
        </template>
        
        <div class="plan-details">
          <div class="plan-name">
            <span class="label">{{ $t('payment.confirm.planName') }}:</span>
            <span class="value">{{ orderData?.productName || 'KedoMind' }}</span>
          </div>
          <div class="plan-price">
            <span class="label">{{ $t('payment.confirm.price') }}:</span>
            <span class="value">
              <span class="currency">¥</span>
              <span class="amount">{{ planAmount }}</span>
            </span>
          </div>
          <div class="plan-features" v-if="orderData?.list && orderData.list.length > 0">
            <span class="label">{{ $t('payment.confirm.features') }}:</span>
            <div class="features-list">
              <div class="feature-item" v-for="item in orderData.list" :key="item.name">
                <CheckOutlined class="feature-icon" />
                <span>{{ item.name }} - {{ item.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 支付方式卡片 -->
      <a-card class="payment-method-card">
        <template #title>
          <div class="card-title">
            <CreditCardOutlined class="title-icon" />
            <span>{{ $t('payment.confirm.paymentMethod') }}</span>
          </div>
        </template>
        
                 <div class="payment-options">
           <div 
             v-if="paypalAvailable"
             class="payment-option"
             :class="{ active: paymentMethod === 'paypal' }"
             @click="selectMethod('paypal')"
           >
             <div class="option-header">
               <img src="@/assets/images/paypal.png" :alt="$t('payment.paypal')" class="paypal-logo">
               <span class="option-title">{{ $t('payment.paypal') }}</span>
             </div>
             <p class="option-description">{{ $t('payment.confirm.paypalDescription') }}</p>

             <div v-show="paymentMethod === 'paypal'">
               <!-- PayPal支付按钮容器 -->
               <div v-show="showPayPal" class="paypal-container">
                 <div id="paypal-button-container"></div>
               </div>
               
               <div v-if="!showPayPal" class="payment-actions">
                 <a-button 
                   type="primary"
                   size="large"
                   block
                   @click="initPayment"
                   :loading="loading"
                   class="pay-button"
                 >
                   <CreditCardOutlined />
                   {{ loading ? $t('payment.processing') : $t('payment.confirm.payNow') }}
                 </a-button>
               </div>
             </div>
           </div>

          <div 
            class="payment-option"
            :class="{ active: paymentMethod === 'wechat' }"
            @click="selectMethod('wechat')"
          >
            <div class="option-header">
              <WechatOutlined class="wechat-icon" />
              <span class="option-title">{{ $t('pay.wechatPay') }}</span>
            </div>
            <p class="option-description">{{ $t('payment.confirm.wechatDescription') || '使用微信扫码完成支付' }}</p>

                         <div v-show="paymentMethod === 'wechat'" class="wechat-container">
               <div v-if="loadingWechat" class="payment-loading">
                 <a-spin size="large" />
                 <p>{{ $t('pay.generatingQRCode') }}</p>
               </div>

               <div v-else-if="qrCodeError" class="qr-error">
                 <div class="error-container">
                   <ReloadOutlined class="error-icon" />
                   <p class="error-text">{{ $t('pay.qrCodeGenerationFailed') }}</p>
                   <a-button 
                     type="primary" 
                     @click="regenerateQRCode"
                     :loading="loadingWechat"
                     class="retry-button"
                   >
                     <ReloadOutlined />
                     {{ $t('pay.regenerate') }}
                   </a-button>
                 </div>
               </div>

               <div v-else-if="qrCodeGenerated && !loadingWechat" class="qr-payment">
                 <div class="qr-container">
                   <canvas ref="qrCodeRef" class="qr-code"></canvas>
                 </div>
                 <div class="qr-tips">
                   <p class="tip-main">{{ $t('pay.scanToPay') }}</p>
                   <p class="tip-sub">{{ $t('pay.paymentCompleteTip') }}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </a-card>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { 
  CheckCircleOutlined, 
  CreditCardOutlined, 
  CheckOutlined, 
  ArrowLeftOutlined,
  WechatOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue'
import { capturePayPalPayment } from '@/api/payment'
import { getWeChatPayQRCode, checkOrderPaymentStatus, awaitWrapper } from '@/api'
import { useUserStore } from '@/store/user'
import QRCode from 'qrcode'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()

const loading = ref(false)
const showPayPal = ref(false)
const paymentMethod = ref<'paypal' | 'wechat'>('paypal')
const loadingWechat = ref(false)
const qrCodeRef = ref<HTMLCanvasElement | null>(null)
const paypalAvailable = ref(false)
const qrCodeGenerated = ref(false)
const qrCodeError = ref(false) // 设置为true来显示错误状态
const paymentSuccess = ref(false)
const countdown = ref(5)
let orderId = ''
let pollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: NodeJS.Timeout | null = null

// 从路由参数获取订单数据
const orderData = ref<any>(null)
const planType = ref('kedomind')
const planAmount = ref(0)

// PayPal SDK configuration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID 

let paypal: any = null

// 套餐功能映射
const featuresMap = {
  basic: ['basicChats', 'basicModels', 'basicSupport', 'cloudSync'],
  premium: ['premiumChats', 'advancedModels', 'prioritySupport', 'teamCollaboration', 'apiAccess'],
  pro: ['unlimitedChats', 'allModels', 'dedicatedSupport', 'enterpriseFeatures', 'customIntegration', 'whiteLabel']
}

// 计算当前套餐的功能列表
const planFeatures = computed(() => {
  return featuresMap[planType.value as keyof typeof featuresMap] || featuresMap.basic
})

onMounted(() => {
  // 验证路由参数
  if (!route.query.orderData) {
    message.error(t('payment.confirm.invalidParams'))
    router.push('/payment')
    return
  }
  
  try {
    orderData.value = JSON.parse(route.query.orderData as string)
    planAmount.value = orderData.value.totalMoney
  } catch (error) {
    console.error('解析订单数据失败:', error)
    message.error(t('payment.confirm.invalidParams'))
    router.push('/payment')
    return
  }
  
  loadPayPalSDK()
  // 如果没有PayPal配置，默认选择微信支付
  if (!PAYPAL_CLIENT_ID) {
    paymentMethod.value = 'wechat'
  }
})

/**
 * 动态加载PayPal SDK
 */
function loadPayPalSDK() {
  if (window.paypal) {
    paypal = window.paypal
    return
  }

  if (!PAYPAL_CLIENT_ID) {
    console.warn('PayPal Client ID not configured')
    paypalAvailable.value = false
    return
  }

  const script = document.createElement('script')
  script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=CNY&intent=capture`
  script.onload = () => {
    paypal = window.paypal
    console.log('PayPal SDK loaded')
    paypalAvailable.value = true // PayPal SDK加载成功，设置为可用
  }
  script.onerror = () => {
    console.error('PayPal SDK load failed')
    paypalAvailable.value = false
  }
  document.head.appendChild(script)
}

/**
 * 初始化支付
 */
function initPayment() {
  if (!paypal) {
    paypalAvailable.value = false
    message.error(t('payment.paypalConfigError'))
    return
  }

  loading.value = true
  showPayPal.value = false

  try {
    // 清空之前的PayPal按钮
    const container = document.getElementById('paypal-button-container')
    if (container) {
      container.innerHTML = ''
    }

    // 创建PayPal支付按钮
    paypal.Buttons({
      createOrder: function(data: any, actions: any) {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: planAmount.value.toString()
            },
                          description: `KedoMind - ${orderData.value?.productName || 'Token充值'}`
          }]
        })
      },
      onApprove: async function(data: any, actions: any) {
        try {
          const order = await actions.order.capture()
          
          // 调用后端API确认PayPal支付
          await capturePayPalPayment({
            orderId: order.id,
            paypalOrderId: order.id,
            payerInfo: order.payer
          })

          // 显示支付成功状态
          setTimeout(() => {
            showPaymentSuccess()
          }, 1000)
          
        } catch (error) {
          console.error('Payment capture error:', error)
          message.error(t('payment.failed'))
        } finally {
          loading.value = false
          showPayPal.value = false
        }
      },
      onError: function(err: any) {
        console.error('PayPal payment error:', err)
        message.error(t('payment.failed'))
        loading.value = false
        showPayPal.value = false
      },
      onCancel: function(data: any) {
        message.info(t('payment.cancelled'))
        loading.value = false
        showPayPal.value = false
      }
    }).render('#paypal-button-container')

    showPayPal.value = true
    loading.value = false

  } catch (error) {
    console.error('Payment initialization error:', error)
    message.error(t('payment.failed'))
    loading.value = false
  }
}

function selectMethod(method: 'paypal' | 'wechat') {
  // 停止之前的轮询
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  
  paymentMethod.value = method
  if (method === 'paypal') {
    showPayPal.value = false
    // 重置微信支付状态
    qrCodeGenerated.value = false
    qrCodeError.value = false
  } else if (method === 'wechat') {
    showPayPal.value = false
    // 只有在未生成过二维码且没有错误时才重新生成
    if (!loadingWechat.value && !qrCodeGenerated.value && !qrCodeError.value) {
      generateWeChatQRCode()
    }
  }
}

async function generateWeChatQRCode() {
  loadingWechat.value = true
  qrCodeError.value = false
  
  try {
    const userId = userStore.getUserId as string
    if (!userId) {
      message.error(t('pay.userInfoError'))
      qrCodeError.value = true
      loadingWechat.value = false
      // 滚动到底部
      scrollToBottom()
      return
    }

    const [err, response] = await awaitWrapper(getWeChatPayQRCode({
      userId,
      body: '3',
      description: '蝌蚪文公司',
      amount: Number((planAmount.value * 100).toFixed(2)),
      prodId: orderData.value?.proId || 'kedomind',
      payProject: '08',
      ip: '127.0.0.1'
    }))

    if (err) {
      message.error(t('pay.generateQRCodeFailed'))
      qrCodeError.value = true
      loadingWechat.value = false
      // 滚动到底部
      scrollToBottom()
      return
    }
    
    const respData = response?.data?.data
    if (respData && respData.qrCodeUrl) {
      orderId = respData.orderId
      loadingWechat.value = false
      qrCodeGenerated.value = true
      await nextTick()
      if (!qrCodeRef.value) {
        message.error(t('pay.qrCodeGenerationFailed'))
        qrCodeError.value = true
        // 滚动到底部
        scrollToBottom()
        return
      }
      await QRCode.toCanvas(qrCodeRef.value, respData.qrCodeUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      startPolling()
      // 滚动到底部
      scrollToBottom()
      return
    }
    loadingWechat.value = false
    qrCodeError.value = true
    message.error(t('pay.getQRCodeFailed'))
    // 滚动到底部
    scrollToBottom()
  } catch (error) {
    message.error(t('pay.generateQRCodeFailed'))
    qrCodeError.value = true
    loadingWechat.value = false
    // 滚动到底部
    scrollToBottom()
  }
}

async function queryPaymentStatus() {
  if (!orderId) return false
  
  try {
    const [err, response] = await awaitWrapper(checkOrderPaymentStatus({ OrderId: orderId }))
    if (err) {
      console.error('查询订单状态失败:', err)
      return false
    }
    const respData = response?.data?.data
    return respData?.payStatus === true
  } catch (error) {
    console.error('查询订单状态失败:', error)
    return false
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    const isPaid = await queryPaymentStatus()
    if (isPaid) {
      clearInterval(pollTimer!)
      setTimeout(() => {
        showPaymentSuccess()
      }, 1200)
    }
  }, 3000)
}

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})

/**
 * 平滑滚动到页面底部
 */
function scrollToBottom() {
  nextTick(() => {
    const container = document.querySelector('.payment-confirm-container')
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

/**
 * 重新生成微信支付二维码
 */
function regenerateQRCode() {
  qrCodeGenerated.value = false
  qrCodeError.value = false
  generateWeChatQRCode()
}

/**
 * 前往聊天页面
 */
function goToChat() {
  router.push('/chat')
}

/**
 * 返回首页
 */
function goToHome() {
  router.push('/')
}

/**
 * 开始倒计时
 */
function startCountdown() {
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      goToChat()
    }
  }, 1000)
}

/**
 * 显示支付成功状态
 */
function showPaymentSuccess() {
  paymentSuccess.value = true
  startCountdown()
}

/**
 * 返回套餐选择页面
 */
function goBack() {
  router.push('/payment')
}

// 全局声明PayPal类型
declare global {
  interface Window {
    paypal: any
  }
}
</script>

<style scoped lang="scss">
.payment-confirm-container {
  height: 100%;
  padding-top: 20px;
  background-color: $main-bg;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch; // iOS平滑滚动
  padding: 1rem;
}

.top-nav {
  position: fixed;
  top: 40px;
  left: 1rem;
  z-index: 1000;
  
  .back-button {
    color: $text-color;
    font-weight: 500;
    background-color: $main-bg;
    backdrop-filter: blur(8px);
    border: 1px solid $border-color;
    border-radius: 6px;
    
    :deep(.anticon) {
      margin-right: 0.5rem;
    }
    
    &:hover {
      color: $primary-color;
      background-color: rgba(30, 156, 255, 0.1);
      border-color: $primary-color;
    }
  }
}

.confirm-header {
  text-align: center;
  margin-bottom: 3rem;
  margin-top: 3rem; // 给左上角按钮留空间
  
  .confirm-title {
    font-size: 2rem;
    font-weight: 700;
    color: $text-color;
    margin-bottom: 0.5rem;
  }
  
  .confirm-subtitle {
    font-size: 1rem;
    color: $text-color;
    margin: 0;
  }
}

.confirm-content {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  gap: 2rem;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .title-icon {
    color: $primary-color;
    font-size: 1.2rem;
  }
}

.plan-info-card {
  .plan-details {
    .plan-name,
    .plan-price {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid $border-color;
      
      .label {
        font-weight: 500;
        color: $text-color;
      }
      
      .value {
        font-weight: 600;
        color: $text-color;
      }
    }
    
    .plan-price .value {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      
      .currency {
        font-size: 1rem;
        color: $text-color;
      }
      
      .amount {
        font-size: 1.5rem;
        color: $primary-color;
      }
      
      .period {
        font-size: 0.9rem;
        color: $text-color;
      }
    }
    
    .plan-features {
      padding: 1rem 0;
      
      .label {
        font-weight: 500;
        color: $text-color;
        margin-bottom: 1rem;
        display: block;
      }
      
      .features-list {
        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          
          .feature-icon {
            color: $primary-color;
            font-size: 1rem;
            flex-shrink: 0;
          }
          
          span {
            color: $text-color;
            font-size: 0.9rem;
          }
        }
      }
    }
  }
}

  .payment-method-card {
    .payment-options {
      .payment-option {
        padding: 1rem;
        border: 2px solid $border-color;
        border-radius: 8px;
        margin-bottom: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        
        &:hover {
          border-color: $primary-color;
          background-color: rgba(30, 156, 255, 0.02);
        }
        
        &.active {
          border-color: $primary-color;
          background-color: rgba(30, 156, 255, 0.05);
        }
        
        .option-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
          
          .paypal-logo {
            height: 24px;
            width: auto;
          }
          
          .wechat-icon {
            font-size: 24px;
            color: #09bb07;
          }
          
          .option-title {
            font-weight: 600;
            color: $text-color;
            font-size: 1.1rem;
          }
        }
        
        .option-description {
          color: $text-color;
          margin: 0;
          font-size: 0.9rem;
        }
        
        .wechat-container {
          margin-top: 1rem;
          
                     .payment-loading {
             text-align: center;
             padding: 2rem;
             
             p {
               margin-top: 1rem;
               color: $text-color;
             }
           }
           
           .qr-error {
             text-align: center;
             padding: 2rem;
             
             .error-container {
               .error-icon {
                 font-size: 3rem;
                 color: #ff4d4f;
                 margin-bottom: 1rem;
               }
               
               .error-text {
                 color: $text-color;
                 margin-bottom: 1.5rem;
                 font-size: 1rem;
               }
               
               .retry-button {
                 height: 40px;
                 padding: 0 1.5rem;
                 
                 .anticon {
                   margin-right: 0.5rem;
                 }
               }
             }
           }
          
          .qr-payment {
            text-align: center;
            
            .qr-container {
              margin-bottom: 1rem;
              padding: 1rem;
              background: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              display: inline-block;
              
              .qr-code {
                display: block;
                border-radius: 4px;
              }
            }
            
            .qr-tips {
              .tip-main {
                font-size: 1rem;
                font-weight: 600;
                color: $text-color;
                margin-bottom: 0.5rem;
              }
              
              .tip-sub {
                font-size: 0.9rem;
                color: $text-color;
                margin: 0;
              }
            }
          }
        }
      }
    }
  
  .paypal-container {
    margin-top: 1.5rem;
    padding: 1rem;
    border: 1px solid $border-color;
    border-radius: 8px;
    background-color: $main-bg;
  }
  
  .payment-actions {
    margin-top: 1.5rem;
    
    .pay-button {
      height: 48px;
      font-size: 1.1rem;
      font-weight: 600;
      
      .anticon {
        margin-right: 0.5rem;
      }
    }
  }
}



// 支付成功状态样式
.success-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
}

.success-container {
  text-align: center;
  max-width: 500px;
  width: 100%;
  padding: 2rem;

  .success-icon {
    margin-bottom: 2rem;

    :deep(.anticon) {
      font-size: 80px;
      color: $primary-color;
    }
  }

  .success-info {
    margin-bottom: 2rem;

    .success-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: $text-color;
      margin-bottom: 1rem;
    }

    .success-desc {
      font-size: 1.1rem;
      color: $text-color;
      margin: 0;
      line-height: 1.6;
      opacity: 0.8;
    }
  }

  .order-info {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: rgba(30, 156, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(30, 156, 255, 0.1);

    .order-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      
      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: $text-color;
        font-weight: 500;
      }

      .value {
        color: $primary-color;
        font-weight: 600;
        font-size: 1.1rem;
      }
    }
  }

  .countdown-info {
    margin-bottom: 2rem;
    padding: 1rem 1.5rem;
    background: #f0f8ff;
    border-radius: 8px;
    border: 1px solid #d4edda;

    .countdown-text {
      margin: 0;
      color: $primary-color;
      font-weight: 500;

      :deep(.anticon) {
        margin-right: 0.5rem;
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;

    .chat-btn {
      height: 48px;
      padding: 0 2rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      background: $primary-color;
      border: none;

      &:hover {
        background: $primary-color;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(30, 156, 255, 0.3);
      }
    }

    .home-btn {
      height: 48px;
      padding: 0 2rem;
      font-size: 1rem;
      border-radius: 8px;
      border-color: $border-color;

      &:hover {
        color: $primary-color;
        border-color: $primary-color;
      }
    }
  }

  .tips-section {
    .tip-item {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: $text-color;
      opacity: 0.7;

      &:last-child {
        margin-bottom: 0;
      }

      :deep(.anticon) {
        margin-right: 0.5rem;
        color: $primary-color;
      }
    }
  }
}

@media (max-width: 768px) {
  .payment-confirm-container {
    padding: 1rem;
    padding-bottom: 2rem; // 底部留更多空间
  }
  
  .top-nav {
    top: 0.5rem;
    left: 0.5rem;
    
    .back-button {
      font-size: 0.9rem;
      padding: 0.5rem;
    }
  }
  
  .confirm-header {
    margin-bottom: 2rem; // 减少顶部边距以节省空间
    margin-top: 3rem; // 给左上角按钮留空间
    
    .confirm-title {
      font-size: 1.5rem;
    }
  }
  
  .confirm-content {
    gap: 1.5rem; // 减少卡片间距
    margin-bottom: 2rem; // 增加底部边距
  }
  
  .plan-details {
    .plan-name,
    .plan-price {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }

  .success-container {
    padding: 1rem;

    .success-icon :deep(.anticon) {
      font-size: 64px;
    }

    .success-info .success-title {
      font-size: 2rem;
    }

    .action-buttons {
      flex-direction: column;

      .chat-btn,
      .home-btn {
        width: 100%;
      }
    }
  }
}
</style> 