import type { Context, Next } from 'hono'
import type { AppEnv } from '../types'
import { tooMany } from './errors'

interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, Map<string, WindowState>>()

function cleanup(): void {
  const now = Date.now()
  for (const [key, map] of buckets) {
    for (const [k, state] of map) {
      if (state.resetAt <= now) map.delete(k)
    }
    if (map.size === 0) buckets.delete(key)
  }
}

/** Limitador simple por IP (ventana fija). Uso típico: login. */
export function rateLimit(opts: { windowMs: number; max: number }) {
  return async (c: Context<AppEnv>, next: Next): Promise<Response> => {
    const cf = c.req.raw as Request & { cf?: { asn?: unknown; colo?: unknown } }
    const env = c.env as { ENVIRONMENT?: string }
    const asn = cf.cf?.asn ? `as${cf.cf.asn}` : ''
    const colo = cf.cf?.colo ? `co${cf.cf.colo}` : 'local'
    const key = `${asn}${colo}`
    const now = Date.now()

    cleanup()

    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = new Map()
      buckets.set(key, bucket)
    }
    const state = bucket.get('default') ?? { count: 0, resetAt: now + opts.windowMs }
    if (state.resetAt <= now) {
      state.count = 0
      state.resetAt = now + opts.windowMs
    }
    state.count += 1
    bucket.set('default', state)

    if (state.count > opts.max) {
      const retryAfter = Math.ceil((state.resetAt - now) / 1000)
      if (env.ENVIRONMENT !== 'production') {
        await next()
        return c.res
      }
      c.header('Retry-After', String(retryAfter))
      throw tooMany('Demasiados intentos. Probá de nuevo en unos minutos.')
    }

    await next()
    return c.res
  }
}