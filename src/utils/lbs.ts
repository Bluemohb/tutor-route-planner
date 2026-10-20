/**
 * 腾讯位置服务（LBS）封装
 *
 * - 配置了 key：调用真实的地理编码 / 驾车路线规划
 * - 没配置 key：自动降级为「片区坐标估算 + 直线距离折算」，功能不中断
 *
 * 申请 key：https://lbs.qq.com/dev/console/application/mine
 * 小程序端需把 https://apis.map.qq.com 加入 request 合法域名
 */
import type { LatLng } from './geo'

function request<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      timeout: 8000,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data as T)
        else reject(new Error(`HTTP ${res.statusCode}`))
      },
      fail: (err: any) => reject(new Error(err?.errMsg || '网络请求失败')),
    })
  })
}

export interface GeocodeResult extends LatLng {
  /** 腾讯返回的标准化地址 */
  title: string
}

/** 地址 → 经纬度 */
export async function geocode(address: string, city: string, key: string): Promise<GeocodeResult | null> {
  if (!key || !address) return null
  try {
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?address=${encodeURIComponent(address)}`
      + `&region=${encodeURIComponent(city || '北京')}&key=${key}`
    const data: any = await request(url)
    if (data?.status !== 0) return null
    const loc = data?.result?.location
    if (!loc) return null
    return { lat: Number(loc.lat), lng: Number(loc.lng), title: data?.result?.title || address }
  }
  catch (e) {
    console.warn('[lbs] 地理编码失败，使用片区估算', e)
    return null
  }
}

export interface RouteLeg {
  distanceKm: number
  minutes: number
  /** 腾讯返回的路线点串，用于在地图上画线 */
  polyline: LatLng[]
  /** 是否来自真实路线规划 */
  real: boolean
}

/** 驾车路线规划 */
export async function driving(from: LatLng, to: LatLng, key: string): Promise<RouteLeg | null> {
  if (!key) return null
  try {
    const url = 'https://apis.map.qq.com/ws/direction/v1/driving/'
      + `?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&key=${key}`
    const data: any = await request(url)
    if (data?.status !== 0) return null
    const route = data?.result?.routes?.[0]
    if (!route) return null
    const coors: number[][] = route.polyline || []
    return {
      distanceKm: Number(route.distance) / 1000,
      minutes: Math.round(Number(route.duration) / 60),
      polyline: coors.map(([lat, lng]) => ({ lat, lng })),
      real: true,
    }
  }
  catch (e) {
    console.warn('[lbs] 路线规划失败，使用估算', e)
    return null
  }
}

/** 打开系统/内置地图导航 */
export function openNavigation(p: LatLng, name: string, address: string) {
  // #ifdef MP-WEIXIN
  uni.openLocation({
    latitude: p.lat,
    longitude: p.lng,
    name,
    address,
    scale: 16,
    fail: () => {
      uni.showToast({ title: '打开地图失败', icon: 'none' })
    },
  })
  return
  // #endif

  // #ifdef H5
  const url = `https://uri.amap.com/marker?position=${p.lng},${p.lat}`
    + `&name=${encodeURIComponent(name)}&src=tutor&coordinate=gaode&callnative=1`
    + `&address=${encodeURIComponent(address)}`
  window.open(url, '_blank')
  // #endif
}
