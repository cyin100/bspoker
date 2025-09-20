
import { useMemo, useState } from 'react'
import type { Declaration, Rank } from '../lib/types'
import { RANKS } from '../lib/deck'
import { declarationBeats } from '../lib/evaluator'
type Props = { onPick: (d: Declaration) => void; disabled?: boolean; previous?: Declaration | null }

const BASE: Record<Declaration['kind'], number> = { 'HIGH':0,'PAIR':1,'TWO_PAIR':2,'TRIPS':3,'STRAIGHT':4,'FULL_HOUSE':5,'QUADS':6,'STRAIGHT_FLUSH':7,'FIVE':8,'SIX':9,'SEVEN':10,'EIGHT':11 } as any
const ORDER: Declaration['kind'][] = ['HIGH','PAIR','TWO_PAIR','TRIPS','STRAIGHT','FULL_HOUSE','QUADS','STRAIGHT_FLUSH','FIVE','SIX','SEVEN','EIGHT']
const idx = (r:Rank)=>RANKS.indexOf(r)

const STRAIGHT_HIGHS: Rank[] = ['5','6','7','8','9','T','J','Q','K','A'] as Rank[]
const straightLabel = (hi: Rank) => {
  if (hi==='5') return 'A-5'
  const end = idx(hi); const start = end - 4
  const seq = RANKS.slice(start, end+1).map(r => r==='T'?'10':r)
  return `${seq[0]}-${seq[4]}`
}
const rankTxt = (r:Rank)=> r==='T'?'10':r

export default function HandPicker({ onPick, disabled, previous }: Props) {
  const [mode, setMode] = useState<Declaration['kind'] | ''>('')
  const [r1, setR1] = useState<Rank>('A'); const [r2, setR2] = useState<Rank>('K')
  const min = previous ? BASE[previous.kind] : 0

  const kindHasAny = (k: Declaration['kind']): boolean => {
    if (!previous) return true
    const p = previous
    const gt = (a:Rank,b:Rank)=>idx(a)>idx(b)
    if (BASE[k] > BASE[p.kind]) return true
    if (BASE[k] < BASE[p.kind]) return false
    switch(k){
      case 'HIGH': return idx(p.kind==='HIGH'?p.rank:'2' as Rank) < idx('A' as Rank)
      case 'PAIR':
      case 'TRIPS':
      case 'QUADS':
      case 'FIVE':
      case 'SIX':
      case 'SEVEN':
      case 'EIGHT': {
        const ref = (p as any).rank as Rank
        return idx(ref) < idx('A' as Rank)
      }
      case 'STRAIGHT':
      case 'STRAIGHT_FLUSH': {
        const ref = (p as any).highest as Rank
        return ref !== 'A'
      }
      case 'TWO_PAIR': {
        const ph = p.kind==='TWO_PAIR' ? p.high : '2'
        const pl = p.kind==='TWO_PAIR' ? p.low : '2'
        if (idx(ph) < idx('A' as Rank)) return true
        return idx(pl) < idx('K' as Rank)
      }
      case 'FULL_HOUSE': {
        const pt = p.kind==='FULL_HOUSE' ? p.three : '2'
        return idx(pt) < idx('A' as Rank)
      }
    }
  }

  const kinds = useMemo(() => ORDER.filter(k => BASE[k] >= min && kindHasAny(k)), [min, previous])

  const btn = (k: Declaration['kind'], label: string) => (
    <button key={k} onClick={()=>setMode(k)} className={`px-3 py-2 rounded-lg border border-slate-700 hover:border-sky-400 ${mode===k?'bg-slate-800':''}`}>{label}</button>
  )

  const ranks = (vals: Rank[], val: Rank, onPickRank:(r:Rank)=>void) => (
    <div className="grid grid-cols-7 gap-1">{vals.map(r => (
      <button key={r} className={`px-2 py-1 rounded-md border ${val===r?'border-sky-400 bg-slate-800':'border-slate-700 hover:border-sky-400'}`} onClick={()=>onPickRank(r)}>{rankTxt(r)}</button>
    ))}</div>
  )

  const filterRanksForKind = (k: Declaration['kind']): Rank[] => {
    if (!previous) return [...RANKS]
    const gt = (a:Rank,b:Rank)=>idx(a)>idx(b)
    if (k==='HIGH' && previous.kind==='HIGH') return RANKS.filter(r => gt(r, previous.rank))
    if (k==='PAIR' && previous.kind==='PAIR') return RANKS.filter(r => gt(r, previous.rank))
    if (k==='TRIPS' && previous.kind==='TRIPS') return RANKS.filter(r => gt(r, previous.rank))
    if (k==='QUADS' && previous.kind==='QUADS') return RANKS.filter(r => gt(r, previous.rank))
    if ((k==='FIVE' && previous.kind==='FIVE')||(k==='SIX' && previous.kind==='SIX')||(k==='SEVEN' && previous.kind==='SEVEN')||(k==='EIGHT' && previous.kind==='EIGHT')) {
      const ref = (previous as any).rank as Rank
      return RANKS.filter(r => gt(r, ref))
    }
    return [...RANKS]
  }

  const filterStraightHighs = (k:'STRAIGHT'|'STRAIGHT_FLUSH'): Rank[] => {
    if (!previous) return STRAIGHT_HIGHS
    if (previous.kind===k) return STRAIGHT_HIGHS.filter(h => idx(h) > idx(previous.highest))
    return STRAIGHT_HIGHS
  }

  // Two Pair dynamic
  const allowedTwoPairHighs = useMemo(()=>{
    if (!previous || previous.kind!=='TWO_PAIR') return [...RANKS]
    const highs: Rank[] = []
    for (const h of RANKS){
      if (idx(h) > idx(previous.high)) { highs.push(h); continue }
      if (h===previous.high){
        const lows = RANKS.filter(r => r !== h && idx(r) < idx(h) && idx(r) > idx(previous.low))
        if (lows.length>0) highs.push(h)
      }
    }
    return highs
  }, [previous])

  const allowedTwoPairLows = (chosenHigh: Rank) => {
    const lows = RANKS.filter(r => r !== chosenHigh && idx(r) < idx(chosenHigh))
    if (previous?.kind==='TWO_PAIR' && chosenHigh===previous.high) {
      return lows.filter(r => idx(r) > idx(previous.low))
    }
    return lows
  }

  // Full House dynamic
  const allowedFullTrips = useMemo(()=>{
    if (!previous || previous.kind!=='FULL_HOUSE') return [...RANKS]
    const trips: Rank[] = []
    for (const t of RANKS){
      if (idx(t) > idx(previous.three)) { trips.push(t); continue }
      if (t===previous.three){
        const pairs = RANKS.filter(r => r !== t && idx(r) > idx(previous.two))
        if (pairs.length>0) trips.push(t)
      }
    }
    return trips
  }, [previous])

  const allowedFullPair = (chosenThree: Rank) => {
    const pool = RANKS.filter(r => r !== chosenThree)
    if (previous?.kind==='FULL_HOUSE' && chosenThree===previous.three) {
      return pool.filter(r => idx(r) > idx(previous.two))
    }
    return pool
  }

  const can = (d: Declaration) => !previous || declarationBeats(previous, d)
  const submit = (d: Declaration) => { if (disabled) return; if (!can(d)) return; onPick(d); setMode('') }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {kinds.length>0 ? kinds.map(k => btn(k,
          k==='HIGH'?'High Card':
          k==='TRIPS'?'Trips':k==='QUADS'?'Quads':k==='STRAIGHT_FLUSH'?'SF':k==='FULL_HOUSE'?'Full':k==='TWO_PAIR'?'Two Pair':k==='FIVE'?'5OAK':k==='SIX'?'6OAK':k==='SEVEN'?'7OAK':k==='EIGHT'?'8OAK':k==='STRAIGHT'?'Straight':'Pair')) : (
            <div className="text-sm text-slate-400 col-span-full">No higher declaration available. You may only call <b>BS</b>.</div>
          )}
      </div>
      <div className="space-y-3">
        {mode==='HIGH' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('HIGH'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'HIGH',rank:r1})} onClick={()=>submit({kind:'HIGH',rank:r1})}>Declare</button></div></div>)}
        {mode==='PAIR' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('PAIR'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'PAIR',rank:r1})} onClick={()=>submit({kind:'PAIR',rank:r1})}>Declare</button></div></div>)}
        {mode==='TWO_PAIR' && (<div><div className="text-xs mb-1">High Rank</div>{ranks(allowedTwoPairHighs,r1,setR1)}<div className="text-xs mt-3 mb-1">Low Rank</div>{ranks(allowedTwoPairLows(r1),r2,setR2)}<div className="mt-2"><button className="btn" disabled={!can({kind:'TWO_PAIR',high:r1,low:r2})} onClick={()=>submit({kind:'TWO_PAIR',high:r1,low:r2})}>Declare</button></div></div>)}
        {mode==='TRIPS' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('TRIPS'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'TRIPS',rank:r1})} onClick={()=>submit({kind:'TRIPS',rank:r1})}>Declare</button></div></div>)}
        {mode==='STRAIGHT' && (<div><div className="text-xs mb-1">Sequence</div>
          <div className="grid grid-cols-3 gap-1">{filterStraightHighs('STRAIGHT').map(h => (
            <button key={h} className={`px-2 py-1 rounded-md border ${r1===h?'border-sky-400 bg-slate-800':'border-slate-700 hover:border-sky-400'}`} onClick={()=>setR1(h)}>{straightLabel(h)}</button>
          ))}</div>
          <div className="mt-2"><button className="btn" disabled={!can({kind:'STRAIGHT',highest:r1})} onClick={()=>submit({kind:'STRAIGHT',highest:r1})}>Declare</button></div>
        </div>)}
        {mode==='FULL_HOUSE' && (<div><div className="text-xs mb-1">Trips Rank</div>{ranks(allowedFullTrips,r1,setR1)}<div className="text-xs mt-3 mb-1">Pair Rank</div>{ranks(allowedFullPair(r1),r2,setR2)}<div className="mt-2"><button className="btn" disabled={!can({kind:'FULL_HOUSE',three:r1,two:r2})} onClick={()=>submit({kind:'FULL_HOUSE',three:r1,two:r2})}>Declare</button></div></div>)}
        {mode==='QUADS' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('QUADS'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'QUADS',rank:r1})} onClick={()=>submit({kind:'QUADS',rank:r1})}>Declare</button></div></div>)}
        {mode==='STRAIGHT_FLUSH' && (<div><div className="text-xs mb-1">Sequence</div>
          <div className="grid grid-cols-3 gap-1">{filterStraightHighs('STRAIGHT_FLUSH').map(h => (
            <button key={h} className={`px-2 py-1 rounded-md border ${r1===h?'border-sky-400 bg-slate-800':'border-slate-700 hover:border-sky-400'}`} onClick={()=>setR1(h)}>{straightLabel(h)}</button>
          ))}</div>
          <div className="mt-2"><button className="btn" disabled={!can({kind:'STRAIGHT_FLUSH',highest:r1})} onClick={()=>submit({kind:'STRAIGHT_FLUSH',highest:r1})}>Declare</button></div>
        </div>)}
        {mode==='FIVE' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('FIVE'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'FIVE',rank:r1})} onClick={()=>submit({kind:'FIVE',rank:r1})}>Declare</button></div></div>)}
        {mode==='SIX' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('SIX'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'SIX',rank:r1})} onClick={()=>submit({kind:'SIX',rank:r1})}>Declare</button></div></div>)}
        {mode==='SEVEN' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('SEVEN'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'SEVEN',rank:r1})} onClick={()=>submit({kind:'SEVEN',rank:r1})}>Declare</button></div></div>)}
        {mode==='EIGHT' && (<div><div className="text-xs mb-1">Rank</div>{ranks(filterRanksForKind('EIGHT'),r1,setR1)}<div className="mt-2"><button className="btn" disabled={!can({kind:'EIGHT',rank:r1})} onClick={()=>submit({kind:'EIGHT',rank:r1})}>Declare</button></div></div>)}
      </div>
    </div>
  )
}
