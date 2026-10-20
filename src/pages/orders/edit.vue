<template>
  <view class="page">
    <view class="wrap">
      <view class="card pad">
        <text class="group-title">基础信息</text>

        <view class="field">
          <text class="field-label">单号</text>
          <input v-model="form.code" class="field-input" placeholder="如 BJ26062502" placeholder-class="ph">
        </view>

        <view class="field">
          <text class="field-label">年级</text>
          <input v-model="form.grade" class="field-input" placeholder="如 高二 / 初二" placeholder-class="ph">
          <view class="chips">
            <text
              v-for="g in GRADE_PRESETS"
              :key="g"
              class="chip"
              :class="{ on: form.grade === g }"
              @tap="form.grade = g"
            >{{ g }}</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">科目</text>
          <input v-model="form.subject" class="field-input" placeholder="如 数学 / 物理" placeholder-class="ph">
          <view class="chips">
            <text
              v-for="s in SUBJECT_PRESETS"
              :key="s"
              class="chip"
              :class="{ on: form.subject === s }"
              @tap="form.subject = s"
            >{{ s }}</text>
          </view>
        </view>

        <view class="field">
          <text class="field-label">授课形式</text>
          <view class="seg">
            <view class="seg-item" :class="{ on: form.mode === 'offline' }" @tap="form.mode = 'offline'">线下</view>
            <view class="seg-item" :class="{ on: form.mode === 'online' }" @tap="form.mode = 'online'">线上</view>
          </view>
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">上课地点</text>

        <view class="field">
          <text class="field-label">城市 / 区</text>
          <view class="row" style="gap: 16rpx">
            <input v-model="form.city" class="field-input half" placeholder="北京" placeholder-class="ph">
            <input v-model="form.district" class="field-input half" placeholder="通州" placeholder-class="ph">
          </view>
        </view>

        <view class="field">
          <text class="field-label">详细地址</text>
          <input v-model="form.address" class="field-input" placeholder="通州杨庄（北苑地铁附近）" placeholder-class="ph">
        </view>

        <view class="field">
          <text class="field-label">片区 / 商圈</text>
          <input v-model="form.area" class="field-input" placeholder="北苑" placeholder-class="ph">
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">课时与频次</text>

        <view class="field">
          <text class="field-label">课时费（元）</text>
          <view class="row" style="gap: 16rpx; align-items: center">
            <input v-model.number="form.rateMin" class="field-input half" type="number" placeholder="150" placeholder-class="ph">
            <text class="dash">—</text>
            <input v-model.number="form.rateMax" class="field-input half" type="number" placeholder="180" placeholder-class="ph">
            <view class="seg small">
              <view class="seg-item" :class="{ on: form.rateUnit === 'h' }" @tap="form.rateUnit = 'h'">/h</view>
              <view class="seg-item" :class="{ on: form.rateUnit === 'lesson' }" @tap="form.rateUnit = 'lesson'">/次</view>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">每周次数</text>
          <view class="chips">
            <text
              v-for="n in [1, 2, 3, 4, 5]"
              :key="n"
              class="chip"
              :class="{ on: form.freqPerWeek === n }"
              @tap="setFreq(n)"
            >{{ n }}次</text>
          </view>
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
          <text class="field-label">具体上课时间</text>
          <input v-model="form.startTimeText" class="field-input" placeholder="如 周六日上午9点" placeholder-class="ph">
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">学生与要求</text>

        <view class="field">
          <text class="field-label">学生性别</text>
          <view class="seg small">
            <view class="seg-item" :class="{ on: form.studentGender === '' }" @tap="form.studentGender = ''">未注明</view>
            <view class="seg-item" :class="{ on: form.studentGender === '男' }" @tap="form.studentGender = '男'">男孩</view>
            <view class="seg-item" :class="{ on: form.studentGender === '女' }" @tap="form.studentGender = '女'">女孩</view>
          </view>
        </view>

        <view class="field">
          <text class="field-label">学生情况</text>
          <textarea v-model="form.studentInfo" class="field-area" placeholder="基础薄弱 / 物理50分…" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="field-label">老师要求</text>
          <textarea v-model="form.teacherReq" class="field-area" placeholder="男大学生，有耐心，有经验" placeholder-class="ph" />
        </view>

        <view class="field">
          <text class="field-label">备注</text>
          <input v-model="form.remark" class="field-input" placeholder="其他补充信息" placeholder-class="ph">
        </view>
      </view>

      <view class="card pad">
        <text class="group-title">状态</text>
        <view class="chips" style="margin-top: 16rpx">
          <text
            v-for="s in STATUS_ORDER"
            :key="s"
            class="chip"
            :class="{ on: form.status === s }"
            @tap="form.status = s"
          >{{ ORDER_STATUS[s].label }}</text>
        </view>
      </view>
    </view>

    <view class="bottom">
      <view class="btn btn-primary" @tap="save">保存</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { OrderStatus, TutorOrder } from '@/types'
import { ORDER_STATUS, STATUS_ORDER, addOrders, getOrder, updateOrder } from '@/utils/store'
import { estimateCoord } from '@/utils/geo'
import { todayISO } from '@/utils/date'
import { toast } from '@/utils/ui'

const GRADE_PRESETS = ['四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
const SUBJECT_PRESETS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

const editingId = ref('')

const form = reactive({
  code: '',
  grade: '',
  subject: '',
  mode: 'offline' as 'offline' | 'online',
  city: '北京',
  district: '',
  area: '',
  address: '',
  rateMin: 0,
  rateMax: 0,
  rateUnit: 'h' as 'h' | 'lesson',
  freqPerWeek: 2,
  durationMin: 120,
  startTimeText: '',
  studentGender: '' as '' | '男' | '女',
  studentInfo: '',
  teacherReq: '',
  remark: '',
  status: 'pending' as OrderStatus,
})

onLoad((query: any) => {
  uni.setNavigationBarTitle({ title: query?.id ? '编辑家教单' : '新建家教单' })
  const id = query?.id
  if (!id) return
  const o = getOrder(id)
  if (!o) return
  editingId.value = id
  Object.assign(form, {
    code: o.code,
    grade: o.grade,
    subject: o.subject,
    mode: o.mode,
    city: o.city,
    district: o.district,
    area: o.area,
    address: o.address,
    rateMin: o.rateMin,
    rateMax: o.rateMax,
    rateUnit: o.rateUnit,
    freqPerWeek: o.freqPerWeek,
    durationMin: o.durationMin || 120,
    startTimeText: o.startTimeText,
    studentGender: o.studentGender,
    studentInfo: o.studentInfo,
    teacherReq: o.teacherReq,
    remark: o.remark,
    status: o.status,
  })
})

function setFreq(n: number) {
  form.freqPerWeek = n
}

function save() {
  if (!form.grade && !form.subject) {
    toast('至少填年级或科目')
    return
  }
  const rateMin = Number(form.rateMin) || 0
  const rateMax = Number(form.rateMax) || rateMin
  const coord = estimateCoord({ address: form.address, area: form.area, district: form.district })

  if (editingId.value) {
    updateOrder(editingId.value, {
      code: form.code,
      grade: form.grade,
      subject: form.subject,
      mode: form.mode,
      city: form.city,
      district: form.district,
      area: form.area,
      address: form.address,
      rateMin,
      rateMax,
      rateUnit: form.rateUnit,
      freqPerWeek: form.freqPerWeek,
      freqPerWeekMax: form.freqPerWeek,
      durationMin: form.durationMin,
      startTimeText: form.startTimeText,
      studentGender: form.studentGender,
      studentInfo: form.studentInfo,
      teacherReq: form.teacherReq,
      remark: form.remark,
      status: form.status,
      title: `${form.district || form.city} · ${form.grade}${form.subject}`,
      lat: coord.lat,
      lng: coord.lng,
      geoSource: 'area',
    })
    toast('已保存', 'success')
  }
  else {
    const now = Date.now()
    const order: TutorOrder = {
      id: `o_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      code: form.code,
      title: `${form.district || form.city} · ${form.grade}${form.subject}`,
      city: form.city,
      district: form.district,
      area: form.area,
      mode: form.mode,
      grade: form.grade,
      subject: form.subject,
      address: form.address,
      rateMin,
      rateMax,
      rateUnit: form.rateUnit,
      rateText: rateMin ? `${rateMin}-${rateMax}` : '',
      freqPerWeek: form.freqPerWeek,
      freqPerWeekMax: form.freqPerWeek,
      freqText: '',
      durationMin: form.durationMin,
      studentGender: form.studentGender,
      studentInfo: form.studentInfo,
      teacherReq: form.teacherReq,
      teacherGender: '',
      startTimeText: form.startTimeText,
      remark: form.remark,
      source: '手动新建',
      rawText: '',
      status: form.status,
      missing: [],
      confidence: 1,
      lat: coord.lat,
      lng: coord.lng,
      geoSource: 'area',
      createdAt: now,
      updatedAt: now,
    }
    addOrders([order])
    toast('已创建', 'success')
  }
  setTimeout(() => uni.navigateBack(), 600)
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

.half {
  flex: 1;
  min-width: 0;
}

.dash {
  color: #c0c6d1;
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

.seg {
  display: flex;
  gap: 8rpx;
  background: #f2f4f7;
  border-radius: 16rpx;
  padding: 6rpx;
  margin-top: 12rpx;
}

.seg.small {
  margin-top: 0;
  padding: 4rpx;
}

.seg-item {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 25rpx;
  color: #667085;
}

.seg.small .seg-item {
  height: 52rpx;
  padding: 0 16rpx;
  flex: initial;
}

.seg-item.on {
  background: #fff;
  color: #3b62f6;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(16, 24, 40, 0.08);
}

.field-area {
  width: 100%;
  height: 140rpx;
  font-size: 27rpx;
  color: #101828;
  line-height: 1.6;
  margin-top: 8rpx;
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
