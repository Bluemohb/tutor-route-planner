<template>
  <view class="tabbar">
    <view class="tabbar-inner">
      <view
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        @tap="go(t)"
      >
        <view class="tab-icon-wrap" :class="{ on: t.key === active }">
          <app-icon
            :name="t.icon"
            :size="21"
            :color="t.key === active ? '#FFFFFF' : '#98A2B3'"
            :stroke="t.key === active ? 2 : 1.8"
          />
        </view>
        <text class="tab-text" :class="{ on: t.key === active }">{{ t.label }}</text>
      </view>
    </view>
    <view class="tabbar-safe" />
  </view>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = defineProps<{ active: 'home' | 'orders' | 'calendar' | 'route' }>()

const tabs = [
  { key: 'home', label: '工作台', icon: 'home', url: '/pages/index/index' },
  { key: 'orders', label: '家教单', icon: 'list', url: '/pages/orders/list' },
  { key: 'calendar', label: '日历', icon: 'calendar', url: '/pages/calendar/calendar' },
  { key: 'route', label: '路线', icon: 'map', url: '/pages/route/route' },
] as const

function go(t: (typeof tabs)[number]) {
  if (t.key === props.active) return
  uni.reLaunch({ url: t.url })
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(234, 236, 240, 0.9);
}

.tabbar-inner {
  display: flex;
  align-items: center;
  height: 108rpx;
  padding: 0 12rpx;
}

.tabbar-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}

.tab-icon-wrap {
  width: 56rpx;
  height: 44rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s ease;
}

.tab-icon-wrap.on {
  background: linear-gradient(135deg, #3b62f6 0%, #5b7cff 100%);
  box-shadow: 0 6rpx 16rpx rgba(59, 98, 246, 0.35);
}

.tab-text {
  font-size: 20rpx;
  color: #98a2b3;
  font-weight: 500;
}

.tab-text.on {
  color: #3b62f6;
  font-weight: 600;
}
</style>
