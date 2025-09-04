'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '../../utils/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { MindMapsRepo } from '../../utils/firestoreRepo'
import { StorageManager } from '../../utils/storage'

interface MapCard {
  id: string
  title: string
  updatedAt: number
  nodesCount: number
  connectionsCount: number
}

export default function MapsPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthReady(true)
      if (!u) {
        router.replace('/login')
        return
      }
      setUid(u.uid)
      const list = await MindMapsRepo.list(u.uid)
      // Keep context maps in sync with actual maps
      try { StorageManager.pruneContextMaps(list.map(m => m.id)) } catch {}
      setMaps(list)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  if (!authReady || !uid) return null

  const formatWhen = (ms: number) => {
    const d = new Date(ms)
    if (isNaN(d.getTime())) return 'Data sconosciuta'
    const now = new Date()
    const oneDay = 24 * 60 * 60 * 1000

    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
      const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      return `Oggi alle ${timeStr}`
    }

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri'

    const diffDays = Math.floor((now.getTime() - d.getTime()) / oneDay)
    if (diffDays < 7) return `${diffDays} giorni fa`
    return d.toLocaleDateString('it-IT')
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar spacer to align with existing layout */}
      <div className="w-[260px] border-r border-gray-200 bg-[#f9fbff]" />

      {/* Maps grid */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Mappe concettuali</h1>
          <div className="flex items-center gap-2">
            {Object.values(selected).some(Boolean) && (
              <button
                onClick={async () => {
                  const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
                  if (ids.length === 0) return
                  if (!confirm(`Eliminare ${ids.length} mappa/e selezionate? Questa azione è irreversibile.`)) return
                  await Promise.all(ids.map(id => MindMapsRepo.delete(uid!, id)))
                  const list = await MindMapsRepo.list(uid!)
                  try { StorageManager.pruneContextMaps(list.map(m => m.id)) } catch {}
                  setMaps(list)
                  setSelected({})
                }}
                className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
              >
                Elimina selezionate
              </button>
            )}
            <button
              onClick={async () => {
                if (maps.length === 0) return
                if (!confirm('Eliminare TUTTE le mappe? Questa azione è irreversibile.')) return
                await Promise.all(maps.map(m => MindMapsRepo.delete(uid!, m.id)))
                try { StorageManager.pruneContextMaps([]) } catch {}
                setMaps([])
                setSelected({})
              }}
              className={`px-3 py-2 rounded text-sm ${maps.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}
              disabled={maps.length === 0}
            >
              Elimina tutte
            </button>
            <Link href="/mindmap" className="px-3 py-2 rounded bg-slate-900 hover:bg-black text-white text-sm">Nuova mappa</Link>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Caricamento…</div>
        ) : maps.length === 0 ? (
          <div className="text-sm text-gray-500">Nessuna mappa salvata. Crea la tua prima mappa.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map(m => (
              <div key={m.id} className="group border border-gray-200 rounded-lg p-4 hover:shadow-sm transition relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      checked={!!selected[m.id]}
                      onChange={(e) => setSelected(prev => ({ ...prev, [m.id]: e.target.checked }))}
                    />
                    <div>
                      <div className="font-semibold truncate max-w-[220px]">{m.title}</div>
                      <div className="text-xs text-gray-500">Aggiornata {formatWhen(m.updatedAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!confirm('Eliminare questa mappa?')) return
                        await MindMapsRepo.delete(uid!, m.id)
                        const list = await MindMapsRepo.list(uid!)
                        try { StorageManager.pruneContextMaps(list.map(mm => mm.id)) } catch {}
                        setMaps(list)
                        setSelected(prev => { const cp = { ...prev }; delete cp[m.id]; return cp })
                      }}
                      className="w-8 h-8 rounded hover:bg-red-50 text-red-600 flex items-center justify-center"
                      title="Elimina"
                    >
                      ×
                    </button>
                    <Link href={`/mindmap?id=${m.id}`} className="w-8 h-8 rounded hover:bg-blue-50 text-blue-600 flex items-center justify-center" title="Apri">→</Link>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">{m.nodesCount} nodi • {m.connectionsCount} collegamenti</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


