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

  const subscription = await request.json()
  if (!subscription?.endpoint) return json({ error: 'Missing push endpoint' }, 400)

  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates',
    },
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
