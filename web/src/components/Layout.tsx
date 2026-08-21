import { useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Icon } from './Icon'
import { Toast } from './Toast'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
    isActive
      ? 'bg-emerald-700 text-white shadow-sm'
      : 'text-emerald-100/90 hover:bg-emerald-800/80 hover:text-white'
  }`

export function Layout() {
  const { isLocalMode, user, signOut, signInWithGoogle } = useAuth()
  const [hideLocalBanner, setHideLocalBanner] = useState(
    () => sessionStorage.getItem('hide_local_banner') === '1',
  )
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState<'ok' | 'error'>('ok')
  const importRef = useRef<HTMLInputElement>(null)

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
              Local mode — data stays in this browser on this site. Use <strong className="font-semibold">Export</strong> for a backup.
              Opening the old HTML file or a different URL won’t share the same save.
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
