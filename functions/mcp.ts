type Env = {
  RMCC_MCP_TOKEN?: string
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type PagesFunction<Bindings> = (context: { request: Request; env: Bindings }) => Response | Promise<Response>

type JsonRpcRequest = {
  jsonrpc?: '2.0'
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

const tools = [
  {
    name: 'get_focus_summary',
    description: 'Get a short Race Media Command Centre summary covering projects, overdue tasks, and unpaid project money.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_projects',
    description: 'List active Command Centre projects with status, priority, due date, next action, and money fields.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', minimum: 1, maximum: 50 } }, additionalProperties: false },
  },
  {
    name: 'list_tasks',
    description: 'List open Command Centre tasks with status, priority, due date, and notes.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', minimum: 1, maximum: 50 } }, additionalProperties: false },
  },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,accept',
    },
  })
}

function rpc(id: JsonRpcRequest['id'], result: unknown) {
  return json({ jsonrpc: '2.0', id: id ?? null, result })
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, 200)
}

function authorised(request: Request, env: Env) {
  if (!env.RMCC_MCP_TOKEN) return false
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${env.RMCC_MCP_TOKEN}`
}

async function supabaseGet(env: Env, table: string, query: string) {
  const apiKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.SUPABASE_URL || !apiKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are not configured')
  }
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query}`
  const headers: Record<string, string> = {
    apikey: apiKey,
    accept: 'application/json',
  }
  if (!apiKey.startsWith('sb_secret_')) headers.authorization = `Bearer ${apiKey}`
  const res = await fetch(url, {
    headers,
  })
  if (!res.ok) throw new Error(`Supabase ${table} request failed: ${res.status}`)
  return res.json()
}

function textResult(value: unknown) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

async function callTool(name: string, params: Record<string, unknown>, env: Env) {
  const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 50)
  if (name === 'list_projects') {
    const data = await supabaseGet(env, 'projects', `select=*&deleted_at=is.null&order=updated_at.desc&limit=${limit}`)
    return textResult(data)
  }
  if (name === 'list_tasks') {
    const data = await supabaseGet(env, 'tasks', `select=*&deleted_at=is.null&status=neq.complete&order=updated_at.desc&limit=${limit}`)
    return textResult(data)
  }
  if (name === 'get_focus_summary') {
    const [projects, tasks, metrics] = await Promise.all([
      supabaseGet(env, 'projects', 'select=id,name,status,priority,due_date,next_action,payment_status,amount_charged,amount_paid&deleted_at=is.null&order=updated_at.desc&limit=30'),
      supabaseGet(env, 'tasks', 'select=id,title,project_id,status,priority,due_date,energy,notes,can_be_done_by_ai,requires_manual,blocked,waiting_on_type&deleted_at=is.null&status=neq.complete&order=updated_at.desc&limit=30'),
      supabaseGet(env, 'v_project_metrics', 'select=*'),
    ])
    return textResult({ projects, tasks, metrics })
  }
  throw new Error(`Unknown tool: ${name}`)
}

export const onRequestOptions: PagesFunction<Env> = async () => json({ ok: true })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => json({
  ok: true,
  name: 'Race Media Command Centre MCP',
  mcp: 'POST JSON-RPC 2.0 requests to this endpoint.',
  configured: !!(env.RMCC_MCP_TOKEN && env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)),
  tools: tools.map((tool) => tool.name),
})

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!authorised(request, env)) {
    return json({ error: 'Unauthorized. Send Authorization: Bearer <RMCC_MCP_TOKEN>.' }, 401)
  }

  let body: JsonRpcRequest
  try {
    body = await request.json()
  } catch {
    return rpcError(null, -32700, 'Invalid JSON')
  }

  if (body.method === 'initialize') {
    return rpc(body.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'race-media-command-centre', version: '0.1.0' },
    })
  }

  if (body.method === 'tools/list') {
    return rpc(body.id, { tools })
  }

  if (body.method === 'tools/call') {
    const name = String(body.params?.name ?? '')
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>
    try {
      return rpc(body.id, await callTool(name, args, env))
    } catch (err) {
      return rpcError(body.id, -32000, err instanceof Error ? err.message : 'Tool call failed')
    }
  }

  if (body.method === 'notifications/initialized') {
    return new Response(null, { status: 202 })
  }

  return rpcError(body.id, -32601, `Unsupported method: ${body.method ?? 'missing'}`)
}
