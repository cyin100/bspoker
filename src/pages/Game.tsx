
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ensureAuth } from '../lib/firebase'
import { ackNextRound, callBS, declareHand, subLobby } from '../lib/store'
import HandPicker from '../components/HandPicker'
import CardFace from '../components/CardFace'
import type { Card } from '../lib/types'
export default function Game(){
  const { code='' } = useParams()
  const [state,setState]=useState<any>(undefined); const [uid,setUid]=useState<string>('')
  const nav=useNavigate()
  useEffect(()=>{ ensureAuth().then(u=>setUid(u!)) },[])
  useEffect(()=>{ const u=subLobby(code,s=>setState(s)); return ()=>u() },[code])
  useEffect(()=>{ if(state===null) nav('/404') },[state,nav])
  useEffect(()=>{ if(state?.status==='lobby') nav(`/${code}`) },[state,nav,code])
  const my = state?.players?.[uid]
  const isTurn = state?.turn === uid
  const reveal = !!state?.reveal
  const awaitingAck = !!state?.awaitingAck
  const seats = (state?.seats ?? [])
  const playersAll = useMemo(()=> seats.map((id:string)=>state.players[id]).filter((p:any)=>!!p), [state])
  const alivePlayers = playersAll.filter((p:any)=>!p.eliminated)
  const eliminated = playersAll.filter((p:any)=>p.eliminated)
  const activeIds = new Set(alivePlayers.map((p:any)=>p.uid))
  const ackedActive = Object.keys(state?.acks ?? {}).filter(id=>activeIds.has(id)).length
  const totalActive = alivePlayers.length
  const usedSet = new Set((state?.highlights ?? []) as Card[])
  const displayName = (p:any)=>{
    if (!p) return ''
    if (p.nickname && p.nickname.trim()) return p.nickname.trim()
    const idx = Math.max(0, seats.indexOf(p.uid))
    return `Player ${idx+1}`
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Game <span className="text-sky-400">{code}</span></h2><div className="text-sm text-slate-400">Round {state?.roundNumber ?? 1}</div></div>
      </div>
      {(!awaitingAck && isTurn) && (
        <div className="card">
          <div className="mb-3">
            {state?.lastDeclaration ? <div className="text-slate-300"><b>{displayName(state.players[state.lastBy])}</b>: <b>{state.players[state.lastBy]?.lastCall}</b></div> : <div className="text-slate-400">No declaration yet this round.</div>}
          </div>
          <div className="space-y-3">
            <div className="glass p-3 rounded-xl">
              <h4 className="font-semibold mb-2">Declare a Hand</h4>
              <HandPicker disabled={!isTurn} previous={state?.lastDeclaration ?? null} onPick={async(d)=>{ try{ await declareHand(code,uid,d) }catch(e:any){ alert(e.message||String(e)) } }} />
              {state?.lastDeclaration && (<div className="mt-3"><button className="btn-danger" onClick={async()=>{ try{ await callBS(code,uid) }catch(e:any){ alert(e.message||String(e)) } }}>Call BS</button></div>)}
            </div>
          </div>
        </div>
      )}
      {awaitingAck && (
        <div className="card">
          <div className="mb-2 text-sm text-slate-200" dangerouslySetInnerHTML={{__html: state?.bsMessage || ''}} />
          <button className="btn" onClick={()=>ackNextRound(code,uid)}>{state?.status==='ended' ? `Back to Lobby (${ackedActive}/${totalActive})` : `Next Round (${ackedActive}/${totalActive})`}</button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {alivePlayers.map((p:any)=>{
          const isMe=p.uid===uid; const glow=state?.turn===p.uid && !awaitingAck
          const countClass = p.cardCount>=4 ? 'text-rose-400 font-semibold' : 'text-slate-400'
          return (
            <div key={p.uid} className={`card min-h-[220px] ${glow?'ring-2 ring-sky-400 animate-glow':''}`}>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{displayName(p)}</div>
                <div className={`text-xs ${countClass}`}>{`${p.cardCount} cards`}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {p.cards.map((c:Card,i:number)=>(<CardFace key={i} card={c} hidden={(!isMe && !reveal)} highlight={reveal && usedSet.has(c)} />))}
              </div>
              {p.lastCall && <div className="text-xs text-slate-300 mt-3"><b>{p.lastCall}</b></div>}
            </div>
          )
        })}
      </div>
      {eliminated.length>0 && (
        <div className="card">
          <div className="font-semibold mb-2">Eliminated</div>
          <ul className="text-sm text-slate-300 space-y-1">
            {eliminated.map((p:any)=> <li key={p.uid}>{displayName(p)} {p.place ? <span className="text-xs text-slate-400">({p.place})</span> : null}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
