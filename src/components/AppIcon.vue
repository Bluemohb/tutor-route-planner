<template>
  <image
    class="app-icon"
    :src="src"
    :style="{ width: `${size}px`, height: `${size}px` }"
    mode="aspectFit"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { iconUrl } from '@/utils/icons'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    color?: string
    stroke?: number
    filled?: boolean
  }>(),
  { size: 22, color: '#101828', stroke: 1.8, filled: false },
)

const src = computed(() =>
  iconUrl(props.name, { color: props.color, stroke: props.stroke, filled: props.filled }),
)
</script>

<style scoped>
.app-icon {
  display: block;
  flex-shrink: 0;
}
</style>
