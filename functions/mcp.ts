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
    description: 'List Command Centre tasks with status, priority, due date, notes, and AI workflow fields.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 50 },
        include_completed: { type: 'boolean' },
        project_id: { type: 'string' },
        client_id: { type: 'string' },
        ai_ready_only: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_ai_ready_tasks',
    description: 'List open tasks that Steve has marked Ready for AI to complete.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', minimum: 1, maximum: 50 } }, additionalProperties: false },
  },
  {
    name: 'create_task',
    description: 'Create a new Command Centre task. Set ready_for_ai true only when the task has enough context for an AI to attempt it.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        project_id: { type: 'string' },
        client_id: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        energy: { type: 'string', enum: ['quick', 'deep_work', 'admin', 'annoying', 'client_chasing'] },
        ready_for_ai: { type: 'boolean' },
        requires_manual: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_task',
    description: 'Update a Command Centre task by id, including status, notes, due date, priority, and Ready for AI state.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        notes: { type: 'string' },
        project_id: { type: 'string' },
        client_id: { type: 'string' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'blocked', 'complete'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        energy: { type: 'string', enum: ['quick', 'deep_work', 'admin', 'annoying', 'client_chasing'] },
        ready_for_ai: { type: 'boolean' },
        requires_manual: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mark_task_needs_steve',
    description: 'Move a task into Steve input needed when AI cannot proceed without more context or a decision.',
    inputSchema: {
      type: 'object',
      required: ['id', 'reason'],
      properties: {
        id: { type: 'string' },
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mark_task_complete_for_review',
    description: 'Mark a task complete after AI has carried it out, leaving a review note for Steve.',
    inputSchema: {
      type: 'object',
      required: ['id', 'summary'],
      properties: {
        id: { type: 'string' },
        summary: { type: 'string' },
      },
      additionalProperties: false,
    },
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

function supabaseHeaders(env: Env, extra: Record<string, string> = {}) {
  const apiKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.SUPABASE_URL || !apiKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are not configured')
  }
  const headers: Record<string, string> = {
    apikey: apiKey,
    accept: 'application/json',
    ...extra,
  }
  if (!apiKey.startsWith('sb_secret_')) headers.authorization = `Bearer ${apiKey}`
  return headers
}

async function supabaseRequest(env: Env, table: string, query: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL) throw new Error('SUPABASE_URL is not configured')
  const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query}`
  const res = await fetch(url, {
    ...init,
    headers: supabaseHeaders(env, init.headers as Record<string, string> | undefined),
  })
  if (!res.ok) throw new Error(`Supabase ${table} request failed: ${res.status}`)
  return res.json()
}

async function supabaseGet(env: Env, table: string, query: string) {
  return supabaseRequest(env, table, query)
}

async function supabaseInsert(env: Env, table: string, row: Record<string, unknown>) {
  return supabaseRequest(env, table, 'select=*', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
}

async function supabasePatch(env: Env, table: string, id: string, row: Record<string, unknown>) {
  return supabaseRequest(env, table, `id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
}

function textResult(value: unknown) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getTask(env: Env, id: string) {
  const rows = await supabaseGet(env, 'tasks', `select=*&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`) as Array<Record<string, unknown>>
  if (!rows[0]) throw new Error(`Task not found: ${id}`)
  return rows[0]
}

function datedNote(label: string, text: string) {
  return `[${label} ${new Date().toISOString()}]\n${text.trim()}`
}

function appendNote(existing: unknown, label: string, text: string) {
  const current = typeof existing === 'string' ? existing.trim() : ''
  return current ? `${current}\n\n${datedNote(label, text)}` : datedNote(label, text)
}

async function callTool(name: string, params: Record<string, unknown>, env: Env) {
  const limit = Math.min(Math.max(Number(params.limit ?? 20), 1), 50)
  if (name === 'list_projects') {
    const data = await supabaseGet(env, 'projects', `select=*&deleted_at=is.null&order=updated_at.desc&limit=${limit}`)
    return textResult(data)
  }
  if (name === 'list_tasks') {
    const query = [
      'select=*',
      'deleted_at=is.null',
      params.include_completed ? null : 'status=neq.complete',
      params.project_id ? `project_id=eq.${encodeURIComponent(String(params.project_id))}` : null,
      params.client_id ? `client_id=eq.${encodeURIComponent(String(params.client_id))}` : null,
      params.ai_ready_only ? 'can_be_done_by_ai=eq.true&requires_manual=eq.false&blocked=eq.false&waiting_on_type=is.null' : null,
      'order=updated_at.desc',
      `limit=${limit}`,
    ].filter(Boolean).join('&')
    const data = await supabaseGet(env, 'tasks', query)
    return textResult(data)
  }
  if (name === 'list_ai_ready_tasks') {
    const data = await supabaseGet(env, 'tasks', `select=*&deleted_at=is.null&status=neq.complete&can_be_done_by_ai=eq.true&requires_manual=eq.false&blocked=eq.false&waiting_on_type=is.null&order=updated_at.desc&limit=${limit}`)
    return textResult(data)
  }
  if (name === 'get_focus_summary') {
    const [projects, tasks, metrics] = await Promise.all([
      supabaseGet(env, 'projects', 'select=id,name,status,priority,due_date,next_action,payment_status,amount_charged,amount_paid&deleted_at=is.null&order=updated_at.desc&limit=30'),
      supabaseGet(env, 'tasks', 'select=id,title,project_id,client_id,status,priority,due_date,energy,notes,can_be_done_by_ai,requires_manual,blocked,waiting_on_type&deleted_at=is.null&status=neq.complete&order=updated_at.desc&limit=30'),
      supabaseGet(env, 'v_project_metrics', 'select=*'),
    ])
    return textResult({ projects, tasks, metrics })
  }
  if (name === 'create_task') {
    const title = stringOrNull(params.title)
    if (!title) throw new Error('title is required')
    const readyForAi = params.ready_for_ai === true
    const row = {
      title,
      project_id: stringOrNull(params.project_id),
      client_id: stringOrNull(params.client_id),
      status: 'not_started',
      priority: stringOrNull(params.priority) ?? 'medium',
      due_date: stringOrNull(params.due_date),
      energy: stringOrNull(params.energy),
      notes: stringOrNull(params.notes),
      can_be_done_by_ai: readyForAi,
      requires_manual: readyForAi ? false : params.requires_manual !== false,
      blocked: false,
      waiting_on_type: null,
      waiting_on_person: null,
      waiting_since: null,
      avoidance_level: null,
    }
    return textResult(await supabaseInsert(env, 'tasks', row))
  }
  if (name === 'update_task') {
    const id = stringOrNull(params.id)
    if (!id) throw new Error('id is required')
    const patch: Record<string, unknown> = {}
    for (const key of ['title', 'project_id', 'client_id', 'status', 'priority', 'due_date', 'energy', 'notes'] as const) {
      if (Object.prototype.hasOwnProperty.call(params, key)) patch[key] = stringOrNull(params[key])
    }
    if (typeof params.requires_manual === 'boolean') patch.requires_manual = params.requires_manual
    if (typeof params.ready_for_ai === 'boolean') {
      patch.can_be_done_by_ai = params.ready_for_ai
      if (params.ready_for_ai) {
        patch.requires_manual = false
        patch.blocked = false
        patch.waiting_on_type = null
        patch.waiting_on_person = null
        patch.waiting_since = null
      }
    }
    return textResult(await supabasePatch(env, 'tasks', id, patch))
  }
  if (name === 'mark_task_needs_steve') {
    const id = stringOrNull(params.id)
    const reason = stringOrNull(params.reason)
    if (!id || !reason) throw new Error('id and reason are required')
    const task = await getTask(env, id)
    return textResult(await supabasePatch(env, 'tasks', id, {
      status: 'blocked',
      blocked: true,
      can_be_done_by_ai: false,
      requires_manual: true,
      waiting_on_type: 'other',
      waiting_on_person: 'Steve',
      waiting_since: new Date().toISOString().slice(0, 10),
      notes: appendNote(task.notes, 'AI needs Steve input', reason),
    }))
  }
  if (name === 'mark_task_complete_for_review') {
    const id = stringOrNull(params.id)
    const summary = stringOrNull(params.summary)
    if (!id || !summary) throw new Error('id and summary are required')
    const task = await getTask(env, id)
    return textResult(await supabasePatch(env, 'tasks', id, {
      status: 'complete',
      completed_at: new Date().toISOString(),
      blocked: false,
      can_be_done_by_ai: true,
      requires_manual: true,
      waiting_on_type: null,
      waiting_on_person: null,
      waiting_since: null,
      notes: appendNote(task.notes, 'AI completed for Steve review', summary),
    }))
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

