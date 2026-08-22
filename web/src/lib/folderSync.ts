/**
 * Optional sync of local garden data to a user-chosen folder (Chrome / Edge).
 * Uses the File System Access API; falls back to Export/Import elsewhere.
 */

const IDB_NAME = 'au_natives_folder_sync'
const IDB_STORE = 'handles'
const HANDLE_KEY = 'sync_dir'
const FILE_NAME = 'au-natives-garden.json'
const META_KEY = 'au_natives_folder_sync_meta'

type FolderMeta = {
  folderName: string
  lastSyncAt: string | null
  enabled: boolean
}

type PermissionMode = 'read' | 'readwrite'

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (opts?: { mode?: PermissionMode }) => Promise<PermissionState>
  requestPermission?: (opts?: { mode?: PermissionMode }) => Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string
      mode?: PermissionMode
      startIn?: string
    }) => Promise<FileSystemDirectoryHandle>
  }
}

export function folderSyncSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

async function idbGet(): Promise<DirHandle | null> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY)
    req.onsuccess = () => resolve((req.result as DirHandle | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'))
  })
}

async function idbSet(handle: DirHandle): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put failed'))
  })
}

async function idbClear(): Promise<void> {
  const db = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
  })
}

function readMeta(): FolderMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw) as FolderMeta
  } catch {
    /* ignore */
  }
  return { folderName: '', lastSyncAt: null, enabled: false }
}

function writeMeta(meta: FolderMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function getFolderSyncMeta(): FolderMeta {
  return readMeta()
}

async function ensurePermission(handle: DirHandle, withPrompt: boolean): Promise<boolean> {
  const mode: PermissionMode = 'readwrite'
  if (handle.queryPermission) {
    const state = await handle.queryPermission({ mode })
    if (state === 'granted') return true
    if (state === 'denied') return false
  }
  if (!withPrompt) return false
  if (handle.requestPermission) {
    const next = await handle.requestPermission({ mode })
    return next === 'granted'
  }
  return true
}

async function writeJson(handle: DirHandle, json: string) {
  const fileHandle = await handle.getFileHandle(FILE_NAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(json)
  await writable.close()
}

async function readJson(handle: DirHandle): Promise<string | null> {
  try {
    const fileHandle = await handle.getFileHandle(FILE_NAME)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

export async function chooseSyncFolder(exportJson: () => string): Promise<FolderMeta> {
  if (!folderSyncSupported()) {
    throw new Error('Folder sync needs Chrome or Edge. Use Export/Import instead.')
  }
  const handle = (await window.showDirectoryPicker!({
    id: 'au-natives-garden-sync',
    mode: 'readwrite',
    startIn: 'documents',
  })) as DirHandle

  const ok = await ensurePermission(handle, true)
  if (!ok) throw new Error('Folder permission was not granted.')

  await idbSet(handle)
  await writeJson(handle, exportJson())
  const meta: FolderMeta = {
    folderName: handle.name,
    lastSyncAt: new Date().toISOString(),
    enabled: true,
  }
  writeMeta(meta)
  return meta
}

export async function syncToFolder(exportJson: () => string, opts?: { prompt?: boolean }): Promise<FolderMeta | null> {
  const meta = readMeta()
  if (!meta.enabled) return null
  const handle = await idbGet()
  if (!handle) {
    writeMeta({ ...meta, enabled: false })
    throw new Error('Saved folder link was lost. Choose the folder again.')
  }
  const ok = await ensurePermission(handle, Boolean(opts?.prompt))
  if (!ok) {
    throw new Error('Folder access needs approval — click Sync folder again.')
  }
  await writeJson(handle, exportJson())
  const next: FolderMeta = {
    folderName: handle.name || meta.folderName,
    lastSyncAt: new Date().toISOString(),
    enabled: true,
  }
  writeMeta(next)
  return next
}

export async function loadFromFolder(
  importJson: (json: string) => { plants: number; sites: number; species: number },
  opts?: { prompt?: boolean },
): Promise<{ meta: FolderMeta; summary: { plants: number; sites: number; species: number } }> {
  const meta = readMeta()
  const handle = await idbGet()
  if (!handle) throw new Error('No sync folder linked yet. Choose a folder first.')
  const ok = await ensurePermission(handle, Boolean(opts?.prompt))
  if (!ok) throw new Error('Folder access needs approval — click Load from folder.')
  const text = await readJson(handle)
  if (!text) throw new Error(`No ${FILE_NAME} found in “${handle.name}”. Sync once to create it.`)
  const summary = importJson(text)
  const next: FolderMeta = {
    folderName: handle.name || meta.folderName,
    lastSyncAt: new Date().toISOString(),
    enabled: true,
  }
  writeMeta(next)
  return { meta: next, summary }
}

export async function disconnectSyncFolder(): Promise<void> {
  await idbClear()
  writeMeta({ folderName: '', lastSyncAt: null, enabled: false })
}

/** Debounced auto-write after local saves (no permission prompt). */
let syncTimer: ReturnType<typeof setTimeout> | null = null
let exportFn: (() => string) | null = null

export function enableAutoFolderSync(getJson: () => string) {
  exportFn = getJson
}

export function scheduleAutoFolderSync() {
  if (!exportFn || !readMeta().enabled) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void syncToFolder(exportFn!, { prompt: false }).catch(() => {
      /* permission may need a click — ignore silent auto-sync failures */
    })
  }, 800)
}
