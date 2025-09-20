
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureAuth } from '../lib/firebase'
import { createLobby } from '../lib/store'
function randomCode(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ'; let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s }
export default function Home(){
  const nav=useNavigate(); const [code,setCode]=useState(''); const [busy,setBusy]=useState(false); const [err,setErr]=useState<string|null>(null)
  const handleCreate=async()=>{ setErr(null); try{ const uid=await ensureAuth() as string; const c=randomCode(); await createLobby(c, uid); nav(`/${c}`) } catch(e:any){ setErr(e.message||String(e)) } }
  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <div className="card"><h2 className="text-xl font-bold mb-2">Create Lobby</h2><p className="text-sm text-slate-400 mb-3">Spin up a new room with a 4-char code.</p><button className="btn" onClick={handleCreate} disabled={busy}>{busy?'Creating…':'Create Lobby'}</button>{err && <p className="mt-3 text-rose-400 text-sm">{err}</p>}</div>
      <div className="card"><h2 className="text-xl font-bold mb-2">Join Lobby</h2><div className="flex gap-2"><input className="input uppercase" maxLength={4} placeholder="ABCD" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} /><button className="btn" onClick={()=>nav(`/${code}`)} disabled={code.length!==4}>Join</button></div><p className="mt-2 text-sm text-slate-400">Enter a 4-character code provided by the host.</p></div>
    </div>
  )
}
