import type { TutorOrder } from '@/types'
import { parseOrder } from '@/parser'
import { canonField } from '@/parser/dict'

/** 极简 CSV/TSV 解析：支持引号包裹、双引号转义、字段内换行 */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '')
  const firstLine = clean.split(/\r?\n/)[0] || ''
  const tabs = (firstLine.match(/\t/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  const delim = tabs > commas ? '\t' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"'
          i++
        }
        else {
          inQuotes = false
        }
      }
      else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
    }
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    }
    else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    }
    else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/**
 * 表格行 → 家教单
 *
 * 思路：把每一行按表头拼成「【表头】值」的伪消息，再交给同一个解析器。
 * 这样 Excel 导入和群消息导入走完全相同的字段归一化逻辑，行为一致、不会两套规则打架。
 */
export function rowsToOrders(rows: string[][], source: string): TutorOrder[] {
  if (!rows.length) return []

  // 找表头行：前 10 行里命中已知字段最多的一行
  let headerIdx = -1
  let bestHits = 0
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const hits = (rows[i] || []).filter(c => canonField(String(c ?? '').trim())).length
    if (hits > bestHits) {
      bestHits = hits
      headerIdx = i
    }
  }

  // 没有可识别表头：当作「每行一段自由文本」逐行解析
  if (headerIdx < 0 || bestHits < 2) {
    return rows
      .map(r => (r || []).join(' ').trim())
      .filter(Boolean)
      .map(t => parseOrder(t, { source }))
      .filter(o => o.grade || o.subject || o.address || o.rateMin)
  }

  const headers = (rows[headerIdx] || []).map(h => String(h ?? '').trim())
  const out: TutorOrder[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || []
    if (r.every(c => !String(c ?? '').trim())) continue
    const lines = headers
      .map((h, j) => (h ? `【${h}】${String(r[j] ?? '').trim()}` : ''))
      .filter(Boolean)
    if (!lines.length) continue
    const o = parseOrder(lines.join('\n'), { source })
    if (o.grade || o.subject || o.address || o.rateMin || o.code) out.push(o)
  }
  return out
}

/** 读取 Excel（.xlsx/.xls）或 CSV 文本 → 家教单 */
export async function readTableFile(input: {
  name: string
  /** H5 的 ArrayBuffer 或小程序端的 base64 字符串 */
  buffer?: ArrayBuffer
  base64?: string
  text?: string
  source: string
}): Promise<TutorOrder[]> {
  const { name, buffer, base64, text, source } = input
  const isCsv = /\.(csv|tsv|txt)$/i.test(name)

  if (isCsv) {
    const content = text ?? ''
    if (!content) throw new Error('文件内容为空')
    return rowsToOrders(parseDelimited(content), source)
  }

  const XLSX: any = await import('xlsx')
  const wb = buffer
    ? XLSX.read(new Uint8Array(buffer), { type: 'array' })
    : XLSX.read(base64, { type: 'base64' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('Excel 里没有工作表')
  const ws = wb.Sheets[sheetName]
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
  return rowsToOrders(rows, source)
}

/** 生成导入模板（CSV，Excel 可直接打开） */
export function buildTemplateCsv(): string {
  const header = [
    '单号',
    '区域',
    '年级',
    '科目',
    '辅导地点',
    '课时报酬',
    '时间次数',
    '学生情况',
    '老师要求',
  ]
  const sample = [
    'BJ26062502',
    '通州',
    '初二',
    '物理',
    '通州区后北营家园',
    '120-150/h',
    '一周2次 每次1h',
    '男孩，物理50分',
    '男老师，有经验',
  ]
  return `${header.join(',')}\n${sample.join(',')}\n`
}
