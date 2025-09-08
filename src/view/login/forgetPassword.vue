<template>
    <div class="forget-form">
    <div class="title">{{ t('login.forgotPasswordTitle') }}</div>
    
    <a-form :model="formData" @finish="handleResetPassword" autocomplete="off">
      <a-form-item
        name="f_Mobile"
        :rules="[
          { required: true, message: t('login.phoneNumberRequired') },
          { pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/, message: t('login.invalidPhoneNumber') }
        ]"
      >
        <a-input 
          v-model:value="formData.f_Mobile" 
          :placeholder="t('login.phoneNumber')"
          :style="inputStyle" 
        />
      </a-form-item>

      <a-form-item
        name="f_VerificationCode"
        :rules="[{ required: true, message: t('login.verificationCodeRequired') }]"
      >
        <div style="position: relative">
          <a-input 
            v-model:value="formData.f_VerificationCode" 
            :placeholder="t('login.verificationCode')"
            :style="inputStyle" 
            maxlength="6" 
          />
          <a-button
            type="link"
            class="code-btn"
            @click="handleSendCode"
            :disabled="sendingCode || timeLeft > 0"
          >
            <a-spin v-if="sendingCode" />
            <span v-else-if="timeLeft > 0">{{ Math.floor(timeLeft / 1000) }}</span>
            <span v-else>{{ t('login.sendVerificationCode') }}</span>
          </a-button>
        </div>
      </a-form-item>

      <a-form-item
        name="f_Password"
        :rules="[{ required: true, message: t('login.passwordRequired') }]"
      >
        <a-input-password 
          v-model:value="formData.f_Password" 
                      :placeholder="t('login.newPassword')" 
          :style="inputStyle" 
        />
      </a-form-item>

      <a-form-item
        name="f_Password_1"
        :rules="[
          { required: true, message: t('login.passwordRequired') },
          { validator: validatePasswordConfirm }
        ]"
      >
        <a-input-password 
          v-model:value="formData.f_Password_1" 
                      :placeholder="t('login.confirmPassword')" 
          :style="inputStyle" 
        />
      </a-form-item>

      <div class="bottom-links">
        <div>{{ t('login.knowPassword') }}</div>
        <a-button
          type="link"
          style="padding: 0"
          @click="goBack"
        >
          {{ t('login.backToLogin') }}
        </a-button>
      </div>

      <a-button
        type="primary"
        html-type="submit"
        block
        :loading="resetLoading"
        :disabled="resetLoading"
        class="reset-btn"
      >
        {{ t('login.confirm') }}
      </a-button>
    </a-form>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const { t } = useI18n()
import { 
  getBackPassword, 
  getVerificationCode,
  awaitWrapper 
} from '@/api'
import LoginLayout from './Index.vue'

const router = useRouter()

// 表单数据
const formData = reactive({
  f_Mobile: '',
  f_VerificationCode: '',
  f_Password: '',
  f_Password_1: ''
})

// 状态
const resetLoading = ref(false)
const sendingCode = ref(false)
const timeLeft = ref(0)
let countdownTimer: number | null = null

// 确认密码验证
const validatePasswordConfirm = (rule: any, value: string) => {
  if (!value || formData.f_Password === value) {
    return Promise.resolve()
  }
  return Promise.reject(new Error(t('login.passwordsNotMatch')))
}

// 发送验证码
const handleSendCode = async () => {
  if (sendingCode.value || timeLeft.value > 0) return
  
  const mobile = formData.f_Mobile
  if (!mobile?.trim()) {
    message.warning(t('login.getPhoneFailed'))
    return
  }

  // 验证手机号格式
  const phoneRegex = /^(?:(?:\+|00)86)?1[3-9]\d{9}$/
  if (!phoneRegex.test(mobile)) {
    message.error(t('login.phoneFormatError'))
    return
  }

  sendingCode.value = true
  const [err, res] = await awaitWrapper(getVerificationCode({ phoneNum: mobile }))
  sendingCode.value = false

  if (res) {
    message.success(t('login.verificationCodeSent'))
    startCountdown()
  }
}

// 开始倒计时
const startCountdown = () => {
  timeLeft.value = 60000 // 60秒
  countdownTimer = setInterval(() => {
    timeLeft.value -= 1000
    if (timeLeft.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

// 重置密码处理
const handleResetPassword = async () => {
  resetLoading.value = true
  
  const params = {
    f_Mobile: formData.f_Mobile,
    f_VerificationCode: formData.f_VerificationCode,
    f_Password: formData.f_Password
  }

  const [err, res] = await awaitWrapper(getBackPassword(params))
  resetLoading.value = false

  if (res) {
    message.success(t('login.passwordResetSuccess'))
    router.go(-1)
  }
}

// 导航方法
const goBack = () => {
  router.go(-1)
}

// 样式
const inputStyle = {
  width: '340px',
  height: '52px',
  borderRadius: '14px',
  fontSize: '16px',
  fontWeight: '500',
  color: '#999999',
  padding: '15px 20px',
  boxSizing: 'border-box' as const
}

// 清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style lang="scss" scoped>
.forget-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 40px;
  font-weight: 600;
  color: #333333;
  margin-bottom: 40px;
}

.code-btn {
  position: absolute;
  right: 0;
  height: 100%;
  font-size: 16px;
}

.bottom-links {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #999999;
  margin-top: -10px;
}

.reset-btn {
  margin: 18px 0 70px;
  height: 52px;
  border-radius: 14px;
  font-size: 20px;
  
  &:not(.ant-btn-loading) {
    color: #ffffff;
  }
  
  &.ant-btn-loading {
    color: #000;
  }
}
</style> 