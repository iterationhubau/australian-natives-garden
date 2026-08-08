import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import { FitPage } from './pages/FitPage'
import { LibraryPage } from './pages/LibraryPage'
import { MyPlantsPage } from './pages/MyPlantsPage'
import { SitesPage } from './pages/SitesPage'

function RequireUser({ children }: { children: React.ReactNode }) {
  const { isLocalMode, user, loading, signInWithGoogle } = useAuth()
  if (isLocalMode) return children
  if (loading) return <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 text-sm text-slate-600">Checking session…</div>
  if (!user) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 grid gap-3 max-w-lg">
        <h2 className="text-lg font-bold text-slate-900 m-0">Sign in required</h2>
        <p className="m-0 text-sm text-slate-600">Sign in with Google to sync this section across your devices.</p>
        <button className="w-fit bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3.5 py-2 rounded-xl" type="button" onClick={() => void signInWithGoogle()}>Sign in with Google</button>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LibraryPage />} />
        <Route path="my-plants" element={<RequireUser><MyPlantsPage /></RequireUser>} />
        <Route path="sites" element={<RequireUser><SitesPage /></RequireUser>} />
        <Route path="fit" element={<RequireUser><FitPage /></RequireUser>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
