<template>
  <view class="page">
    <view class="hero">
      <view :style="{ height: `${sbHeight}px` }" />
      <view class="hero-row">
        <view class="flex1">
          <text class="hero-hi">{{ greeting }}，老师</text>
          <view class="hero-sub">
            <text class="hero-date">{{ dateText }}</text>
            <text class="hero-sep">·</text>
            <text class="hero-date">今天 {{ stats.todayCount }} 节课</text>
          </view>
        </view>
        <view class="hero-icon" @tap="go('/pages/settings/settings')">
          <app-icon name="settings" :size="19" color="#FFFFFF" />
        </view>
      </view>

      <view class="hero-card">
        <view class="hc-item">
          <text class="hc-num">{{ stats.pending }}</text>
          <text class="hc-label">待匹配单</text>
        </view>
        <view class="hc-line" />
        <view class="hc-item">
          <text class="hc-num">{{ stats.weekCount }}</text>
          <text class="hc-label">本周课次</text>
        </view>
        <view class="hc-line" />
        <view class="hc-item">
          <text class="hc-num">{{ stats.weekHours }}</text>
          <text class="hc-label">本周课时</text>
        </view>
      </view>
    </view>

    <view class="body">
      <view class="quick">
        <view class="q-item" @tap="go('/pages/import/import')">
          <view class="q-icon q-blue">
            <app-icon name="upload" :size="21" color="#3B62F6" />
          </view>
          <text class="q-text">导入家教单</text>
        </view>
        <view class="q-item" @tap="go('/pages/schedule/edit')">
          <view class="q-icon q-orange">
            <app-icon name="calendar" :size="21" color="#F97316" />
          </view>
          <text class="q-text">新建排课</text>
        </view>
        <view class="q-item" @tap="go('/pages/route/route')">
          <view class="q-icon q-green">
            <app-icon name="route" :size="21" color="#12B886" />
          </view>
          <text class="q-text">今日路线</text>
        </view>
      </view>

      <view class="block">
        <view class="block-head">
          <text class="section-title">今日课程</text>
          <text class="more" @tap="go('/pages/calendar/calendar')">日历 ›</text>
        </view>

        <view v-if="!todayLessons.length" class="card empty-card">
          <text class="empty-text">今天没有排课</text>
          <text class="empty-sub">去「日历」看看这周的安排</text>
        </view>

        <view v-else class="card tl">
          <view
            v-for="(l, i) in todayLessons"
            :key="l.id"
            class="tl-item"
            :class="{ last: i === todayLessons.length - 1 }"
            @tap="go(`/pages/schedule/edit?id=${l.courseId}`)"
          >
            <view class="tl-time">
              <text class="tl-start">{{ l.startTime }}</text>
              <text class="tl-end">{{ l.endTime }}</text>
            </view>
            <view class="tl-bar" :style="{ background: l.color }" />
            <view class="tl-body">
              <text class="tl-title">{{ l.studentName }} · {{ l.subject }}</text>
              <text class="tl-addr ellipsis">{{ l.address || '地址待补充' }}</text>
            </view>
            <view v-if="l.lat" class="tl-nav" @tap.stop="navigate(l)">
              <app-icon name="pin" :size="15" color="#3B62F6" />
            </view>
          </view>
        </view>
      </view>

      <view class="block">
        <view class="block-head">
          <text class="section-title">待匹配家教单</text>
          <text class="more" @tap="go('/pages/orders/list')">全部 {{ stats.total }} ›</text>
        </view>
        <view v-if="!pendingTop.length" class="card empty-card">
          <text class="empty-text">暂无待匹配单</text>
        </view>
        <view v-else class="list">
          <order-card v-for="o in pendingTop" :key="o.id" :order="o" @open="openOrder" />
        </view>
      </view>
    </view>

    <tab-bar active="home" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TabBar from '@/components/TabBar.vue'
import OrderCard from '@/components/OrderCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import type { Lesson, TutorOrder } from '@/types'
import { state, stats, todayLessons } from '@/utils/store'
import { statusBarHeight } from '@/utils/ui'
import { openNavigation } from '@/utils/lbs'
import { WEEK_CN } from '@/utils/date'

const sbHeight = statusBarHeight()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const dateText = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_CN[d.getDay()]}`
})

const pendingTop = computed(() =>
  state.orders.filter(o => o.status === 'pending').slice(0, 3),
)

function go(url: string) {
  uni.navigateTo({ url })
}

function openOrder(o: TutorOrder) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${o.id}` })
}

function navigate(l: Lesson) {
  if (!l.lat || !l.lng) return
  openNavigation({ lat: l.lat, lng: l.lng }, `${l.studentName} · ${l.subject}`, l.address)
}
</script>

<style scoped>
.hero {
  background: linear-gradient(150deg, #3b62f6 0%, #5b7cff 55%, #7c96ff 100%);
  padding: 0 32rpx 120rpx;
  border-bottom-left-radius: 48rpx;
  border-bottom-right-radius: 48rpx;
  position: relative;
}

.hero::after {
  content: '';
  position: absolute;
  right: -60rpx;
  top: -40rpx;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero-row {
  display: flex;
  align-items: flex-start;
  padding-top: 28rpx;
}

.hero-hi {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5rpx;
  display: block;
}

.hero-sub {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
}

.hero-date {
  font-size: 25rpx;
  color: rgba(255, 255, 255, 0.82);
}

.hero-sep {
  color: rgba(255, 255, 255, 0.5);
  font-size: 22rpx;
}

.hero-icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-card {
  margin-top: 40rpx;
  background: rgba(255, 255, 255, 0.16);
  border: 1rpx solid rgba(255, 255, 255, 0.24);
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  position: relative;
  z-index: 2;
}

.hc-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.hc-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.hc-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.78);
}

.hc-line {
  width: 1rpx;
  height: 56rpx;
  background: rgba(255, 255, 255, 0.25);
}

.body {
  padding: 0 28rpx;
  margin-top: -80rpx;
  position: relative;
  z-index: 3;
}

.quick {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 26rpx 12rpx;
  box-shadow: 0 12rpx 36rpx rgba(16, 24, 40, 0.1);
}

.q-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.q-item:active {
  opacity: 0.7;
}

.q-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.q-blue {
  background: #eef2ff;
}

.q-orange {
  background: #fff4ec;
}

.q-green {
  background: #e6faf3;
}

.q-text {
  font-size: 24rpx;
  color: #475467;
  font-weight: 500;
}

.block {
  margin-top: 40rpx;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.more {
  font-size: 24rpx;
  color: #98a2b3;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.empty-card {
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.empty-text {
  font-size: 27rpx;
  color: #667085;
}

.empty-sub {
  font-size: 23rpx;
  color: #98a2b3;
}

.tl {
  padding: 8rpx 24rpx;
}

.tl-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f2f4f7;
}

.tl-item.last {
  border-bottom: none;
}

.tl-time {
  width: 84rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex-shrink: 0;
}

.tl-start {
  font-size: 28rpx;
  font-weight: 700;
  color: #101828;
}

.tl-end {
  font-size: 20rpx;
  color: #98a2b3;
}

.tl-bar {
  width: 6rpx;
  height: 56rpx;
  border-radius: 4rpx;
  flex-shrink: 0;
}

.tl-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tl-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #101828;
}

.tl-addr {
  font-size: 23rpx;
  color: #98a2b3;
}

.tl-nav {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
