<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useUserStore } from "@/store/user";
import { useStorage } from "@/hooks";
import { useRouter } from "vue-router";
import { awaitWrapper, getUserInfoByToken } from "@/api";
import { RouteHomeRedirectPath } from "@/router";
import { Progress, message, ConfigProvider, theme } from "ant-design-vue";
import { MoveModal } from "@/components/modal";
import { useI18n } from "vue-i18n";
import { useLanguageStore, useThemeStore } from "@/store";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import zhTW from "ant-design-vue/es/locale/zh_TW";
import enUS from "ant-design-vue/es/locale/en_US";
import jaJP from "ant-design-vue/es/locale/ja_JP";
import ruRU from "ant-design-vue/es/locale/ru_RU";

const storage = useStorage();
const userStore = useUserStore();
const router = useRouter();
const { t } = useI18n();
const languageStore = useLanguageStore();
const themeStore = useThemeStore();
const isBlocked = ref(false);

// Ant Design locale配置映射
const antdLocaleMap = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en-US": enUS,
  "ja-JP": jaJP,
  "ru-RU": ruRU,
};

// 当前Ant Design locale
const currentAntdLocale = computed(() => {
  return antdLocaleMap[languageStore.currentLanguage] || enUS;
});

// Ant Design主题配置
const antdThemeConfig = computed(() => {
  const colors = themeStore.currentColors;

  return {
    algorithm: themeStore.isDarkMode
      ? [theme.darkAlgorithm]
      : [theme.defaultAlgorithm],
    token: {
      // 使用store中的颜色值
      colorPrimary: colors["--primary-color"],
      colorPrimaryHover: colors["--primary-color"],
      colorPrimaryActive: colors["--primary-color"],
      colorPrimaryText: colors["--primary-color"],
      colorPrimaryTextHover: colors["--primary-color"],
      colorPrimaryBg: colors["--primary-bg"],
      colorPrimaryBgHover: colors["--primary-bg"],
      // 使用主题配置中的背景和文字颜色
      colorBgContainer: colors["--main-bg"],
      colorBgElevated: colors["--secondary-bg"],
      colorBgLayout: colors["--main-bg"],
      colorText: colors["--text-color"],
      colorTextSecondary: colors["--text-color"],
      colorBorder: colors["--border-color"],
      colorSplit: colors["--border-color"],
      boxShadow: "none",
    },
  };
});

// 自动更新相关
const showUpdateModal = ref(false);
const showProgress = ref(false);
const showDownloadedModal = ref(false);
const updateInfo = ref(null);
const downloadProgress = ref(0);

onMounted(() => {
  // if (window.electronAPI) {
  //   window.electronAPI.onUpdateAvailable((info) => {
  //     updateInfo.value = info
  //     showUpdateModal.value = truecdcd
  //   })
  //   window.electronAPI.onUpdateDownloadProgress((progress) => {
  //     showProgress.value = true
  //     downloadProgress.value = Math.floor(progress.percent)
  //   })
  //   window.electronAPI.onUpdateDownloaded(() => {
  //     showProgress.value = false
  //     showDownloadedModal.value = true
  //   })
  //   window.electronAPI.onUpdateError((err) => {
  //     showProgress.value = false
  //     showUpdateModal.value = false
  //     showDownloadedModal.value = false
  //     message.error(t('update.updateError') + err)
  //   })
  // }
});

function startDownloadUpdate() {
  showUpdateModal.value = false;
  showProgress.value = true;
  window.electronAPI && window.electronAPI.startDownloadUpdate();
}
function cancelUpdate() {
  showUpdateModal.value = false;
}
function quitAndInstall() {
  window.electronAPI && window.electronAPI.quitAndInstall();
}
function closeDownloadedModal() {
  showDownloadedModal.value = false;
}
// 检查地理位置限制
async function checkGeoRestriction() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    console.log("data", data);

    // 检查是否为中国地区（包括香港、澳门、台湾）
    const blockedCountries = ["CN", "HK", "MO", "TW"];

    if (blockedCountries.includes(data.country_code)) {
      isBlocked.value = true;
      // 可选：重定向到其他页面或显示替代内容
      document.body.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: #f5f5f5;
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <h1 style="color: #ff4d4f; margin-bottom: 20px;">访问受限 / Access Restricted</h1>
          <p style="color: #666; max-width: 500px;">
            抱歉，该服务在您所在的地区不可用。<br><br>
            Sorry, this service is not available in your region. Please contact support if you have any questions.
          </p>
        </div>
      `;
    }
  } catch (error) {
    console.error("地理位置检查失败:", error);
    // 如果API调用失败，可以选择允许访问或使用备用方案
  }
}

async function actLogin() {
  // 获取查询字符串（不包括问号）
  const queryString = window.location.search;
  // 使用 URLSearchParams 解析查询字符串
  const urlParams = new URLSearchParams(queryString);
  const route = router.currentRoute.value;

  const token = route.redirectedFrom?.query?.token || urlParams.get("token");
  const refreshToken =
    route.redirectedFrom?.query?.refreshToken || urlParams.get("refreshToken");

  if (!token || !refreshToken) {
    // 如果URL中没有token，不做任何处理，让路由守卫正常工作
    return;
  }

  // 存储token
  storage.setToken(String(token));
  storage.setRefreshToken(String(refreshToken));

  // 通过token获取用户信息
  const [err, res] = await awaitWrapper(getUserInfoByToken({ token }));

  if (res && res.data) {
    // 设置用户信息
    userStore.setId(res.data.f_UserId);
    userStore.setName(res.data.f_UserName);
    userStore.setAvatar(res.data.f_HeadImgurl);

    // 跳转到主页
    router.replace(RouteHomeRedirectPath);
  } else {
    // 验证失败，跳转到401页面
    router.replace("/401");
  }
}

// 监听语言变化，同步更新i18n
watch(
  () => languageStore.currentLanguage,
  (newLanguage) => {
    // 更新i18n的locale
    if (window.i18n) {
      window.i18n.global.locale.value = newLanguage;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  console.log("themeStore.isDarkMode", themeStore.isDarkMode);

  // 首先检查地理位置限制
  // await checkGeoRestriction();

  // 如果没有被阻止，则执行正常的登录逻辑
  if (!isBlocked.value) {
    actLogin();
  }
});
</script>

<template>
  <a-config-provider
    :theme="antdThemeConfig"
    :locale="currentAntdLocale"
    v-if="!isBlocked"
  >
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component
          :is="Component"
          :key="route.name"
          v-if="route.meta.keepAlive"
        />
      </keep-alive>
      <component
        :is="Component"
        :key="route.name"
        v-if="!route.meta.keepAlive"
      />
    </router-view>
    <!-- 自动更新：新版本提示 -->
    <!-- <MoveModal v-model:open="showUpdateModal" :title="t('update.newVersionFound')"  :footer="null">
      <template #default>
        {{ t('update.newVersionDesc') }}<br />
        <span v-if="updateInfo">{{ t('update.versionNumber') }}{{ updateInfo.version }}</span>
      </template>
      <template #footer>
        <a-button @click="cancelUpdate">{{ t('update.later') }}</a-button>
        <a-button type="primary" @click="startDownloadUpdate">{{ t('update.downloadNow') }}</a-button>
      </template>
    </MoveModal> -->
    <!-- 自动更新：下载进度 -->
    <!-- <MoveModal v-model:open="showProgress" :title="t('update.downloading')" :footer="null" :closable="false">
      <template #default>
        <div style="display: flex; justify-content: center; align-items: center; padding: 20px;">
          <a-progress type="circle" :percent="downloadProgress" status="active" />
        </div>
      </template>
    </MoveModal> -->
    <!-- 自动更新：下载完成提示 -->
    <!-- <MoveModal v-model:open="showDownloadedModal" :title="t('update.downloadComplete')"  :footer="null">
      <template #default>
        {{ t('update.downloadCompleteDesc') }}
      </template>
      <template #footer>
        <a-button @click="closeDownloadedModal">{{ t('update.later') }}</a-button>
        <a-button type="primary" @click="quitAndInstall">{{ t('update.restartNow') }}</a-button>
      </template>
    </MoveModal> -->
  </a-config-provider>
</template>

<style lang="scss" scoped>
</style>
