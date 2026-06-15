import { useState } from 'react'
import type { FormEvent } from 'react'
import { X, Archive } from 'lucide-react'
import type { Client } from '@/lib/types'
import type { ClientInput } from '@/lib/clients'
import { useCreateClient, useUpdateClient, useArchiveClient } from '@/features/clients/useClients'

const labelCls = 'mb-1 block text-xs font-medium text-slate-500'
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500'

export default function ClientForm({ client, onClose, onArchived }: { client: Client | null; onClose: () => void; onArchived?: () => void }) {
  const create = useCreateClient()
  const update = useUpdateClient()
  const archive = useArchiveClient()
  const editing = !!client

  const [business, setBusiness] = useState(client?.business_name ?? '')
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [website, setWebsite] = useState(client?.website ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const busy = create.isPending || update.isPending || archive.isPending

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: ClientInput = {
      business_name: business.trim() || null,
      name: name.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    }
    if (!input.business_name && !input.name) { setError('Give at least a business name or a contact name.'); return }
    try {
      if (editing && client) await update.mutateAsync({ id: client.id, input })
      else await create.mutateAsync(input)
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
  }

  async function onArchive() {
    if (!client) return
    if (!window.confirm('Archive this client?')) return
    try { await archive.mutateAsync(client.id); (onArchived ?? onClose)() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not archive') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">{editing ? 'Edit client' : 'New client'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className={labelCls} htmlFor="c-biz">Business name <span className="text-slate-300">(shown as the main name)</span></label>
            <input id="c-biz" value={business} onChange={(e) => setBusiness(e.target.value)} className={inputCls} placeholder="e.g. Xing Design" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="c-name">Contact name</label>
              <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Jane Xing" />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-phone">Phone</label>
              <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-email">Email</label>
              <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-web">Website</label>
              <input id="c-web" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="c-addr">Address</label>
            <textarea id="c-addr" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-notes">Notes</label>
            <textarea id="c-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Anything worth remembering about this client" />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          {editing
            ? <button type="button" onClick={onArchive} disabled={busy} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-600"><Archive className="h-4 w-4" /> Archive</button>
            : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create client'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}
