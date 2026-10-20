<template>
  <view class="page">
    <view class="top">
      <view :style="{ height: `${sbHeight}px` }" />
      <view class="top-row">
        <view class="flex1">
          <text class="h1">家教单</text>
          <text class="sub">共 {{ state.orders.length }} 条 · {{ stats.pending }} 条待匹配</text>
        </view>
        <view class="top-btn" @tap="goImport">
          <app-icon name="plus" :size="22" color="#FFFFFF" :stroke="2.2" />
        </view>
      </view>

      <view class="search">
        <app-icon name="search" :size="17" color="#98A2B3" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜年级 / 科目 / 区域 / 单号"
          placeholder-class="ph"
          confirm-type="search"
        >
        <view v-if="keyword" class="search-clear" @tap="keyword = ''">
          <app-icon name="close" :size="13" color="#98A2B3" />
        </view>
      </view>
    </view>

    <scroll-view class="chips" scroll-x :show-scrollbar="false">
      <view class="chips-inner">
        <view
          v-for="c in statusChips"
          :key="c.value"
          class="chip"
          :class="{ on: status === c.value }"
          @tap="status = c.value"
        >
          <text class="chip-text">{{ c.label }}</text>
          <text class="chip-count">{{ c.count }}</text>
        </view>
      </view>
    </scroll-view>

    <scroll-view class="districts" scroll-x :show-scrollbar="false">
      <view class="chips-inner">
        <view
          v-for="d in districtChips"
          :key="d.value"
          class="dchip"
          :class="{ on: district === d.value }"
          @tap="district = d.value"
        >
          {{ d.label }}
        </view>
      </view>
    </scroll-view>

    <view class="list">
      <order-card
        v-for="o in filtered"
        :key="o.id"
        :order="o"
        @open="openOrder"
      />

      <view v-if="!filtered.length" class="empty-wrap">
        <view class="empty-icon">
          <app-icon name="list" :size="26" color="#C0C6D1" />
        </view>
        <text class="empty-title">没有符合条件的家教单</text>
        <text class="empty-desc">换个筛选条件，或者导入新的群消息</text>
        <view class="btn btn-ghost btn-sm empty-btn" @tap="goImport">去导入</view>
      </view>
    </view>

    <tab-bar active="orders" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import OrderCard from '@/components/OrderCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import type { OrderStatus, TutorOrder } from '@/types'
import { ORDER_STATUS, STATUS_ORDER, state, stats } from '@/utils/store'
import { statusBarHeight } from '@/utils/ui'

const sbHeight = statusBarHeight()
const keyword = ref('')
const status = ref<'all' | OrderStatus>('all')
const district = ref('all')

const statusChips = computed(() => {
  const base = [{ value: 'all' as const, label: '全部', count: state.orders.length }]
  return [
    ...base,
    ...STATUS_ORDER.map(s => ({
      value: s,
      label: ORDER_STATUS[s].label,
      count: state.orders.filter(o => o.status === s).length,
    })),
  ]
})

const districtChips = computed(() => {
  const map = new Map<string, number>()
  for (const o of state.orders) {
    const d = o.district || '未分类'
    map.set(d, (map.get(d) || 0) + 1)
  }
  return [
    { value: 'all', label: '全部区域' },
    ...[...map.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => ({ value: d, label: `${d} ${n}` })),
  ]
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return state.orders.filter((o) => {
    if (status.value !== 'all' && o.status !== status.value) return false
    if (district.value !== 'all' && (o.district || '未分类') !== district.value) return false
    if (!kw) return true
    const hay = [o.code, o.grade, o.subject, o.district, o.area, o.address, o.teacherReq, o.studentInfo]
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
})

function openOrder(o: TutorOrder) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${o.id}` })
}

function goImport() {
  uni.navigateTo({ url: '/pages/import/import' })
}
</script>

<style scoped>
.top {
  background: linear-gradient(160deg, #3b62f6 0%, #5b7cff 100%);
  padding: 0 28rpx 30rpx;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
}

.top-row {
  display: flex;
  align-items: center;
  padding-top: 26rpx;
}

.h1 {
  font-size: 42rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  letter-spacing: -0.5rpx;
}

.sub {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
  display: block;
}

.top-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-btn:active {
  background: rgba(255, 255, 255, 0.32);
}

.search {
  margin-top: 26rpx;
  height: 80rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 22rpx;
}

.search-input {
  flex: 1;
  font-size: 27rpx;
  color: #101828;
  height: 100%;
}

.ph {
  color: #b0b7c3;
  font-size: 26rpx;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chips {
  margin-top: 24rpx;
  white-space: nowrap;
}

.chips-inner {
  display: inline-flex;
  gap: 14rpx;
  padding: 0 28rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 4rpx 14rpx rgba(16, 24, 40, 0.05);
  /* 横向滚动容器里必须禁止收缩，否则文字会被挤成竖排 */
  flex-shrink: 0;
  white-space: nowrap;
}

.chip.on {
  background: #3b62f6;
  box-shadow: 0 8rpx 20rpx rgba(59, 98, 246, 0.28);
}

.chip-text {
  font-size: 25rpx;
  color: #475467;
  font-weight: 500;
  white-space: nowrap;
}

.chip.on .chip-text {
  color: #fff;
  font-weight: 600;
}

.chip-count {
  font-size: 21rpx;
  color: #98a2b3;
  background: #f2f4f7;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.chip.on .chip-count {
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
}

.districts {
  margin-top: 16rpx;
  white-space: nowrap;
}

.dchip {
  display: inline-block;
  height: 54rpx;
  line-height: 54rpx;
  padding: 0 20rpx;
  border-radius: 14rpx;
  font-size: 23rpx;
  color: #667085;
  background: #eef0f5;
}

.dchip.on {
  background: #eef2ff;
  color: #3b62f6;
  font-weight: 600;
}

.list {
  padding: 24rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.empty-wrap {
  padding: 100rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}

.empty-icon {
  width: 108rpx;
  height: 108rpx;
  border-radius: 34rpx;
  background: #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.empty-title {
  font-size: 28rpx;
  color: #475467;
  font-weight: 500;
}

.empty-desc {
  font-size: 23rpx;
  color: #98a2b3;
}

.empty-btn {
  margin-top: 16rpx;
}
</style>
