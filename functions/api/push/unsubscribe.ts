type Env = {
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type PagesFunction<Bindings> = (context: { request: Request; env: Bindings }) => Response | Promise<Response>

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const apiKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.SUPABASE_URL || !apiKey) {
    return json({ error: 'Push subscription storage is not configured' }, 500)
  }

  const body = await request.json()
  if (!body?.endpoint) return json({ error: 'Missing push endpoint' }, 400)

  const headers: Record<string, string> = {
    apikey: apiKey,
    'content-type': 'application/json',
  }
  if (!apiKey.startsWith('sb_secret_')) headers.authorization = `Bearer ${apiKey}`

  const endpoint = encodeURIComponent(`eq.${body.endpoint}`)
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/push_subscriptions?endpoint=${endpoint}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
  })

  if (!res.ok) return json({ error: await res.text() }, 500)
  return json({ ok: true })
}
