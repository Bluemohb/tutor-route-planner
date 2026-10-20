<template>
  <view class="page">
    <view class="top">
      <view :style="{ height: `${sbHeight}px` }" />
      <view class="top-row">
        <view class="flex1">
          <text class="h1">日历</text>
          <text class="sub">{{ monthStat }}</text>
        </view>
        <view class="top-btn" @tap="go('/pages/schedule/list')">
          <app-icon name="layers" :size="20" color="#FFFFFF" />
        </view>
      </view>
    </view>

    <view class="cal-wrap">
      <month-calendar v-model="selected" :marks="marks" />
    </view>

    <view class="agenda">
      <view class="agenda-head">
        <text class="section-title">{{ friendlyDate(selected) }}</text>
        <text class="agenda-count">{{ dayLessons.length }} 节课</text>
      </view>

      <view v-if="!dayLessons.length" class="card empty-card">
        <text class="empty-text">这天没有排课</text>
        <view class="btn btn-ghost btn-sm empty-btn" @tap="addCourse">加一节课</view>
      </view>

      <view v-else class="agenda-list">
        <view v-for="l in dayLessons" :key="l.id" class="lesson">
          <view class="lesson-time">
            <text class="lt-start">{{ l.startTime }}</text>
            <text class="lt-end">{{ l.endTime }}</text>
          </view>
          <view class="lesson-card" :style="{ borderLeftColor: l.color }">
            <view class="lc-head">
              <text class="lc-title">{{ l.studentName }} · {{ l.subject }}</text>
              <view
                class="lc-check"
                :class="{ done: l.status === 'done' }"
                @tap.stop="toggleDone(l)"
              >
                <app-icon name="check" :size="13" :color="l.status === 'done' ? '#FFFFFF' : '#C0C6D1'" :stroke="2.6" />
              </view>
            </view>
            <view class="lc-row">
              <app-icon name="pin" :size="13" color="#98A2B3" />
              <text class="lc-addr ellipsis">{{ l.address || '地址待补充' }}</text>
            </view>
            <view class="lc-foot">
              <text class="lc-teacher">{{ l.teacherName || '未指派老师' }}</text>
              <view class="lc-actions">
                <text v-if="l.lat" class="lc-act" @tap.stop="navigate(l)">导航</text>
                <text class="lc-act" @tap.stop="editCourse(l)">排课</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <tab-bar active="calendar" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import MonthCalendar from '@/components/MonthCalendar.vue'
import AppIcon from '@/components/AppIcon.vue'
import type { Lesson } from '@/types'
import { lessonsByDate, lessonsOn, setLessonStatus } from '@/utils/store'
import { friendlyDate, parseISO, todayISO } from '@/utils/date'
import { openNavigation } from '@/utils/lbs'
import { statusBarHeight, toast } from '@/utils/ui'

const sbHeight = statusBarHeight()
const selected = ref(todayISO())

const byDate = computed(() => lessonsByDate())

/** 每天对应的色点 */
const marks = computed(() => {
  const out: Record<string, string[]> = {}
  for (const [date, list] of Object.entries(byDate.value)) {
    out[date] = list.map(l => l.color)
  }
  return out
})

const dayLessons = computed(() => lessonsOn(selected.value))

const monthStat = computed(() => {
  const d = parseISO(selected.value)
  const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const list = Object.entries(byDate.value).filter(([k]) => k.startsWith(prefix))
  const count = list.reduce((n, [, v]) => n + v.length, 0)
  return `本月 ${count} 节课 · ${list.length} 天有课`
})

function toggleDone(l: Lesson) {
  setLessonStatus(l.id, l.status === 'done' ? 'planned' : 'done')
  toast(l.status === 'done' ? '已改回待上' : '已完成', 'success')
}

function navigate(l: Lesson) {
  if (!l.lat || !l.lng) return
  openNavigation({ lat: l.lat, lng: l.lng }, `${l.studentName} · ${l.subject}`, l.address)
}

function editCourse(l: Lesson) {
  uni.navigateTo({ url: `/pages/schedule/edit?id=${l.courseId}` })
}

function addCourse() {
  uni.navigateTo({ url: `/pages/schedule/edit?date=${selected.value}` })
}

function go(url: string) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.top {
  background: linear-gradient(160deg, #3b62f6 0%, #5b7cff 100%);
  padding: 0 28rpx 76rpx;
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

.cal-wrap {
  margin: -56rpx 24rpx 0;
  position: relative;
  z-index: 2;
}

.agenda {
  padding: 36rpx 28rpx 0;
}

.agenda-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.agenda-count {
  font-size: 23rpx;
  color: #98a2b3;
}

.empty-card {
  padding: 56rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.empty-text {
  font-size: 27rpx;
  color: #667085;
}

.empty-btn {
  padding: 0 30rpx;
}

.agenda-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.lesson {
  display: flex;
  gap: 16rpx;
}

.lesson-time {
  width: 80rpx;
  padding-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex-shrink: 0;
}

.lt-start {
  font-size: 27rpx;
  font-weight: 700;
  color: #101828;
}

.lt-end {
  font-size: 20rpx;
  color: #b0b7c3;
}

.lesson-card {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 22rpx;
  border-left: 8rpx solid #3b62f6;
  padding: 22rpx 22rpx 18rpx;
  box-shadow: 0 6rpx 22rpx rgba(16, 24, 40, 0.05);
}

.lc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.lc-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #101828;
  flex: 1;
  min-width: 0;
}

.lc-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #e4e7ec;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lc-check.done {
  background: #12b886;
  border-color: #12b886;
}

.lc-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
}

.lc-addr {
  font-size: 23rpx;
  color: #98a2b3;
  flex: 1;
  min-width: 0;
}

.lc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed #f2f4f7;
}

.lc-teacher {
  font-size: 22rpx;
  color: #98a2b3;
}

.lc-actions {
  display: flex;
  gap: 20rpx;
}

.lc-act {
  font-size: 23rpx;
  color: #3b62f6;
  font-weight: 500;
}
</style>
