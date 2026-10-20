<template>
  <view class="mc">
    <view class="mc-head">
      <view class="mc-nav" @tap="shift(-1)">
        <app-icon name="chevronLeft" :size="18" color="#475467" />
      </view>
      <view class="mc-title" @tap="goToday">
        <text class="mc-month">{{ label }}</text>
        <text class="mc-back">今天</text>
      </view>
      <view class="mc-nav" @tap="shift(1)">
        <app-icon name="chevronRight" :size="18" color="#475467" />
      </view>
    </view>

    <view class="mc-week">
      <text v-for="w in weekLabels" :key="w" class="mc-wd">{{ w }}</text>
    </view>

    <view class="mc-grid">
      <view v-for="c in cells" :key="c.iso" class="mc-cell" @tap="pick(c)">
        <view
          class="mc-day"
          :class="{
            sel: c.iso === modelValue,
            today: c.isToday && c.iso !== modelValue,
            out: !c.inMonth,
          }"
        >
          <text class="mc-num">{{ c.day }}</text>
        </view>
        <view class="mc-dots">
          <view
            v-for="(color, i) in (marks[c.iso] || []).slice(0, 3)"
            :key="i"
            class="mc-dot"
            :style="{ background: color }"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { monthGrid, monthLabel, parseISO, todayISO } from '@/utils/date'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** 每天对应的色点（课程颜色） */
    marks?: Record<string, string[]>
  }>(),
  { marks: () => ({}) },
)

const emit = defineEmits<{ 'update:modelValue': [iso: string] }>()

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']

const viewYear = ref(parseISO(props.modelValue || todayISO()).getFullYear())
const viewMonth = ref(parseISO(props.modelValue || todayISO()).getMonth() + 1)

watch(
  () => props.modelValue,
  (v) => {
    if (!v) return
    const d = parseISO(v)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth() + 1
  },
)

const cells = computed(() => monthGrid(viewYear.value, viewMonth.value))
const label = computed(() => monthLabel(viewYear.value, viewMonth.value))

function shift(n: number) {
  const d = new Date(viewYear.value, viewMonth.value - 1 + n, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth() + 1
}

function goToday() {
  const t = todayISO()
  const d = parseISO(t)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth() + 1
  emit('update:modelValue', t)
}

function pick(c: { iso: string; inMonth: boolean }) {
  if (!c.inMonth) {
    const d = parseISO(c.iso)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth() + 1
  }
  emit('update:modelValue', c.iso)
}
</script>

<style scoped>
.mc {
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx 20rpx 12rpx;
  box-shadow: 0 8rpx 28rpx rgba(16, 24, 40, 0.06);
}

.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 18rpx;
}

.mc-nav {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  background: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mc-nav:active {
  background: #eef2ff;
}

.mc-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.mc-month {
  font-size: 32rpx;
  font-weight: 700;
  color: #101828;
}

.mc-back {
  font-size: 22rpx;
  color: #3b62f6;
  background: #eef2ff;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
}

.mc-week {
  display: flex;
  padding-bottom: 8rpx;
}

.mc-wd {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #98a2b3;
  font-weight: 500;
}

.mc-grid {
  display: flex;
  flex-wrap: wrap;
}

.mc-cell {
  width: 14.2857%;
  height: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 8rpx;
}

.mc-day {
  width: 56rpx;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.mc-num {
  font-size: 27rpx;
  color: #101828;
  font-weight: 500;
}

.mc-day.out .mc-num {
  color: #d0d5dd;
}

.mc-day.today {
  background: #eef2ff;
}

.mc-day.today .mc-num {
  color: #3b62f6;
  font-weight: 700;
}

.mc-day.sel {
  background: linear-gradient(135deg, #3b62f6 0%, #5b7cff 100%);
  box-shadow: 0 8rpx 18rpx rgba(59, 98, 246, 0.32);
}

.mc-day.sel .mc-num {
  color: #fff;
  font-weight: 700;
}

.mc-dots {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 12rpx;
  margin-top: 4rpx;
}

.mc-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
}
</style>
