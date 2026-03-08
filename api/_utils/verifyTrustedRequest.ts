interface ApiRequest {
  headers: Record<string, string | string[] | undefined>
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase()
}

function extractOrigin(req: ApiRequest): string | null {
  const originHeader = req.headers['origin']
  if (typeof originHeader === 'string' && originHeader) {
    return normalizeOrigin(originHeader)
  }
  const refererHeader = req.headers['referer']
  if (typeof refererHeader === 'string' && refererHeader) {
    try { return normalizeOrigin(new URL(refererHeader).origin) } catch { return null }
  }
  return null
}

const ALLOWED_ORIGINS = [
  'https://passport.kiwimu.com',
  'https://kiwimu.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

export function verifyTrustedRequest(req: ApiRequest): boolean {
  const token = process.env.INTERNAL_API_TOKEN
  const provided = req.headers['x-internal-token']
  if (token && typeof provided === 'string' && provided === token) return true

  const origin = extractOrigin(req)
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}
