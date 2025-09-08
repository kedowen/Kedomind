<!--  -->
<template>
  <div class="login-layout" :class="{ 'mobile-layout': isMobile }">
    <WindowControls />
    <div class="login-layout-content">
      <!-- 桌面端布局 -->
      <template v-if="!isMobile">
        <div class="lang-switch">
          <a-dropdown>
            <template #overlay>
              <a-menu @click="changeLang">
                <a-menu-item
                  v-for="lang in SUPPORTED_LANGUAGES"
                  :key="lang.key"
                  >{{ lang.label }}</a-menu-item
                >
              </a-menu>
            </template>
            <a-button type="text" size="small">
              <template #icon>
                <GlobalOutlined />
              </template>
              {{ currentLangLabel }}
            </a-button>
          </a-dropdown>
        </div>
        <!-- 左侧品牌展示区 -->
        <div class="brand-section">
          <div class="brand-content">
            <img
              src="@/assets/logo/logo-kedo.png"
              alt="KEDO"
              class="brand-logo"
            />
            <div class="brand-slogan">
              <span class="gradient-text">{{ displayedText }}</span>
            </div>
            <div class="brand-desc">{{ t("login.brandDescription") }}</div>
          </div>
        </div>

        <!-- 右侧登录表单区 -->
        <div class="form-section">
          <div class="form-blur-bg"></div>
          <div class="form-container">
            <router-view />
          </div>
        </div>

        <!-- 底部备案信息 -->
        <div class="footer-beian" @click="openBeian">
          {{ t("login.companyInfo") }}
        </div>
      </template>

      <!-- 移动端布局 -->
      <template v-else>
        <!-- 顶部区域：logo + 语言切换 -->
        <div class="mobile-header">
          <img
            src="@/assets/logo/logo-kedo.png"
            alt="KEDO"
            class="mobile-logo"
          />
          <a-dropdown>
            <template #overlay>
              <a-menu @click="changeLang">
                <a-menu-item
                  v-for="lang in SUPPORTED_LANGUAGES"
                  :key="lang.key"
                  >{{ lang.label }}</a-menu-item
                >
              </a-menu>
            </template>
            <a-button type="text" size="small">
              <template #icon>
                <GlobalOutlined />
              </template>
              {{ currentLangLabel }}
            </a-button>
          </a-dropdown>
        </div>

        <!-- 主要内容区域：router-view -->
        <div class="mobile-content">
          <router-view />
        </div>

        <!-- 底部版权信息 -->
        <div class="mobile-footer" @click="openBeian">
          {{ t("login.companyInfo") }}
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { GlobalOutlined } from "@ant-design/icons-vue";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { useLanguageStore } from "@/store/language";
import router, { RouteHomeRedirectPath } from "@/router";
import { awaitWrapper, getUserinfoByGoogle } from "@/api";
import { useUserStore } from "@/store";
import { useStorage } from "@/hooks";
import { WindowControls } from "@/components/header";

const { t, locale } = useI18n();
const languageStore = useLanguageStore();
const userStore = useUserStore();
const storage = useStorage();

// 响应式布局控制
const isMobile = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth <= 768;
}

const currentLangLabel = computed(() => {
  const found = SUPPORTED_LANGUAGES.find((l) => l.key === locale.value);
  return found ? found.label : locale.value;
});

function changeLang({ key }) {
  const found = SUPPORTED_LANGUAGES.find((l) => l.key === key);
  locale.value = key;
  languageStore.setLanguage(key);
}

// 打字机动画实现
const displayedText = ref("");
let typewriterTimer: number | null = null;
function startTypewriter(text: string) {
  displayedText.value = "";
  let i = 0;
  if (typewriterTimer) clearInterval(typewriterTimer);
  typewriterTimer = window.setInterval(() => {
    displayedText.value = text.slice(0, i + 1);
    i++;
    if (i >= text.length) {
      clearInterval(typewriterTimer!);
      typewriterTimer = null;
    }
  }, 80);
}

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  startTypewriter(t("login.aiThinkingToolchain"));
  // 检查是否是Google OAuth回调
  handleGoogleOAuthCallback();
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

// 处理Google OAuth回调
async function handleGoogleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const error = urlParams.get("error");
  console.log(urlParams);

  if (error) {
    console.error("Google OAuth错误:", error);
    message.error(t("login.googleLoginFailed") + ": " + error);
    // 清理URL参数
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (code) {
    console.log("收到Google OAuth授权码:", code);
    await exchangeCodeForToken(code);
    // 清理URL参数
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
// 用授权码换取token
async function exchangeCodeForToken(code: string) {
  try {
    message.loading(t("login.verifyingGoogleLogin"), 0);

    const [err, data] = await awaitWrapper(
      getUserinfoByGoogle({
        authCode: code,
      })
    );
    console.log("exchangeCodeForToken data->", data);
    message.destroy(); // 清除loading消息
    console.log("Google登录API响应:", {
      success: data.success,
      hasToken: !!data.token,
    });

    if (data.success && data.token) {
      // 登录成功，保存token等
      storage.setToken(data.token);
      if (data.refreshToken) {
        storage.setRefreshToken(data.refreshToken);
      }

      // 设置用户信息
      if (data.userInfo) {
        userStore.setId(data.userInfo.id);
        userStore.setName(data.userInfo.name);
        userStore.setAvatar(data.userInfo.avatar);
      }

      message.success("Google 登录成功");

      // 延迟一点再跳转，让用户看到成功提示
      setTimeout(async () => {
        // 检查是否有重定向路径
        const needLoginFromPath = sessionStorage
          .getItem("needLoginFromPath")
          ?.trim();
        sessionStorage.removeItem("needLoginFromPath");

        console.log("准备跳转到:", needLoginFromPath || RouteHomeRedirectPath);

        // 跳转到指定页面
        await router.replace(needLoginFromPath || RouteHomeRedirectPath);
      }, 1000);
    } else {
      message.error(data.message || "Google 登录失败");
    }
  } catch (error) {
    message.destroy();
    console.error("Google登录处理异常:", error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      message.error(t("login.networkConnectionFailed"));
    } else {
      message.error(t("login.googleLoginException"));
    }
  }
}

watch(
  () => t("login.aiThinkingToolchain"),
  (val) => {
    startTypewriter(val);
  }
);

const openBeian = () => {
  window.open("https://beian.miit.gov.cn");
};
</script>

<style lang="scss" scoped>
.login-layout {
  width: 100vw;
  height: 100vh;

  &-content {
    width: 100%;
    height: calc(100vh - 32px);
    display: flex;
    justify-content: space-between;
    background: linear-gradient(
      135deg,
      rgba(236, 228, 255, 0.5),
      #ffffff 21%,
      #ffffff 49%,
      rgba(255, 255, 255, 0.72) 78%,
      rgba(222, 238, 255, 0.5)
    );
    overflow: hidden;
    position: relative;
  }

  &.mobile-layout {
    flex-direction: column;
    height: 100vh;
  }
}

.lang-switch {
  position: absolute;
  top: 24px;
  left: 32px;
  z-index: 10;
}

.brand-section {
  margin-left: 12%;
  width: 40%;
  min-width: 320px;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .brand-content {
    .brand-logo {
      width: 241px;
      height: 80px;
    }

    .brand-slogan {
      font-size: 46px;
      color: #000000;
      margin-top: 20px;
      display: flex;
      align-items: center;
      word-break: break-word;
      white-space: normal;
      max-width: 100%;
      text-align: left;
      .gradient-text {
        font-weight: 550;
        background: linear-gradient(
          90deg,
          #1ed7ff 0%,
          #3e50e6 50%,
          #0009e1 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        white-space: normal;
        word-break: break-word;
        overflow: hidden;
        text-align: left;
      }
    }

    .brand-desc {
      font-size: 20px;
      color: #808080;
      margin-top: 10px;
      word-break: break-word;
      white-space: normal;
      max-width: 100%;
      text-align: left;
    }
  }
}

.form-section {
  position: relative;
  width: auto;
  min-width: 340px;
  max-width: 90vw;
  min-height: 620px;
  margin-right: 12%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  flex-shrink: 0;

  .form-blur-bg {
    position: absolute;
    opacity: 0.2;
    background: linear-gradient(181deg, #2affdb 0%, #533aff 100%);
    filter: blur(50px);
    z-index: 0;
    left: 80px;
    top: 140px;
    right: -65px;
    bottom: 140px;
  }

  .form-container {
    width: auto;
    min-width: 320px;
    max-width: 600px;
    min-height: 620px;
    background: #ffffff;
    border-radius: 30px;
    box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    z-index: 1;
    position: relative;
    padding: 60px 32px;
  }
}

.footer-beian {
  color: rgb(187, 187, 187);
  font-family: Arial, sans-serif;
  font-size: 12px;
  position: fixed;
  bottom: 10px;
  left: 0;
  right: 0;
  text-align: center;
  cursor: pointer;
}

/* 原有的媒体查询已被 JavaScript 响应式控制替代 */

/* 移动端样式 */
.mobile-header {
  width: 100vw;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  flex-shrink: 0;

  .mobile-logo {
    width: 100px;
    height: 33px;
  }
}

.mobile-content {
  flex: 1;
  width: calc(100vw - 40px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.mobile-footer {
  width: 100vw;
  padding: 15px 20px;
  text-align: center;
  font-size: 12px;
  color: rgb(187, 187, 187);
  font-family: Arial, sans-serif;
  cursor: pointer;
  box-sizing: border-box;
  flex-shrink: 0;
}
</style>
