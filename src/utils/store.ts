import type { AppSettings, Course, Lesson, OrderStatus, TutorOrder } from '@/types'
import { buildDemoCourses, buildDemoOrders } from '@/data/sample'
import { addDays, fmtDate, hhmmToMin, minToHhmm, parseISO, todayISO } from '@/utils/date'
import { estimateCoord } from '@/utils/geo'
import { cloudPull, cloudPush, cloudRemove, isCloudConfigured } from '@/utils/cloud'
import { computed, reactive } from 'vue'

const KEYS = {
  orders: 'tutor:orders',
  courses: 'tutor:courses',
  lessons: 'tutor:lessons',
  settings: 'tutor:settings',
  seeded: 'tutor:seeded',
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待匹配', color: '#B45309', bg: '#FEF3C7' },
  matched: { label: '已派单', color: '#1D4ED8', bg: '#DBEAFE' },
  trial: { label: '试课中', color: '#7C3AED', bg: '#EDE9FE' },
  active: { label: '在带', color: '#047857', bg: '#D1FAE5' },
  finished: { label: '已结课', color: '#6B7280', bg: '#F3F4F6' },
}

export const STATUS_ORDER: OrderStatus[] = ['pending', 'matched', 'trial', 'active', 'finished']

const DEFAULT_SETTINGS: AppSettings = {
  cloudEnabled: false,
  lbsKey: '',
  defaultDuration: 120,
  defaultStartTime: '18:30',
  homeDistrict: '通州',
}

interface State {
  ready: boolean
  orders: TutorOrder[]
  courses: Course[]
  lessons: Lesson[]
  settings: AppSettings
  syncMode: 'local' | 'cloud'
  syncing: boolean
  lastSyncAt: number
}

export const state = reactive<State>({
  ready: false,
  orders: [],
  courses: [],
  lessons: [],
  settings: { ...DEFAULT_SETTINGS },
  syncMode: 'local',
  syncing: false,
  lastSyncAt: 0,
})

/* ------------------------------- 持久化 ------------------------------- */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = uni.getStorageSync(key)
    if (!raw) return fallback
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
  }
  catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  }
  catch (e) {
    console.warn('[store] 写入本地缓存失败', e)
  }
}

function persistOrders() {
  write(KEYS.orders, state.orders)
}
function persistCourses() {
  write(KEYS.courses, state.courses)
  write(KEYS.lessons, state.lessons)
}
function persistSettings() {
  write(KEYS.settings, state.settings)
}

/* ------------------------------- 初始化 ------------------------------- */

export function initStore() {
  if (state.ready) return
  state.orders = read<TutorOrder[]>(KEYS.orders, [])
  state.courses = read<Course[]>(KEYS.courses, [])
  state.lessons = read<Lesson[]>(KEYS.lessons, [])
  state.settings = { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEYS.settings, {}) }
  state.syncMode = state.settings.cloudEnabled && isCloudConfigured() ? 'cloud' : 'local'
  state.ready = true

  const seeded = read<boolean>(KEYS.seeded, false)
  if (!seeded && state.orders.length === 0) {
    seedDemo()
    write(KEYS.seeded, true)
  }
}

/** 演示数据的单子状态，让列表能看到各种状态的颜色 */
const DEMO_STATUS: OrderStatus[] = [
  'active',
  'active',
  'pending',
  'active',
  'pending',
  'pending',
  'trial',
  'finished',
]

/** 载入演示数据：8 条单 + 4 个排课档期 */
export function seedDemo() {
  const orders = buildDemoOrders().map((o, i) => {
    const c = estimateCoord(o)
    return {
      ...o,
      status: DEMO_STATUS[i] || 'pending',
      lat: c.lat,
      lng: c.lng,
      geoSource: 'area' as const,
    }
  })
  const { courses, lessons } = buildDemoCourses(orders)
  state.orders = orders
  state.courses = courses
  state.lessons = lessons
  persistOrders()
  persistCourses()
}

/* ------------------------------- 家教单 ------------------------------- */

export function addOrders(list: TutorOrder[]) {
  const existingCodes = new Set(state.orders.map(o => o.code).filter(Boolean))
  const fresh: TutorOrder[] = []
  for (const o of list) {
    if (o.code && existingCodes.has(o.code)) continue
    if (o.code) existingCodes.add(o.code)
    const c = estimateCoord(o)
    fresh.push({ ...o, lat: c.lat, lng: c.lng, geoSource: 'area' })
  }
  state.orders = [...fresh, ...state.orders]
  persistOrders()
  if (state.syncMode === 'cloud') void cloudPush('tutor_orders', fresh)
  return fresh.length
}

export function getOrder(id: string): TutorOrder | undefined {
  return state.orders.find(o => o.id === id)
}

export function updateOrder(id: string, patch: Partial<TutorOrder>) {
  const idx = state.orders.findIndex(o => o.id === id)
  if (idx < 0) return
  const next = { ...state.orders[idx], ...patch, updatedAt: Date.now() }
  // 地址/片区变了要重算坐标
  if (patch.address !== undefined || patch.area !== undefined || patch.district !== undefined) {
    if (next.geoSource !== 'geo') {
      const c = estimateCoord(next)
      next.lat = c.lat
      next.lng = c.lng
      next.geoSource = 'area'
    }
  }
  next.missing = computeMissing(next)
  state.orders[idx] = next
  persistOrders()
  if (state.syncMode === 'cloud') void cloudPush('tutor_orders', [next])
}

export function removeOrder(id: string) {
  state.orders = state.orders.filter(o => o.id !== id)
  const courseIds = state.courses.filter(c => c.orderId === id).map(c => c.id)
  state.courses = state.courses.filter(c => c.orderId !== id)
  state.lessons = state.lessons.filter(l => !courseIds.includes(l.courseId))
  persistOrders()
  persistCourses()
  if (state.syncMode === 'cloud') void cloudRemove('tutor_orders', id)
}

function computeMissing(o: TutorOrder): string[] {
  const missing: string[] = []
  if (!o.grade) missing.push('年级')
  if (!o.subject) missing.push('科目')
  if (!o.address) missing.push('地址')
  if (!o.rateMin) missing.push('课时费')
  return missing
}

/* ------------------------------- 排课 ------------------------------- */

const COURSE_COLORS = ['#3B62F6', '#F97316', '#12B886', '#8B5CF6', '#EC4899', '#0EA5E9', '#F59E0B']

export function nextColor(): string {
  return COURSE_COLORS[state.courses.length % COURSE_COLORS.length]
}

/** 按档期展开成具体课次，保留已存在的课次状态 */
export function generateLessons(course: Course): Lesson[] {
  const oldStatus = new Map<string, Lesson['status']>()
  for (const l of state.lessons) {
    if (l.courseId === course.id) oldStatus.set(`${l.date}|${l.startTime}`, l.status)
  }

  const out: Lesson[] = []
  const end = parseISO(course.endDate)
  for (let d = parseISO(course.startDate); d <= end; d = addDays(d, 1)) {
    if (!course.weekdays.includes(d.getDay())) continue
    const date = fmtDate(d)
    const key = `${date}|${course.startTime}`
    out.push({
      id: `l_${course.id}_${date}_${course.startTime.replace(':', '')}`,
      courseId: course.id,
      orderId: course.orderId,
      date,
      startTime: course.startTime,
      endTime: minToHhmm(hhmmToMin(course.startTime) + course.durationMin),
      subject: course.subject,
      studentName: course.studentName,
      teacherName: course.teacherName,
      address: course.address,
      lat: course.lat,
      lng: course.lng,
      color: course.color,
      status: oldStatus.get(key) || 'planned',
      note: '',
    })
    if (out.length >= 200) break
  }
  return out
}

export function saveCourse(course: Course) {
  const idx = state.courses.findIndex(c => c.id === course.id)
  const next = { ...course, updatedAt: Date.now() }
  if (idx >= 0) state.courses[idx] = next
  else state.courses = [...state.courses, next]

  const others = state.lessons.filter(l => l.courseId !== course.id)
  state.lessons = [...others, ...generateLessons(next)]
  persistCourses()
  if (state.syncMode === 'cloud') void cloudPush('tutor_courses', [next])
}

export function removeCourse(id: string) {
  state.courses = state.courses.filter(c => c.id !== id)
  state.lessons = state.lessons.filter(l => l.courseId !== id)
  persistCourses()
  if (state.syncMode === 'cloud') void cloudRemove('tutor_courses', id)
}

export function setLessonStatus(id: string, status: Lesson['status']) {
  const idx = state.lessons.findIndex(l => l.id === id)
  if (idx < 0) return
  state.lessons[idx] = { ...state.lessons[idx], status }
  persistCourses()
}

export function getCourse(id: string): Course | undefined {
  return state.courses.find(c => c.id === id)
}

/* ------------------------------- 设置与同步 ------------------------------- */

export function updateSettings(patch: Partial<AppSettings>) {
  state.settings = { ...state.settings, ...patch }
  persistSettings()
  state.syncMode = state.settings.cloudEnabled && isCloudConfigured() ? 'cloud' : 'local'
}

export async function syncNow(): Promise<{ ok: boolean; message: string }> {
  if (!isCloudConfigured()) return { ok: false, message: '未配置云开发环境 ID' }
  state.syncing = true
  try {
    await cloudPush('tutor_orders', state.orders)
    await cloudPush('tutor_courses', state.courses)
    const remoteOrders = await cloudPull<TutorOrder>('tutor_orders')
    const remoteCourses = await cloudPull<Course>('tutor_courses')
    if (remoteOrders.length) {
      const map = new Map(state.orders.map(o => [o.id, o]))
      for (const r of remoteOrders) {
        const local = map.get(r.id)
        if (!local || (r.updatedAt || 0) > (local.updatedAt || 0)) map.set(r.id, r)
      }
      state.orders = [...map.values()].sort((a, b) => b.createdAt - a.createdAt)
    }
    if (remoteCourses.length) {
      const map = new Map(state.courses.map(c => [c.id, c]))
      for (const r of remoteCourses) {
        const local = map.get(r.id)
        if (!local || (r.updatedAt || 0) > (local.updatedAt || 0)) map.set(r.id, r)
      }
      state.courses = [...map.values()]
      state.lessons = state.courses.flatMap(c => generateLessons(c))
    }
    persistOrders()
    persistCourses()
    state.lastSyncAt = Date.now()
    return { ok: true, message: '同步完成' }
  }
  catch (e: any) {
    return { ok: false, message: e?.message || '同步失败' }
  }
  finally {
    state.syncing = false
  }
}

export function clearAll() {
  state.orders = []
  state.courses = []
  state.lessons = []
  persistOrders()
  persistCourses()
}

/** 重新按档期展开所有课次（导入备份、批量改动后调用） */
export function rebuildLessons() {
  state.lessons = state.courses.flatMap(c => generateLessons(c))
  persistCourses()
}

/** 合并外部导入的数据（按 id 去重） */
export function importData(orders: TutorOrder[], courses: Course[]) {
  const orderIds = new Set(state.orders.map(o => o.id))
  const newOrders = orders.filter(o => !orderIds.has(o.id))
  state.orders = [...state.orders, ...newOrders]

  const courseIds = new Set(state.courses.map(c => c.id))
  const newCourses = courses.filter(c => !courseIds.has(c.id))
  state.courses = [...state.courses, ...newCourses]

  state.lessons = state.courses.flatMap(c => generateLessons(c))
  persistOrders()
  persistCourses()
  return { orders: newOrders.length, courses: newCourses.length }
}

/* ------------------------------- 派生数据 ------------------------------- */

export const todayLessons = computed(() =>
  state.lessons
    .filter(l => l.date === todayISO() && l.status !== 'canceled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
)

export const upcomingLessons = computed(() => {
  const today = todayISO()
  return state.lessons
    .filter(l => l.date >= today && l.status === 'planned')
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
})

export const stats = computed(() => {
  const today = todayISO()
  const weekEnd = fmtDate(addDays(new Date(), 6))
  const pending = state.orders.filter(o => o.status === 'pending').length
  const active = state.orders.filter(o => o.status === 'active' || o.status === 'matched').length
  const weekLessons = state.lessons.filter(l => l.date >= today && l.date <= weekEnd && l.status !== 'canceled')
  const weekMinutes = weekLessons.reduce((sum, l) => {
    return sum + Math.max(0, hhmmToMin(l.endTime) - hhmmToMin(l.startTime))
  }, 0)
  const districts = new Set(state.orders.map(o => o.district).filter(Boolean))
  return {
    pending,
    active,
    total: state.orders.length,
    todayCount: todayLessons.value.length,
    weekCount: weekLessons.length,
    weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    districtCount: districts.size,
  }
})

/** 按区聚合，用于路线页分组 */
export const ordersByDistrict = computed(() => {
  const map = new Map<string, TutorOrder[]>()
  for (const o of state.orders) {
    const key = o.district || o.city || '未分类'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(o)
  }
  return [...map.entries()]
    .map(([district, list]) => ({ district, list }))
    .sort((a, b) => b.list.length - a.list.length)
})

export function lessonsOn(iso: string): Lesson[] {
  return state.lessons
    .filter(l => l.date === iso && l.status !== 'canceled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function lessonsByDate(): Record<string, Lesson[]> {
  const map: Record<string, Lesson[]> = {}
  for (const l of state.lessons) {
    if (l.status === 'canceled') continue
    if (!map[l.date]) map[l.date] = []
    map[l.date].push(l)
  }
  return map
}
