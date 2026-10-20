<template>
  <view class="oc" @tap="emit('open', order)">
    <view class="oc-accent" :style="{ background: statusColor }" />
    <view class="oc-body">
      <view class="oc-top">
        <view class="oc-tags">
          <text class="tag tag-place">{{ placeLabel }}</text>
          <text v-if="order.mode === 'online'" class="tag tag-online">线上</text>
          <text v-if="order.missing.length" class="tag tag-warn">缺{{ order.missing.join('/') }}</text>
        </view>
        <text class="tag tag-status" :style="{ color: statusColor, background: statusBg }">
          {{ statusLabel }}
        </text>
      </view>

      <view class="oc-title">
        <text class="oc-grade">{{ order.grade || '年级待补' }}</text>
        <text class="oc-subject">{{ order.subject || '科目待补' }}</text>
      </view>

      <view class="oc-facts">
        <view class="fact">
          <app-icon name="money" :size="15" color="#F97316" :stroke="2" />
          <text class="fact-text strong">{{ rateLabel(order.rateMin, order.rateMax, order.rateUnit) }}</text>
        </view>
        <view v-if="order.freqPerWeek" class="fact">
          <app-icon name="clock" :size="15" color="#98A2B3" />
          <text class="fact-text">{{ freqLabel(order.freqPerWeek, order.freqPerWeekMax) }}</text>
        </view>
        <view v-if="order.durationMin" class="fact">
          <text class="fact-text">{{ durationLabel(order.durationMin) }}/次</text>
        </view>
      </view>

      <view class="oc-addr">
        <app-icon name="pin" :size="14" color="#98A2B3" />
        <text class="oc-addr-text ellipsis">{{ order.address || '地址待补充' }}</text>
      </view>

      <view class="oc-foot">
        <text class="oc-req ellipsis">{{ reqLine }}</text>
        <text class="oc-time">{{ timeAgo(order.createdAt) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TutorOrder } from '@/types'
import { ORDER_STATUS } from '@/utils/store'
import { durationLabel, freqLabel, rateLabel } from '@/utils/ui'
import { timeAgo } from '@/utils/date'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ order: TutorOrder }>()
/**
 * 事件名不能用 tap：uni-app 会把组件上的 @tap 当原生事件处理，
 * 父组件的回调收到的是 DOM 事件而不是订单对象，导致跳转时 id 丢失。
 */
const emit = defineEmits<{ open: [order: TutorOrder] }>()

const meta = computed(() => ORDER_STATUS[props.order.status] || ORDER_STATUS.pending)
const statusColor = computed(() => meta.value.color)
const statusBg = computed(() => meta.value.bg)
const statusLabel = computed(() => meta.value.label)

const placeLabel = computed(() => {
  const { district, area } = props.order
  if (district && area && area !== district) return `${district}·${area}`
  return district || area || '区域待定'
})

const reqLine = computed(() => {
  const o = props.order
  const parts: string[] = []
  if (o.teacherReq) parts.push(o.teacherReq)
  else if (o.studentInfo) parts.push(o.studentInfo)
  if (o.studentGender) parts.push(`${o.studentGender}孩`)
  return parts.join(' · ') || '暂无补充信息'
})
</script>

<style scoped>
.oc {
  display: flex;
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 8rpx 28rpx rgba(16, 24, 40, 0.06);
  overflow: hidden;
  transition: transform 0.14s ease;
}

.oc:active {
  transform: scale(0.985);
}

.oc-accent {
  width: 8rpx;
  flex-shrink: 0;
}

.oc-body {
  flex: 1;
  min-width: 0;
  padding: 26rpx 26rpx 22rpx 24rpx;
}

.oc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.oc-tags {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tag-place {
  background: #eef2ff;
  color: #3b62f6;
}

.tag-online {
  background: #e6faf3;
  color: #0f9d76;
}

.tag-warn {
  background: #fff4ec;
  color: #e8590c;
}

.tag-status {
  flex-shrink: 0;
  font-weight: 600;
}

.oc-title {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-top: 18rpx;
}

.oc-grade {
  font-size: 34rpx;
  font-weight: 700;
  color: #101828;
  letter-spacing: -0.4rpx;
}

.oc-subject {
  font-size: 34rpx;
  font-weight: 700;
  color: #3b62f6;
  letter-spacing: -0.4rpx;
}

.oc-facts {
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-top: 14rpx;
  flex-wrap: wrap;
}

.fact {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.fact-text {
  font-size: 25rpx;
  color: #475467;
}

.fact-text.strong {
  color: #f97316;
  font-weight: 700;
  font-size: 27rpx;
}

.oc-addr {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 14rpx;
}

.oc-addr-text {
  font-size: 25rpx;
  color: #667085;
  flex: 1;
  min-width: 0;
}

.oc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #eaecf0;
}

.oc-req {
  font-size: 24rpx;
  color: #98a2b3;
  flex: 1;
  min-width: 0;
}

.oc-time {
  font-size: 22rpx;
  color: #c0c6d1;
  flex-shrink: 0;
}
</style>
