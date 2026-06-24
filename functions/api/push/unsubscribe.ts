type Env = {
  SUPABASE_URL?: string
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
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Push subscription storage is not configured' }, 500)
  }

  const body = await request.json()
  if (!body?.endpoint) return json({ error: 'Missing push endpoint' }, 400)

  const endpoint = encodeURIComponent(`eq.${body.endpoint}`)
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/push_subscriptions?endpoint=${endpoint}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }),
  })

  if (!res.ok) return json({ error: await res.text() }, 500)
  return json({ ok: true })
}
