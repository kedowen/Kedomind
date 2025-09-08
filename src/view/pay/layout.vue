<template>
  <div class="payment-layout">
    <WindowControls />
    <router-view v-slot="{ Component, route }">
      <keep-alive>
        <component :is="Component" v-if="route.meta.keepAlive" />
      </keep-alive>
      <component :is="Component" v-if="!route.meta.keepAlive" />
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { WindowControls } from "@/components/header";
// 支付页面布局组件
</script>

<style scoped lang="scss">
.payment-layout {
  width: 100%;
  height: calc(100vh);
  overflow-y: hidden;
  overflow-x: hidden;
  position: relative;
}
</style> 