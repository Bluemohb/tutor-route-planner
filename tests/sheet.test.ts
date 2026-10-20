import { describe, expect, it } from 'vitest'
import { buildTemplateCsv, parseDelimited, rowsToOrders } from '@/utils/sheet'

describe('parseDelimited', () => {
  it('解析带引号和字段内换行的 CSV', () => {
    const csv = 'a,b\n"x,y","line1\nline2"\n1,2'
    const rows = parseDelimited(csv)
    expect(rows).toHaveLength(3)
    expect(rows[1][0]).toBe('x,y')
    expect(rows[1][1]).toBe('line1\nline2')
  })

  it('自动识别 TSV', () => {
    const rows = parseDelimited('年级\t科目\n初二\t物理')
    expect(rows[0]).toEqual(['年级', '科目'])
    expect(rows[1]).toEqual(['初二', '物理'])
  })

  it('去掉 BOM', () => {
    const rows = parseDelimited('\uFEFF年级,科目\n高一,英语')
    expect(rows[0][0]).toBe('年级')
  })
})

describe('rowsToOrders', () => {
  it('按表头映射成家教单（列顺序随意）', () => {
    const csv = [
      '序号,课时报酬,补习科目,学生年级,补课地址,一周几次,单号',
      '1,120-150/h,物理,初二,通州区后北营家园,一周2次 每次1h,BJ26062502',
      '2,180/h,数学,高二,通州杨庄,一周3次 每次2h,gy26072504',
    ].join('\n')
    const orders = rowsToOrders(parseDelimited(csv), '测试表.xlsx')

    expect(orders).toHaveLength(2)
    expect(orders[0].subject).toBe('物理')
    expect(orders[0].grade).toBe('初二')
    expect(orders[0].code).toBe('BJ26062502')
    expect(orders[0].rateMin).toBe(120)
    expect(orders[0].rateMax).toBe(150)
    expect(orders[0].district).toBe('通州')
    expect(orders[0].area).toBe('后北营')
    expect(orders[0].freqPerWeek).toBe(2)
    expect(orders[0].durationMin).toBe(60)

    expect(orders[1].grade).toBe('高二')
    expect(orders[1].rateMin).toBe(180)
    expect(orders[1].freqPerWeek).toBe(3)
    expect(orders[1].durationMin).toBe(120)
  })

  it('有「区域」列时优先用它', () => {
    const csv = '区域,年级,科目,辅导地点\n朝阳,高一,英语,望京SOHO'
    const [o] = rowsToOrders(parseDelimited(csv), 'x')
    expect(o.district).toBe('朝阳')
    expect(o.area).toBe('望京')
  })

  it('没有表头时按整行文本兜底解析', () => {
    const rows = [['初二 物理 通州后北营 120/h']]
    const [o] = rowsToOrders(rows, 'x')
    expect(o.grade).toBe('初二')
    expect(o.subject).toBe('物理')
    expect(o.rateMin).toBe(120)
  })

  it('跳过空行', () => {
    const csv = '年级,科目\n初二,物理\n,\n高一,英语'
    const orders = rowsToOrders(parseDelimited(csv), 'x')
    expect(orders).toHaveLength(2)
  })

  it('模板文件能被自己解析', () => {
    const orders = rowsToOrders(parseDelimited(buildTemplateCsv()), '模板')
    expect(orders).toHaveLength(1)
    expect(orders[0].grade).toBe('初二')
    expect(orders[0].rateMin).toBe(120)
  })
})
