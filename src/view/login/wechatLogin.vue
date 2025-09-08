<!--  -->
<template>
  <div class="wechat-login-form">
    <div class="title">{{ t("login.wechatLogin") }}</div>

    <div class="tab-row">
      <div class="tab-item" @click="goToPasswordLogin">
        {{ t("login.passwordLogin") }}
      </div>
      <div class="tab-item" @click="goToVerCodeLogin">
        {{ t("login.verificationCodeLogin") }}
      </div>
    </div>

    <div class="qr-container">
      <!-- 二维码显示区域 -->
      <div v-if="ticket && !qrCodeLoading" class="qr-content">
        <img
          :src="`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(
            ticket
          )}`"
          width="220"
          height="220"
          :alt="t('login.wechatQRCode')"
        />
        <div class="qr-tip">
          <div>{{ t("login.scanToLogin") }}</div>
          <div style="text-align: center">"{{ t("login.companyName") }}"</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div
        v-if="qrCodeLoading || (!ticket && !qrCodeIsError)"
        class="loading-overlay"
      >
        <div v-if="qrCodeIsError" class="error-message">
          <span style="color: white">{{ t("login.getQRCodeFailed") }}</span>
        </div>
        <div v-else class="loading-content">
          <a-spin size="large" />
          <div class="loading-text">{{ t("login.gettingQRCode") }}</div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="qrCodeIsError && !qrCodeLoading" class="error-overlay">
        <div class="error-message">
          <span style="color: white">{{ t("login.getQRCodeFailed") }}</span>
          <a-button
            type="primary"
            size="small"
            @click="retryGetQRCode"
            style="margin-top: 10px"
          >
            {{ t("login.retryGet") }}
          </a-button>
        </div>
      </div>

      <!-- 登录状态覆盖层 -->
      <div v-if="loging" class="login-overlay">
        <a-spin size="large" />
        <div class="loading-text">{{ t("login.loggingIn") }}</div>
      </div>
    </div>

    <div class="agreement-text">
      <span>{{ t("login.scanRegisterAgree") }}</span>
      <a @click="goToUseAgreement">{{ t("login.useAgreement") }}</a>
      <span>{{ t("login.and") }}</span>
      <a @click="goToPrivacyPolicy">{{ t("login.privacyPolicy") }}</a>
      <span>{{ t("login.endBracket") }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";

const { t } = useI18n();
import {
  getWeChatQRCodeInfo,
  getWeChatUserInfoByTick,
  userLoginByWechat,
  awaitWrapper,
} from "@/api";
import { useUserStore } from "@/store";
import { useStorage } from "@/hooks";
import { RouteHomeRedirectPath } from "@/router";
import LoginLayout from "./Index.vue";

const router = useRouter();
const storage = useStorage();
const userStore = useUserStore();

// 状态
const ticket = ref("");
const sceneId = ref("");
const qrCodeIsError = ref(false);
const loging = ref(false);
const qrCodeLoading = ref(true);
let isScanOver = false;
let pollTimer: number | null = null;

// 获取二维码信息
const getQRCodeInfo = async () => {
  qrCodeLoading.value = true;
  const [err, res] = await awaitWrapper(getWeChatQRCodeInfo());

  if (res && res.data) {
    try {
      const { scene_id, qr_info } = res.data;
      const qrData = JSON.parse(qr_info);

      if (!qrData.ticket || !scene_id) {
        qrCodeIsError.value = true;
        qrCodeLoading.value = false;
        message.error(qrData.errmsg || t("login.qrCodeGetFailed"));
        return;
      }

      ticket.value = qrData.ticket;
      sceneId.value = scene_id;
      qrCodeLoading.value = false;
    } catch (error) {
      qrCodeIsError.value = true;
      qrCodeLoading.value = false;
      message.error(t("login.qrCodeParseFailed"));
    }
  } else {
    qrCodeIsError.value = true;
    qrCodeLoading.value = false;
    message.error(t("login.qrCodeGetFailed"));
  }
};

// 微信登录
const wechatLogin = async (userInfo: {
  openid: string;
  unionid: string;
  nickname: string;
  sex: number;
  headimgurl: string;
}) => {
  const [err, res] = await awaitWrapper(
    userLoginByWechat({
      f_OpenId: userInfo.openid,
      f_UnionId: userInfo.unionid,
      f_UserName: userInfo.nickname,
      f_Sex: String(userInfo.sex),
      f_HeadImgurl: userInfo.headimgurl,
    })
  );

  if (res && res.data) {
    // 保存用户信息
    storage.setToken(res.data.token || res.data.f_Token);
    storage.setRefreshToken(res.data.refreshtoken || res.data.f_RefreshToken);

    userStore.setId(res.data.f_UserId);
    userStore.setName(res.data.f_UserName);
    userStore.setAvatar(res.data.f_HeadImgurl);
    if (res.data.f_Mobile?.trim()) {
      userStore.setMobile(res.data.f_Mobile);
    }

    // 检查是否需要绑定手机号
    if (!res.data.f_Mobile?.trim()) {
      console.log(res.data);
      await router.replace("/login/bind_phonenum");
    } else {
      const needLoginFromPath = sessionStorage
        .getItem("needLoginFromPath")
        ?.trim();
      sessionStorage.removeItem("needLoginFromPath");
      await router.replace(needLoginFromPath || RouteHomeRedirectPath);
    }
  } else {
    // API调用失败，可能是新用户需要绑定手机号
    // 先保存微信用户信息到store和sessionStorage，供绑定页面使用
    userStore.setName(userInfo.nickname);
    userStore.setAvatar(userInfo.headimgurl);

    // 保存完整的微信用户信息到sessionStorage
    sessionStorage.setItem("wechatUserInfo", JSON.stringify(userInfo));

    // 跳转到绑定手机号页面
    await router.replace("/login/bind_phonenum");
  }

  loging.value = false;
};

// 轮询检查扫码状态
const checkScanStatus = async () => {
  if (!sceneId.value || isScanOver) return;

  const [err, res] = await awaitWrapper(
    getWeChatUserInfoByTick({
      scene_Id: sceneId.value,
    })
  );

  if (res && res.data && res.data !== "0") {
    if (isScanOver) return;

    isScanOver = true;
    loging.value = true;

    try {
      const userInfo = JSON.parse(res.data);
      await wechatLogin(userInfo);
    } catch (error) {
      loging.value = false;
      message.error(t("login.loginInfoParseFailed"));
    }
  }
};

// 开始轮询
const startPolling = () => {
  pollTimer = setInterval(checkScanStatus, 1000);
};

// 导航方法
const goToPasswordLogin = () => {
  router.push("/login/account/password");
};

const goToVerCodeLogin = () => {
  router.push("/login/account/ver_code");
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

// 重试获取二维码
const retryGetQRCode = async () => {
  qrCodeIsError.value = false;
  isScanOver = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  await getQRCodeInfo();
  if (ticket.value && sceneId.value) {
    startPolling();
  }
};

// 组件挂载时初始化
onMounted(async () => {
  await getQRCodeInfo();
  if (ticket.value && sceneId.value) {
    startPolling();
  }
});

// 组件卸载时清理
onUnmounted(() => {
  isScanOver = false;
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});
</script>

<style lang="scss" scoped>
.wechat-login-form {
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

.tab-row {
  display: flex;
  font-size: 20px;
  font-weight: 500;
  color: #999999;
  margin-bottom: 20px;

  .tab-item {
    cursor: pointer;
    margin-right: 22px;
  }
}

.qr-container {
  width: 340px;
  height: 360px;
  background: #ffffff;
  border: 1px solid #ededed;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .qr-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    .qr-tip {
      font-size: 14px;
      color: #333333;
      line-height: 20px;
      margin-top: 20px;
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .error-message {
      color: white;
      text-align: center;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      :deep(.ant-spin-dot-item) {
        background-color: white !important;
      }
    }

    .loading-text {
      color: white;
      font-size: 14px;
      margin-top: 15px;
    }
  }

  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    .error-message {
      color: white;
      text-align: center;
    }
  }

  .login-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    :deep(.ant-spin-dot-item) {
      background-color: white !important;
    }

    .loading-text {
      color: white;
      font-size: 14px;
      margin-top: 15px;
    }
  }
}

.agreement-text {
  font-size: 14px;
  color: #999999;
  margin: 20px 0 70px;

  a {
    color: #1890ff;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.custom-loading-icon {
  animation: spin 1s linear infinite;
}
</style>
