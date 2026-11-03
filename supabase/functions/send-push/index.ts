import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_HOSTS = new Set([
  'android.googleapis.com',
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

const ALLOWED_SUFFIXES = ['notify.windows.com', 'push.apple.com']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Budget anti-spam per utente: 12 invii al minuto. Anche le risposte
// `skipped` consumano una unità, per non usare la function come contatore
// gratuito senza toccare il database degli articoli.
const PUSH_RATE_MAX = 12
const PUSH_RATE_WINDOW_SECONDS = 60

interface ItemRow {
  id: string
  family_id: string
  name: string
  status: string
  urgent: boolean
  created_by: string | null
}

interface SubscriptionRow {
  id: string
  member_id: string
  endpoint: string
  keys: unknown
}

interface PushKeys {
  p256dh: string
  auth: string
}

type PushEvent = 'created' | 'urgent'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Allineata a `src/lib/push-endpoint.ts`. */
function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false

  const host = url.hostname.toLowerCase()
  return (
    ALLOWED_HOSTS.has(host) ||
    ALLOWED_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
  )
}

function parseKeys(value: unknown): PushKeys | null {
  if (!isRecord(value)) return null

  const p256dh = value.p256dh
  const auth = value.auth
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null
  if (!/^[A-Za-z0-9_-]{40,200}={0,2}$/.test(p256dh)) return null
  if (!/^[A-Za-z0-9_-]{10,100}={0,2}$/.test(auth)) return null

  return { p256dh, auth }
}

function buildMessage(item: ItemRow, event: PushEvent, authorName: string) {
  const urgent = event === 'urgent' || item.urgent
  const name = item.name.trim().slice(0, 120) || 'Articolo'
  const author = authorName.trim().slice(0, 80) || 'Un membro'

  return {
    title: 'Spesa',
    body: (urgent
      ? `${author} segnala che è finito: ${name}`
      : `${author} ha aggiunto: ${name}`
    ).slice(0, 180),
    tag: `${urgent ? 'urgent' : 'item'}-${item.id}`,
    url: '/app',
    itemId: item.id,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'server_not_configured' }, 500)
  }

  const authHeader = request.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }
  if (!isRecord(body)) return json({ error: 'invalid_body' }, 400)

  const itemId = body.itemId
  const event = body.event
  if (typeof itemId !== 'string' || !UUID_PATTERN.test(itemId)) {
    return json({ error: 'invalid_item' }, 400)
  }
  if (event !== 'created' && event !== 'urgent') {
    return json({ error: 'invalid_event' }, 400)
  }

  // Il JWT viene verificato anche dal gateway Supabase. La chiamata esplicita
  // serve a ottenere l'utente e a impedire invii per famiglie non sue.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) {
    return json({ error: 'unauthorized' }, 401)
  }
  const user = authData.user

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Rate limit per utente: chi prova un abuso colpisce prima il contatore.
  // La RPC `consume_rate_limit` è `security definer` e solo `service_role`
  // può eseguirla (migrazione `push_rate_limit`).
  const rateKey = `send-push:${user.id}`
  const { data: consumed, error: rateError } = await admin.rpc('consume_rate_limit', {
    p_key: rateKey,
    p_max: PUSH_RATE_MAX,
    p_window_seconds: PUSH_RATE_WINDOW_SECONDS,
  })

  if (rateError) {
    console.error('send-push: contatore rate limit non disponibile')
    return json({ error: 'internal_error' }, 500)
  }
  if (!consumed) {
    console.error('send-push: invio fuori budget', user.id)
    return json({ error: 'rate_limited' }, 429)
  }

  const { data: item, error: itemError } = await admin
    .from('items')
    .select('id, family_id, name, status, urgent, created_by')
    .eq('id', itemId)
    .maybeSingle()

  if (itemError) {
    console.error('send-push: lettura articolo fallita')
    return json({ error: 'internal_error' }, 500)
  }
  if (!item) return json({ error: 'not_found' }, 404)

  const pushItem = item as ItemRow
  if (pushItem.status !== 'to_buy') {
    return json({ ok: true, skipped: true, reason: 'item_not_active' })
  }
  if (event === 'urgent' && !pushItem.urgent) {
    return json({ ok: true, skipped: true, reason: 'not_urgent' })
  }

  const { data: membership, error: membershipError } = await admin
    .from('members')
    .select('id, display_name')
    .eq('id', user.id)
    .eq('family_id', pushItem.family_id)
    .maybeSingle()

  if (membershipError) {
    console.error('send-push: lettura membro fallita')
    return json({ error: 'internal_error' }, 500)
  }
  if (!membership) return json({ error: 'forbidden' }, 403)

  // Per un'aggiunta l'autore è chi ha creato l'articolo; per un'urgenza è chi
  // ha premuto il pulsante, che può essere un altro membro della famiglia.
  let authorName = membership.display_name?.trim() || 'Un membro'
  if (event === 'created' && pushItem.created_by) {
    const { data: author } = await admin
      .from('members')
      .select('display_name')
      .eq('id', pushItem.created_by)
      .eq('family_id', pushItem.family_id)
      .maybeSingle()
    if (author?.display_name?.trim()) authorName = author.display_name.trim()
  }

  const { data: members, error: recipientsError } = await admin
    .from('members')
    .select('id')
    .eq('family_id', pushItem.family_id)
    .neq('id', user.id)

  if (recipientsError) {
    console.error('send-push: lettura destinatari fallita')
    return json({ error: 'internal_error' }, 500)
  }

  const memberIds = (members ?? []).map((member) => member.id)
  if (memberIds.length === 0) {
    return json({ ok: true, sent: 0, recipients: 0 })
  }

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id, member_id, endpoint, keys')
    .in('member_id', memberIds)
    .limit(500)

  if (subscriptionsError) {
    console.error('send-push: lettura subscription fallita')
    return json({ error: 'internal_error' }, 500)
  }

  const rows = (subscriptions ?? []) as SubscriptionRow[]
  if (rows.length === 0) {
    return json({ ok: true, sent: 0, recipients: memberIds.length })
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')?.trim()
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')?.trim()
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')?.trim()
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return json({ ok: true, skipped: true, reason: 'push_not_configured' })
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  } catch {
    console.error('send-push: configurazione VAPID non valida')
    return json({ error: 'push_config_invalid' }, 500)
  }

  const message = JSON.stringify(buildMessage(pushItem, event, authorName))
  const options = {
    TTL: 3600,
    urgency: event === 'urgent' || pushItem.urgent ? 'high' : 'normal',
  }

  let sent = 0
  let failed = 0
  let skipped = 0
  let removed = 0

  for (const row of rows) {
    const keys = parseKeys(row.keys)
    if (!isAllowedPushEndpoint(row.endpoint) || !keys) {
      skipped += 1
      continue
    }

    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys }, message, options)
      sent += 1
    } catch (error) {
      const status = isRecord(error) && 'statusCode' in error ? Number(error.statusCode) : 0

      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', row.id)
        removed += 1
      } else {
        failed += 1
        console.error('send-push: invio fallito', row.id, status || 'sconosciuto')
      }
    }
  }

  return json({
    ok: true,
    sent,
    failed,
    skipped,
    removed,
    recipients: memberIds.length,
  })
})
