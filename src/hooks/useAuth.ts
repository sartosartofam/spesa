import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'preact/hooks'
import { mapAuthError, normalizeEmail } from '../lib/auth'
import { getSupabase } from '../lib/supabase'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  error: string | null
}

export interface SignUpInput {
  email: string
  password: string
  displayName: string
  familyName: string
}

export interface SignUpResult {
  /** True quando Supabase ha inviato l'email di conferma e non ha aperto la sessione. */
  needsConfirmation: boolean
}

const INITIAL_STATE: AuthState = {
  status: 'loading',
  session: null,
  user: null,
  error: null,
}

function stateForSession(session: Session | null, error: string | null = null): AuthState {
  return {
    status: session ? 'authenticated' : 'anonymous',
    session,
    user: session?.user ?? null,
    error,
  }
}

function authClient() {
  let client: ReturnType<typeof getSupabase>
  try {
    client = getSupabase()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Configurazione Supabase non valida.')
  }
  if (!client) throw new Error('Supabase non configurato')
  return client
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE)

  useEffect(() => {
    let mounted = true
    let client: ReturnType<typeof getSupabase>

    try {
      client = getSupabase()
    } catch (error) {
      if (mounted) {
        setState(
          stateForSession(
            null,
            error instanceof Error ? error.message : 'Configurazione Supabase non valida.',
          ),
        )
      }
      return
    }

    if (!client) {
      setState(stateForSession(null, mapAuthError(new Error('Supabase non configurato'))))
      return
    }

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        setState(error ? stateForSession(null, mapAuthError(error)) : stateForSession(data.session))
      })
      .catch((error: unknown) => {
        if (mounted) setState(stateForSession(null, mapAuthError(error)))
      })

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState(stateForSession(session))
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = authClient()
    const { error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    const client = authClient()
    const { data, error } = await client.auth.signUp({
      email: normalizeEmail(input.email),
      password: input.password,
      options: {
        data: {
          display_name: input.displayName.trim(),
          family_name: input.familyName.trim(),
          signup_flow: 'public',
        },
      },
    })
    if (error) throw error
    return { needsConfirmation: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    const client = authClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
  }, [])

  return { ...state, signIn, signUp, signOut }
}
