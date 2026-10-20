/**
 * 图标：内联 SVG → base64 data URI
 *
 * 为什么不用图片文件：一套图标要维护两套颜色（常态/选中）共 8 个 png，
 * 用 SVG 可以按需换色、任意尺寸，H5 和小程序都能渲染。
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function utf8ToBase64(str: string): string {
  const bytes: number[] = []
  for (const ch of str) {
    const code = ch.codePointAt(0) || 0
    if (code < 0x80) {
      bytes.push(code)
    }
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    }
    else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
    else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = bytes[i + 1]
    const b3 = bytes[i + 2]
    out += B64[b1 >> 2]
    out += B64[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)]
    out += b2 === undefined ? '=' : B64[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)]
    out += b3 === undefined ? '=' : B64[b3 & 63]
  }
  return out
}

/** 每个图标都是 24×24 viewBox 的描边图形 */
const BODY: Record<string, string> = {
  home: '<path d="M3.2 10.6 12 3.2l8.8 7.4V19.6a1.6 1.6 0 0 1-1.6 1.6h-4.3v-6.5H9.1v6.5H4.8a1.6 1.6 0 0 1-1.6-1.6z"/>',
  list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.2" cy="6.5" r="1.3"/><circle cx="4.2" cy="12" r="1.3"/><circle cx="4.2" cy="17.5" r="1.3"/>',
  calendar:
    '<rect x="3.2" y="5.2" width="17.6" height="15.6" rx="3.2"/><path d="M3.2 10.2h17.6M8.2 3v4.2M15.8 3v4.2"/>',
  map: '<path d="M9 4.2 3.4 6.4v13.4L9 17.6l6 2.2 5.6-2.2V4.2L15 6.4 9 4.2z"/><path d="M9 4.2v13.4M15 6.4v13.4"/>',
  pin: '<path d="M12 21.2s6.8-6.1 6.8-10.9A6.8 6.8 0 0 0 5.2 10.3c0 4.8 6.8 10.9 6.8 10.9z"/><circle cx="12" cy="10.2" r="2.6"/>',
  clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.4V12l3.2 2"/>',
  money:
    '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v10M14.8 9.4c0-1.1-1.3-1.8-2.8-1.8s-2.8.7-2.8 1.9c0 2.6 5.6 1.4 5.6 4 0 1.2-1.3 1.9-2.8 1.9s-2.8-.7-2.8-1.9"/>',
  user: '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.6 20.4c0-3.8 3.3-6.2 7.4-6.2s7.4 2.4 7.4 6.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevronLeft: '<path d="M14.6 5.4 8 12l6.6 6.6"/>',
  chevronRight: '<path d="M9.4 5.4 16 12l-6.6 6.6"/>',
  chevronDown: '<path d="M5.4 9.2 12 15.8l6.6-6.6"/>',
  arrowRight: '<path d="M4.5 12h15M13.4 5.9 19.5 12l-6.1 6.1"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6 20.5 20.5"/>',
  filter: '<path d="M3.6 5.4h16.8L14 12.6v6.2l-4 1.8v-8z"/>',
  check: '<path d="M4.8 12.6 9.6 17.4 19.2 6.8"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sync: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.2V9h-4.8"/>',
  settings:
    '<circle cx="12" cy="12" r="3.1"/><path d="M19.1 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3.9a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3.9a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  upload: '<path d="M12 16.5V4.5M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v3.4a1.6 1.6 0 0 0 1.6 1.6h11.8a1.6 1.6 0 0 0 1.6-1.6V15"/>',
  download: '<path d="M12 4.5v12M7.5 12l4.5 4.5 4.5-4.5"/><path d="M4.5 15v3.4a1.6 1.6 0 0 0 1.6 1.6h11.8a1.6 1.6 0 0 0 1.6-1.6V15"/>',
  trash: '<path d="M4.6 7.4h14.8M9.4 7.4V4.9h5.2v2.5M6.6 7.4l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l.9-12.1"/>',
  edit: '<path d="M16.4 4.2a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8l-4.4 1.2 1.2-4.4z"/>',
  sparkles:
    '<path d="M12 3.4 13.7 8.3 18.6 10 13.7 11.7 12 16.6 10.3 11.7 5.4 10 10.3 8.3z"/><path d="M18.4 15.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  phone: '<path d="M20.4 16.9v2.6a1.7 1.7 0 0 1-1.9 1.7 17 17 0 0 1-7.4-2.6 16.7 16.7 0 0 1-5.1-5.1A17 17 0 0 1 3.4 6a1.7 1.7 0 0 1 1.7-1.9h2.6a1.7 1.7 0 0 1 1.7 1.5c.1.9.3 1.7.6 2.5a1.7 1.7 0 0 1-.4 1.8l-1.1 1.1a13.6 13.6 0 0 0 5.1 5.1l1.1-1.1a1.7 1.7 0 0 1 1.8-.4c.8.3 1.6.5 2.5.6a1.7 1.7 0 0 1 1.4 1.7z"/>',
  target: '<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2"/>',
  layers: '<path d="M12 3.4 3.4 8 12 12.6 20.6 8z"/><path d="M3.4 12.8 12 17.4l8.6-4.6M3.4 17.2 12 21.8l8.6-4.6"/>',
  route: '<circle cx="6" cy="18.4" r="2.6"/><circle cx="18" cy="5.6" r="2.6"/><path d="M8.2 16.6c2.4-2 1-4.2 3.4-5.4 1.6-.8 3.4-.4 4.4-2.4"/>',
}

export interface IconOptions {
  color?: string
  stroke?: number
  /** 是否填充（用于圆点类图标） */
  filled?: boolean
}

/** 生成 data URI */
export function iconUrl(name: string, options: IconOptions = {}): string {
  const { color = '#101828', stroke = 1.8, filled = false } = options
  const body = BODY[name] || BODY.target
  const fill = filled ? color : 'none'
  const svg
    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" `
      + `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`
}

export const ICON_NAMES = Object.keys(BODY)
