/** 日期与时间工具 */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayISO(): string {
  return fmtDate(new Date())
}

export function parseISO(s: string): Date {
  const [y, m, d] = (s || '').split('-').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

/** 周一为一周第一天 */
export function weekdayIndexMon(d: Date): number {
  return (d.getDay() + 6) % 7
}

export interface DayCell {
  date: Date
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
}

/** 生成月历网格（周一开头，固定 6 行 42 格） */
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1)
  const offset = weekdayIndexMon(first)
  const start = addDays(first, -offset)
  const today = new Date()
  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i)
    cells.push({
      date: d,
      iso: fmtDate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1,
      isToday: isSameDay(d, today),
    })
  }
  return cells
}

export function hhmmToMin(t: string): number {
  const [h, m] = (t || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minToHhmm(m: number): string {
  const x = ((m % 1440) + 1440) % 1440
  return `${pad2(Math.floor(x / 60))}:${pad2(x % 60)}`
}

export function timeRange(start: string, durationMin: number): string {
  return `${start}-${minToHhmm(hhmmToMin(start) + durationMin)}`
}

/** 今天 / 明天 / 昨天 / 10月20日 周二 */
export function friendlyDate(iso: string): string {
  const d = parseISO(iso)
  const now = new Date()
  const diff = Math.round((parseISO(fmtDate(now)).getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === -1) return '明天'
  if (diff === -2) return '后天'
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_CN[d.getDay()]}`
}

export function shortDate(iso: string): string {
  const d = parseISO(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`
}

/** 相对时间：3分钟前 / 2天前 */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day}天前`
  return fmtDate(new Date(ts))
}
