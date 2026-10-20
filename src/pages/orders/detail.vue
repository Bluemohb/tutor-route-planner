<template>
  <view class="page">
    <view v-if="!order" class="empty">这条家教单不存在或已删除</view>

    <template v-else>
      <view class="hero">
        <view class="hero-top">
          <view class="tags">
            <text class="tag tag-place">{{ placeLabel }}</text>
            <text v-if="order.mode === 'online'" class="tag tag-online">线上</text>
            <text v-if="order.code" class="tag tag-code">{{ order.code }}</text>
          </view>
          <text class="tag tag-status" :style="{ color: statusMeta.color, background: statusMeta.bg }">
            {{ statusMeta.label }}
          </text>
        </view>

        <view class="hero-title">
          <text class="ht-grade">{{ order.grade || '年级待补' }}</text>
          <text class="ht-subject">{{ order.subject || '科目待补' }}</text>
        </view>

        <view class="hero-price">
          <text class="hp-num">{{ order.rateMin ? `${order.rateMin}${order.rateMax && order.rateMax !== order.rateMin ? `-${order.rateMax}` : ''}` : '面议' }}</text>
          <text v-if="order.rateMin" class="hp-unit">{{ order.rateUnit === 'lesson' ? '元/次' : '元/小时' }}</text>
        </view>

        <view v-if="order.missing.length" class="missing">
          <app-icon name="target" :size="14" color="#E8590C" />
          <text class="missing-text">还缺：{{ order.missing.join('、') }}，建议补录后再派单</text>
        </view>
      </view>

      <view class="body">
        <view class="card pad">
          <text class="block-title">课程信息</text>
          <view class="info-grid">
            <view class="ig-item">
              <text class="ig-label">每周次数</text>
              <text class="ig-value">{{ order.freqPerWeek ? freqLabel(order.freqPerWeek, order.freqPerWeekMax) : '待定' }}</text>
            </view>
            <view class="ig-item">
              <text class="ig-label">单次时长</text>
              <text class="ig-value">{{ order.durationMin ? `${durationLabel(order.durationMin)}` : '待定' }}</text>
            </view>
            <view class="ig-item">
              <text class="ig-label">授课形式</text>
              <text class="ig-value">{{ order.mode === 'online' ? '线上' : '线下上门' }}</text>
            </view>
            <view class="ig-item">
              <text class="ig-label">学生性别</text>
              <text class="ig-value">{{ order.studentGender || '未注明' }}</text>
            </view>
          </view>
          <view v-if="order.startTimeText" class="info-line">
            <text class="ig-label">上课时间</text>
            <text class="ig-value wrap-text">{{ order.startTimeText }}</text>
          </view>
          <view v-if="order.freqText" class="info-line">
            <text class="ig-label">时间说明</text>
            <text class="ig-value wrap-text">{{ order.freqText }}</text>
          </view>
        </view>

        <view class="card pad addr-card">
          <view class="row-between">
            <text class="block-title">上课地点</text>
            <view v-if="order.lat" class="nav-btn" @tap="nav">
              <app-icon name="pin" :size="14" color="#FFFFFF" />
              <text class="nav-text">导航</text>
            </view>
          </view>
          <text class="addr-text">{{ order.address || '地址待补充' }}</text>
          <view class="addr-meta">
            <text class="addr-tag">{{ order.city || '—' }}</text>
            <text class="addr-tag">{{ order.district || '未识别区' }}</text>
            <text v-if="order.area" class="addr-tag">{{ order.area }}</text>
            <text class="addr-tag light">{{ order.geoSource === 'geo' ? '已精确定位' : '片区估算' }}</text>
          </view>
        </view>

        <view v-if="order.studentInfo" class="card pad">
          <text class="block-title">学生情况</text>
          <text class="para">{{ order.studentInfo }}</text>
        </view>

        <view v-if="order.teacherReq" class="card pad">
          <text class="block-title">老师要求</text>
          <text class="para">{{ order.teacherReq }}</text>
        </view>

        <view class="card pad">
          <view class="row-between" @tap="showRaw = !showRaw">
            <text class="block-title">原始消息</text>
            <text class="link">{{ showRaw ? '收起' : '展开' }}</text>
          </view>
          <view v-if="showRaw" class="raw-box">
            <text class="raw-text">{{ order.rawText }}</text>
          </view>
          <view v-if="showRaw" class="raw-actions">
            <text class="link" @tap="copyText(order.rawText)">复制原文</text>
          </view>
        </view>

        <view class="card pad">
          <text class="block-title">状态</text>
          <view class="status-row">
            <view
              v-for="s in STATUS_ORDER"
              :key="s"
              class="status-chip"
              :class="{ on: order.status === s }"
              :style="order.status === s ? { background: ORDER_STATUS[s].bg, color: ORDER_STATUS[s].color } : {}"
              @tap="setStatus(s)"
            >
              {{ ORDER_STATUS[s].label }}
            </view>
          </view>
        </view>
      </view>

      <view class="bottom">
        <view class="btn btn-plain bottom-icon" @tap="remove">
          <app-icon name="trash" :size="20" color="#98A2B3" />
        </view>
        <view class="btn btn-ghost bottom-edit" @tap="edit">编辑</view>
        <view class="btn btn-primary bottom-main" @tap="schedule">排课</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import type { OrderStatus } from '@/types'
import { ORDER_STATUS, STATUS_ORDER, getOrder, removeOrder, updateOrder } from '@/utils/store'
import { copyText, confirm, durationLabel, freqLabel, toast } from '@/utils/ui'
import { openNavigation } from '@/utils/lbs'

const id = ref('')
const showRaw = ref(false)

onLoad((query: any) => {
  id.value = query?.id || ''
})

const order = computed(() => getOrder(id.value))

const statusMeta = computed(() => ORDER_STATUS[order.value?.status || 'pending'])

const placeLabel = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.district && o.area && o.area !== o.district) return `${o.district}·${o.area}`
  return o.district || o.area || '区域待定'
})

function setStatus(s: OrderStatus) {
  if (!order.value) return
  updateOrder(order.value.id, { status: s })
  toast(`已改为「${ORDER_STATUS[s].label}」`, 'success')
}

function nav() {
  const o = order.value
  if (!o?.lat || !o?.lng) return
  openNavigation({ lat: o.lat, lng: o.lng }, `${o.grade}${o.subject}`, o.address)
}

function edit() {
  uni.navigateTo({ url: `/pages/orders/edit?id=${id.value}` })
}

function schedule() {
  uni.navigateTo({ url: `/pages/schedule/edit?orderId=${id.value}` })
}

async function remove() {
  const ok = await confirm('删除后不可恢复，确定删除这条家教单吗？', '删除家教单')
  if (!ok) return
  removeOrder(id.value)
  toast('已删除', 'success')
  setTimeout(() => uni.navigateBack(), 500)
}
</script>

<style scoped>
.page {
  padding-bottom: 200rpx;
}

.hero {
  background: linear-gradient(160deg, #3b62f6 0%, #5b7cff 100%);
  padding: 30rpx 32rpx 40rpx;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.tags {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.tag-place {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.tag-online {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.tag-code {
  background: rgba(0, 0, 0, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.tag-status {
  flex-shrink: 0;
  font-weight: 600;
}

.hero-title {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  margin-top: 22rpx;
}

.ht-grade {
  font-size: 46rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.6rpx;
}

.ht-subject {
  font-size: 46rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.6rpx;
}

.hero-price {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 10rpx;
}

.hp-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffe0b8;
}

.hp-unit {
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.75);
}

.missing {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 22rpx;
  background: rgba(255, 244, 236, 0.94);
  padding: 12rpx 16rpx;
  border-radius: 14rpx;
}

.missing-text {
  font-size: 22rpx;
  color: #e8590c;
}

.body {
  padding: 24rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.block-title {
  font-size: 27rpx;
  font-weight: 700;
  color: #101828;
  display: block;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 18rpx;
}

.ig-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.ig-label {
  font-size: 22rpx;
  color: #98a2b3;
}

.ig-value {
  font-size: 27rpx;
  color: #101828;
  font-weight: 500;
}

.info-line {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f2f4f7;
  margin-top: 4rpx;
}

.wrap-text {
  flex: 1;
  font-size: 25rpx;
  line-height: 1.6;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #3b62f6;
  padding: 8rpx 18rpx;
  border-radius: 14rpx;
}

.nav-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.addr-text {
  font-size: 28rpx;
  color: #101828;
  font-weight: 500;
  margin-top: 16rpx;
  line-height: 1.5;
  display: block;
}

.addr-meta {
  display: flex;
  gap: 10rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}

.addr-tag {
  font-size: 21rpx;
  color: #475467;
  background: #f2f4f7;
  padding: 5rpx 12rpx;
  border-radius: 10rpx;
}

.addr-tag.light {
  color: #98a2b3;
  background: #fafbfc;
}

.para {
  font-size: 26rpx;
  color: #475467;
  line-height: 1.7;
  margin-top: 14rpx;
  display: block;
}

.link {
  font-size: 24rpx;
  color: #3b62f6;
}

.raw-box {
  margin-top: 16rpx;
  background: #f8f9fb;
  border-radius: 16rpx;
  padding: 18rpx;
}

.raw-text {
  font-size: 23rpx;
  color: #667085;
  line-height: 1.7;
  white-space: pre-wrap;
}

.raw-actions {
  margin-top: 14rpx;
  display: flex;
  justify-content: flex-end;
}

.status-row {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
  flex-wrap: wrap;
}

.status-chip {
  padding: 12rpx 22rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 24rpx;
  color: #667085;
}

.status-chip.on {
  font-weight: 600;
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #eaecf0;
}

.bottom-icon {
  width: 92rpx;
  flex-shrink: 0;
}

.bottom-edit {
  width: 160rpx;
  flex-shrink: 0;
}

.bottom-main {
  flex: 1;
}
</style>
