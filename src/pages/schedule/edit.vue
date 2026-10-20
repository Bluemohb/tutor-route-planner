<template>
  <view class="page">
    <view class="wrap">
      <view class="card pad">
        <text class="group-title">关联家教单</text>
        <picker
          mode="selector"
          :range="orderLabels"
          :value="orderIndex"
          @change="onOrderChange"
        >
          <view class="picker-row">
            <text class="picker-value" :class="{ ph: orderIndex < 0 }">
              {{ orderIndex >= 0 ? orderLabels[orderIndex] : '选择一个家教单（可选）' }}
            </text>
            <app-icon name="chevronDown" :size="16" color="#98A2B3" />
          </view>
        </picker>

        <view class="field">
          <text class="field-label">学生称呼</text>
          <input v-model="form.studentName" class="field-input" placeholder="如 初二学生 / 小明" placeholder-class="ph">
        </view>

        <view class="field">
          <text class="field-label">上课老师</text>
          <input v-model="form.teacherName" class="field-input" placeholder="如 王老师" placeholder-class="ph">
        </view>

        <view class="field">
          <text class="field-label">地址</text>
          <input v-model="form.address" class="field-input" placeholder="上课地点" placeholder-class="ph">
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">上课时间</text>

        <view class="field">
          <text class="field-label">每周哪几天</text>
          <view class="wd-row">
            <view
              v-for="w in WEEKDAYS"
              :key="w.value"
              class="wd"
              :class="{ on: form.weekdays.includes(w.value) }"
              @tap="toggleWeekday(w.value)"
            >{{ w.label }}</view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">开始时间</text>
          <picker mode="time" :value="form.startTime" @change="onTimeChange">
            <view class="picker-row">
              <text class="picker-value">{{ form.startTime }}</text>
              <app-icon name="clock" :size="16" color="#98A2B3" />
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="field-label">单次时长</text>
          <view class="chips">
            <text
              v-for="d in [60, 90, 120, 150, 180]"
              :key="d"
              class="chip"
              :class="{ on: form.durationMin === d }"
              @tap="form.durationMin = d"
            >{{ d / 60 }}h</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">生效区间</text>
          <view class="row" style="gap: 16rpx; align-items: center">
            <picker mode="date" :value="form.startDate" @change="onStartDate">
              <view class="date-box">{{ form.startDate }}</view>
            </picker>
            <text class="dash">至</text>
            <picker mode="date" :value="form.endDate" @change="onEndDate">
              <view class="date-box">{{ form.endDate }}</view>
            </picker>
          </view>
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">外观</text>
        <view class="colors">
          <view
            v-for="c in COLORS"
            :key="c"
            class="color"
            :style="{ background: c }"
            @tap="form.color = c"
          >
            <app-icon v-if="form.color === c" name="check" :size="14" color="#FFFFFF" :stroke="3" />
          </view>
        </view>
        <view class="field" style="border: none">
          <text class="field-label">备注</text>
          <input v-model="form.note" class="field-input" placeholder="选填" placeholder-class="ph">
        </view>
      </view>

      <view class="preview">
        <app-icon name="calendar" :size="16" color="#3B62F6" />
        <text class="preview-text">{{ previewText }}</text>
      </view>

      <view v-if="editingId" class="del" @tap="remove">
        <text class="del-text">删除这个排课</text>
      </view>
    </view>

    <view class="bottom">
      <view class="btn btn-primary" @tap="save">保存排课</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppIcon from '@/components/AppIcon.vue'
import type { Course } from '@/types'
import { getCourse, getOrder, nextColor, removeCourse, saveCourse, state } from '@/utils/store'
import { addDays, fmtDate, hhmmToMin, minToHhmm, parseISO, todayISO } from '@/utils/date'
import { estimateCoord } from '@/utils/geo'
import { confirm, toast } from '@/utils/ui'

const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

const COLORS = ['#3B62F6', '#F97316', '#12B886', '#8B5CF6', '#EC4899', '#0EA5E9']

const editingId = ref('')
const orderIndex = ref(-1)

const form = reactive({
  orderId: '',
  studentName: '',
  teacherName: '',
  subject: '',
  grade: '',
  weekdays: [6] as number[],
  startTime: '18:30',
  durationMin: 120,
  startDate: todayISO(),
  endDate: fmtDate(addDays(new Date(), 60)),
  address: '',
  lat: 0 as number | undefined,
  lng: 0 as number | undefined,
  color: nextColor(),
  note: '',
})

const orderLabels = computed(() =>
  state.orders.map(o => `${o.grade || '?'}${o.subject || '?'} · ${o.district || ''}${o.area ? `·${o.area}` : ''} · ${o.code || '无单号'}`),
)

onLoad((query: any) => {
  uni.setNavigationBarTitle({ title: query?.id ? '编辑排课' : '新建排课' })
  if (query?.id) {
    const c = getCourse(query.id)
    if (c) {
      editingId.value = c.id
      Object.assign(form, {
        orderId: c.orderId,
        studentName: c.studentName,
        teacherName: c.teacherName,
        subject: c.subject,
        grade: c.grade,
        weekdays: [...c.weekdays],
        startTime: c.startTime,
        durationMin: c.durationMin,
        startDate: c.startDate,
        endDate: c.endDate,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        color: c.color,
        note: c.note,
      })
      orderIndex.value = state.orders.findIndex(o => o.id === c.orderId)
    }
  }
  else if (query?.orderId) {
    const o = getOrder(query.orderId)
    if (o) applyOrder(o.id)
  }
  if (query?.date) {
    form.startDate = query.date
  }
})

function applyOrder(id: string) {
  const o = getOrder(id)
  if (!o) return
  form.orderId = o.id
  form.subject = o.subject
  form.grade = o.grade
  form.address = o.address
  form.studentName = `${o.grade}${o.studentGender ? `${o.studentGender}孩` : '学生'}`
  form.durationMin = o.durationMin || 120
  const c = estimateCoord(o)
  form.lat = c.lat
  form.lng = c.lng
  orderIndex.value = state.orders.findIndex(x => x.id === id)
}

function onOrderChange(e: any) {
  const idx = Number(e.detail.value)
  const o = state.orders[idx]
  if (o) applyOrder(o.id)
}

function toggleWeekday(v: number) {
  if (form.weekdays.includes(v)) {
    form.weekdays = form.weekdays.filter(x => x !== v)
  }
  else {
    form.weekdays = [...form.weekdays, v].sort((a, b) => a - b)
  }
}

function onTimeChange(e: any) {
  form.startTime = e.detail.value
}

function onStartDate(e: any) {
  form.startDate = e.detail.value
  if (form.endDate < form.startDate) form.endDate = form.startDate
}

function onEndDate(e: any) {
  form.endDate = e.detail.value
}

const lessonCount = computed(() => {
  if (!form.weekdays.length) return 0
  const end = parseISO(form.endDate)
  let n = 0
  for (let d = parseISO(form.startDate); d <= end; d = addDays(d, 1)) {
    if (form.weekdays.includes(d.getDay())) n++
    if (n >= 200) break
  }
  return n
})

const previewText = computed(() => {
  if (!form.weekdays.length) return '还没选上课的星期'
  const wd = [...form.weekdays].sort((a, b) => a - b).map(v => WEEKDAYS.find(w => w.value === v)?.label).join('、')
  const end = minToHhmm(hhmmToMin(form.startTime) + form.durationMin)
  return `每周${wd} ${form.startTime}-${end}，共生成 ${lessonCount.value} 节课`
})

function save() {
  if (!form.weekdays.length) {
    toast('至少选一天')
    return
  }
  const course: Course = {
    id: editingId.value || `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    orderId: form.orderId,
    studentName: form.studentName || '学生',
    teacherName: form.teacherName,
    subject: form.subject || '课程',
    grade: form.grade,
    weekdays: [...form.weekdays].sort((a, b) => a - b),
    startTime: form.startTime,
    durationMin: form.durationMin,
    startDate: form.startDate,
    endDate: form.endDate,
    address: form.address,
    lat: form.lat,
    lng: form.lng,
    color: form.color,
    note: form.note,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  saveCourse(course)
  toast('已保存', 'success')
  setTimeout(() => uni.navigateBack(), 600)
}

async function remove() {
  const ok = await confirm('删除后对应的课次也会一起删掉，确定吗？', '删除排课')
  if (!ok) return
  removeCourse(editingId.value)
  toast('已删除', 'success')
  setTimeout(() => uni.navigateBack(), 500)
}
</script>

<style scoped>
.page {
  padding-bottom: 200rpx;
}

.wrap {
  padding: 24rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.group-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #98a2b3;
  letter-spacing: 1rpx;
  display: block;
}

.ph {
  color: #b0b7c3;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 0 4rpx;
}

.picker-value {
  font-size: 27rpx;
  color: #101828;
  flex: 1;
  min-width: 0;
}

.picker-value.ph {
  color: #b0b7c3;
}

.wd-row {
  display: flex;
  gap: 10rpx;
  margin-top: 16rpx;
}

.wd {
  flex: 1;
  height: 72rpx;
  border-radius: 18rpx;
  background: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #667085;
}

.wd.on {
  background: #3b62f6;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(59, 98, 246, 0.28);
}

.chips {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 16rpx;
}

.chip {
  padding: 10rpx 20rpx;
  border-radius: 14rpx;
  background: #f5f7fb;
  font-size: 24rpx;
  color: #667085;
}

.chip.on {
  background: #eef2ff;
  color: #3b62f6;
  font-weight: 600;
}

.date-box {
  padding: 14rpx 22rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 25rpx;
  color: #101828;
}

.dash {
  color: #c0c6d1;
  font-size: 24rpx;
}

.colors {
  display: flex;
  gap: 18rpx;
  margin-top: 20rpx;
}

.color {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview {
  display: flex;
  align-items: center;
  gap: 10rpx;
  background: #eef2ff;
  border-radius: 18rpx;
  padding: 20rpx 22rpx;
}

.preview-text {
  font-size: 24rpx;
  color: #3b62f6;
  font-weight: 500;
}

.del {
  padding: 26rpx;
  text-align: center;
}

.del-text {
  font-size: 26rpx;
  color: #ef4444;
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
