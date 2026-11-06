import type { CookieOptions, Response } from 'express'

export const ACCESS_COOKIE = 'hm_access'
export const REFRESH_COOKIE = 'hm_refresh'
/** O refresh token só é enviado para as rotas de auth. */
const REFRESH_PATH = '/api/auth'

/** Converte "15m", "7d", "3600s", "12h" em milissegundos. */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim())
  if (!match) throw new Error(`Duração inválida: "${value}" (use ex.: 15m, 7d)`)
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const
  return Number(match[1]) * units[match[2] as keyof typeof units]
}

export interface CookieSettings {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  accessTtlMs: number
  refreshTtlMs: number
}

function base(settings: CookieSettings): CookieOptions {
  return {
    httpOnly: true,
    secure: settings.secure,
    sameSite: settings.sameSite,
  }
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  settings: CookieSettings,
) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(settings),
    path: '/',
    maxAge: settings.accessTtlMs,
  })
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(settings),
    path: REFRESH_PATH,
    maxAge: settings.refreshTtlMs,
  })
}

export function clearAuthCookies(res: Response, settings: CookieSettings) {
  res.clearCookie(ACCESS_COOKIE, { ...base(settings), path: '/' })
  res.clearCookie(REFRESH_COOKIE, { ...base(settings), path: REFRESH_PATH })
}
