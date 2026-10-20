<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initStore } from '@/utils/store'

onLaunch(() => {
  initStore()
})
</script>

<style>
/* 全局设计变量与基础样式 */
page,
uni-page-body,
:root {
  --bg: #f4f6fb;
  --card: #ffffff;
  --ink: #101828;
  --ink-2: #475467;
  --ink-3: #98a2b3;
  --line: #eaecf0;
  --brand: #3b62f6;
  --brand-2: #6d8bff;
  --brand-soft: #eef2ff;
  --orange: #f97316;
  --orange-soft: #fff4ec;
  --green: #12b886;
  --green-soft: #e6faf3;
  --red: #ef4444;
  --purple: #8b5cf6;
  --shadow: 0 8rpx 32rpx rgba(16, 24, 40, 0.06);
  --shadow-lg: 0 16rpx 48rpx rgba(16, 24, 40, 0.1);
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei',
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

view,
text,
scroll-view,
button,
input,
textarea {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  padding-bottom: 180rpx;
}

/* 卡片 */
.card {
  background: var(--card);
  border-radius: 28rpx;
  box-shadow: var(--shadow);
}

.pad {
  padding: 32rpx;
}

.row {
  display: flex;
  align-items: center;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.col {
  display: flex;
  flex-direction: column;
}

.flex1 {
  flex: 1;
  min-width: 0;
}

.muted {
  color: var(--ink-3);
  font-size: 24rpx;
}

.dim {
  color: var(--ink-2);
  font-size: 26rpx;
}

.title-lg {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
}

.title-md {
  font-size: 32rpx;
  font-weight: 600;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ellipsis-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 按钮 */
.btn {
  height: 92rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.btn:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.btn-primary {
  background: linear-gradient(135deg, #3b62f6 0%, #5b7cff 100%);
  color: #fff;
  box-shadow: 0 10rpx 26rpx rgba(59, 98, 246, 0.32);
}

.btn-ghost {
  background: var(--brand-soft);
  color: var(--brand);
}

.btn-plain {
  background: #f2f4f7;
  color: var(--ink-2);
}

.btn-sm {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
}

/* 表单 */
.field {
  padding: 26rpx 0;
  border-bottom: 1rpx solid var(--line);
}

.field:last-child {
  border-bottom: none;
}

.field-label {
  font-size: 26rpx;
  color: var(--ink-3);
  margin-bottom: 12rpx;
}

.field-input {
  font-size: 30rpx;
  color: var(--ink);
  width: 100%;
  min-height: 44rpx;
}

/* 标签 */
.tag {
  display: inline-flex;
  align-items: center;
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 500;
  line-height: 1;
}

/* 空状态 */
.empty {
  padding: 100rpx 40rpx;
  text-align: center;
  color: var(--ink-3);
  font-size: 26rpx;
}

.divider {
  height: 1rpx;
  background: var(--line);
}

/* 滚动条（H5） */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
