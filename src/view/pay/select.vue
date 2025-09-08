<template>
  <div class="payment-container">
    <!-- 返回按钮 - 左上角 -->
    <div class="top-nav">
      <a-button
        type="text"
        size="large"
        @click="$router.push('/chat')"
        class="back-button"
      >
        <ArrowLeftOutlined />
        {{ $t("common.back") }}
      </a-button>
    </div>

    <div class="payment-header">
      <h1 class="payment-title">{{ $t("payment.title") }}</h1>
      <p class="payment-subtitle">{{ $t("payment.subtitle") }}</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="packageLoading" class="loading-state">
      <a-spin size="large" />
      <p>{{ $t("pay.loadingPackageInfo") }}</p>
    </div>

         <!-- 套餐列表和自定义金额 -->
     <div v-else-if="packageList.length > 0" class="plans-container">
       <a-card
         v-for="plan in packageList"
         :key="plan.id"
         class="plan-card"
         hoverable
         :class="{ active: plan.isChoose }"
         @click="selectPlan(plan)"
       >
         <div class="plan-content">
           <div class="plan-header">
             <h3 class="plan-name">{{ plan.time }}</h3>
             <div class="plan-price">
               <span class="currency">¥</span>
               <span class="amount">{{ formatPrice(plan.nowPrice) }}</span>
               <span
                 v-if="plan.originPrice > plan.nowPrice"
                 class="original-price"
                 >¥{{ formatPrice(plan.originPrice) }}</span
               >
             </div>
           </div>
           <div class="plan-features">
             <div class="feature-item">
               <CheckOutlined class="feature-icon" />
               <span>{{
                 plan.description || $t("pay.recommendedPackage")
               }}</span>
             </div>
           </div>
         </div>
         <div class="plan-footer">
           <a-button
             size="large"
             block
             class="subscribe-btn"
             :type="plan.isChoose ? 'primary' : 'default'"
           >
             {{ plan.isChoose ? $t("pay.selected") : $t("payment.subscribe") }}
           </a-button>
         </div>
         <div v-if="plan.originPrice > plan.nowPrice" class="plan-badge">
           {{ getDiscountText(plan.nowPrice, plan.originPrice) }}
         </div>
       </a-card>
     </div>

     <!-- 自定义金额容器 -->
     <div v-if="packageList.length > 0" class="custom-section">
       <a-card
         class="custom-card"
         :class="{ active: customPriceDetail.isCustom && payMoney > 0 }"
         @click="handleCustomCardClick"
       >
         <div class="custom-content">
           <!-- 未选中状态 -->
           <h3 class="custom-title">{{ $t('pay.customAmount') }}</h3>
           <!-- 选中状态 -->
           <div v-if="customPriceDetail.isCustom" class="custom-expanded">
             <div class="custom-header">
               <div class="custom-price">
                 <span class="currency">¥</span>
                 <span class="amount">{{ customPriceDetail.money || "0" }}</span>
               </div>
             </div>

             <div class="custom-input-wrapper" @click.stop>
               <span class="input-label">{{ $t('pay.amount') }}：</span>
               <a-input-number
                 v-model:value="customPriceDetail.money"
                 :min="1"
                 :max="100000"
                 :step="1"
                 :precision="0"
                 class="custom-input"
                 @change="handleCustomMoneyChange"
                 :placeholder="$t('pay.enterAmount')"
               />
               <span class="input-unit">{{ $t('pay.yuan') }}</span>
             </div>

             <div
               v-if="customPriceDetail.money && customPriceDetail.radio"
               class="token-preview"
             >
               {{ $t('pay.estimatedTokens') }}
               {{
                 formatTokenCount(
                   customPriceDetail.money * customPriceDetail.radio
                 )
               }}
             </div>

             <p class="custom-desc">{{ customPriceDetail.description }}</p>
           </div>
         </div>
       </a-card>
     </div>

    <!-- 操作按钮 -->
    <div v-if="canProceed" class="action-section">
      <a-button type="primary" size="large" @click="handleNext">
        {{ $t("pay.nextStep") }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { message } from "ant-design-vue";
import { CheckOutlined, ArrowLeftOutlined } from "@ant-design/icons-vue";
import { queryProductServices, getTokenPrice } from "@/api/pay";
import { awaitWrapper } from "@/api";
import { useUserStore } from "@/store/user";

const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();

// 套餐数据
const packageList = ref<any[]>([]);
const packageLoading = ref(false);

// 自定义价格详情
const customPriceDetail = reactive({
  proId: "",
  radio: 0,
  originRadio: 0,
  money: 1,
  isCustom: false,
  description: "",
});

// 支付相关
const payMoney = ref(0);
const saveMoney = ref(0);
const payProCode = ref("");

// 计算属性
const canProceed = computed(() => {
  return payMoney.value > 0;
});

// 加载套餐数据
const loadPackageData = async () => {
  packageLoading.value = true;
  try {
    const [err, response] = await awaitWrapper(
      queryProductServices({ F_ProdId: "kedomind" })
    );
    if (err) {
      console.error("加载套餐数据失败:", err);
      message.error(t("pay.loadPackageDataFailed"));
      return;
    }

    if (response?.data && response.data.length > 0) {
      packageList.value = response.data.map((item: any) => ({
        id: item.f_ProdCode,
        nowPrice: Number(item.f_Price),
        originPrice: Number(item.f_OriginalPrice),
        time: item.f_Service_Duration,
        isChoose: false,
        payProCode: item.f_ProdCode,
        description:
          item.f_Description ||
          getPriceDescription(
            Number(item.f_Price),
            Number(item.f_OriginalPrice)
          ),
      }));
    } else {
      console.log("API返回数据为空或格式不正确:", response);
    }
  } catch (error) {
    console.error("加载套餐数据失败:", error);
    message.error(t("pay.loadPackageDataFailed"));
  } finally {
    packageLoading.value = false;
  }
};

// 生成价格描述
const getPriceDescription = (nowPrice: number, originalPrice: number) => {
  if (originalPrice > nowPrice) {
    const discount = Math.round((1 - nowPrice / originalPrice) * 100);
    return t('pay.specialPrice', { discount });
  }
  return t('pay.recommendedPackage');
};

// 获取折扣文本
const getDiscountText = (nowPrice: number, originalPrice: number) => {
  const discount = Math.round((1 - nowPrice / originalPrice) * 100);
  return `${discount}折`;
};

// 加载自定义价格数据
const loadCustomPriceData = async () => {
  try {
    const [err, response] = await awaitWrapper(
      getTokenPrice({ userId: userStore.getUserId as string })
    );
    if (err) {
      console.error("加载自定义价格数据失败:", err);
      return;
    }

    if (response?.data) {
      const data = response.data;
      Object.assign(customPriceDetail, {
        proId: data.f_ProdCode,
        radio: Number(data.f_Price), // 1元可购买的token数量
        originRadio: Number(data.f_OriginalPrice),
        money: 1,
        isCustom: false,
        description: data.f_Description,
      });
    }
  } catch (error) {
    console.error("加载自定义价格数据失败:", error);
  }
};

// 套餐选择处理
const selectPlan = (plan: any) => {
  if (plan.isChoose) {
    // 取消选择
    plan.isChoose = false;
    payMoney.value = 0;
    saveMoney.value = 0;
    payProCode.value = "";
  } else {
    // 选择套餐
    packageList.value.forEach((item) => {
      item.isChoose = item.id === plan.id;
    });
    // 收起自定义金额卡片，但保留金额
    if (customPriceDetail.isCustom) {
      customPriceDetail.isCustom = false;
      payMoney.value = 0;
      saveMoney.value = 0;
      payProCode.value = "";
    }

    payMoney.value = plan.nowPrice;
    saveMoney.value = plan.originPrice - plan.nowPrice;
    payProCode.value = plan.payProCode;
  }
};

// 自定义金额卡片点击
const handleCustomCardClick = () => {
  // 如果还没有展开，则展开并选中
  if (!customPriceDetail.isCustom) {
    customPriceDetail.isCustom = true;
    packageList.value.forEach((item) => {
      item.isChoose = false;
    });
    // 自动选中，使用当前金额
    handleCustomMoneyChange(customPriceDetail.money);
  } else {
    // 如果已经展开，则切换选中状态
    if (payMoney.value > 0) {
      // 取消选中
      payMoney.value = 0;
      saveMoney.value = 0;
      payProCode.value = "";
    } else {
      // 重新选中
      handleCustomMoneyChange(customPriceDetail.money);
    }
  }
};

// 自定义金额变化
const handleCustomMoneyChange = (value: number) => {
  if (!customPriceDetail.isCustom) return;

  customPriceDetail.money = value;
  payMoney.value = value;

  // 计算优惠金额（如果原价和现价不同）
  if (customPriceDetail.originRadio > customPriceDetail.radio) {
    const tokenCount = value * customPriceDetail.radio;
    const originalCost = tokenCount / customPriceDetail.originRadio;
    saveMoney.value = Number((originalCost - value).toFixed(2));
  } else {
    saveMoney.value = 0;
  }

  payProCode.value = customPriceDetail.proId;
};

// 格式化token数量显示
const formatTokenCount = (count: number) => {
  if (count >= 100000000) {
    // >= 1亿
    return `${(count / 100000000).toFixed(1)}亿 tokens`;
  } else if (count >= 10000) {
    // >= 1万
    return `${(count / 10000).toFixed(0)}万 tokens`;
  } else {
    return `${count} tokens`;
  }
};

// 格式化价格显示
const formatPrice = (price: number) => {
  return price % 1 === 0 ? price.toString() : price.toFixed(2);
};

// 下一步
const handleNext = () => {
  if (!canProceed.value) {
    message.warning("请选择套餐");
    return;
  }

  const orderData = {
    list: [
      {
        name: "KedoMind",
        time: customPriceDetail.isCustom
          ? formatTokenCount(customPriceDetail.money * customPriceDetail.radio)
          : packageList.value.find((p) => p.isChoose)?.time || "",
        date: new Date().toLocaleDateString(),
      },
    ],
    totalMoney: payMoney.value,
    proId: payProCode.value,
    productName: "KedoMind",
  };

  router.push({
    name: "payment-confirm",
    query: {
      orderData: JSON.stringify(orderData),
    },
  });
};

// 初始化数据
onMounted(async () => {
  await loadPackageData();
  await loadCustomPriceData();
});

// 当组件被激活时（从缓存中恢复）
onActivated(() => {
  // 如果数据已经加载过，就不需要重新加载
  if (packageList.value.length > 0) {
    console.log("从缓存恢复，跳过数据加载");
    return;
  }

  // 如果数据为空，重新加载
  // loadPackageData();
  // loadCustomPriceData();
});

// 重置缓存数据（可选：用于强制刷新）
const resetCache = () => {
  packageList.value = [];
  packageLoading.value = false;
  customPriceDetail.proId = "";
  customPriceDetail.radio = 0;
  customPriceDetail.originRadio = 0;
  customPriceDetail.money = 1;
  customPriceDetail.isCustom = false;
  customPriceDetail.description = "";
  payMoney.value = 0;
  saveMoney.value = 0;
  payProCode.value = "";

  // 重新加载数据
  loadPackageData();
  loadCustomPriceData();
};
</script>

<style scoped lang="scss">
.payment-container {
  height: 100%;
  padding-top: 20px;
  background-color: $main-bg;
  overflow: auto;
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

.payment-header {
  text-align: center;
  margin-bottom: 3rem;
  margin-top: 3rem; // 给左上角按钮留空间

  .payment-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: $text-color;
    margin-bottom: 0.5rem;
  }

  .payment-subtitle {
    font-size: 1.1rem;
    color: $text-color;
    margin: 0;
  }
}

.loading-state {
  text-align: center;
  padding: 40px;

  p {
    margin-top: 16px;
    color: var(--text-light);
  }
}

.plans-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto 3rem;
}

.plan-card {
  transition: all 0.3s ease;
  height: 100%;
  border: 1px solid $border-color;
  position: relative;
  cursor: pointer;

  &:hover {
    border-color: $primary-color;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);

    .subscribe-btn {
      transition: all 0.5s ease;
      background-color: $primary-color;
      border-color: $primary-color;
      color: white;
    }
  }

  &.active {
    border-color: $primary-color;
    background: $primary-bg;
    box-shadow: 0 4px 12px rgba(30, 156, 255, 0.2);
  }

  :deep(.ant-card-body) {
    padding: 2rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.plan-badge {
  position: absolute;
  top: -1px;
  right: -1px;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: white;
  padding: 4px 12px;
  border-radius: 0 12px 0 12px;
  font-size: 12px;
  font-weight: 600;
}

.subscribe-btn {
  transition: all 0.3s ease;
}

.plan-content {
  flex: 1;
}

.plan-footer {
  margin-top: 1.5rem;
}

.plan-header {
  text-align: center;
  margin-bottom: 2rem;

  .plan-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: $text-color;
    margin-bottom: 1rem;
  }
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.25rem;

  .currency {
    font-size: 1.2rem;
    color: $text-color;
  }

  .amount {
    font-size: 3rem;
    font-weight: 700;
    color: $text-color;
  }

  .original-price {
    font-size: 1.4rem;
    color: #999;
    text-decoration: line-through;
    margin-left: 8px;
  }
}

.plan-features {
  margin-bottom: 2rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;

  .feature-icon {
    color: $primary-color;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  span {
    color: $text-color;
    line-height: 1.5;
  }
}

.custom-section {
  margin: 2rem auto;
  max-width: 1200px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;

  .custom-card {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid $border-color;
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &:hover {
      border-color: $primary-color;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    &.active {
      border-color: $primary-color;
      background: $primary-bg;
      box-shadow: 0 4px 12px rgba(30, 156, 255, 0.2);
    }

    :deep(.ant-card-body) {
      padding: 2rem;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .custom-content {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: center;

    .custom-collapsed {
      text-align: center;
      padding: 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;

      .custom-text {
        font-size: 1.1rem;
        font-weight: 500;
        color: $text-color;
      }
    }

    .custom-expanded {
      display: flex;
      flex-direction: column;
      justify-content: center;

      .custom-header {
        text-align: center;
        margin-bottom: 2rem;

        .custom-title {
          text-align: center;
          font-size: 1.5rem;
          font-weight: 600;
          color: $text-color;
          margin-bottom: 1rem;
        }

        .custom-price {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;

          .currency {
            font-size: 1.2rem;
            color: $text-color;
          }

          .amount {
            font-size: 2.5rem;
            font-weight: 700;
            color: $primary-color;
          }
        }
      }

      .custom-input-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 0.5rem;

        .input-label {
          color: $text-color;
          font-weight: 500;
          font-size: 1.1rem;
        }

        .custom-input {
          width: 150px;
          margin: 0 0.5rem;

          :deep(.ant-input-number-input) {
            text-align: center;
            font-size: 1.2rem;
            font-weight: 600;
          }
        }

        .input-unit {
          color: $text-color;
          font-weight: 500;
          font-size: 1.1rem;
        }
      }

      .token-preview {
        text-align: center;
        margin-bottom: 1rem;
        color: $primary-color;
        font-weight: 600;
        font-size: 1rem;
        background: rgba(30, 156, 255, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        border: 1px solid rgba(30, 156, 255, 0.2);
        display: inline-block;
      }

      .custom-desc {
        font-size: 1rem;
        color: $text-color;
        margin: 0;
        text-align: center;
        line-height: 1.6;
        opacity: 0.8;
      }
    }
  }
}

.action-section {
  text-align: center;
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .payment-container {
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

  .plans-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem; // 增加底部边距
  }

  .custom-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .payment-header {
    margin-bottom: 2rem; // 减少顶部边距以节省空间
    margin-top: 2rem; // 移动端减少顶部边距

    .payment-title {
      font-size: 2rem;
    }
  }

  .plan-card :deep(.ant-card-body) {
    padding: 1.5rem;
  }
}
</style>
