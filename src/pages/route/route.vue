<template>
  <view class="page">
    <view class="top">
      <view :style="{ height: `${sbHeight}px` }" />
      <view class="top-row">
        <view class="flex1">
          <text class="h1">路线</text>
          <text class="sub">{{ summaryText }}</text>
        </view>
        <view class="top-btn" @tap="openSettings">
          <app-icon name="pin" :size="20" color="#FFFFFF" />
        </view>
      </view>

      <view class="tabs">
        <view class="tab" :class="{ on: tab === 'day' }" @tap="tab = 'day'">当天跑单</view>
        <view class="tab" :class="{ on: tab === 'area' }" @tap="tab = 'area'">区域分布</view>
      </view>
    </view>

    <!-- ============ 当天跑单 ============ -->
    <view v-if="tab === 'day'" class="body">
      <view class="dates">
        <view class="dates-inner">
          <view
            v-for="d in dateStrip"
            :key="d.iso"
            class="date-chip"
            :class="{ on: d.iso === date }"
            @tap="date = d.iso"
          >
            <text class="dc-wd">{{ d.wd }}</text>
            <text class="dc-day">{{ d.day }}</text>
            <text v-if="d.count" class="dc-count">{{ d.count }}</text>
          </view>
        </view>
      </view>

      <view class="map-wrap">
        <route-map
          :points="mapPoints"
          :start="startPoint"
          :start-label="startLabel"
          :path="pathPoints"
          height="420rpx"
          :hint="mapHint"
        />
      </view>

      <view class="stat-card">
        <view class="sc-item">
          <text class="sc-num">{{ stops.length }}</text>
          <text class="sc-label">个上课点</text>
        </view>
        <view class="sc-line" />
        <view class="sc-item">
          <text class="sc-num">{{ totalKm }}</text>
          <text class="sc-label">公里</text>
        </view>
        <view class="sc-line" />
        <view class="sc-item">
          <text class="sc-num">{{ totalMin }}</text>
          <text class="sc-label">分钟车程</text>
        </view>
      </view>

      <view v-if="!stops.length" class="card empty-card">
        <text class="empty-text">这天没有排课</text>
        <text class="empty-sub">先到「日历」或「排课」安排课程</text>
      </view>

      <view v-else class="stops">
        <view v-for="(s, i) in stopRows" :key="s.id" class="stop">
          <view class="stop-left">
            <view class="stop-pin" :style="{ background: s.color }">
              <text class="stop-num">{{ i + 1 }}</text>
            </view>
            <view v-if="i < stopRows.length - 1" class="stop-line" />
          </view>
          <view class="stop-card" @tap="openDetail(s)">
            <view class="stop-head">
              <text class="stop-time">{{ s.startTime }}-{{ s.endTime }}</text>
              <text class="stop-leg">{{ s.legText }}</text>
            </view>
            <text class="stop-title">{{ s.studentName }} · {{ s.subject }}</text>
            <view class="stop-addr-row">
              <app-icon name="pin" :size="13" color="#98A2B3" />
              <text class="stop-addr ellipsis">{{ s.address }}</text>
            </view>
            <view class="stop-foot">
              <text class="stop-teacher">{{ s.teacherName || '未指派老师' }}</text>
              <text class="stop-act" @tap.stop="nav(s)">导航 ›</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ============ 区域分布 ============ -->
    <view v-else class="body">
      <view v-for="g in districtGroups" :key="g.district" class="card area-card">
        <view class="area-head" @tap="toggle(g.district)">
          <view class="area-badge">{{ g.list.length }}</view>
          <view class="flex1">
            <text class="area-name">{{ g.district }}</text>
            <text class="area-sub">{{ areaSummary(g.list) }}</text>
          </view>
          <view class="area-arrow" :class="{ open: expanded === g.district }">
            <app-icon name="chevronDown" :size="16" color="#98A2B3" />
          </view>
        </view>

        <view v-if="expanded === g.district" class="area-body">
          <view
            v-for="o in g.list"
            :key="o.id"
            class="area-row"
            @tap="openOrder(o)"
          >
            <view class="area-dot" :style="{ background: statusColor(o.status) }" />
            <view class="flex1">
              <text class="area-title">{{ o.grade }}{{ o.subject }}</text>
              <text class="area-addr ellipsis">{{ o.address || '地址待补充' }}</text>
            </view>
            <text class="area-price">{{ o.rateMin ? `${o.rateMin}+` : '面议' }}</text>
          </view>
        </view>
      </view>

      <view v-if="!districtGroups.length" class="card empty-card">
        <text class="empty-text">还没有家教单</text>
      </view>
    </view>

    <tab-bar active="route" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import TabBar from '@/components/TabBar.vue'
import RouteMap, { type MapPoint } from '@/components/RouteMap.vue'
import AppIcon from '@/components/AppIcon.vue'
import type { Lesson, OrderStatus, TutorOrder } from '@/types'
import { ORDER_STATUS, lessonsOn, ordersByDistrict, state } from '@/utils/store'
import { addDays, fmtDate, todayISO, WEEK_CN } from '@/utils/date'
import { BEIJING_DISTRICTS } from '@/parser/dict'
import { estimateTravel, haversineKm } from '@/utils/geo'
import { driving, openNavigation } from '@/utils/lbs'
import { statusBarHeight } from '@/utils/ui'

const sbHeight = statusBarHeight()
const tab = ref<'day' | 'area'>('day')
const date = ref(todayISO())
const expanded = ref('')

const COLOR_BY_INDEX = ['#3B62F6', '#F97316', '#12B886', '#8B5CF6', '#EC4899', '#0EA5E9']

/* ---------------- 当天跑单 ---------------- */

const dateStrip = computed(() => {
  const out: { iso: string; wd: string; day: string; count: number }[] = []
  // 只排 6 天：正好铺满一屏，不需要横向滑动
  for (let i = 0; i < 6; i++) {
    const d = addDays(new Date(), i)
    const iso = fmtDate(d)
    out.push({
      iso,
      wd: i === 0 ? '今天' : i === 1 ? '明天' : `周${WEEK_CN[d.getDay()]}`,
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      count: lessonsOn(iso).length,
    })
  }
  return out
})

const stops = computed<Lesson[]>(() => {
  return lessonsOn(date.value)
    .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

const startPoint = computed(() => {
  const d = state.settings.homeDistrict || '通州'
  const c = BEIJING_DISTRICTS[d] || BEIJING_DISTRICTS['通州']
  return { lat: c[0], lng: c[1] }
})

const startLabel = computed(() => state.settings.homeDistrict || '出发')

const mapPoints = computed<MapPoint[]>(() =>
  stops.value.map((l, i) => ({
    id: l.id,
    seq: i + 1,
    label: `${l.subject} ${l.startTime}`,
    lat: l.lat!,
    lng: l.lng!,
    color: l.color || COLOR_BY_INDEX[i % COLOR_BY_INDEX.length],
  })),
)

/** 每段行程 */
const legs = ref<{ km: number; min: number; real: boolean }[]>([])
const pathPoints = ref<{ lat: number; lng: number }[]>([])

async function computeLegs() {
  const key = state.settings.lbsKey
  const list = stops.value
  if (!list.length) {
    legs.value = []
    pathPoints.value = []
    return
  }
  const froms = [startPoint.value, ...list.map(l => ({ lat: l.lat!, lng: l.lng! }))]
  const result: { km: number; min: number; real: boolean }[] = []
  const path: { lat: number; lng: number }[] = []

  for (let i = 0; i < list.length; i++) {
    const a = froms[i]
    const b = froms[i + 1]
    let leg = key ? await driving(a, b, key) : null
    if (leg) {
      result.push({ km: leg.distanceKm, min: leg.minutes, real: true })
      if (leg.polyline.length) path.push(...leg.polyline)
    }
    else {
      const est = estimateTravel(haversineKm(a, b))
      result.push({ km: est.distanceKm, min: est.minutes, real: false })
    }
  }
  legs.value = result
  pathPoints.value = path.length > 1 ? path : []
}

onMounted(computeLegs)
watch([date, () => state.settings.lbsKey], computeLegs)

const totalKm = computed(() => {
  const km = legs.value.reduce((s, l) => s + l.km, 0)
  return km ? km.toFixed(1) : '0'
})

const totalMin = computed(() => legs.value.reduce((s, l) => s + l.min, 0))

const mapHint = computed(() => {
  if (!stops.value.length) return '这天还没有安排课程'
  if (state.settings.lbsKey) return '腾讯位置服务 · 实时路线'
  return '示意地图 · 未配置位置服务 Key'
})

const summaryText = computed(() => {
  if (tab.value === 'area') {
    const n = districtGroups.value.length
    return `${n} 个区域 · 共 ${state.orders.length} 条家教单`
  }
  const n = stops.value.length
  if (!n) return '这一天还没有上课点'
  return `${n} 个上课点 · 预计 ${totalKm.value} 公里`
})

const stopRows = computed(() =>
  stops.value.map((l, i) => {
    const leg = legs.value[i]
    return {
      ...l,
      legText: leg ? `${leg.km.toFixed(1)}km · ${leg.min}分钟` : '计算中…',
    }
  }),
)

function nav(l: Lesson) {
  if (!l.lat || !l.lng) return
  openNavigation({ lat: l.lat, lng: l.lng }, `${l.studentName} · ${l.subject}`, l.address)
}

function openDetail(l: Lesson) {
  if (!l.orderId) return
  uni.navigateTo({ url: `/pages/orders/detail?id=${l.orderId}` })
}

/* ---------------- 区域分布 ---------------- */

const districtGroups = computed(() => ordersByDistrict.value)

function areaSummary(list: TutorOrder[]) {
  const areas = [...new Set(list.map(o => o.area).filter(Boolean))]
  const prices = list.map(o => o.rateMin).filter(Boolean) as number[]
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const parts: string[] = []
  if (areas.length) parts.push(areas.slice(0, 3).join('、'))
  if (avg) parts.push(`均价 ${avg}/h`)
  return parts.join(' · ') || '暂无片区信息'
}

function toggle(d: string) {
  expanded.value = expanded.value === d ? '' : d
}

function statusColor(s: OrderStatus) {
  return (ORDER_STATUS[s] || ORDER_STATUS.pending).color
}

function openOrder(o: TutorOrder) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${o.id}` })
}

function openSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}
</script>

<style scoped>
.top {
  background: linear-gradient(160deg, #3b62f6 0%, #5b7cff 100%);
  padding: 0 28rpx 26rpx;
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

.tabs {
  display: flex;
  gap: 10rpx;
  margin-top: 26rpx;
  background: rgba(255, 255, 255, 0.16);
  padding: 6rpx;
  border-radius: 20rpx;
}

.tab {
  flex: 1;
  height: 62rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.tab.on {
  background: #fff;
  color: #3b62f6;
  font-weight: 600;
}

.body {
  padding: 24rpx 28rpx 0;
}

.dates {
  margin: 0 -4rpx;
}

.dates-inner {
  display: flex;
  gap: 12rpx;
}

.date-chip {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 112rpx;
  border-radius: 22rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  box-shadow: 0 4rpx 16rpx rgba(16, 24, 40, 0.05);
}

.date-chip.on {
  background: #101828;
}

.dc-wd {
  font-size: 21rpx;
  color: #98a2b3;
}

.dc-day {
  font-size: 26rpx;
  font-weight: 600;
  color: #101828;
}

.date-chip.on .dc-wd,
.date-chip.on .dc-day {
  color: #fff;
}

.dc-count {
  position: absolute;
  top: 8rpx;
  right: 10rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  border-radius: 14rpx;
  background: #3b62f6;
  color: #fff;
  font-size: 18rpx;
  text-align: center;
  line-height: 28rpx;
}

.map-wrap {
  margin-top: 24rpx;
}

.stat-card {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  box-shadow: 0 6rpx 22rpx rgba(16, 24, 40, 0.05);
}

.sc-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.sc-num {
  font-size: 36rpx;
  font-weight: 700;
  color: #101828;
  line-height: 1;
}

.sc-label {
  font-size: 21rpx;
  color: #98a2b3;
}

.sc-line {
  width: 1rpx;
  height: 46rpx;
  background: #eaecf0;
}

.stops {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
}

.stop {
  display: flex;
  gap: 16rpx;
}

.stop-left {
  width: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 22rpx;
}

.stop-pin {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(16, 24, 40, 0.16);
  flex-shrink: 0;
}

.stop-num {
  font-size: 21rpx;
  color: #fff;
  font-weight: 700;
}

.stop-line {
  flex: 1;
  width: 2rpx;
  background: repeating-linear-gradient(
    to bottom,
    #d0d5dd 0,
    #d0d5dd 6rpx,
    transparent 6rpx,
    transparent 12rpx
  );
  margin: 6rpx 0;
  min-height: 40rpx;
}

.stop-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 22rpx;
  padding: 20rpx 22rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.05);
}

.stop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.stop-time {
  font-size: 23rpx;
  color: #3b62f6;
  font-weight: 600;
}

.stop-leg {
  font-size: 21rpx;
  color: #b0b7c3;
}

.stop-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #101828;
  margin-top: 10rpx;
  display: block;
}

.stop-addr-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
}

.stop-addr {
  font-size: 23rpx;
  color: #98a2b3;
  flex: 1;
  min-width: 0;
}

.stop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx dashed #f2f4f7;
}

.stop-teacher {
  font-size: 22rpx;
  color: #98a2b3;
}

.stop-act {
  font-size: 23rpx;
  color: #3b62f6;
  font-weight: 500;
}

.area-card {
  padding: 0;
  overflow: hidden;
  margin-bottom: 18rpx;
}

.area-head {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 26rpx 24rpx;
}

.area-badge {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  background: #eef2ff;
  color: #3b62f6;
  font-size: 28rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.area-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #101828;
  display: block;
}

.area-sub {
  font-size: 22rpx;
  color: #98a2b3;
  margin-top: 6rpx;
  display: block;
}

.area-arrow {
  transition: transform 0.2s ease;
}

.area-arrow.open {
  transform: rotate(180deg);
}

.area-body {
  padding: 0 24rpx 8rpx;
  border-top: 1rpx solid #f2f4f7;
}

.area-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f9fb;
}

.area-row:last-child {
  border-bottom: none;
}

.area-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.area-title {
  font-size: 26rpx;
  color: #101828;
  font-weight: 500;
  display: block;
}

.area-addr {
  font-size: 22rpx;
  color: #98a2b3;
  margin-top: 4rpx;
  display: block;
}

.area-price {
  font-size: 24rpx;
  color: #f97316;
  font-weight: 700;
}

.empty-card {
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-top: 28rpx;
}

.empty-text {
  font-size: 27rpx;
  color: #667085;
}

.empty-sub {
  font-size: 23rpx;
  color: #98a2b3;
}
</style>
