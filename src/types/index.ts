/** 家教单状态 */
export type OrderStatus = 'pending' | 'matched' | 'trial' | 'active' | 'finished'

/** 授课形式 */
export type ClassMode = 'offline' | 'online'

/** 一条家教单（结构化后的结果） */
export interface TutorOrder {
  /** 本地唯一 id */
  id: string
  /** 机构单号，如 BJ26062502 / gy26072504 */
  code: string
  /** 展示标题，如「通州 · 高二数学」 */
  title: string
  city: string
  /** 区，如 通州 */
  district: string
  /** 商圈 / 片区，如 北苑 */
  area: string
  mode: ClassMode
  grade: string
  subject: string
  address: string
  /** 课时费下限（元/小时） */
  rateMin: number
  /** 课时费上限 */
  rateMax: number
  /** 计价单位：按小时 / 按次 */
  rateUnit: 'h' | 'lesson'
  /** 原始课时费文本，如「150-180/h」 */
  rateText: string
  /** 每周次数（取下限） */
  freqPerWeek: number
  /** 每周次数上限（「一周2-3次」时为 3） */
  freqPerWeekMax: number
  freqText: string
  /** 单次时长（分钟） */
  durationMin: number
  studentGender: '' | '男' | '女'
  studentInfo: string
  teacherReq: string
  teacherGender: '' | '男' | '女'
  /** 具体上课时间原文 */
  startTimeText: string
  /** 备注 / 未归类的附加信息 */
  remark: string
  /** 来源：群名 / 导入方式 */
  source: string
  /** 原始消息全文，便于回溯 */
  rawText: string
  status: OrderStatus
  /** 缺失的关键字段名（中文），UI 上高亮提醒补录 */
  missing: string[]
  /** 解析置信度 0-1 */
  confidence: number
  /** 经纬度（GCJ-02），用于地图打点与路线 */
  lat?: number
  lng?: number
  /** 坐标来源：geo=真实地理编码，area=片区估算 */
  geoSource?: 'geo' | 'area'
  createdAt: number
  updatedAt: number
}

/** 排课计划：一条单可能对应一个长期固定档期 */
export interface Course {
  id: string
  orderId: string
  /** 学生称呼 */
  studentName: string
  /** 老师称呼 */
  teacherName: string
  subject: string
  grade: string
  /** 星期几，0=周日 … 6=周六 */
  weekdays: number[]
  /** 开始时间 HH:mm */
  startTime: string
  /** 单次时长（分钟） */
  durationMin: number
  /** 生效日期 YYYY-MM-DD */
  startDate: string
  /** 结束日期 YYYY-MM-DD */
  endDate: string
  address: string
  lat?: number
  lng?: number
  /** 主题色，日历上区分不同课 */
  color: string
  note: string
  createdAt: number
  updatedAt: number
}

/** 具体课次 */
export interface Lesson {
  id: string
  courseId: string
  orderId: string
  /** YYYY-MM-DD */
  date: string
  startTime: string
  endTime: string
  subject: string
  studentName: string
  teacherName: string
  address: string
  lat?: number
  lng?: number
  color: string
  status: 'planned' | 'done' | 'canceled'
  note: string
}

/** 应用设置 */
export interface AppSettings {
  /** 是否启用云端同步 */
  cloudEnabled: boolean
  /** 腾讯位置服务 key（用于地理编码 / 路线规划），留空则用内置片区坐标估算 */
  lbsKey: string
  /** 默认单次时长（分钟） */
  defaultDuration: number
  /** 默认上课时间 */
  defaultStartTime: string
  /** 常用区域，用于路线分组排序 */
  homeDistrict: string
}

/** 导入批次（一次粘贴 / 一次 Excel） */
export interface ImportBatch {
  id: string
  source: string
  count: number
  createdAt: number
}
