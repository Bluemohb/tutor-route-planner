import type { TutorOrder } from '@/types'
import {
  AREA_POINTS,
  BEIJING_DISTRICTS,
  CITIES,
  CODE_PATTERNS,
  SUBJECT_ALIAS,
  SUBJECTS,
  canonField,
} from './dict'

/* ------------------------------------------------------------------ *
 * 一、文本清洗
 * ------------------------------------------------------------------ */

/**
 * 全角 → 半角：只转换会影响正则判断的符号，保留中文标点
 * （否则「男孩，基础薄弱」会被改成「男孩,基础薄弱」，展示出来很难看）
 */
const FULL_TO_HALF: Record<string, string> = {
  '＃': '#',
  '＝': '=',
  '：': ':',
  '；': ';',
  '／': '/',
  '（': '(',
  '）': ')',
  '［': '[',
  '］': ']',
  '｜': '|',
  '．': '.',
  '－': '-',
  '～': '~',
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
}

export function normalizeText(raw: string): string {
  return (raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\uFF00-\uFFEF]/g, ch => FULL_TO_HALF[ch] ?? ch)
    .replace(/\u3000/g, ' ')
}

/** 只保留“有内容”的行，去掉分隔线与空行 */
function toLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !/^[-—=＝*~·\s]{3,}$/.test(l))
}

/* ------------------------------------------------------------------ *
 * 二、行分类：字段行 / 标题行 / 正文行
 * ------------------------------------------------------------------ */

const LABEL_LINE = /^【([^】]{1,16})】\s*[:：]?\s*([\s\S]*)$/
const KV_LINE = /^([^【】\s:：#][^【】:：#]{0,13})\s*[:：]\s*([\s\S]*)$/

/** 该行是不是「【字段名】值」或「字段名：值」 */
function isLabelLine(line: string): boolean {
  const m = line.match(LABEL_LINE)
  if (m && canonField(m[1])) return true
  const m2 = line.match(KV_LINE)
  return !!(m2 && canonField(m2[1]))
}

/**
 * 该行是不是一条新单的「标题行」
 *
 * 家教群里常见的三种开头：
 *   1. ＃通州大学生单
 *   2. 北京线下gy26072504 / BJ26062502
 *   3. 【北京线下】H0032026#暑假单
 */
function isHeaderLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false

  // 1. # 开头的短标题（排除正文里以 # 强调的句子）
  if (/^[#＃]/.test(t)) {
    if (t.length <= 22 && !/[。！!？?]$/.test(t) && !/^【/.test(t)) return true
  }

  // 2. 【X】开头且 X 不是已知字段名 → 是标题（如【北京线下】）
  const m = t.match(/^【([^】]{1,16})】/)
  if (m && !canonField(m[1])) return true

  // 3. 单号行（很短、不含【】、含形如 BJ26062502 的单号）
  if (t.length <= 40 && !/【/.test(t) && extractCode(t)) return true

  // 4. 「北京线下」「（线上）」这类开头
  if (/^[（(【]?\s*\S{0,4}(线下|线上|网课|上门)/.test(t)) return true

  return false
}

/* ------------------------------------------------------------------ *
 * 三、单条消息切分
 * ------------------------------------------------------------------ */

/**
 * 把一整段聊天记录切成一条条家教单
 *
 * 核心规则：**标题行出现时，如果当前块里已经有字段行，就切一刀**。
 * 这样「＃通州大学生单 / 北京线下gy26072504」这种连续两行标题
 * 会被正确归到同一单里，而不会误切成两单。
 */
export function splitOrders(raw: string): string[] {
  const lines = toLines(normalizeText(raw))
  const blocks: string[] = []
  let cur: string[] = []
  let fieldCount = 0

  for (const line of lines) {
    const header = isHeaderLine(line)
    const field = !header && isLabelLine(line)

    if (header && fieldCount > 0) {
      blocks.push(cur.join('\n'))
      cur = []
      fieldCount = 0
    }
    cur.push(line)
    if (field) fieldCount++
  }
  if (cur.length) blocks.push(cur.join('\n'))

  return blocks.filter((b, i) => {
    if (blocks.length === 1) return true
    // 只有标题、没有任何字段的碎块丢掉
    return b.split('\n').some(l => isLabelLine(l)) || i === 0
  })
}

/* ------------------------------------------------------------------ *
 * 四、字段抽取工具
 * ------------------------------------------------------------------ */

const CN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}
const NUM_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

function toNumber(s: string): number {
  if (!s) return 0
  if (/^\d+$/.test(s)) return Number.parseInt(s, 10)
  return CN_NUM[s] ?? 0
}

function toCn(s: string): string {
  if (/^\d$/.test(s)) return NUM_CN[Number(s)] ?? s
  return s
}

/** 去掉群里用来强调的 == 、# 以及多余标点 */
function cleanValue(v: string): string {
  return (v || '')
    .replace(/[=＝]+/g, '')
    .replace(/[#＃]/g, '')
    .replace(/^[\s:：、,，.。\-—]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** 年级归一化：新高二 → 高二，新4年级 → 四年级 */
export function matchGrade(text: string): string {
  if (!text) return ''
  const t = text.replace(/\s/g, '')
  let m = t.match(/新?高([一二三123])/)
  if (m) return `高${toCn(m[1])}`
  m = t.match(/新?初([一二三123])/)
  if (m) return `初${toCn(m[1])}`
  m = t.match(/新?([一二三四五六1-6])年级/)
  if (m) return `${toCn(m[1])}年级`
  m = t.match(/(幼儿园|小学|初中|高中|大学|成人|考研|学前)/)
  if (m) return m[1]
  return ''
}

const SUBJECTS_BY_LEN = [...SUBJECTS].sort((a, b) => b.length - a.length)

/** 科目归一化 */
export function matchSubject(text: string): string {
  if (!text) return ''
  for (const s of SUBJECTS_BY_LEN) {
    if (text.includes(s)) return SUBJECT_ALIAS[s] || s
  }
  return ''
}

/** 提取机构单号 */
export function extractCode(text: string): string {
  for (const re of CODE_PATTERNS) {
    const found = text.match(new RegExp(re.source, 'g'))
    if (found && found.length) {
      return found.sort((a, b) => b.length - a.length)[0]
    }
  }
  return ''
}

/** 从单号里猜发布日期：gy26072504 → 2026-07-25 */
function codeToDate(code: string): string {
  const digits = (code.match(/\d+/g) || []).join('')
  if (digits.length < 6) return ''
  const yy = Number(digits.slice(0, 2))
  const mm = Number(digits.slice(2, 4))
  const dd = Number(digits.slice(4, 6))
  if (yy < 20 || yy > 40 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return ''
  return `20${String(yy).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/** 课时费：150-180/h → {150,180,'h'} */
export function parseRate(text: string): {
  min: number
  max: number
  unit: 'h' | 'lesson'
  text: string
} {
  const raw = cleanValue(text)
  if (!raw) return { min: 0, max: 0, unit: 'h', text: '' }

  // 只取单位符号之前的部分，避免把「一次课1.5-2小时」里的 1.5 当成价格
  const head = raw.split(/[/／元每（(]/)[0]
  const nums = (head.match(/\d{2,4}(?:\.\d+)?/g) || []).map(Number)

  let min = 0
  let max = 0
  if (nums.length >= 2) {
    min = Math.min(nums[0], nums[1])
    max = Math.max(nums[0], nums[1])
  }
  else if (nums.length === 1) {
    min = max = nums[0]
  }

  const perLesson = /每次|每节|一节|一课/.test(raw) && !/小时|每小时|\/\s*h/i.test(raw)
  return { min, max, unit: perLesson ? 'lesson' : 'h', text: raw }
}

/** 每周次数：「暑假一周3次」「一周2-3次」 */
export function parseFreq(text: string): { min: number; max: number } {
  if (!text) return { min: 0, max: 0 }
  const m = text.match(
    /(?:一周|每周|一星期|每星期|1周)\s*([0-9一二两三四五六七])\s*(?:[-~—到至]\s*([0-9一二两三四五六七]))?\s*次/,
  )
  if (m) {
    const a = toNumber(m[1])
    const b = m[2] ? toNumber(m[2]) : a
    return { min: Math.min(a, b), max: Math.max(a, b) }
  }
  const m2 = text.match(
    /([0-9一二两三四五六七])\s*(?:[-~—到至]\s*([0-9一二两三四五六七]))?\s*次\s*[/／]?\s*周/,
  )
  if (m2) {
    const a = toNumber(m2[1])
    const b = m2[2] ? toNumber(m2[2]) : a
    return { min: Math.min(a, b), max: Math.max(a, b) }
  }
  const m3 = text.match(/(\d+)\s*次/)
  if (m3) return { min: Number(m3[1]), max: Number(m3[1]) }
  return { min: 0, max: 0 }
}

/** 单次时长（分钟）：「每次2h」「一次课1.5-2小时」 */
export function parseDuration(text: string): number {
  if (!text) return 0
  const m = text.match(
    /(?:每次|一次课|每节课|每节|单次)?\s*(\d+(?:\.\d+)?)\s*(?:[-~—到至]\s*(\d+(?:\.\d+)?))?\s*(小时|个小时|h|H|分钟|min)/,
  )
  if (!m) return 0
  const v = Number.parseFloat(m[1])
  if (/分钟|min/.test(m[3])) return Math.round(v)
  return Math.round(v * 60)
}

/** 区 / 片区识别：优先取地址里出现位置最靠前的片区 */
function detectLocation(address: string, headerText: string) {
  const hay = `${address} ${headerText}`
  let district = ''
  for (const d of Object.keys(BEIJING_DISTRICTS)) {
    if (hay.includes(d)) {
      district = d
      break
    }
  }

  let area = ''
  let bestIdx = Number.POSITIVE_INFINITY
  for (const p of AREA_POINTS) {
    const idx = hay.indexOf(p.name)
    if (idx >= 0 && idx < bestIdx) {
      bestIdx = idx
      area = p.name
      if (!district) district = p.district
    }
  }
  return { district, area }
}

function detectCity(text: string): string {
  for (const c of CITIES) {
    if (text.includes(c)) return c
  }
  return ''
}

/**
 * 从一段描述里猜性别
 * 「男体育生擅长跑步」这种写法不带「生」以外的线索，只能看男/女谁先出现
 */
function guessGender(text: string): '' | '男' | '女' {
  if (!text) return ''
  const iM = text.indexOf('男')
  const iF = text.indexOf('女')
  if (iM < 0 && iF < 0) return ''
  if (iM >= 0 && iF < 0) return '男'
  if (iF >= 0 && iM < 0) return '女'
  return iM < iF ? '男' : '女'
}

/* ------------------------------------------------------------------ *
 * 五、单条解析
 * ------------------------------------------------------------------ */

export interface ParseOptions {
  source?: string
}

let seq = 0
function makeId(): string {
  seq += 1
  return `o_${Date.now().toString(36)}_${seq.toString(36)}`
}

/** 解析一条家教单 */
export function parseOrder(block: string, opts: ParseOptions = {}): TutorOrder {
  const text = normalizeText(block)
  const lines = toLines(text)

  const headerLines: string[] = []
  const extras: string[] = []
  const values = new Map<string, string>()

  const setVal = (field: string, val: string) => {
    const v = cleanValue(val)
    if (!v) return
    const old = values.get(field)
    values.set(field, old ? `${old}；${v}` : v)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (isHeaderLine(line)) {
      headerLines.push(line)
      continue
    }

    const m = line.match(LABEL_LINE)
    if (m) {
      const field = canonField(m[1])
      let val = (m[2] || '').trim()
      if (!val) {
        // 值写在下一行的情况：【学生情况】\n男孩，基础薄弱
        const next = lines[i + 1]
        if (next && !isHeaderLine(next) && !isLabelLine(next)) {
          val = next
          i++
        }
      }
      if (field) setVal(field, val)
      else extras.push(`${cleanValue(m[1])}：${cleanValue(val)}`)
      continue
    }

    const m2 = line.match(KV_LINE)
    if (m2) {
      const field = canonField(m2[1])
      if (field) {
        setVal(field, m2[2])
        continue
      }
    }

    extras.push(line)
  }

  const headerText = headerLines.join(' ')
  const fullText = text

  /* ---- 年级 / 科目 ---- */
  let grade = ''
  let subject = ''

  const gs = values.get('gradeSubject')
  if (gs) {
    const parts = gs.split(/[，,、/／|｜；;（）()]+/).map(s => s.trim()).filter(Boolean)
    for (const p of parts) {
      if (!grade) {
        const g = matchGrade(p)
        if (g) {
          grade = g
          continue
        }
      }
      if (!subject) {
        const s = matchSubject(p)
        if (s) subject = s
      }
    }
    if (!grade) grade = matchGrade(gs)
    if (!subject) subject = matchSubject(gs)
  }
  if (values.get('grade')) grade = matchGrade(values.get('grade')!) || values.get('grade')!
  if (values.get('subject')) subject = matchSubject(values.get('subject')!) || values.get('subject')!
  if (!grade) grade = matchGrade(`${headerText} ${fullText}`)
  if (!subject) subject = matchSubject(`${headerText} ${fullText}`)

  /* ---- 地址 ---- */
  const address = cleanValue(values.get('address') || '')

  /* ---- 费用 ---- */
  let rate = parseRate(values.get('rate') || '')
  if (!rate.min) {
    // 没写字段名、只在正文里出现「150-180/h」时兜底捞一次
    // （必须带单位标记，否则容易把「物理满分70」里的 70 当成价格）
    const m = fullText.match(
      /(\d{2,4})(?:\s*[-~—到至]\s*(\d{2,4}))?\s*元?\s*(?:\/|每)\s*(?:小时|h|H|次|节)/,
    )
    if (m) rate = parseRate(m[0])
  }

  /* ---- 频次 / 时长 ---- */
  const freqSource = values.get('freq') || values.get('startTime') || fullText
  const freq = parseFreq(freqSource)
  let durationMin = parseDuration(values.get('duration') || '')
  if (!durationMin) durationMin = parseDuration(freqSource)
  if (!durationMin && values.get('rate')) durationMin = parseDuration(values.get('rate')!)

  /* ---- 性别 ---- */
  const studentInfo = cleanValue(values.get('studentInfo') || '')
  const studentGender = guessGender(studentInfo)
  const teacherReq = cleanValue(values.get('teacherReq') || '')
  const teacherGender = guessGender(teacherReq)

  /* ---- 城市 / 区 / 片区 ---- */
  const detected = detectLocation(address, headerText)
  let district = detected.district
  const area = detected.area
  // Excel 里可能直接有「区域」列，优先级最高
  const districtOverride = cleanValue(values.get('district') || '')
  if (districtOverride) district = districtOverride
  const city = detectCity(headerText) || detectCity(fullText) || (district ? '北京' : '')

  /* ---- 线上线下 ---- */
  const modeHay = `${headerText} ${fullText}`
  const mode: 'offline' | 'online' = /线上|网课|网络授课|线上授课/.test(modeHay)
    && !/线下/.test(headerText)
    ? 'online'
    : 'offline'

  /* ---- 单号 ---- */
  const code = cleanValue(values.get('code') || '')
    || extractCode(headerText)
    || extractCode(fullText)

  /* ---- 备注：未归类的附加信息 ---- */
  const remark = cleanValue(extras.filter(e => !e.startsWith('【')).join('；')).slice(0, 200)

  /* ---- 标题 ---- */
  const place = district || city
  let title = [place, `${grade}${subject}`].filter(Boolean).join(' · ')
  if (!title) title = cleanValue(headerLines[0] || '').slice(0, 20) || '未命名单'

  /* ---- 缺失字段 ---- */
  const missing: string[] = []
  if (!grade) missing.push('年级')
  if (!subject) missing.push('科目')
  if (!address) missing.push('地址')
  if (!rate.min) missing.push('课时费')

  let confidence = 0
  confidence += grade ? 0.25 : 0
  confidence += subject ? 0.25 : 0
  confidence += address ? 0.25 : 0
  confidence += rate.min ? 0.15 : 0
  confidence += code ? 0.05 : 0
  confidence += freq.min ? 0.05 : 0

  const now = Date.now()
  return {
    id: makeId(),
    code,
    title,
    city,
    district,
    area,
    mode,
    grade,
    subject,
    address,
    rateMin: rate.min,
    rateMax: rate.max || rate.min,
    rateUnit: rate.unit,
    rateText: rate.text,
    freqPerWeek: freq.min,
    freqPerWeekMax: freq.max || freq.min,
    freqText: cleanValue(values.get('freq') || ''),
    durationMin,
    studentGender,
    studentInfo,
    teacherReq,
    teacherGender,
    startTimeText: cleanValue(values.get('startTime') || ''),
    remark,
    source: opts.source || '粘贴导入',
    rawText: block.trim(),
    status: 'pending',
    missing,
    confidence: Math.min(1, Number(confidence.toFixed(2))),
    createdAt: now,
    updatedAt: now,
  }
}

/** 批量解析整段聊天记录 */
export function parseMany(raw: string, opts: ParseOptions = {}): TutorOrder[] {
  const blocks = splitOrders(raw)
  const seen = new Set<string>()
  const out: TutorOrder[] = []

  for (const block of blocks) {
    const order = parseOrder(block, opts)
    // 完全没解析出任何有效信息（既没单号也没关键字段）的块丢掉
    const useful = order.code || order.grade || order.subject || order.address || order.rateMin
    if (!useful) continue
    if (order.code) {
      if (seen.has(order.code)) continue
      seen.add(order.code)
    }
    out.push(order)
  }
  return out
}

export { codeToDate }
