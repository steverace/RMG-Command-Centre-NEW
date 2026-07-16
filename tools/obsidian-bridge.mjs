#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_VAULT = 'C:\\Users\\race_\\Desktop\\Agent Folder\\Race Media Second Brain'
const DEFAULT_MCP = 'https://rmg-command-centre-new.pages.dev/mcp'

const vaultRoot = process.env.RMCC_VAULT_PATH || DEFAULT_VAULT
const vaultName = process.env.RMCC_OBSIDIAN_VAULT || 'Race Media Second Brain'
const mcpUrl = process.env.RMCC_MCP_URL || DEFAULT_MCP
const mcpToken = process.env.RMCC_MCP_TOKEN || ''

const folders = {
  project: '02-Projects',
  client: '03-Clients',
  task: '00-Inbox',
  idea: '06-Ideas',
  quote: '04-Areas',
  goal: '04-Areas',
}

function usage() {
  return [
    'Usage:',
    '  node tools/obsidian-bridge.mjs ensure-vault',
    '  node tools/obsidian-bridge.mjs create-note --entity-type project --entity-id <uuid> --title "Project Name" --summary "Context"',
    '  node tools/obsidian-bridge.mjs get-context --entity-type project --entity-id <uuid>',
    '  node tools/obsidian-bridge.mjs search-vault --query "needle"',
  ].join('\n')
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i]
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = argv[i + 1]
    args[key] = next && !next.startsWith('--') ? next : 'true'
    if (args[key] === next) i += 1
  }
  return args
}

function cleanFilePart(value) {
  return (value || 'Untitled').replace(/[<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 96) || 'Untitled'
}

function vaultPathFor(entityType, title) {
  return `${folders[entityType] || '00-Inbox'}/${cleanFilePart(title)}.md`
}

function absoluteVaultPath(vaultPath) {
  return path.join(vaultRoot, ...vaultPath.split('/'))
}

function yamlValue(value) {
  if (value == null || value === '') return '""'
  return JSON.stringify(String(value))
}

function noteContent({ entityType, entityId, title, summary }) {
  const now = new Date().toISOString()
  const tag = entityType ? `rmcc/${entityType}` : 'rmcc'
  return `---\ntitle: ${yamlValue(title)}\ntype: ${yamlValue(entityType)}\nrmcc_id: ${yamlValue(entityId)}\nrmcc_type: ${yamlValue(entityType)}\nstatus: \"active\"\npriority: \"\"\nclient: \"\"\nproject: \"\"\ntags:\n  - rmcc\n  - ${tag}\ncreated: ${yamlValue(now)}\nupdated: ${yamlValue(now)}\nlast_synced_at: ${yamlValue(now)}\n---\n\n# ${title}\n\n> [!info] RMCC Link\n> Source of truth: Race Media Command Centre.\n> Entity: ${entityType || 'unknown'} ${entityId || ''}\n\n## Overview\n${summary || 'Add the useful context here.'}\n\n## Decisions\n\n## Context\n\n## Resources\n\n## Next Actions\n\n`
}

async function ensureVault() {
  const folderList = [
    '00-Inbox',
    '01-Daily',
    '02-Projects',
    '03-Clients',
    '04-Areas',
    '05-Research',
    '06-Ideas',
    '07-Meetings',
    '08-Templates',
    '09-Bases',
    '99-Archive',
  ]
  await Promise.all(folderList.map((folder) => fs.mkdir(path.join(vaultRoot, folder), { recursive: true })))
  return { ok: true, vaultRoot, folders: folderList.length }
}

async function rmccTool(name, args) {
  if (!mcpToken) throw new Error('RMCC_MCP_TOKEN is required for RMCC calls')
  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${mcpToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(body.error?.message || `RMCC MCP failed: ${res.status}`)
  return body.result
}

async function createNote(args) {
  const entityType = args['entity-type']
  const entityId = args['entity-id']
  const title = args.title
  if (!entityType || !entityId || !title) throw new Error('entity-type, entity-id, and title are required')
  await ensureVault()
  const vaultPath = args.path || vaultPathFor(entityType, title)
  const filePath = absoluteVaultPath(vaultPath)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, noteContent({ entityType, entityId, title, summary: args.summary }), { flag: 'wx' }).catch(async (err) => {
    if (err?.code !== 'EEXIST') throw err
  })
  let linked = false
  if (mcpToken) {
    await rmccTool('link_vault_note', {
      entity_type: entityType,
      entity_id: entityId,
      vault_path: vaultPath,
      title,
      summary: args.summary || null,
      tags: ['rmcc', entityType],
    })
    linked = true
  }
  return {
    ok: true,
    vaultPath,
    filePath,
    obsidianUrl: `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(vaultPath)}`,
    linked,
  }
}

async function getContext(args) {
  const entityType = args['entity-type']
  const entityId = args['entity-id']
  if (!entityType || !entityId) throw new Error('entity-type and entity-id are required')
  const context = await rmccTool('get_entity_context', { entity_type: entityType, entity_id: entityId })
  const parsed = JSON.parse(context.content?.[0]?.text || '{}')
  const notes = []
  for (const ref of parsed.knowledge_refs || []) {
    const filePath = absoluteVaultPath(ref.vault_path)
    try {
      notes.push({ vault_path: ref.vault_path, content: await fs.readFile(filePath, 'utf8') })
    } catch {
      notes.push({ vault_path: ref.vault_path, missing: true })
    }
  }
  return { ...parsed, vault_notes: notes }
}

async function searchVault(args) {
  const query = (args.query || '').toLowerCase()
  if (!query) throw new Error('query is required')
  const results = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(full, 'utf8')
        if (content.toLowerCase().includes(query)) {
          results.push({ path: path.relative(vaultRoot, full).replace(/\\/g, '/'), title: entry.name.replace(/\.md$/, '') })
        }
      }
    }
  }
  await walk(vaultRoot)
  return { query, results: results.slice(0, 25) }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  let result
  if (command === 'ensure-vault') result = await ensureVault()
  else if (command === 'create-note') result = await createNote(args)
  else if (command === 'get-context') result = await getContext(args)
  else if (command === 'search-vault') result = await searchVault(args)
  else {
    console.error(usage())
    process.exitCode = 1
    return
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
