/** 轻量 UI 工具 */

export function statusBarHeight(): number {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0
  }
  catch {
    return 0
  }
}

export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none') {
  uni.showToast({ title, icon, duration: 1800 })
}

export function confirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmColor: '#3B62F6',
      success: res => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

/** 复制文本 */
export function copyText(text: string) {
  uni.setClipboardData({
    data: text,
    success: () => toast('已复制', 'success'),
  })
}

/** 金额/价格展示 */
export function rateLabel(min: number, max: number, unit: 'h' | 'lesson'): string {
  if (!min) return '面议'
  const suffix = unit === 'lesson' ? '/次' : '/h'
  if (!max || max === min) return `${min}${suffix}`
  return `${min}-${max}${suffix}`
}

/** 时长展示：90 → 1.5h */
export function durationLabel(min: number): string {
  if (!min) return ''
  const h = min / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

/** 每周次数展示 */
export function freqLabel(min: number, max: number): string {
  if (!min) return ''
  if (max && max !== min) return `一周${min}-${max}次`
  return `一周${min}次`
}

/** 手机号 / 微信号脱敏 */
export function maskContact(s: string): string {
  if (!s) return ''
  if (/^1\d{10}$/.test(s)) return `${s.slice(0, 3)}****${s.slice(7)}`
  return s
}
