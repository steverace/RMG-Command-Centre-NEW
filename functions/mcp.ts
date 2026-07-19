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
      required: ['title', 'confirmed'],
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
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_project',
    description: 'Create a new Command Centre project with safe defaults. Use for real work that should be tracked in RMCC.',
    inputSchema: {
      type: 'object',
      required: ['name', 'confirmed'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['client', 'personal', 'affiliate', 'directory', 'app', 'seo', 'content', 'automation', 'admin'] },
        status: { type: 'string', enum: ['not_started', 'active', 'paused', 'waiting'] },
        client_id: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        project_value: { type: 'number' },
        next_action: { type: 'string' },
        ai_can_help: { type: 'boolean' },
        manual_required: { type: 'boolean' },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_idea',
    description: 'Capture a new opportunity or research idea in Command Centre.',
    inputSchema: {
      type: 'object',
      required: ['name', 'confirmed'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        why_it_might_work: { type: 'string' },
        next_research_step: { type: 'string' },
        expected_monthly_revenue: { type: 'number' },
        revenue_confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_task',
    description: 'Update a Command Centre task by id, including status, notes, due date, priority, and Ready for AI state.',
    inputSchema: {
      type: 'object',
      required: ['id', 'confirmed'],
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
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_project',
    description: 'Update safe project workflow fields after explicit human confirmation. Money fields and deletion are not exposed.',
    inputSchema: {
      type: 'object',
      required: ['id', 'confirmed'],
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['not_started', 'active', 'paused', 'waiting', 'completed', 'abandoned'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        next_action: { type: 'string' },
        ai_can_help: { type: 'boolean' },
        manual_required: { type: 'boolean' },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mark_task_needs_steve',
    description: 'Move a task into Steve input needed when AI cannot proceed without more context or a decision.',
    inputSchema: {
      type: 'object',
      required: ['id', 'reason', 'confirmed'],
      properties: {
        id: { type: 'string' },
        reason: { type: 'string' },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'mark_task_complete_for_review',
    description: 'Mark a task complete after AI has carried it out, leaving a review note for Steve.',
    inputSchema: {
      type: 'object',
      required: ['id', 'summary', 'confirmed'],
      properties: {
        id: { type: 'string' },
        summary: { type: 'string' },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'append_project_context',
    description: 'Append project context as an auditable AI event. Use for notes, decisions, or context discovered outside RMCC.',
    inputSchema: {
      type: 'object',
      required: ['project_id', 'summary', 'confirmed'],
      properties: {
        project_id: { type: 'string' },
        summary: { type: 'string' },
        source: { type: 'string' },
        vault_path: { type: 'string' },
        confirmed: { type: 'boolean', description: 'Must be true after the human has approved the exact action.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'link_vault_note',
    description: 'Link an Obsidian vault note path to an RMCC entity. The local bridge creates or updates the actual Markdown file.',
    inputSchema: {
      type: 'object',
      required: ['entity_type', 'entity_id', 'vault_path', 'title'],
      properties: {
        entity_type: { type: 'string', enum: ['project', 'client', 'task', 'idea', 'quote', 'goal'] },
        entity_id: { type: 'string' },
        vault_path: { type: 'string' },
        title: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_knowledge_refs',
    description: 'List Obsidian vault notes linked to RMCC entities.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['project', 'client', 'task', 'idea', 'quote', 'goal'] },
        entity_id: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_entity_context',
    description: 'Get one RMCC entity plus linked Obsidian references and recent AI context events.',
    inputSchema: {
      type: 'object',
      required: ['entity_type', 'entity_id'],
      properties: {
        entity_type: { type: 'string', enum: ['project', 'client', 'task', 'idea', 'quote', 'goal'] },
        entity_id: { type: 'string' },
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
  if (!res.ok) {
    const responseText = await res.text()
    let detail: string
    try {
      const parsed = JSON.parse(responseText) as { message?: string; details?: string; hint?: string; code?: string }
      detail = [parsed.message, parsed.details, parsed.hint, parsed.code].filter(Boolean).join(' | ')
    } catch {
      detail = responseText.trim().slice(0, 400)
    }
    throw new Error(`Supabase ${table} request failed: ${res.status}${detail ? ` - ${detail}` : ''}`)
  }
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

async function resolveOwnerId(env: Env, projectId?: string | null) {
  const query = projectId
    ? `select=owner_id&deleted_at=is.null&id=eq.${encodeURIComponent(projectId)}&limit=1`
    : 'select=owner_id&deleted_at=is.null&order=created_at.asc&limit=1'
  const rows = await supabaseGet(env, 'projects', query) as Array<Record<string, unknown>>
  const ownerId = stringOrNull(rows[0]?.owner_id)
  if (!ownerId) throw new Error('Unable to determine the RMCC owner for this write')
  return ownerId
}

function textResult(value: unknown) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
}

function requireConfirmed(params: Record<string, unknown>) {
  if (params.confirmed !== true) {
    throw new Error('This write action requires confirmed=true after explicit human approval')
  }
}

function entityType(value: unknown) {
  const v = stringOrNull(value)
  if (!v || !['project', 'client', 'task', 'idea', 'quote', 'goal'].includes(v)) throw new Error('valid entity_type is required')
  return v
}

function tableForEntity(type: string) {
  if (type === 'project') return 'projects'
  if (type === 'client') return 'clients'
  if (type === 'task') return 'tasks'
  if (type === 'idea') return 'ideas'
  if (type === 'quote') return 'quotes'
  if (type === 'goal') return 'goals'
  throw new Error(`Unsupported entity type: ${type}`)
}

async function getTask(env: Env, id: string) {
  const rows = await supabaseGet(env, 'tasks', `select=*&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`) as Array<Record<string, unknown>>
  if (!rows[0]) throw new Error(`Task not found: ${id}`)
  return rows[0]
}

async function getEntity(env: Env, type: string, id: string) {
  const rows = await supabaseGet(env, tableForEntity(type), `select=*&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`) as Array<Record<string, unknown>>
  if (!rows[0]) throw new Error(`${type} not found: ${id}`)
  return rows[0]
}

function datedNote(label: string, text: string) {
  return `[${label} ${new Date().toISOString()}]\n${text.trim()}`
}

function appendNote(existing: unknown, label: string, text: string) {
  const current = typeof existing === 'string' ? existing.trim() : ''
  return current ? `${current}\n\n${datedNote(label, text)}` : datedNote(label, text)
}

async function agentEvent(env: Env, row: {
  source?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  summary: string
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseInsert(env, 'agent_events', {
      source: row.source ?? 'rmcc-mcp',
      action: row.action,
      entity_type: row.entity_type ?? null,
      entity_id: row.entity_id ?? null,
      summary: row.summary,
      metadata: row.metadata ?? {},
    })
  } catch {
    // Keep MCP actions usable while the optional audit table is being rolled out.
  }
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
    requireConfirmed(params)
    const title = stringOrNull(params.title)
    if (!title) throw new Error('title is required')
    const readyForAi = params.ready_for_ai === true
    const projectId = stringOrNull(params.project_id)
    const row = {
      owner_id: await resolveOwnerId(env, projectId),
      title,
      project_id: projectId,
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
    const created = await supabaseInsert(env, 'tasks', row) as Array<Record<string, unknown>>
    await agentEvent(env, {
      action: 'create_task',
      entity_type: 'task',
      entity_id: stringOrNull(created[0]?.id),
      summary: `Created task: ${title}`,
      metadata: { ready_for_ai: readyForAi },
    })
    return textResult(created)
  }
  if (name === 'create_project') {
    requireConfirmed(params)
    const projectName = stringOrNull(params.name)
    if (!projectName) throw new Error('name is required')
    const row = {
      owner_id: await resolveOwnerId(env),
      name: projectName,
      type: stringOrNull(params.type) ?? 'personal',
      status: stringOrNull(params.status) ?? 'not_started',
      client_id: stringOrNull(params.client_id),
      priority: stringOrNull(params.priority) ?? 'medium',
      start_date: null,
      due_date: stringOrNull(params.due_date),
      last_worked_on: null,
      project_value: numberOrNull(params.project_value),
      amount_charged: 0,
      amount_paid: 0,
      payment_status: 'not_applicable',
      next_action: stringOrNull(params.next_action),
      ai_can_help: params.ai_can_help === true,
      manual_required: params.manual_required !== false,
    }
    const created = await supabaseInsert(env, 'projects', row) as Array<Record<string, unknown>>
    await agentEvent(env, {
      action: 'create_project',
      entity_type: 'project',
      entity_id: stringOrNull(created[0]?.id),
      summary: `Created project: ${projectName}`,
      metadata: { next_action: row.next_action },
    })
    return textResult(created)
  }
  if (name === 'create_idea') {
    requireConfirmed(params)
    const ideaName = stringOrNull(params.name)
    if (!ideaName) throw new Error('name is required')
    const row = {
      owner_id: await resolveOwnerId(env),
      name: ideaName,
      description: stringOrNull(params.description),
      category: stringOrNull(params.category),
      why_it_might_work: stringOrNull(params.why_it_might_work),
      evidence: null,
      next_research_step: stringOrNull(params.next_research_step),
      revenue_potential: null,
      time_to_revenue: null,
      difficulty: null,
      excitement: null,
      expected_monthly_revenue: numberOrNull(params.expected_monthly_revenue),
      revenue_confidence: stringOrNull(params.revenue_confidence),
      status: 'captured',
    }
    const created = await supabaseInsert(env, 'ideas', row) as Array<Record<string, unknown>>
    await agentEvent(env, {
      action: 'create_idea',
      entity_type: 'idea',
      entity_id: stringOrNull(created[0]?.id),
      summary: `Captured idea: ${ideaName}`,
      metadata: { category: row.category },
    })
    return textResult(created)
  }
  if (name === 'update_task') {
    requireConfirmed(params)
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
    const updated = await supabasePatch(env, 'tasks', id, patch)
    await agentEvent(env, {
      action: 'update_task',
      entity_type: 'task',
      entity_id: id,
      summary: `Updated task ${id}`,
      metadata: patch,
    })
    return textResult(updated)
  }
  if (name === 'update_project') {
    requireConfirmed(params)
    const id = stringOrNull(params.id)
    if (!id) throw new Error('id is required')
    const patch: Record<string, unknown> = {}
    for (const key of ['status', 'priority', 'due_date', 'next_action'] as const) {
      if (Object.prototype.hasOwnProperty.call(params, key)) patch[key] = stringOrNull(params[key])
    }
    if (typeof params.ai_can_help === 'boolean') patch.ai_can_help = params.ai_can_help
    if (typeof params.manual_required === 'boolean') patch.manual_required = params.manual_required
    if (!Object.keys(patch).length) throw new Error('at least one safe project field is required')
    const updated = await supabasePatch(env, 'projects', id, patch)
    await agentEvent(env, {
      action: 'update_project',
      entity_type: 'project',
      entity_id: id,
      summary: `Updated project ${id}`,
      metadata: patch,
    })
    return textResult(updated)
  }
  if (name === 'mark_task_needs_steve') {
    requireConfirmed(params)
    const id = stringOrNull(params.id)
    const reason = stringOrNull(params.reason)
    if (!id || !reason) throw new Error('id and reason are required')
    const task = await getTask(env, id)
    const updated = await supabasePatch(env, 'tasks', id, {
      status: 'blocked',
      blocked: true,
      can_be_done_by_ai: false,
      requires_manual: true,
      waiting_on_type: 'other',
      waiting_on_person: 'Steve',
      waiting_since: new Date().toISOString().slice(0, 10),
      notes: appendNote(task.notes, 'AI needs Steve input', reason),
    })
    await agentEvent(env, {
      action: 'mark_task_needs_steve',
      entity_type: 'task',
      entity_id: id,
      summary: reason,
    })
    return textResult(updated)
  }
  if (name === 'mark_task_complete_for_review') {
    requireConfirmed(params)
    const id = stringOrNull(params.id)
    const summary = stringOrNull(params.summary)
    if (!id || !summary) throw new Error('id and summary are required')
    const task = await getTask(env, id)
    const updated = await supabasePatch(env, 'tasks', id, {
      status: 'complete',
      completed_at: new Date().toISOString(),
      blocked: false,
      can_be_done_by_ai: true,
      requires_manual: true,
      waiting_on_type: null,
      waiting_on_person: null,
      waiting_since: null,
      notes: appendNote(task.notes, 'AI completed for Steve review', summary),
    })
    await agentEvent(env, {
      action: 'mark_task_complete_for_review',
      entity_type: 'task',
      entity_id: id,
      summary,
    })
    return textResult(updated)
  }
  if (name === 'append_project_context') {
    requireConfirmed(params)
    const projectId = stringOrNull(params.project_id)
    const summary = stringOrNull(params.summary)
    if (!projectId || !summary) throw new Error('project_id and summary are required')
    await getEntity(env, 'project', projectId)
    await agentEvent(env, {
      source: stringOrNull(params.source) ?? 'rmcc-mcp',
      action: 'append_project_context',
      entity_type: 'project',
      entity_id: projectId,
      summary,
      metadata: { vault_path: stringOrNull(params.vault_path) },
    })
    return textResult({ ok: true, project_id: projectId, summary })
  }
  if (name === 'link_vault_note') {
    const type = entityType(params.entity_type)
    const id = stringOrNull(params.entity_id)
    const vaultPath = stringOrNull(params.vault_path)
    const title = stringOrNull(params.title)
    if (!id || !vaultPath || !title) throw new Error('entity_id, vault_path, and title are required')
    await getEntity(env, type, id)
    const row = {
      entity_type: type,
      entity_id: id,
      vault_path: vaultPath,
      title,
      summary: stringOrNull(params.summary),
      tags: stringList(params.tags),
      last_synced_at: new Date().toISOString(),
    }
    const created = await supabaseInsert(env, 'knowledge_refs', row)
    await agentEvent(env, {
      action: 'link_vault_note',
      entity_type: type,
      entity_id: id,
      summary: `Linked vault note: ${vaultPath}`,
      metadata: { title, tags: row.tags },
    })
    return textResult(created)
  }
  if (name === 'list_knowledge_refs') {
    const type = params.entity_type ? entityType(params.entity_type) : null
    const id = stringOrNull(params.entity_id)
    const query = [
      'select=*',
      'deleted_at=is.null',
      type ? `entity_type=eq.${encodeURIComponent(type)}` : null,
      id ? `entity_id=eq.${encodeURIComponent(id)}` : null,
      'order=updated_at.desc',
      `limit=${limit}`,
    ].filter(Boolean).join('&')
    return textResult(await supabaseGet(env, 'knowledge_refs', query))
  }
  if (name === 'get_entity_context') {
    const type = entityType(params.entity_type)
    const id = stringOrNull(params.entity_id)
    if (!id) throw new Error('entity_id is required')
    const [entity, knowledgeRefs, events] = await Promise.all([
      getEntity(env, type, id),
      supabaseGet(env, 'knowledge_refs', `select=*&entity_type=eq.${encodeURIComponent(type)}&entity_id=eq.${encodeURIComponent(id)}&deleted_at=is.null&order=updated_at.desc&limit=20`),
      supabaseGet(env, 'agent_events', `select=*&entity_type=eq.${encodeURIComponent(type)}&entity_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=20`),
    ])
    return textResult({ entity_type: type, entity, knowledge_refs: knowledgeRefs, agent_events: events })
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

