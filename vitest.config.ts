import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // forks 池在部分沙箱/受限环境下写 SSR 缓存会 EPERM，threads 更稳
    pool: 'threads',
  },
})
