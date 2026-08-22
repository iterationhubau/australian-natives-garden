import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import {
  chooseSyncFolder,
  disconnectSyncFolder,
  enableAutoFolderSync,
  folderSyncSupported,
  getFolderSyncMeta,
  loadFromFolder,
  syncToFolder,
} from '../lib/folderSync'
import { Icon } from './Icon'
import { Toast } from './Toast'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
    isActive
      ? 'bg-emerald-700 text-white shadow-sm'
      : 'text-emerald-100/90 hover:bg-emerald-800/80 hover:text-white'
  }`

function formatSyncTime(iso: string | null) {
  if (!iso) return 'never'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function Layout() {
  const { isLocalMode, user, signOut, signInWithGoogle } = useAuth()
  const [hideLocalBanner, setHideLocalBanner] = useState(
    () => sessionStorage.getItem('hide_local_banner') === '1',
  )
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok')
  const [folderMeta, setFolderMeta] = useState(() => getFolderSyncMeta())
  const [folderMenuOpen, setFolderMenuOpen] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const folderMenuRef = useRef<HTMLDivElement>(null)
  const canFolderSync = folderSyncSupported()

  useEffect(() => {
    if (!isLocalMode) return
    enableAutoFolderSync(() => api.exportBackup())
  }, [isLocalMode])

  useEffect(() => {
    if (!folderMenuOpen) return
    function onDocClick(e: MouseEvent) {
      if (!folderMenuRef.current?.contains(e.target as Node)) setFolderMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [folderMenuOpen])

  function exportBackup() {
    try {
      const json = api.exportBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `au-natives-garden-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToastTone('ok')
      setToast('Backup downloaded')
    } catch (err) {
      setToastTone('error')
      setToast(err instanceof Error ? err.message : 'Export failed')
    }
  }

  function importBackup(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const summary = api.importBackup(String(reader.result || ''))
        setToastTone('ok')
        setToast(`Restored ${summary.plants} plants · ${summary.sites} sites · ${summary.species} species`)
        window.setTimeout(() => window.location.reload(), 600)
      } catch (err) {
        setToastTone('error')
        setToast(err instanceof Error ? err.message : 'Import failed')
      }
    }
    reader.readAsText(file)
  }

  async function linkFolder() {
    try {
      const meta = await chooseSyncFolder(() => api.exportBackup())
      setFolderMeta(meta)
      setFolderMenuOpen(false)
      setToastTone('ok')
      setToast(`Syncing to folder “${meta.folderName}”`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setToastTone('error')
      setToast(err instanceof Error ? err.message : 'Could not link folder')
    }
  }

  async function syncNow() {
    try {
      const meta = await syncToFolder(() => api.exportBackup(), { prompt: true })
      if (meta) setFolderMeta(meta)
      setFolderMenuOpen(false)
      setToastTone('ok')
      setToast('Saved to sync folder')
    } catch (err) {
      setToastTone('error')
      setToast(err instanceof Error ? err.message : 'Sync failed')
    }
  }

  async function loadFolder() {
    try {
      const { meta, summary } = await loadFromFolder((json) => api.importBackup(json), { prompt: true })
      setFolderMeta(meta)
      setFolderMenuOpen(false)
      setToastTone('ok')
      setToast(`Loaded from folder · ${summary.plants} plants`)
      window.setTimeout(() => window.location.reload(), 600)
    } catch (err) {
      setToastTone('error')
      setToast(err instanceof Error ? err.message : 'Load from folder failed')
    }
  }

  async function unlinkFolder() {
    await disconnectSyncFolder()
    setFolderMeta(getFolderSyncMeta())
    setFolderMenuOpen(false)
    setToastTone('ok')
    setToast('Folder sync disconnected')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {toast && <Toast message={toast} onDismiss={() => setToast('')} tone={toastTone} />}
      <header className="sticky top-0 z-30 bg-emerald-900 text-white border-b border-emerald-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-emerald-800 p-2 rounded-xl border border-emerald-700/60 shadow-inner shrink-0">
                  <Icon name="leaf" className="h-6 w-6 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                    Australian Natives Garden
                  </h1>
                  <p className="text-emerald-200/75 text-xs sm:text-sm truncate">
                    Library · tracking · garden planning
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isLocalMode && (
                  <>
                    <button
                      type="button"
                      onClick={exportBackup}
                      className="bg-emerald-800 hover:bg-emerald-700 border border-emerald-700 text-emerald-100 px-3 py-1.5 rounded-xl text-sm"
                      title="Download a JSON backup of local data"
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => importRef.current?.click()}
                      className="bg-emerald-800 hover:bg-emerald-700 border border-emerald-700 text-emerald-100 px-3 py-1.5 rounded-xl text-sm"
                      title="Restore from a JSON backup"
                    >
                      Import
                    </button>
                    <input
                      ref={importRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) importBackup(file)
                        e.target.value = ''
                      }}
                    />

                    {canFolderSync && (
                      <div className="relative" ref={folderMenuRef}>
                        <button
                          type="button"
                          onClick={() => setFolderMenuOpen((o) => !o)}
                          className={`border px-3 py-1.5 rounded-xl text-sm ${
                            folderMeta.enabled
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-emerald-800 hover:bg-emerald-700 border-emerald-700 text-emerald-100'
                          }`}
                          title="Save and sync to a folder on this computer"
                        >
                          {folderMeta.enabled ? `Folder · ${folderMeta.folderName}` : 'Folder sync'}
                        </button>
                        {folderMenuOpen && (
                          <div className="absolute right-0 mt-1.5 w-64 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-lg p-2 z-40">
                            <p className="text-[11px] text-slate-500 px-2 py-1 m-0">
                              {folderMeta.enabled
                                ? `Linked to “${folderMeta.folderName}”. Last sync: ${formatSyncTime(folderMeta.lastSyncAt)}`
                                : 'Choose a folder to keep au-natives-garden.json in sync.'}
                            </p>
                            {!folderMeta.enabled ? (
                              <button
                                type="button"
                                onClick={() => void linkFolder()}
                                className="w-full text-left text-sm font-semibold px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-emerald-900"
                              >
                                Choose folder…
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void syncNow()}
                                  className="w-full text-left text-sm font-semibold px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-emerald-900"
                                >
                                  Sync now (save to folder)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void loadFolder()}
                                  className="w-full text-left text-sm font-semibold px-2.5 py-2 rounded-lg hover:bg-slate-50"
                                >
                                  Load from folder
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void linkFolder()}
                                  className="w-full text-left text-sm px-2.5 py-2 rounded-lg hover:bg-slate-50"
                                >
                                  Change folder…
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void unlinkFolder()}
                                  className="w-full text-left text-sm px-2.5 py-2 rounded-lg hover:bg-rose-50 text-rose-700"
                                >
                                  Disconnect
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {isLocalMode ? (
                  <span className="text-[10px] bg-emerald-800/80 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                    Local
                  </span>
                ) : user ? (
                  <>
                    <span className="hidden sm:inline text-xs bg-emerald-800/80 border border-emerald-700 text-emerald-200 px-2 py-1 rounded-full max-w-[200px] truncate">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="bg-emerald-800 hover:bg-emerald-700 border border-emerald-700 text-emerald-100 px-3 py-1.5 rounded-xl text-sm"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white px-3 py-1.5 rounded-xl text-sm font-semibold"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1" aria-label="Primary">
              <NavLink to="/" end className={navClass}>Library</NavLink>
              <NavLink to="/my-plants" className={navClass}>My plants</NavLink>
              <NavLink to="/sites" className={navClass}>Sites</NavLink>
              <NavLink to="/fit" className={navClass}>Fit helper</NavLink>
            </nav>
          </div>
        </div>
      </header>

      {isLocalMode && !hideLocalBanner && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950 text-sm px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            <p className="m-0">
              Local mode — browser storage on this site
              {canFolderSync ? (
                <>
                  , or use <strong className="font-semibold">Folder sync</strong> to keep a file on disk.
                </>
              ) : (
                <>
                  . Use <strong className="font-semibold">Export</strong> for a backup (folder sync needs Chrome/Edge).
                </>
              )}
            </p>
            <button
              type="button"
              className="shrink-0 text-amber-800/70 hover:text-amber-950 text-xs font-bold"
              onClick={() => {
                sessionStorage.setItem('hide_local_banner', '1')
                setHideLocalBanner(true)
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
