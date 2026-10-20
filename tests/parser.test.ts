import { describe, expect, it } from 'vitest'
import { parseMany, splitOrders } from '@/parser'

/** 用户真实提供的群消息样例（三种典型格式混在一起） */
const SAMPLE = `＃通州大学生单
北京线下gy26072504
【年级科目】新高二，数学
【辅导地点】通州杨庄（北苑地铁附近）
【课时报酬】150-180/h
【时间次数】暑假一周3次，每次2h，时间协商，开学后也可继续
【学生情况】男孩，基础薄弱
【老师要求】男大学生，耐心，有经验的
BJ26062502
【补课地址】 : ==通州区后北营家园==
【学生年级】：初二
【补习科目】：物理
【几位老师】：一位
【学生成绩】：物理满分70，得50分 难题没有思路
【一周几次】：一周2次 每次1h
【课时价格】 ：120-150/h
【具体上课时间】：简历通过就
【北京线下】H0032026#暑假单
【年级科目】新4年级（跑步训练）
【辅导地点】#==通州宋庄==
【课费报酬】100/小时（一次课1.5-2小时）
【时间次数】一周2-3次
【学员情况】无
【老师要求】#男体育生擅长跑步，孩跑步特别慢。`

describe('splitOrders', () => {
  it('把三种格式的消息切成 3 条单', () => {
    const blocks = splitOrders(SAMPLE)
    expect(blocks).toHaveLength(3)
    // 第一单：连续两行标题应归到同一单（全角＃会被归一化为半角）
    expect(blocks[0]).toContain('#通州大学生单')
    expect(blocks[0]).toContain('gy26072504')
    expect(blocks[0]).toContain('【年级科目】新高二，数学')
    // 第二单：从单号开始
    expect(blocks[1].startsWith('BJ26062502')).toBe(true)
    // 第三单：【北京线下】开头
    expect(blocks[2]).toContain('H0032026')
  })

  it('单条消息（无标题）也能正常解析', () => {
    const one = `【学生年级】：初三\n【补习科目】：化学\n【补课地址】：朝阳望京\n【课时价格】：200/h`
    expect(splitOrders(one)).toHaveLength(1)
  })

  it('不会把正文里以 # 强调的行误判成新单', () => {
    const one = `【辅导地点】#通州北苑\n【老师要求】#男老师，有耐心`
    expect(splitOrders(one)).toHaveLength(1)
  })
})

describe('parseMany', () => {
  const orders = parseMany(SAMPLE, { source: '通州家教群' })

  it('解析出 3 条结构化家教单', () => {
    expect(orders).toHaveLength(3)
  })

  it('第 1 单：新高二数学，通州杨庄，150-180/h，一周3次每次2h', () => {
    const o = orders[0]
    expect(o.code).toBe('gy26072504')
    expect(o.grade).toBe('高二')
    expect(o.subject).toBe('数学')
    expect(o.district).toBe('通州')
    expect(o.area).toBe('杨庄')
    expect(o.address).toContain('杨庄')
    expect(o.rateMin).toBe(150)
    expect(o.rateMax).toBe(180)
    expect(o.rateUnit).toBe('h')
    expect(o.freqPerWeek).toBe(3)
    expect(o.durationMin).toBe(120)
    expect(o.studentGender).toBe('男')
    expect(o.teacherGender).toBe('男')
    expect(o.mode).toBe('offline')
    expect(o.city).toBe('北京')
    expect(o.missing).toEqual([])
    expect(o.confidence).toBeGreaterThan(0.9)
  })

  it('第 2 单：初二物理，通州后北营，120-150/h，一周2次每次1h', () => {
    const o = orders[1]
    expect(o.code).toBe('BJ26062502')
    expect(o.grade).toBe('初二')
    expect(o.subject).toBe('物理')
    expect(o.district).toBe('通州')
    expect(o.area).toBe('后北营')
    expect(o.address).toBe('通州区后北营家园')
    expect(o.rateMin).toBe(120)
    expect(o.rateMax).toBe(150)
    expect(o.freqPerWeek).toBe(2)
    expect(o.durationMin).toBe(60)
    // 学生成绩里的「物理」不应该污染科目（科目已由【补习科目】确定）
    expect(o.studentInfo).toContain('难题没有思路')
  })

  it('第 3 单：四年级体育（跑步），通州宋庄，100/小时', () => {
    const o = orders[2]
    expect(o.code).toBe('H0032026')
    expect(o.grade).toBe('四年级')
    expect(o.subject).toBe('体育·跑步')
    expect(o.district).toBe('通州')
    expect(o.area).toBe('宋庄')
    expect(o.address).toBe('通州宋庄')
    expect(o.rateMin).toBe(100)
    expect(o.rateMax).toBe(100)
    expect(o.freqPerWeek).toBe(2)
    expect(o.freqPerWeekMax).toBe(3)
    // 价格括号里的「一次课1.5-2小时」应被识别成时长
    expect(o.durationMin).toBe(90)
    expect(o.teacherGender).toBe('男')
    expect(o.mode).toBe('offline')
  })

  it('重复单号不会重复入库', () => {
    const dup = parseMany(`${SAMPLE}\n${SAMPLE}`)
    expect(dup).toHaveLength(3)
  })
})

describe('边界情况', () => {
  it('缺字段时给出 missing 提示', () => {
    const [o] = parseMany(`【补习科目】：英语\n【课时价格】：150/h`)
    expect(o.missing).toContain('年级')
    expect(o.missing).toContain('地址')
    expect(o.missing).not.toContain('科目')
  })

  it('全角冒号 / 空格 / 强调符号都能处理', () => {
    const [o] = parseMany(`【课时价格】 ： ２００/h\n【辅导地点】：＃＃通州果园＃＃`)
    expect(o.rateMin).toBe(200)
    expect(o.address).toBe('通州果园')
    expect(o.area).toBe('果园')
  })

  it('线上单能识别', () => {
    const [o] = parseMany(`【线上】高三数学\n【课时报酬】200/h\n【时间次数】一周2次`)
    expect(o.mode).toBe('online')
    expect(o.grade).toBe('高三')
  })
})
