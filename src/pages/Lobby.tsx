
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ensureAuth } from '../lib/firebase'
import { joinLobby, subLobby, toggleReady, leaveLobby } from '../lib/store'
import CopyButton from '../components/CopyButton'
export default function Lobby(){
  const { code='' } = useParams(); const nav=useNavigate()
  const [state,setState]=useState<any>(undefined); const [uid,setUid]=useState<string>(''); const [nick,setNick]=useState('')
  useEffect(()=>{ ensureAuth().then(u=>setUid(u!)) },[])
  useEffect(()=>{ const u=subLobby(code,s=>setState(s)); return ()=>u() },[code])
  useEffect(()=>{ if(state===null) nav('/404') },[state,nav])
  useEffect(()=>{ if(state?.status==='playing') nav(`/${code}/play`) },[state,nav,code])
  useEffect(()=>{
    if(!uid || state===null) return
    if (state && state.players && state.players[uid]) return
    ;(async()=>{ try{ await joinLobby(code, uid) } catch(e){} })()
  },[uid, code, state])
  const players = useMemo(()=>Object.values(state?.players??{}).sort((a:any,b:any)=>(a.joinedAt??0)-(b.joinedAt??0)),[state])
  const my = state?.players?.[uid]
  const readyCount = players.filter((p:any)=>p.ready).length
  const target = Math.max(2, players.length)
  const headerRight = state?.status==='playing' ? 'game started' : `(${Math.min(readyCount, target)}/${target})`
  const url = `${window.location.origin}/${code}`
  const displayName = (p:any,i:number)=> p.nickname?.trim()? p.nickname : `Player ${i+1}`
  const updateNick = async()=>{ if(!uid) return; await joinLobby(code, uid, nick.trim()); setNick('') }
  const onLeave = async()=>{ if(uid) await leaveLobby(code, uid); nav('/') }
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Lobby <span className="text-sky-400">{code}</span></h2><div className="flex items-center"><span className="text-xs text-slate-400">{headerRight}</span></div></div>
          <div className="flex items-center"><div className="font-mono text-lg">{code}</div><CopyButton text={code} /></div>
          <div className="flex items-center"><div className="text-sm truncate">{url}</div><CopyButton text={url} /></div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Set Nickname</label>
            <div className="flex gap-2"><input className="input w-full" placeholder="Nickname" value={nick} onChange={e=>setNick(e.target.value)} /><button className="btn" onClick={updateNick} disabled={!uid || !state?.players?.[uid] || !nick.trim()}>OK</button></div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Players</div>
            <ul className="space-y-1">
              {players.map((p:any,i:number)=>(
                <li key={p.uid} className="flex items-center justify-between">
                  <div>{displayName(p,i)} {p.ready && <span className="text-xs text-sky-400 ml-1">(ready)</span>}</div>
                  <div className="text-xs text-slate-400">{p.uid===uid?'You':''}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-2">
            {my && (
              <button className="btn" onClick={async()=>{ try{ await toggleReady(code, uid) }catch(e:any){ alert(e.message||String(e)) } }}>
                {my.ready ? 'Unready' : 'Ready Up'}
              </button>
            )}
          </div>
          {players.length < 2 && (
            <div className="text-xs text-slate-400 pt-2">
              Need 2 players to start the game.
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Rules (Quick)</h3>
          <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 text-slate-300">
            <li>On your turn: declare a hand that beats the last, or call <b>BS</b>.</li>
            <li>2s are wild cards. No flush declarations.</li>
            <li>Straight / Straight Flush: choose sequence (e.g., A-5, 6-10, 10-A).</li>
            <li>Two Pair & Full House: pick both ranks.</li>
            <li>Above SF: 5OAK, 6OAK, 7OAK, 8OAK.</li>
            <li>BS reveals all; loser gains a card next round; 5 cards eliminates.</li>
            <li>BS loser (if alive) starts next round.</li>
          </ul>
        </div>
      </div>
      <div className="pt-4">
        <button onClick={onLeave} className="btn-danger">Leave Lobby</button>
      </div>
    </div>
  )
}
