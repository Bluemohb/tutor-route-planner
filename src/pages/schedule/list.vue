<template>
  <view class="page">
    <view class="head">
      <text class="head-title">排课档期</text>
      <text class="head-sub">{{ state.courses.length }} 个固定档期 · 共 {{ state.lessons.length }} 节课</text>
    </view>

    <view class="list">
      <view
        v-for="c in courseRows"
        :key="c.id"
        class="course"
        @tap="edit(c.id)"
      >
        <view class="c-bar" :style="{ background: c.color }" />
        <view class="c-body">
          <view class="c-head">
            <text class="c-title">{{ c.studentName }} · {{ c.subject }}</text>
            <text class="c-count">{{ c.total }} 节</text>
          </view>
          <view class="c-row">
            <app-icon name="clock" :size="14" color="#98A2B3" />
            <text class="c-text">{{ c.weekdayText }} {{ c.startTime }}-{{ c.endTime }}</text>
          </view>
          <view class="c-row">
            <app-icon name="pin" :size="14" color="#98A2B3" />
            <text class="c-text ellipsis">{{ c.address || '地址待补充' }}</text>
          </view>
          <view class="c-foot">
            <text class="c-next">{{ c.nextText }}</text>
            <text class="c-teacher">{{ c.teacherName || '未指派' }}</text>
          </view>
        </view>
      </view>

      <view v-if="!courseRows.length" class="card empty-card">
        <text class="empty-text">还没有排课</text>
        <text class="empty-sub">建一个固定档期，日历会自动生成每次课</text>
      </view>
    </view>

    <view class="bottom">
      <view class="btn btn-primary" @tap="edit()">新建排课</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { state } from '@/utils/store'
import { hhmmToMin, minToHhmm, todayISO, WEEK_CN, friendlyDate } from '@/utils/date'

const courseRows = computed(() =>
  state.courses.map((c) => {
    const lessons = state.lessons.filter(l => l.courseId === c.id)
    const upcoming = lessons
      .filter(l => l.date >= todayISO())
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    const wd = [...c.weekdays].sort((a, b) => a - b).map(d => `周${WEEK_CN[d]}`).join('、')
    return {
      ...c,
      total: lessons.length,
      weekdayText: wd || '未设置',
      endTime: minToHhmm(hhmmToMin(c.startTime) + c.durationMin),
      nextText: upcoming ? `下次 ${friendlyDate(upcoming.date)} ${upcoming.startTime}` : '暂无后续课次',
    }
  }),
)

function edit(id?: string) {
  uni.navigateTo({ url: id ? `/pages/schedule/edit?id=${id}` : '/pages/schedule/edit' })
}
</script>

<style scoped>
.page {
  padding-bottom: 200rpx;
}

.head {
  padding: 32rpx 32rpx 8rpx;
}

.head-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #101828;
  display: block;
}

.head-sub {
  font-size: 23rpx;
  color: #98a2b3;
  margin-top: 10rpx;
  display: block;
}

.list {
  padding: 20rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.course {
  display: flex;
  background: #fff;
  border-radius: 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 26rpx rgba(16, 24, 40, 0.06);
}

.course:active {
  transform: scale(0.99);
}

.c-bar {
  width: 8rpx;
  flex-shrink: 0;
}

.c-body {
  flex: 1;
  min-width: 0;
  padding: 24rpx;
}

.c-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.c-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #101828;
}

.c-count {
  font-size: 21rpx;
  color: #3b62f6;
  background: #eef2ff;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.c-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}

.c-text {
  font-size: 24rpx;
  color: #667085;
  flex: 1;
  min-width: 0;
}

.c-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx dashed #f2f4f7;
}

.c-next {
  font-size: 22rpx;
  color: #98a2b3;
}

.c-teacher {
  font-size: 22rpx;
  color: #475467;
  font-weight: 500;
}

.empty-card {
  padding: 70rpx 32rpx;
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

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.97);
  border-top: 1rpx solid #eaecf0;
}
</style>
