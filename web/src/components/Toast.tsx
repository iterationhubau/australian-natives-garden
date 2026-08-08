import { useEffect } from 'react'

export function Toast({
  message,
  onDismiss,
  tone = 'ok',
}: {
  message: string
  onDismiss: () => void
  tone?: 'ok' | 'error'
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 3200)
    return () => window.clearTimeout(t)
  }, [message, onDismiss])

  return (
    <div
      role="status"
      className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${
        tone === 'error'
          ? 'bg-rose-50 text-rose-900 border-rose-200'
          : 'bg-emerald-900 text-emerald-50 border-emerald-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <p className="m-0 flex-1">{message}</p>
        <button type="button" onClick={onDismiss} className="opacity-70 hover:opacity-100 text-xs font-bold">
          ✕
        </button>
      </div>
    </div>
  )
}
