<template>
  <div class="signup-form">
    <div class="title">{{ t("login.freeRegister") }}</div>

    <a-form :model="formData" @finish="handleRegister" autocomplete="off">
      <a-form-item
        name="f_Mobile"
        :rules="[
          { required: true, message: t('login.phoneNumberRequired') },
          {
            pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
            message: t('login.invalidPhoneNumber'),
          },
          { validator: validatePhone },
        ]"
      >
        <a-input
          v-model:value="formData.f_Mobile"
          :placeholder="t('login.phoneNumber')"
          :style="inputStyle"
          maxlength="11"
        />
      </a-form-item>

      <a-form-item
        name="f_VerificationCode"
        :rules="[
          { required: true, message: t('login.verificationCodeRequired') },
        ]"
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
            <span v-else-if="timeLeft > 0">{{
              Math.floor(timeLeft / 1000)
            }}</span>
            <span v-else>{{ t("login.sendVerificationCode") }}</span>
          </a-button>
        </div>
      </a-form-item>

      <a-form-item
        name="f_Password"
        :rules="[{ required: true, message: t('login.passwordRequired') }]"
      >
        <a-input-password
          v-model:value="formData.f_Password"
          :placeholder="t('login.password')"
          :style="inputStyle"
        />
      </a-form-item>

      <a-form-item
        name="f_Password_1"
        :rules="[
          { required: true, message: t('login.passwordRequired') },
          { validator: validatePasswordConfirm },
        ]"
      >
        <a-input-password
          v-model:value="formData.f_Password_1"
          :placeholder="t('login.confirmPassword')"
          :style="inputStyle"
        />
      </a-form-item>

      <div class="bottom-links">
        <div>{{ t("login.hasAccount") }}</div>
        <a-button type="link" style="padding: 0" @click="goBack">
          {{ t("login.backToLogin") }}
        </a-button>
      </div>

      <a-button
        type="primary"
        html-type="submit"
        block
        :loading="registerLoading"
        :disabled="registerLoading"
        class="register-btn"
      >
        {{ t("login.register")
        }}{{ registerLoading ? t("login.registering") : "" }}
      </a-button>
    </a-form>

    <a-checkbox v-model:checked="agree" class="agreement-checkbox">
      <span>{{ t("login.readAndAgree") }}</span>
      <a @click="goToUseAgreement">{{ t("login.useAgreement") }}</a>
      <span>{{ t("login.and") }}</span>
      <a @click="goToPrivacyPolicy">{{ t("login.privacyPolicy") }}</a>
      <span>{{ t("login.endBracket") }}</span>
    </a-checkbox>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { debounce } from "lodash-es";

const { t } = useI18n();
import {
  userRegist,
  getVerificationCode,
  checkPhoneNoIsUsed,
  awaitWrapper,
} from "@/api";
import LoginLayout from "./Index.vue";

const router = useRouter();

// 表单数据
const formData = reactive({
  f_Mobile: "",
  f_VerificationCode: "",
  f_Password: "",
  f_Password_1: "",
});

// 状态
const agree = ref(false);
const registerLoading = ref(false);
const sendingCode = ref(false);
const timeLeft = ref(0);
let countdownTimer: number | null = null;

// 创建防抖的手机号检查函数
const debouncedCheckPhone = debounce(
  async (phone: string, resolve: Function, reject: Function) => {
    try {
      const result = await checkPhoneNoIsUsedAsync(phone);
      if (!result) {
        reject(new Error(t("login.phoneExists")));
      } else {
        resolve(undefined);
      }
    } catch (error) {
      resolve(undefined); // 网络错误不阻止表单提交
    }
  },
  800
);

// 手机号验证
const validatePhone = async (rule: any, value: string) => {
  if (!value?.trim()) {
    return Promise.resolve();
  }

  // 先验证格式
  const phoneRegex = /^(?:(?:\+|00)86)?1[3-9]\d{9}$/;
  if (!phoneRegex.test(value)) {
    return Promise.resolve(); // 格式错误由其他规则处理
  }

  // 返回一个Promise，使用防抖函数
  // return new Promise((resolve, reject) => {
  //   debouncedCheckPhone(value, resolve, reject)
  // })
};

// 确认密码验证
const validatePasswordConfirm = (rule: any, value: string) => {
  if (!value || formData.f_Password === value) {
    return Promise.resolve();
  }
  return Promise.reject(new Error(t("login.passwordsNotMatch")));
};

// 检查手机号是否已被使用
const checkPhoneNoIsUsedAsync = async (phone: string) => {
  const [err, res] = await awaitWrapper(
    checkPhoneNoIsUsed({ f_Mobile: phone })
  );
  if (res) {
    return res.data;
  }
  return false;
};

// 发送验证码
const handleSendCode = async () => {
  if (sendingCode.value || timeLeft.value > 0) return;

  const mobile = formData.f_Mobile;
  if (!mobile?.trim()) {
    message.warning(t("login.getPhoneFailed"));
    return;
  }

  // 验证手机号格式
  const phoneRegex = /^(?:(?:\+|00)86)?1[3-9]\d{9}$/;
  if (!phoneRegex.test(mobile)) {
    message.error(t("login.phoneFormatError"));
    return;
  }

  sendingCode.value = true;
  const [err, res] = await awaitWrapper(
    getVerificationCode({ phoneNum: mobile })
  );
  sendingCode.value = false;

  if (res) {
    message.success(t("login.verificationCodeSent"));
    startCountdown();
  }
};

// 开始倒计时
const startCountdown = () => {
  timeLeft.value = 60000; // 60秒
  countdownTimer = setInterval(() => {
    timeLeft.value -= 1000;
    if (timeLeft.value <= 0) {
      clearInterval(countdownTimer!);
      countdownTimer = null;
    }
  }, 1000);
};

// 注册处理
const handleRegister = async () => {
  if (!agree.value) {
    message.warning(t("login.agreeToRegister"));
    return;
  }

  registerLoading.value = true;

  const params = {
    f_Mobile: formData.f_Mobile,
    f_Password: formData.f_Password,
    f_VerificationCode: formData.f_VerificationCode,
    f_UserName: "",
    f_CompanyName: "",
    f_Email: "",
    f_IndustryCategory: "",
    f_Job: "",
    f_Secretkey: "",
  };

  const [err, res] = await awaitWrapper(userRegist(params));
  registerLoading.value = false;

  if (res) {
    message.success(t("login.registerSuccessLogin"));
    router.go(-1);
  }
};

// 导航方法
const goBack = () => {
  router.go(-1);
};

const goToUseAgreement = (e: Event) => {
  e.stopPropagation();
  e.preventDefault();
  router.push("/doc/use_agreement");
};

const goToPrivacyPolicy = (e: Event) => {
  e.stopPropagation();
  e.preventDefault();
  router.push("/doc/privacy_policy");
};

// 样式
const inputStyle = {
  width: "340px",
  height: "52px",
  borderRadius: "14px",
  fontSize: "16px",
  fontWeight: "500",
  padding: "15px 20px",
  boxSizing: "border-box" as const,
};

// 清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  // 取消防抖函数
  // debouncedCheckPhone.cancel()
});
</script>

<style lang="scss" scoped>
.signup-form {
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

.register-btn {
  margin-top: 38px;
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

.agreement-checkbox {
  font-size: 14px;
  color: #999999;
  margin: 20px 0 70px;
}
</style>
