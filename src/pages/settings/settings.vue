<template>
  <view class="page">
    <view class="wrap">
      <view class="card">
        <view class="sec-head">
          <text class="sec-title">数据</text>
          <text class="sec-sub">{{ state.orders.length }} 条家教单 · {{ state.courses.length }} 个排课</text>
        </view>

        <view class="row-item">
          <view class="flex1">
            <text class="row-title">云端同步</text>
            <text class="row-desc">{{ cloudDesc }}</text>
          </view>
          <switch
            :checked="state.settings.cloudEnabled"
            color="#3B62F6"
            @change="onCloudToggle"
          />
        </view>

        <view class="row-item" @tap="doSync">
          <view class="flex1">
            <text class="row-title">立即同步</text>
            <text class="row-desc">{{ syncDesc }}</text>
          </view>
          <app-icon name="sync" :size="18" color="#98A2B3" />
        </view>

        <view class="row-item" @tap="exportData">
          <view class="flex1">
            <text class="row-title">导出全部数据</text>
            <text class="row-desc">导出为 JSON，可用于备份或换设备迁移</text>
          </view>
          <app-icon name="download" :size="18" color="#98A2B3" />
        </view>

        <view class="row-item" @tap="showImport = !showImport">
          <view class="flex1">
            <text class="row-title">导入数据</text>
            <text class="row-desc">粘贴之前导出的 JSON 恢复</text>
          </view>
          <app-icon name="upload" :size="18" color="#98A2B3" />
        </view>

        <view v-if="showImport" class="import-box">
          <textarea
            v-model="importText"
            class="import-ta"
            :maxlength="-1"
            placeholder="把导出的 JSON 粘贴到这里"
            placeholder-class="ph"
          />
          <view class="row" style="gap: 16rpx; margin-top: 16rpx">
            <view class="btn btn-plain btn-sm flex1" @tap="showImport = false">取消</view>
            <view class="btn btn-ghost btn-sm flex1" @tap="doImportJson">确认导入</view>
          </view>
        </view>

        <view class="row-item" @tap="clearData">
          <view class="flex1">
            <text class="row-title danger">清空所有数据</text>
            <text class="row-desc">不可恢复，建议先导出备份</text>
          </view>
          <app-icon name="trash" :size="18" color="#EF4444" />
        </view>

        <view class="row-item" @tap="onRestoreDemo">
          <view class="flex1">
            <text class="row-title">恢复示例数据</text>
            <text class="row-desc">重新载入 8 条示例家教单和 4 个排课档期</text>
          </view>
          <app-icon name="sparkles" :size="18" color="#98A2B3" />
        </view>
      </view>

      <view class="card">
        <view class="sec-head">
          <text class="sec-title">位置与路线</text>
        </view>

        <view class="pad-x">
          <text class="row-title">腾讯位置服务 Key</text>
          <text class="row-desc">填了才能做真实地理编码和驾车路线规划；留空则用内置片区坐标估算</text>
          <input
            v-model="lbsKey"
            class="key-input"
            placeholder="粘贴你的 Key（https://lbs.qq.com 申请）"
            placeholder-class="ph"
            @blur="saveLbsKey"
          >
          <view class="row" style="gap: 12rpx; margin-top: 14rpx">
            <view class="btn btn-ghost btn-sm" @tap="saveLbsKey">保存 Key</view>
            <text class="hint">{{ state.settings.lbsKey ? '已配置' : '未配置 · 当前为示意模式' }}</text>
          </view>
        </view>

        <view class="row-item">
          <view class="flex1">
            <text class="row-title">默认出发点</text>
            <text class="row-desc">算路线时从这里出发</text>
          </view>
          <picker mode="selector" :range="districts" :value="districtIndex" @change="onDistrict">
            <view class="picker-val">
              <text>{{ state.settings.homeDistrict }}</text>
              <app-icon name="chevronDown" :size="14" color="#98A2B3" />
            </view>
          </picker>
        </view>
      </view>

      <view class="card">
        <view class="sec-head">
          <text class="sec-title">默认值</text>
        </view>

        <view class="row-item">
          <text class="row-title flex1">默认单次时长</text>
          <view class="seg">
            <view
              v-for="d in [60, 90, 120]"
              :key="d"
              class="seg-item"
              :class="{ on: state.settings.defaultDuration === d }"
              @tap="updateSettings({ defaultDuration: d })"
            >{{ d / 60 }}h</view>
          </view>
        </view>

        <view class="row-item">
          <text class="row-title flex1">默认上课时间</text>
          <picker mode="time" :value="state.settings.defaultStartTime" @change="onDefaultTime">
            <view class="picker-val">
              <text>{{ state.settings.defaultStartTime }}</text>
              <app-icon name="chevronDown" :size="14" color="#98A2B3" />
            </view>
          </picker>
        </view>
      </view>

      <view class="card">
        <view class="sec-head">
          <text class="sec-title">关于</text>
        </view>
        <view class="pad-x about">
          <text class="about-line">家教助手 v1.0.0</text>
          <text class="about-line dim">家教单导入 · 排课 · 日历 · 路线</text>
          <text class="about-line dim">解析引擎支持群消息里 30+ 种字段写法</text>
          <text class="about-line dim">数据默认只存在本机，开启云同步后才会上传</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { Course, TutorOrder } from '@/types'
import { clearAll, importData, seedDemo, state, syncNow, updateSettings } from '@/utils/store'
import { isCloudConfigured } from '@/utils/cloud'
import { BEIJING_DISTRICTS } from '@/parser/dict'
import { confirm, copyText, toast } from '@/utils/ui'
import { timeAgo } from '@/utils/date'

const showImport = ref(false)
const importText = ref('')
const lbsKey = ref(state.settings.lbsKey)

const districts = Object.keys(BEIJING_DISTRICTS)
const districtIndex = computed(() => Math.max(0, districts.indexOf(state.settings.homeDistrict)))

const cloudDesc = computed(() => {
  if (!isCloudConfigured()) return '未配置云开发环境 ID（在 .env 里设置 VITE_ENV_ID）'
  return state.settings.cloudEnabled ? '已开启 · 数据会同步到腾讯云开发' : '已关闭 · 数据只存本机'
})

const syncDesc = computed(() => {
  if (state.syncing) return '同步中…'
  if (!state.settings.cloudEnabled) return '先打开上面的云同步开关'
  return state.lastSyncAt ? `上次同步 ${timeAgo(state.lastSyncAt)}` : '还没有同步过'
})

function onCloudToggle(e: any) {
  updateSettings({ cloudEnabled: !!e.detail.value })
  toast(e.detail.value ? '已开启云同步' : '已关闭云同步')
}

async function doSync() {
  if (!state.settings.cloudEnabled) {
    toast('先打开云同步开关')
    return
  }
  const res = await syncNow()
  toast(res.message, res.ok ? 'success' : 'none')
}

function saveLbsKey() {
  updateSettings({ lbsKey: lbsKey.value.trim() })
  toast('已保存', 'success')
}

function onDistrict(e: any) {
  const d = districts[Number(e.detail.value)]
  updateSettings({ homeDistrict: d })
}

function onDefaultTime(e: any) {
  updateSettings({ defaultStartTime: e.detail.value })
}

function exportData() {
  const payload = JSON.stringify(
    { version: 1, exportedAt: Date.now(), orders: state.orders, courses: state.courses },
    null,
    2,
  )

  // #ifdef H5
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `家教助手备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('已导出', 'success')
  // #endif

  // #ifdef MP-WEIXIN
  copyText(payload)
  // #endif
}

function doImportJson() {
  try {
    const data = JSON.parse(importText.value)
    const orders: TutorOrder[] = data.orders || []
    const courses: Course[] = data.courses || []
    if (!orders.length && !courses.length) {
      toast('JSON 里没有数据')
      return
    }
    const res = importData(orders, courses)
    toast(`已导入 ${res.orders} 条单 · ${res.courses} 个排课`, 'success')
    importText.value = ''
    showImport.value = false
  }
  catch {
    toast('JSON 格式不正确')
  }
}

async function clearData() {
  const ok = await confirm('会删除本机所有家教单和排课，确定吗？', '清空数据')
  if (!ok) return
  clearAll()
  toast('已清空', 'success')
}

function onRestoreDemo() {
  seedDemo()
  toast('示例数据已恢复', 'success')
}
</script>

<style scoped>
.page {
  padding-bottom: 80rpx;
}

.wrap {
  padding: 24rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  background: #fff;
  border-radius: 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 26rpx rgba(16, 24, 40, 0.05);
}

.sec-head {
  padding: 26rpx 26rpx 18rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.sec-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #101828;
}

.sec-sub {
  font-size: 22rpx;
  color: #98a2b3;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 26rpx;
  border-top: 1rpx solid #f5f7fb;
}

.row-title {
  font-size: 27rpx;
  color: #101828;
  display: block;
}

.row-title.danger {
  color: #ef4444;
}

.row-desc {
  font-size: 22rpx;
  color: #98a2b3;
  margin-top: 6rpx;
  display: block;
  line-height: 1.5;
}

.pad-x {
  padding: 0 26rpx 26rpx;
}

.key-input {
  margin-top: 16rpx;
  background: #f8f9fb;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 25rpx;
  color: #101828;
}

.ph {
  color: #b0b7c3;
}

.hint {
  font-size: 22rpx;
  color: #98a2b3;
}

.picker-val {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #475467;
}

.seg {
  display: flex;
  gap: 8rpx;
  background: #f2f4f7;
  border-radius: 14rpx;
  padding: 4rpx;
}

.seg-item {
  padding: 8rpx 20rpx;
  border-radius: 10rpx;
  font-size: 23rpx;
  color: #667085;
}

.seg-item.on {
  background: #fff;
  color: #3b62f6;
  font-weight: 600;
}

.import-box {
  padding: 0 26rpx 26rpx;
}

.import-ta {
  width: 100%;
  height: 220rpx;
  background: #f8f9fb;
  border-radius: 16rpx;
  padding: 18rpx;
  font-size: 22rpx;
  color: #475467;
}

.about {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.about-line {
  font-size: 24rpx;
  color: #101828;
}

.about-line.dim {
  color: #98a2b3;
  font-size: 22rpx;
}
</style>
