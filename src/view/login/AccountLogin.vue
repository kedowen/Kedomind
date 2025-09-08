<!--  -->
<template>
  <div class="login-form">
    <div class="title">{{ t("login.welcomeLogin") }}</div>
    <div class="tab-row">
      <div
        class="tab-item"
        :class="{ active: loginType === 'password' }"
        @click="setLoginType('password')"
      >
        {{ t("login.passwordLogin") }}
      </div>
      <div
        class="tab-item"
        :class="{ active: loginType === 'ver_code' }"
        @click="setLoginType('ver_code')"
      >
        {{ t("login.verificationCodeLogin") }}
      </div>
    </div>

    <a-form :model="formData" @finish="handleLogin" autocomplete="off">
      <a-form-item
        name="f_Account"
        :rules="[
          { required: true, message: t('login.phoneNumberRequired') },
          {
            pattern: /^(?:(?:\+|00)86)?1[3-9]\d{9}$/,
            message: t('login.invalidPhoneNumber'),
          },
        ]"
      >
        <a-input
          v-model:value="formData.f_Account"
          :placeholder="t('login.phoneNumber')"
          :style="inputStyle"
        />
      </a-form-item>

      <!-- 密码登录模式 -->
      <template v-if="loginType === 'password'">
        <a-form-item
          name="f_Password"
          :rules="[{ required: true, message: t('login.passwordRequired') }]"
        >
          <a-input-password
            v-model:value="formData.f_Password"
            :placeholder="t('login.password')"
            :style="{ ...inputStyle }"
          />
        </a-form-item>
        <div class="bottom-links input-row">
          <div class="register-area">
            {{ t("login.noAccount") }}
            <a-button type="link" style="padding: 0" @click="goToSignUp">
              {{ t("login.freeRegister") }}
            </a-button>
          </div>
          <a-button
            type="link"
            class="forget-btn"
            @click="goToForgetPassword"
            style="padding: 0; color: #1e9cff; font-size: 14px"
          >
            {{ t("login.forgotPassword") }}
          </a-button>
        </div>
      </template>

      <!-- 验证码登录模式 -->
      <template v-if="loginType === 'ver_code'">
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
              :style="{ ...inputStyle, paddingRight: '90px' }"
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
      </template>

      <a-button
        type="primary"
        html-type="submit"
        block
        :loading="loginLoading"
        :disabled="loginLoading"
        class="login-btn"
      >
        {{ t("login.login") }}{{ loginLoading ? t("login.loggingIn") : "" }}
      </a-button>
    </a-form>

    <a-divider class="divider">{{ t("login.thirdPartyLogin") }}</a-divider>

    <div class="third-party-login">
      <a-button block class="third-party-btn" @click="goToWechatLogin">
        <div class="third-party-content">
          <img
            src="@/assets/images/logo-wechat.svg"
            alt=""
            class="third-party-icon"
          />
          <span class="third-party-text">{{ t("login.wechatLogin") }}</span>
        </div>
      </a-button>
      <a-button
        block
        class="third-party-btn"
        @click="handleGoogleLogin"
        :loading="googleLoading"
        style="margin-top: 16px"
      >
        <div class="third-party-content">
          <img
            src="@/assets/images/logo-google.png"
            alt=""
            class="third-party-icon"
          />
          <span class="third-party-text">{{ t("login.googleLogin") }}</span>
        </div>
      </a-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onUnmounted, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, useRoute } from "vue-router";
import { message } from "ant-design-vue";
import {
  userLoginByAccount,
  userLoginByMobile,
  getVerificationCode,
  awaitWrapper,
  getUserinfoByGoogle,
} from "@/api";
import { useUserStore } from "@/store";
import { useStorage } from "@/hooks";
import { RouteHomeRedirectPath } from "@/router";
import LoginLayout from "./Index.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const storage = useStorage();
const userStore = useUserStore();

// 表单相关
const formData = reactive({
  f_Account: "",
  f_Password: "",
  f_VerificationCode: "",
});

// 登录类型
const loginType = ref<"password" | "ver_code">("password");

// 根据路由设置初始登录类型
onMounted(() => {
  const type = route.params.type;
  if (type) {
    loginType.value = type === "password" ? "password" : "ver_code";
  }
});



// 加载状态
const loginLoading = ref(false);
const sendingCode = ref(false);

// 倒计时
const timeLeft = ref(0);
let countdownTimer: number | null = null;

// Google OAuth 配置
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_AUTH_API = import.meta.env.VITE_GOOGLE_AUTH_API;

// 设置登录类型
const setLoginType = (type: "password" | "ver_code") => {
  loginType.value = type;
  // 清空表单
  formData.f_Password = "";
  formData.f_VerificationCode = "";

  // 更新路由
  if (type === "password") {
    router.replace("/login/account/password");
  } else {
    router.replace("/login/account/ver_code");
  }
};

// 发送验证码
const handleSendCode = async () => {
  if (sendingCode.value || timeLeft.value > 0) return;

  const mobile = formData.f_Account;
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

// 登录处理
const handleLogin = async () => {
  loginLoading.value = true;

  try {
    let apiCall;
    let params;

    if (loginType.value === "password") {
      apiCall = userLoginByAccount;
      params = {
        f_Account: formData.f_Account,
        f_Password: formData.f_Password,
      };
    } else {
      apiCall = userLoginByMobile;
      params = {
        f_Mobile: formData.f_Account,
        f_VerificationCode: formData.f_VerificationCode,
      };
    }

    const [err, res] = await awaitWrapper(apiCall(params));

    if (res && res.data) {
      // 1. 先保存用户信息到 localStorage（同步操作）
      storage.setToken(res.data.token || res.data.f_Token);
      storage.setRefreshToken(res.data.refreshToken || res.data.f_RefreshToken);

      // 2. 批量更新 store 状态
      userStore.setId(res.data.f_UserId);
      userStore.setName(res.data.f_UserName);
      userStore.setAvatar(res.data.f_HeadImgurl);
      if (res.data.f_Mobile?.trim()) {
        userStore.setMobile(res.data.f_Mobile);
      }

      // 3. 显示成功提示
      message.success(t("login.loginSuccess"));

      // 5. 检查是否需要绑定手机号
      if (!res.data.f_Mobile?.trim()) {
        await router.replace("/login/bind_phonenum");
      } else {
        // 检查是否有重定向路径
        const needLoginFromPath = sessionStorage
          .getItem("needLoginFromPath")
          ?.trim();
        sessionStorage.removeItem("needLoginFromPath");

        // 6. 立即跳转路由
        await router.replace(needLoginFromPath || RouteHomeRedirectPath);
      }
    }
  } catch (error) {
    console.error("登录失败:", error);
  } finally {
    loginLoading.value = false;
  }
};

// 导航方法
const goToForgetPassword = () => {
  router.push("/login/forget_password");
};

const goToSignUp = () => {
  router.push("/login/sign_up");
};

const goToWechatLogin = () => {
  router.push("/login/wechat");
};

const googleLoading = ref(false);

// Google OAuth登录 - 使用跳转方案
function handleGoogleLogin() {
  googleLoading.value = true;

  // 从环境变量获取重定向URI
  const redirectUri = window.location.origin;

  const googleAuthParams = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${googleAuthParams.toString()}`;

  console.log("跳转到Google登录页面:", googleAuthUrl);

  // 跳转到Google登录页面
  window.location.href = googleAuthUrl;
}

// 样式对象
const inputStyle = {
  width: "340px",
  height: "52px",
  borderRadius: "14px",
  fontSize: "16px",
  fontWeight: "500",
  padding: "15px 20px",
  boxSizing: "border-box" as const,
};

// 组件销毁时清理定时器
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>

<style lang="scss" scoped>
.login-form {
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
  white-space: normal;
  word-break: break-word;
  line-height: 1.2;
}

.tab-row {
  display: flex;
  font-size: 20px;
  font-weight: 500;
  color: #999999;
  margin-bottom: 20px;

  .tab-item {
    cursor: pointer;

    &.active {
      color: #000000;
    }

    &:nth-child(2) {
      margin-left: 22px;
    }
  }
}

.input-row {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.register-area {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #999999;
}

.forget-btn,
.register-btn {
  font-size: 14px;
  color: #1e9cff;
  padding: 0 8px;
  background: transparent;
  display: flex;
  align-items: center;
  white-space: nowrap;
  border: none;
  box-shadow: none;
}

.code-btn {
  position: absolute;
  right: 0;
  height: 100%;
  font-size: 16px;
}

.login-btn {
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

.divider {
  font-size: 12px;
  color: #808080;
  margin: 38px 0 0;
}

.third-party-login {
  width: 100%;
}

.third-party-btn {
  background: #fff;
  border: 1px solid #e0e0e0;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  height: 52px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-size: 16px;
  padding: 0 24px;
}
.third-party-btn:hover {
  border-color: #1e9cff;
  box-shadow: 0 4px 16px 0 rgba(30, 156, 255, 0.08);
}

.third-party-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.third-party-icon {
  width: 26px;
}

.third-party-text {
  margin-left: 14px;
  font-size: 16px;
}
</style>
