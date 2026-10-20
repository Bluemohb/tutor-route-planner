<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ on: mode === 'text' }" @tap="mode = 'text'">粘贴群消息</view>
      <view class="tab" :class="{ on: mode === 'file' }" @tap="mode = 'file'">导入表格</view>
    </view>

    <!-- ================= 粘贴群消息 ================= -->
    <view v-if="mode === 'text'" class="wrap">
      <view class="card pad">
        <view class="row-between">
          <text class="card-title">把群里的家教单复制过来</text>
          <text class="link" @tap="loadSample">载入示例</text>
        </view>
        <textarea
          v-model="raw"
          class="ta"
          :maxlength="-1"
          placeholder="支持一次粘贴多条，程序会自动按「＃标题 / 单号 / 【北京线下】」切成一条条家教单"
          placeholder-class="ta-ph"
        />
        <view class="row-between ta-foot">
          <text class="muted">{{ raw.length }} 字</text>
          <view class="row" style="gap: 20rpx">
            <text v-if="raw" class="link gray" @tap="raw = ''">清空</text>
            <text class="link" @tap="doParse">解析</text>
          </view>
        </view>
      </view>

      <view class="tip-card">
        <view class="tip-head">
          <app-icon name="sparkles" :size="16" color="#3B62F6" />
          <text class="tip-title">能识别这些写法</text>
        </view>
        <view class="tip-body">
          <text class="tip-line">· 【年级科目】新高二，数学　　　【辅导地点】通州杨庄</text>
          <text class="tip-line">· 【补课地址】 : ==通州区后北营家园==</text>
          <text class="tip-line">· 一周2-3次 / 每次1.5h / 150-180/h 自动拆成结构化字段</text>
          <text class="tip-line">· 单号 gy26072504、BJ26062502、H0032026 自动提取</text>
        </view>
        <view class="tip-foot">
          <text class="link gray">单子太少？</text>
          <text class="link" @tap="goManual">手动新建一条 ›</text>
        </view>
      </view>

      <view class="parse-bar" v-if="parsed.length">
        <text class="pb-text">解析出 {{ parsed.length }} 条</text>
        <text class="pb-sub">{{ parsed.length - pickedCount }} 条未选中</text>
      </view>

      <view v-if="parsed.length" class="preview">
        <view
          v-for="o in parsed"
          :key="o.id"
          class="pv-item"
          :class="{ off: !picked[o.id] }"
          @tap="togglePick(o.id)"
        >
          <view class="pv-check" :class="{ on: picked[o.id] }">
            <app-icon
              v-if="picked[o.id]"
              name="check"
              :size="12"
              color="#FFFFFF"
              :stroke="3"
            />
          </view>
          <view class="flex1">
            <view class="pv-line1">
              <text class="pv-title">{{ o.grade || '?' }}{{ o.subject || '?' }}</text>
              <text class="pv-price">{{ o.rateMin ? `${o.rateMin}-${o.rateMax}/h` : '面议' }}</text>
            </view>
            <text class="pv-addr ellipsis">{{ o.district || '' }}{{ o.area ? ` · ${o.area}` : '' }}　{{ o.address || '地址待补' }}</text>
            <view class="pv-tags">
              <text v-if="o.code" class="pv-tag">{{ o.code }}</text>
              <text v-if="o.freqPerWeek" class="pv-tag">{{ o.freqPerWeek }}次/周</text>
              <text v-for="m in o.missing" :key="m" class="pv-tag warn">缺{{ m }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ================= 导入表格 ================= -->
    <view v-else class="wrap">
      <view class="card upload-card" @tap="pickFile">
        <view class="up-icon">
          <app-icon name="upload" :size="28" color="#3B62F6" />
        </view>
        <text class="up-title">{{ loading ? '正在解析…' : '选择 Excel / CSV 文件' }}</text>
        <text class="up-sub">支持 .xlsx .xls .csv，自动识别表头</text>
      </view>

      <view class="tip-card">
        <view class="tip-head">
          <app-icon name="layers" :size="16" color="#3B62F6" />
          <text class="tip-title">表格要求</text>
        </view>
        <view class="tip-body">
          <text class="tip-line">· 第一行是表头，列名用「年级 / 科目 / 辅导地点 / 课时报酬 / 时间次数」这类写法即可，顺序不限</text>
          <text class="tip-line">· 多余的列（序号、备注等）会被忽略</text>
          <text class="tip-line">· 表头和群消息共用同一套字段词典，识别结果一致</text>
        </view>
        <view class="btn btn-ghost btn-sm tpl-btn" @tap.stop="downloadTemplate">下载模板</view>
      </view>

      <view class="tip-card">
        <view class="tip-head">
          <app-icon name="phone" :size="16" color="#12B886" />
          <text class="tip-title">从微信群直接导入</text>
        </view>
        <view class="tip-body">
          <text class="tip-line">1. 在微信群里长按别人发来的表格文件 → 选择「用其他应用打开」</text>
          <text class="tip-line">2. 或者在聊天里「发送给朋友 → 文件」，存到手机后回到这里选文件</text>
          <text class="tip-line">3. 纯文字单子更简单：长按消息 → 复制 → 用「粘贴群消息」导入</text>
        </view>
      </view>
    </view>

    <view v-if="parsed.length && mode === 'text'" class="bottom-bar">
      <view class="bb-info">
        <text class="bb-num">{{ pickedCount }}</text>
        <text class="bb-label">条待导入</text>
      </view>
      <view class="btn btn-primary bb-btn" @tap="doImport">导入家教单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { TutorOrder } from '@/types'
import { parseMany } from '@/parser'
import { SAMPLE_MESSAGES } from '@/data/sample'
import { addOrders } from '@/utils/store'
import { buildTemplateCsv, readTableFile } from '@/utils/sheet'
import { copyText, toast } from '@/utils/ui'

const mode = ref<'text' | 'file'>('text')
const raw = ref('')
const parsed = ref<TutorOrder[]>([])
const picked = ref<Record<string, boolean>>({})
const loading = ref(false)

const pickedCount = computed(() => parsed.value.filter(o => picked.value[o.id]).length)

function loadSample() {
  raw.value = SAMPLE_MESSAGES.slice(0, 3).join('\n\n')
  parsed.value = []
  picked.value = {}
}

function goManual() {
  uni.navigateTo({ url: '/pages/orders/edit' })
}

function doParse() {
  if (!raw.value.trim()) {
    toast('先粘贴群消息')
    return
  }
  const list = parseMany(raw.value, { source: '群消息导入' })
  if (!list.length) {
    toast('没解析出内容，检查下格式')
    return
  }
  parsed.value = list
  const m: Record<string, boolean> = {}
  for (const o of list) m[o.id] = true
  picked.value = m
  toast(`解析出 ${list.length} 条`, 'success')
}

function togglePick(id: string) {
  picked.value = { ...picked.value, [id]: !picked.value[id] }
}

function doImport() {
  const list = parsed.value.filter(o => picked.value[o.id])
  if (!list.length) {
    toast('至少选一条')
    return
  }
  const n = addOrders(list)
  toast(n === list.length ? `已导入 ${n} 条` : `已导入 ${n} 条（${list.length - n} 条单号重复已跳过）`, 'success')
  parsed.value = []
  picked.value = {}
  raw.value = ''
  setTimeout(() => uni.navigateBack(), 800)
}

/* ------------------------- 文件导入 ------------------------- */

function pickFile() {
  if (loading.value) return

  // #ifdef H5
  uni.chooseFile({
    count: 1,
    extension: ['.xlsx', '.xls', '.csv', '.txt'],
    success: (res: any) => {
      const file = res.tempFiles?.[0]
      if (!file) return
      handleH5File(file)
    },
    fail: () => toast('未选择文件'),
  })
  // #endif

  // #ifdef MP-WEIXIN
  const wxAny = (globalThis as any).wx
  wxAny.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xlsx', 'xls', 'csv', 'txt'],
    success: (res: any) => {
      const file = res.tempFiles?.[0]
      if (file) handleMpFile(file)
    },
    fail: () => toast('未选择文件'),
  })
  // #endif
}

async function handleH5File(file: File) {
  loading.value = true
  try {
    const isCsv = /\.(csv|tsv|txt)$/i.test(file.name)
    if (isCsv) {
      const text = await file.text()
      const list = await readTableFile({ name: file.name, text, source: file.name })
      finishFile(list)
    }
    else {
      const buffer = await file.arrayBuffer()
      const list = await readTableFile({ name: file.name, buffer, source: file.name })
      finishFile(list)
    }
  }
  catch (e: any) {
    toast(e?.message || '解析失败')
  }
  finally {
    loading.value = false
  }
}

async function handleMpFile(file: { name: string, path: string }) {
  loading.value = true
  try {
    const wxAny = (globalThis as any).wx
    const fs = wxAny.getFileSystemManager()
    const isCsv = /\.(csv|tsv|txt)$/i.test(file.name)
    if (isCsv) {
      const text = fs.readFileSync(file.path, 'utf8') as string
      const list = await readTableFile({ name: file.name, text, source: file.name })
      finishFile(list)
    }
    else {
      const base64 = fs.readFileSync(file.path, 'base64') as string
      const list = await readTableFile({ name: file.name, base64, source: file.name })
      finishFile(list)
    }
  }
  catch (e: any) {
    toast(e?.message || '解析失败')
  }
  finally {
    loading.value = false
  }
}

function finishFile(list: TutorOrder[]) {
  if (!list.length) {
    toast('表格里没读到有效数据')
    return
  }
  const n = addOrders(list)
  toast(`已导入 ${n} 条`, 'success')
  setTimeout(() => uni.navigateBack(), 800)
}

function downloadTemplate() {
  const csv = buildTemplateCsv()

  // #ifdef H5
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '家教单导入模板.csv'
  a.click()
  URL.revokeObjectURL(url)
  toast('模板已下载', 'success')
  // #endif

  // #ifdef MP-WEIXIN
  copyText(csv)
  // #endif
}
</script>

<style scoped>
.page {
  padding-bottom: 220rpx;
}

.tabs {
  display: flex;
  gap: 12rpx;
  margin: 24rpx 28rpx 0;
  background: #eef0f5;
  padding: 6rpx;
  border-radius: 20rpx;
}

.tab {
  flex: 1;
  height: 68rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  color: #667085;
}

.tab.on {
  background: #fff;
  color: #3b62f6;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(16, 24, 40, 0.08);
}

.wrap {
  padding: 24rpx 28rpx 0;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #101828;
}

.link {
  font-size: 25rpx;
  color: #3b62f6;
  font-weight: 500;
}

.link.gray {
  color: #98a2b3;
}

.ta {
  margin-top: 20rpx;
  width: 100%;
  height: 380rpx;
  font-size: 26rpx;
  line-height: 1.65;
  color: #101828;
  background: #f8f9fb;
  border-radius: 18rpx;
  padding: 20rpx;
}

.ta-ph {
  color: #b0b7c3;
  font-size: 25rpx;
  line-height: 1.6;
}

.ta-foot {
  margin-top: 16rpx;
}

.tip-card {
  margin-top: 22rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.04);
}

.tip-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.tip-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #101828;
}

.tip-body {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.tip-line {
  font-size: 23rpx;
  color: #667085;
  line-height: 1.6;
}

.tip-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #eaecf0;
}

.tpl-btn {
  margin-top: 20rpx;
  align-self: flex-start;
  display: inline-flex;
  width: 180rpx;
}

.parse-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30rpx 4rpx 16rpx;
}

.pb-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #101828;
}

.pb-sub {
  font-size: 23rpx;
  color: #98a2b3;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.pv-item {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border-radius: 22rpx;
  padding: 22rpx;
  box-shadow: 0 6rpx 20rpx rgba(16, 24, 40, 0.04);
  transition: opacity 0.15s ease;
}

.pv-item.off {
  opacity: 0.45;
}

.pv-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 12rpx;
  border: 2rpx solid #e4e7ec;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.pv-check.on {
  background: #3b62f6;
  border-color: #3b62f6;
}

.pv-line1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.pv-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #101828;
}

.pv-price {
  font-size: 26rpx;
  font-weight: 700;
  color: #f97316;
}

.pv-addr {
  font-size: 23rpx;
  color: #98a2b3;
  margin-top: 8rpx;
  display: block;
}

.pv-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 10rpx;
  flex-wrap: wrap;
}

.pv-tag {
  font-size: 20rpx;
  color: #667085;
  background: #f2f4f7;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
}

.pv-tag.warn {
  color: #e8590c;
  background: #fff4ec;
}

.upload-card {
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  border: 2rpx dashed #d6ddee;
}

.up-icon {
  width: 104rpx;
  height: 104rpx;
  border-radius: 32rpx;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.up-title {
  font-size: 29rpx;
  font-weight: 600;
  color: #101828;
}

.up-sub {
  font-size: 23rpx;
  color: #98a2b3;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #eaecf0;
}

.bb-info {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.bb-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #3b62f6;
}

.bb-label {
  font-size: 23rpx;
  color: #98a2b3;
}

.bb-btn {
  flex: 1;
}
</style>
