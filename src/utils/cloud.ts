/**
 * 腾讯云开发（CloudBase）数据通道
 *
 * 设计原则：**云端是可选增强，不是硬依赖**。
 * 没有配置环境 ID 时整个 App 走本地缓存，功能完全可用；
 * 配置后可以把单子同步到云端，多设备共享。
 *
 * ⚠️ 安全：前端只能放 Publishable Key，绝不能放 SecretKey。
 * 数据库集合建议的安全规则（控制台 → 数据库 → 权限设置）：
 *   tutor_orders / tutor_courses：仅创建者可读写
 */

const ENV_ID: string = (import.meta as any).env?.VITE_ENV_ID || ''
const PUBLISHABLE_KEY: string = (import.meta as any).env?.VITE_PUBLISHABLE_KEY || ''

export function isCloudConfigured(): boolean {
  return !!ENV_ID && ENV_ID !== 'your-env-id'
}

export function cloudEnvId(): string {
  return ENV_ID
}

let appPromise: Promise<any> | null = null
let uid = ''

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(msg)), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function isMpWeixin(): boolean {
  try {
    return typeof (globalThis as any).wx !== 'undefined'
  }
  catch {
    return false
  }
}

async function ensureLogin(app: any): Promise<string> {
  const auth = app.auth
  const session = await auth.getSession()
  if (session?.data?.session?.user?.id) {
    return session.data.session.user.id
  }
  if (isMpWeixin()) {
    try {
      const res = await withTimeout<any>(
        auth.signInWithOpenId({ useWxCloud: false }),
        12000,
        'OpenID 登录超时',
      )
      if (res?.error) throw res.error
      const s = await auth.getSession()
      if (s?.data?.session?.user?.id) return s.data.session.user.id
    }
    catch (e) {
      console.warn('[cloud] OpenID 登录失败，回退匿名', e)
    }
  }
  const res = await withTimeout<any>(auth.signInAnonymously(), 12000, '匿名登录超时')
  if (res?.error) throw res.error
  const s = await auth.getSession()
  const id = s?.data?.session?.user?.id || ''
  if (!id) throw new Error('云开发登录未建立有效会话')
  return id
}

async function getApp(): Promise<any> {
  if (!isCloudConfigured()) throw new Error('未配置云开发环境 ID')
  if (!appPromise) {
    appPromise = (async () => {
      const [{ default: cloudbase }, { default: adapter }] = await Promise.all([
        import('@cloudbase/js-sdk'),
        import('@cloudbase/adapter-uni-app'),
      ])
      cloudbase.useAdapters(adapter, { uni })
      const app = cloudbase.init({
        env: ENV_ID,
        accessKey: PUBLISHABLE_KEY,
        timeout: 12000,
      })
      uid = await ensureLogin(app)
      return app
    })()
    appPromise.catch(() => {
      appPromise = null
    })
  }
  return appPromise
}

/** 把本地对象里的 SDK 内部字段剔掉 */
function strip(doc: any) {
  const { _id, _openid, ...rest } = doc || {}
  return rest
}

/** 批量写入（按 id 覆盖） */
export async function cloudPush(collection: string, items: any[]): Promise<void> {
  if (!items.length) return
  const app = await getApp()
  const db = app.database()
  const chunks: any[][] = []
  for (let i = 0; i < items.length; i += 10) chunks.push(items.slice(i, i + 10))
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((item) => {
        const { id, ...data } = item
        return db.collection(collection).doc(id).set({ ...data, _uid: uid })
      }),
    )
  }
}

/** 删除一条 */
export async function cloudRemove(collection: string, id: string): Promise<void> {
  const app = await getApp()
  await app.database().collection(collection).doc(id).remove()
}

/** 拉取全部（分页，最多 1000 条） */
export async function cloudPull<T>(collection: string): Promise<T[]> {
  const app = await getApp()
  const db = app.database()
  const out: T[] = []
  for (let skip = 0; skip < 1000; skip += 100) {
    const res = await db.collection(collection).skip(skip).limit(100).get()
    const list = res?.data || []
    for (const doc of list) out.push(strip(doc) as T)
    if (list.length < 100) break
  }
  return out
}
