import { expect, type Page } from '@playwright/test'

export const DEMO_EMAIL = 'demo@spesa.test'
export const DEMO_PASSWORD = 'spesa-demo-123'

const DEMO_USER = {
  id: '00000000-0000-4000-8000-000000000101',
  aud: 'authenticated',
  role: 'authenticated',
  email: DEMO_EMAIL,
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Demo' },
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
}

function session() {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'e2e-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user: DEMO_USER,
  }
}

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }
}

interface SignUpBody {
  email?: string
  data?: Record<string, unknown>
}

interface RecoverBody {
  email?: string
}

interface UpdatePasswordBody {
  password?: string
}

interface MockAuthOptions {
  onSignUp?: (body: SignUpBody) => void
  onRecover?: (body: RecoverBody, redirectTo: string | null) => void
  onUpdatePassword?: (body: UpdatePasswordBody) => void
}

function signUpUser(body: SignUpBody) {
  return {
    ...DEMO_USER,
    id: '00000000-0000-4000-8000-000000000202',
    email: body.email ?? DEMO_EMAIL,
    email_confirmed_at: null,
    confirmed_at: null,
    last_sign_in_at: null,
    user_metadata: body.data ?? {},
  }
}

/**
 * Intercetta le chiamate Auth di Supabase per gli e2e.
 *
 * La CI non avvia Supabase: il build di Playwright usa un URL fittizio e questi
 * mock coprono login, signup, refresh, utente e logout. La verifica contro il
 * Supabase locale reale resta manuale (e nei test pgTAP per il seed).
 */
export async function mockAuth(page: Page, options: MockAuthOptions = {}): Promise<void> {
  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/signup')) {
      const body = request.postDataJSON() as SignUpBody
      options.onSignUp?.(body)
      await route.fulfill(json({ user: signUpUser(body), session: null }))
      return
    }

    if (url.pathname.endsWith('/token')) {
      const grantType = url.searchParams.get('grant_type')
      if (grantType === 'password') {
        const body = request.postDataJSON() as { email?: string; password?: string }
        if (body.email === DEMO_EMAIL && body.password === DEMO_PASSWORD) {
          await route.fulfill(json(session()))
        } else {
          await route.fulfill(
            json(
              {
                code: 400,
                error_code: 'invalid_credentials',
                msg: 'Invalid login credentials',
              },
              400,
            ),
          )
        }
        return
      }
      if (grantType === 'refresh_token') {
        await route.fulfill(json(session()))
        return
      }
    }

    if (url.pathname.endsWith('/recover')) {
      const body = request.postDataJSON() as RecoverBody
      options.onRecover?.(body, url.searchParams.get('redirect_to'))
      await route.fulfill(json({}))
      return
    }

    if (url.pathname.endsWith('/logout')) {
      await route.fulfill({ status: 204 })
      return
    }

    if (url.pathname.endsWith('/user')) {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON() as UpdatePasswordBody
        options.onUpdatePassword?.(body)
        await route.fulfill(json({ ...DEMO_USER, updated_at: new Date().toISOString() }))
        return
      }
      await route.fulfill(json(DEMO_USER))
      return
    }

    await route.continue()
  })
}

export async function signInAsDemo(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(DEMO_EMAIL)
  await page.getByLabel('Password').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: 'Spesa' })).toBeVisible()
}
