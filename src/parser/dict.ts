/**
 * 解析词典：字段同义词、科目、年级、区域坐标
 * 家教群里的写法非常随意，这里尽量覆盖常见变体
 */

/** 规范字段名 → 同义词（写在家教群消息里的标签） */
export const FIELD_SYNONYMS: Record<string, string[]> = {
  gradeSubject: ['年级科目', '年级及科目', '年级和科目', '年级+科目', '学生年级科目', '年级与科目'],
  grade: ['年级', '学生年级', '学员年级', '孩子年级', '补课年级'],
  subject: ['科目', '补习科目', '辅导科目', '补课科目', '学科', '补习学科'],
  address: [
    '辅导地点',
    '补课地址',
    '上课地址',
    '补课地点',
    '辅导地址',
    '上课地点',
    '地点',
    '地址',
    '位置',
    '住址',
  ],
  rate: [
    '课时报酬',
    '课费报酬',
    '课时价格',
    '课时费',
    '课时费报酬',
    '报酬',
    '价格',
    '薪资',
    '课时薪酬',
    '费用',
    '课酬',
  ],
  freq: [
    '时间次数',
    '一周几次',
    '上课次数',
    '时间安排',
    '上课频率',
    '次数',
    '频率',
    '每周次数',
    '课时安排',
  ],
  duration: ['每次时长', '单次时长', '课时长度', '单次课长'],
  studentInfo: [
    '学生情况',
    '学员情况',
    '学生成绩',
    '学员成绩',
    '孩子情况',
    '学生',
    '学员',
    '孩子',
    '学情',
    '成绩情况',
  ],
  teacherReq: ['老师要求', '教师要求', '教员要求', '老师性别', '对老师的要求', '教师性别'],
  teacherCount: ['几位老师', '老师人数', '需要几位老师', '老师数量'],
  startTime: [
    '具体上课时间',
    '上课时间',
    '开始时间',
    '期望上课时间',
    '可上课时间',
    '上课时间段',
  ],
  remark: ['备注', '其他', '说明', '补充', '其他说明', '附加说明'],
  // 这两个主要给 Excel 表头用，群消息里一般不会这么写
  code: ['单号', '编号', '订单号', '家教单号', '家教编号'],
  district: ['区域', '区县', '行政区', '商圈'],
}

/** 反向索引：标签 → 规范字段名 */
export const LABEL_TO_FIELD: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const field of Object.keys(FIELD_SYNONYMS)) {
    for (const label of FIELD_SYNONYMS[field]) {
      map[normalizeLabel(label)] = field
    }
  }
  return map
})()

/** 去掉标签里的空格、冒号、助词，便于比对 */
export function normalizeLabel(label: string): string {
  return label
    .replace(/[\s　]/g, '')
    .replace(/[：:]+$/g, '')
    .replace(/的$/, '')
    .trim()
}

/**
 * 标签 → 规范字段名，先精确匹配，再按关键词兜底
 * 兜底是为了兼容「补习费用」「学生住址」这类没收录进词典的写法
 */
export function canonField(label: string): string | null {
  const key = normalizeLabel(label)
  if (!key) return null
  if (LABEL_TO_FIELD[key]) return LABEL_TO_FIELD[key]

  if (/地址|地点|位置|住址/.test(key)) return 'address'
  if (/价|报酬|薪酬|课酬|费用|薪资|工资/.test(key)) return 'rate'
  if (/科目|学科/.test(key)) return 'subject'
  if (/年级/.test(key)) return 'grade'
  if (/次数|频率/.test(key)) return 'freq'
  if (/时长/.test(key)) return 'duration'
  if (/上课时间|时间段|开课/.test(key)) return 'startTime'
  if (/要求/.test(key)) return 'teacherReq'
  if (/情况|成绩|学情/.test(key)) return 'studentInfo'
  return null
}

/** 科目关键词，按长度倒序匹配，避免「数学思维」被识别成「数学」 */
export const SUBJECTS: string[] = [
  '数学思维',
  '英语口语',
  '理综',
  '文综',
  '全科',
  '数学',
  '语文',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
  '科学',
  '奥数',
  '编程',
  '信息',
  '体育',
  '跑步',
  '游泳',
  '美术',
  '书法',
  '钢琴',
  '舞蹈',
  '声乐',
  '围棋',
  '日语',
  '雅思',
  '托福',
  '作业辅导',
]

/** 科目归并：跑步训练 → 体育(跑步) */
export const SUBJECT_ALIAS: Record<string, string> = {
  跑步: '体育·跑步',
  游泳: '体育·游泳',
  作业辅导: '全科',
}

/** 北京行政区中心点（GCJ-02，近似值，仅用于片区估算打点） */
export const BEIJING_DISTRICTS: Record<string, [number, number]> = {
  东城: [39.9285, 116.416],
  西城: [39.9123, 116.366],
  朝阳: [39.9219, 116.4436],
  海淀: [39.9593, 116.298],
  丰台: [39.8585, 116.287],
  石景山: [39.9066, 116.223],
  门头沟: [39.94, 116.102],
  房山: [39.749, 116.143],
  通州: [39.9097, 116.6564],
  顺义: [40.13, 116.654],
  昌平: [40.2207, 116.2312],
  大兴: [39.7268, 116.341],
  怀柔: [40.316, 116.632],
  平谷: [40.14, 117.121],
  密云: [40.377, 116.843],
  延庆: [40.457, 115.975],
}

/** 片区（商圈）坐标表：地址里出现这些词就按片区估算坐标 */
export interface AreaPoint {
  name: string
  district: string
  lat: number
  lng: number
}

export const AREA_POINTS: AreaPoint[] = [
  // 通州
  { name: '北苑', district: '通州', lat: 39.9075, lng: 116.642 },
  { name: '通州北苑', district: '通州', lat: 39.9075, lng: 116.642 },
  { name: '杨庄', district: '通州', lat: 39.9085, lng: 116.635 },
  { name: '果园', district: '通州', lat: 39.893, lng: 116.648 },
  { name: '梨园', district: '通州', lat: 39.883, lng: 116.665 },
  { name: '九棵树', district: '通州', lat: 39.887, lng: 116.654 },
  { name: '万达', district: '通州', lat: 39.905, lng: 116.662 },
  { name: '新华大街', district: '通州', lat: 39.9095, lng: 116.657 },
  { name: '物资学院', district: '通州', lat: 39.916, lng: 116.672 },
  { name: '后北营', district: '通州', lat: 39.913, lng: 116.68 },
  { name: '宋庄', district: '通州', lat: 39.94, lng: 116.72 },
  { name: '潞城', district: '通州', lat: 39.92, lng: 116.73 },
  { name: '张家湾', district: '通州', lat: 39.88, lng: 116.71 },
  { name: '台湖', district: '通州', lat: 39.84, lng: 116.63 },
  { name: '次渠', district: '通州', lat: 39.82, lng: 116.59 },
  { name: '马驹桥', district: '通州', lat: 39.75, lng: 116.56 },
  { name: '永顺', district: '通州', lat: 39.915, lng: 116.65 },
  { name: '玉桥', district: '通州', lat: 39.899, lng: 116.67 },
  { name: '中仓', district: '通州', lat: 39.911, lng: 116.665 },
  { name: '西门', district: '通州', lat: 39.906, lng: 116.648 },
  { name: '东关', district: '通州', lat: 39.914, lng: 116.674 },
  { name: '西集', district: '通州', lat: 39.79, lng: 116.85 },
  { name: '漷县', district: '通州', lat: 39.78, lng: 116.79 },
  // 城六区常见片区
  { name: '望京', district: '朝阳', lat: 39.996, lng: 116.47 },
  { name: '国贸', district: '朝阳', lat: 39.908, lng: 116.459 },
  { name: '双井', district: '朝阳', lat: 39.893, lng: 116.464 },
  { name: '亚运村', district: '朝阳', lat: 39.996, lng: 116.41 },
  { name: '常营', district: '朝阳', lat: 39.923, lng: 116.599 },
  { name: '管庄', district: '朝阳', lat: 39.912, lng: 116.6 },
  { name: '中关村', district: '海淀', lat: 39.983, lng: 116.316 },
  { name: '五道口', district: '海淀', lat: 39.992, lng: 116.337 },
  { name: '上地', district: '海淀', lat: 40.033, lng: 116.308 },
  { name: '西二旗', district: '海淀', lat: 40.052, lng: 116.3 },
  { name: '万柳', district: '海淀', lat: 39.968, lng: 116.29 },
  { name: '公主坟', district: '海淀', lat: 39.907, lng: 116.309 },
  { name: '方庄', district: '丰台', lat: 39.865, lng: 116.428 },
  { name: '大红门', district: '丰台', lat: 39.83, lng: 116.4 },
  { name: '亦庄', district: '大兴', lat: 39.795, lng: 116.506 },
  { name: '黄村', district: '大兴', lat: 39.726, lng: 116.338 },
  { name: '天通苑', district: '昌平', lat: 40.076, lng: 116.415 },
  { name: '回龙观', district: '昌平', lat: 40.076, lng: 116.34 },
]

/** 支持识别的城市 */
export const CITIES: string[] = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '天津',
  '重庆',
  '杭州',
  '南京',
  '苏州',
  '成都',
  '武汉',
  '西安',
  '长沙',
  '郑州',
  '济南',
  '青岛',
  '石家庄',
  '沈阳',
  '大连',
  '合肥',
  '福州',
  '厦门',
  '昆明',
  '南昌',
  '南宁',
  '贵阳',
  '兰州',
  '太原',
  '宁波',
  '无锡',
  '常州',
  '徐州',
  '烟台',
  '洛阳',
  '保定',
  '唐山',
  '廊坊',
  '燕郊',
]

/** 单号正则：形如 BJ26062502 / gy26072504 / H0032026 */
export const CODE_PATTERNS: RegExp[] = [
  /[A-Z]{2,4}\d{6,10}/g,
  /[A-Za-z]{1,4}\d{6,10}/g,
]
