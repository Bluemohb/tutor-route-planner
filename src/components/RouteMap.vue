<template>
  <view class="rm" :style="{ height }">
    <!-- #ifdef MP-WEIXIN -->
    <map
      class="rm-map"
      :latitude="center.lat"
      :longitude="center.lng"
      :scale="12"
      :markers="markers"
      :polyline="polyline"
      :include-points="includePoints"
      show-location
    />
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="rm-canvas">
      <view class="rm-grid" />
      <svg
        v-if="linePoints"
        class="rm-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          :points="linePoints"
          fill="none"
          stroke="#3B62F6"
          stroke-width="2.5"
          stroke-dasharray="5 4"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          opacity="0.45"
        />
      </svg>

      <view
        v-for="p in positioned"
        :key="`pin-${p.id}`"
        class="rm-pin"
        :style="{ left: `${p.x}%`, top: `${p.y}%`, background: p.color, boxShadow: `0 8rpx 20rpx ${p.color}55` }"
      >
        <text class="rm-pin-num">{{ p.seq }}</text>
      </view>

      <view
        v-for="p in positioned"
        :key="`label-${p.id}`"
        class="rm-label"
        :style="{ left: `${p.x}%`, top: `${p.y}%` }"
      >
        <text class="rm-label-text">{{ p.label }}</text>
      </view>

      <view v-if="startPos" class="rm-start" :style="{ left: `${startPos.x}%`, top: `${startPos.y}%` }">
        <view class="rm-start-dot" />
        <text class="rm-start-text">{{ startLabel }}</text>
      </view>
    </view>
    <!-- #endif -->

    <view class="rm-hint">
      <text class="rm-hint-text">{{ hint }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MapPoint {
  id: string
  seq: number
  label: string
  lat: number
  lng: number
  color: string
}

const props = withDefaults(
  defineProps<{
    points: MapPoint[]
    start?: { lat: number; lng: number } | null
    startLabel?: string
    /** 真实路线规划返回的点串，用于画更贴近实际道路的线 */
    path?: { lat: number; lng: number }[]
    height?: string
    hint?: string
  }>(),
  {
    start: null,
    startLabel: '出发点',
    path: () => [],
    height: '440rpx',
    hint: '',
  },
)

const PAD = 13

const bbox = computed(() => {
  const all = [...props.points]
  if (props.start) all.push({ ...props.start, id: '__s', seq: 0, label: '', color: '' })
  if (props.path.length) {
    for (const p of props.path) all.push({ ...p, id: '__p', seq: 0, label: '', color: '' })
  }
  if (!all.length) return { minLat: 39.85, maxLat: 39.99, minLng: 116.3, maxLng: 116.75 }
  const lats = all.map(p => p.lat)
  const lngs = all.map(p => p.lng)
  let minLat = Math.min(...lats)
  let maxLat = Math.max(...lats)
  let minLng = Math.min(...lngs)
  let maxLng = Math.max(...lngs)
  const padLat = Math.max((maxLat - minLat) * 0.15, 0.004)
  const padLng = Math.max((maxLng - minLng) * 0.15, 0.004)
  minLat -= padLat
  maxLat += padLat
  minLng -= padLng
  maxLng += padLng
  return { minLat, maxLat, minLng, maxLng }
})

function project(p: { lat: number; lng: number }) {
  const { minLat, maxLat, minLng, maxLng } = bbox.value
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  return {
    x: PAD + ((p.lng - minLng) / spanLng) * (100 - PAD * 2),
    y: PAD + ((maxLat - p.lat) / spanLat) * (100 - PAD * 2),
  }
}

const positioned = computed(() =>
  props.points.map(p => ({ ...p, ...project(p) })),
)

const startPos = computed(() => (props.start ? project(props.start) : null))

const linePoints = computed(() => {
  const list = props.path.length
    ? props.path.map(project)
    : [
        ...(props.start ? [project(props.start)] : []),
        ...[...props.points].sort((a, b) => a.seq - b.seq).map(project),
      ]
  if (list.length < 2) return ''
  return list.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
})

const center = computed(() => {
  const { minLat, maxLat, minLng, maxLng } = bbox.value
  return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }
})

const ICONS: Record<string, string> = {
  '#3B62F6': '/static/marker-blue.png',
  '#F97316': '/static/marker-orange.png',
  '#12B886': '/static/marker-green.png',
  '#8B5CF6': '/static/marker-purple.png',
}

const markers = computed(() =>
  props.points.map(p => ({
    id: p.seq,
    latitude: p.lat,
    longitude: p.lng,
    iconPath: ICONS[p.color] || '/static/marker-blue.png',
    width: 28,
    height: 36,
    callout: {
      content: `${p.seq}. ${p.label}`,
      color: '#101828',
      fontSize: 11,
      borderRadius: 6,
      padding: 5,
      bgColor: '#FFFFFF',
      display: 'BYCLICK' as const,
    },
  })),
)

const polyline = computed(() => {
  const pts = props.path.length
    ? props.path
    : [
        ...(props.start ? [props.start] : []),
        ...[...props.points].sort((a, b) => a.seq - b.seq),
      ]
  if (pts.length < 2) return []
  return [
    {
      points: pts.map(p => ({ latitude: p.lat, longitude: p.lng })),
      color: '#3B62F6AA',
      width: 5,
      arrowLine: true,
      dottedLine: !props.path.length,
    },
  ]
})

const includePoints = computed(() => {
  const pts = [
    ...props.points.map(p => ({ latitude: p.lat, longitude: p.lng })),
    ...(props.start ? [{ latitude: props.start.lat, longitude: props.start.lng }] : []),
  ]
  return pts
})
</script>

<style scoped>
.rm {
  position: relative;
  width: 100%;
  border-radius: 28rpx;
  overflow: hidden;
  background: #eef3fb;
}

.rm-map {
  width: 100%;
  height: 100%;
}

.rm-canvas {
  position: absolute;
  inset: 0;
  background: linear-gradient(160deg, #eef4ff 0%, #f6f9ff 45%, #eef7f3 100%);
}

.rm-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(59, 98, 246, 0.07) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(59, 98, 246, 0.07) 1rpx, transparent 1rpx);
  background-size: 56rpx 56rpx;
}

.rm-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.rm-pin {
  position: absolute;
  width: 44rpx;
  height: 44rpx;
  margin-left: -22rpx;
  margin-top: -22rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rm-pin-num {
  font-size: 22rpx;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

.rm-label {
  position: absolute;
  transform: translate(-50%, 26rpx);
  max-width: 200rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2rpx 8rpx rgba(16, 24, 40, 0.08);
}

.rm-label-text {
  font-size: 19rpx;
  color: #475467;
  white-space: nowrap;
}

.rm-start {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rm-start-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: #101828;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 12rpx rgba(16, 24, 40, 0.25);
}

.rm-start-text {
  font-size: 18rpx;
  color: #101828;
  font-weight: 600;
  margin-top: 4rpx;
  background: rgba(255, 255, 255, 0.85);
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}

.rm-hint {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  padding: 6rpx 14rpx;
  border-radius: 10rpx;
  background: rgba(16, 24, 40, 0.55);
}

.rm-hint-text {
  font-size: 19rpx;
  color: #fff;
}
</style>
