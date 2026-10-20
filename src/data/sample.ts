import type { Course, Lesson } from '@/types'
import { parseMany } from '@/parser'
import { addDays, fmtDate, hhmmToMin, minToHhmm, parseISO } from '@/utils/date'
import { estimateCoord } from '@/utils/geo'

/** 首次进入时的示例群消息（前三条是真实样例，用于演示解析能力） */
export const SAMPLE_MESSAGES: string[] = [
  `＃通州大学生单
北京线下gy26072504
【年级科目】新高二，数学
【辅导地点】通州杨庄（北苑地铁附近）
【课时报酬】150-180/h
【时间次数】暑假一周3次，每次2h，时间协商，开学后也可继续
【学生情况】男孩，基础薄弱
【老师要求】男大学生，耐心，有经验的`,

  `BJ26062502
【补课地址】 : ==通州区后北营家园==
【学生年级】：初二
【补习科目】：物理
【几位老师】：一位
【学生成绩】：物理满分70，得50分 难题没有思路
【一周几次】：一周2次 每次1h
【课时价格】 ：120-150/h
【具体上课时间】：简历通过就`,

  `【北京线下】H0032026#暑假单
【年级科目】新4年级（跑步训练）
【辅导地点】#==通州宋庄==
【课费报酬】100/小时（一次课1.5-2小时）
【时间次数】一周2-3次
【学员情况】无
【老师要求】#男体育生擅长跑步，孩跑步特别慢。`,

  `＃通州果园急单
北京线下ty26080211
【年级科目】初三，化学
【辅导地点】通州果园地铁站附近
【课时报酬】180-220/h
【时间次数】一周2次，每次2h，周六日白天
【学生情况】女孩，中考冲刺，基础一般
【老师要求】有中考经验，女老师优先`,

  `＃朝阳望京单
北京线下cy26073105
【年级科目】高一，英语
【辅导地点】朝阳望京SOHO附近
【课时报酬】200-260/h
【时间次数】一周2次，每次1.5h，工作日晚7点后
【学生情况】男孩，国际学校，口语薄弱
【老师要求】英语专业，口语好，男女不限`,

  `BJ26071809
【补课地址】：海淀区五道口华清嘉园
【学生年级】：六年级
【补习科目】：数学
【一周几次】：一周3次 每次1.5h
【课时价格】：150/h
【学生成绩】：计算粗心，应用题弱
【具体上课时间】：周一到周五晚6点半`,

  `【线上】H0052026
【年级科目】高三，物理
【辅导地点】线上授课（腾讯会议）
【课时报酬】250-300/h
【时间次数】一周2次，每次2h
【学生情况】男孩，一轮复习
【老师要求】985物理相关专业，有高三带课经验`,

  `＃通州梨园单
北京线下ly26081003
【年级科目】五年级，语文
【辅导地点】通州梨园九棵树家园
【课时报酬】120-150/h
【时间次数】一周2次，每次1.5h
【学生情况】女孩，阅读理解弱，作文不会写
【老师要求】女老师，有小学语文经验，耐心`,
]

/** 用示例消息生成一批家教单 */
export function buildDemoOrders() {
  return parseMany(SAMPLE_MESSAGES.join('\n\n'), { source: '示例·通州家教群' })
}

const COLORS = ['#3B62F6', '#F97316', '#12B886', '#8B5CF6', '#EC4899', '#0EA5E9']

/**
 * 生成演示用的排课：从今天起，把前几条单排进未来几周
 * 让日历 / 路线一进去就有内容，而不是空白
 */
export function buildDemoCourses(orders: { id: string; title: string; subject: string; grade: string; address: string; district: string; area: string; durationMin: number }[]): {
  courses: Course[]
  lessons: Lesson[]
} {
  const today = new Date()
  const todayWd = today.getDay()
  const plans = [
    { idx: 0, weekdays: [1, 3, 6], startTime: '18:30', teacher: '王老师' },
    { idx: 1, weekdays: [2, 4], startTime: '19:00', teacher: '李老师' },
    { idx: 3, weekdays: [6, 0], startTime: '09:30', teacher: '张老师' },
    { idx: 4, weekdays: [3, 5], startTime: '19:30', teacher: '陈老师' },
  ]

  const courses: Course[] = []
  const lessons: Lesson[] = []

  plans.forEach((p, i) => {
    const o = orders[p.idx]
    if (!o) return
    const coord = estimateCoord(o)
    // 前三个档期都包含今天，保证「今日课程 / 当天跑单」一进去就有内容可看
    const weekdays = i < 3
      ? [...new Set([todayWd, ...p.weekdays])].sort((a, b) => a - b)
      : p.weekdays
    const course: Course = {
      id: `c_demo_${i}`,
      orderId: o.id,
      studentName: `${o.grade}学生`,
      teacherName: p.teacher,
      subject: o.subject,
      grade: o.grade,
      weekdays,
      startTime: p.startTime,
      durationMin: o.durationMin || 120,
      startDate: fmtDate(addDays(today, -7)),
      endDate: fmtDate(addDays(today, 45)),
      address: o.address,
      lat: coord.lat,
      lng: coord.lng,
      color: COLORS[i % COLORS.length],
      note: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    courses.push(course)

    const end = parseISO(course.endDate)
    for (let d = parseISO(course.startDate); d <= end; d = addDays(d, 1)) {
      if (!course.weekdays.includes(d.getDay())) continue
      lessons.push({
        id: `l_${course.id}_${fmtDate(d)}`,
        courseId: course.id,
        orderId: course.orderId,
        date: fmtDate(d),
        startTime: course.startTime,
        endTime: minToHhmm(hhmmToMin(course.startTime) + course.durationMin),
        subject: course.subject,
        studentName: course.studentName,
        teacherName: course.teacherName,
        address: course.address,
        lat: course.lat,
        lng: course.lng,
        color: course.color,
        status: 'planned',
        note: '',
      })
      if (lessons.length > 120) break
    }
  })

  return { courses, lessons }
}
