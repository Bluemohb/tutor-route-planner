import { AREA_POINTS, BEIJING_DISTRICTS } from '@/parser/dict'

export interface LatLng {
  lat: number
  lng: number
}

/** 两点球面距离（公里） */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h
    = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 字符串 → 稳定的 0~1 伪随机数（用来给同一地址做固定偏移，避免点位重叠） */
export function hash01(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/**
 * 估算一个地址的坐标
 * 有片区就用片区中心，否则用区中心，都没有就退回天安门；
 * 再叠加一个基于地址字符串的固定抖动，让同片区的多个单子在图上不重叠
 */
export function estimateCoord(input: {
  address?: string
  area?: string
  district?: string
}): LatLng & { source: 'area' } {
  const { address = '', area = '', district = '' } = input

  let base: LatLng | null = null
  const hit = AREA_POINTS.find(p => p.name === area) || AREA_POINTS.find(p => address.includes(p.name))
  if (hit) base = { lat: hit.lat, lng: hit.lng }
  if (!base && district && BEIJING_DISTRICTS[district]) {
    const [lat, lng] = BEIJING_DISTRICTS[district]
    base = { lat, lng }
  }
  if (!base) base = { lat: 39.9087, lng: 116.3975 }

  const seed = address || area || district || 'x'
  const dLat = (hash01(seed) - 0.5) * 0.012
  const dLng = (hash01(`${seed}#lng`) - 0.5) * 0.016
  return { lat: Number((base.lat + dLat).toFixed(6)), lng: Number((base.lng + dLng).toFixed(6)), source: 'area' }
}

export interface RoutePoint extends LatLng {
  id: string
}

/**
 * 最近邻排序：从起点出发，每次挑离当前位置最近的下一个点
 * 这是最常用的「跑单顺序」近似解，效果足够好且 O(n²) 很快
 */
export function nearestNeighborOrder(start: LatLng, points: RoutePoint[]): RoutePoint[] {
  const rest = [...points]
  const out: RoutePoint[] = []
  let cur: LatLng = start
  while (rest.length) {
    let bestIdx = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < rest.length; i++) {
      const d = haversineKm(cur, rest[i])
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const next = rest.splice(bestIdx, 1)[0]
    out.push(next)
    cur = next
  }
  return out
}

/** 路径总里程（公里，含回到起点的可选段） */
export function pathDistance(start: LatLng, points: LatLng[], backToStart = false): number {
  let total = 0
  let cur = start
  for (const p of points) {
    total += haversineKm(cur, p)
    cur = p
  }
  if (backToStart && points.length) total += haversineKm(cur, start)
  return total
}

/** 直线距离 → 实际路程的粗略修正系数（城区道路绕行） */
export const ROAD_FACTOR = 1.35

/** 无地图 key 时的行程估算：25km/h 城区均速 */
export function estimateTravel(km: number): { distanceKm: number; minutes: number } {
  const distanceKm = km * ROAD_FACTOR
  return { distanceKm, minutes: Math.round((distanceKm / 25) * 60) }
}

/** 高德 URI：H5 端一键导航（无需 key） */
export function navUrlH5(p: LatLng, name: string, address: string): string {
  const n = encodeURIComponent(name)
  const a = encodeURIComponent(address)
  return `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${n}&src=tutor&coordinate=gaode&callnative=1&address=${a}`
}
