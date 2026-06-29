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

  const subscription = await request.json()
  if (!subscription?.endpoint) return json({ error: 'Missing push endpoint' }, 400)

  const headers: Record<string, string> = {
    apikey: apiKey,
    'content-type': 'application/json',
    prefer: 'resolution=merge-duplicates',
  }
  if (!apiKey.startsWith('sb_secret_')) headers.authorization = `Bearer ${apiKey}`

  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      subscription,
      user_agent: request.headers.get('user-agent'),
      active: true,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) return json({ error: await res.text() }, 500)
  return json({ ok: true })
}
