
import { Outlet, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ensureAuth } from './lib/firebase'
export default function App() {
  useEffect(() => { ensureAuth() }, [])
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-black tracking-tight text-xl">BS Poker</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  )
}
