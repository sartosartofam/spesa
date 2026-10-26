import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import vercelJson from '../../vercel.json?raw'

interface SecurityHeader {
  key: string
  value: string
}

interface VercelConfig {
  headers?: Array<{
    source: string
    headers: SecurityHeader[]
  }>
}

function securityHeaders(): Map<string, string> {
  const config = JSON.parse(vercelJson) as VercelConfig
  const firstRule = config.headers?.[0]
  if (!firstRule) throw new Error('vercel.json non contiene regole headers')
  return new Map(firstRule.headers.map((header) => [header.key, header.value]))
}

describe('configurazione di sicurezza del frontend', () => {
  it('non carica font da origini esterne', () => {
    expect(indexHtml).not.toContain('fonts.googleapis.com')
    expect(indexHtml).not.toContain('fonts.gstatic.com')
    expect(indexHtml).toContain('name="referrer"')
  })

  it('imposta una CSP restrittiva su Vercel', () => {
    const csp = securityHeaders().get('Content-Security-Policy') ?? ''

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain('https://*.supabase.co')
  })

  it('imposta gli header di difesa in profondità', () => {
    const headers = securityHeaders()

    expect(headers.get('Strict-Transport-Security')).toContain('max-age=')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('X-Frame-Options')).toBe('DENY')
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('Permissions-Policy')).toContain('camera=()')
  })
})
