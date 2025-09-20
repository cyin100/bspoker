
import type { Card, Declaration, Rank, Suit } from './types'
import { RANKS } from './deck'
const IDX: Record<Rank, number> = Object.fromEntries(RANKS.map((r,i)=>[r,i])) as any

const disp = (r:Rank)=> r==='T' ? '10' : r
const plural = (r:Rank)=> `${disp(r)}s`
const straightLabel = (hi: Rank) => {
  if (hi==='5') return 'A-5'
  const end = IDX[hi]; const start = end - 4
  const seq = RANKS.slice(start, end+1).map(disp)
  return `${seq[0]}-${seq[4]}`
}

const countMap = (cs:Card[]) => { const m=new Map<Rank,number>(); for(const c of cs){const r=c[0] as Rank; m.set(r,(m.get(r)||0)+1)} return m }
const wild = (cs:Card[])=>cs.filter(c=>c[0]==='2').length

export function canMakeDeclaration(cards:Card[], d:Declaration):boolean{
  const wc=wild(cards), counts=countMap(cards); const cnt=(r:Rank)=>counts.get(r)||0
  const need=(r:Rank,n:number)=> (r==='2'? wc>=n : cnt(r)+wc>=n)
  const needWild=(r:Rank,n:number)=> Math.max(0, n - (r==='2'?0:cnt(r)))
  const straight=(hi:Rank)=>{
    if (hi==='5'){ // A-5 wheel
      const ranks: Rank[] = ['A','2','3','4','5']
      let have=0; for(const r of ranks) if(r!=='2'&&cnt(r)>0) have++
      return wc >= (5-have)
    }
    const end=IDX[hi]; if(end<4) return false
    const seq=RANKS.slice(end-4,end+1)
    let have=0; for(const r of seq) if(r!=='2'&&cnt(r)>0) have++
    return wc >= (5-have)
  }
  const sflush=(hi:Rank)=>{
    const suits:Suit[] = ['S','H','D','C']
    const seq = hi==='5' ? (['A','2','3','4','5'] as Rank[]) : (():Rank[]=>{ const end=IDX[hi]; if(end<4) return []; return RANKS.slice(end-4,end+1) as Rank[] })()
    if (seq.length===0) return false
    for(const s of suits){
      const sc:Record<Rank,number>=Object.fromEntries(RANKS.map(r=>[r,0])) as any; let sw=0
      for(const c of cards) if(c[1]===s){ if(c[0]==='2') sw++; else sc[c[0] as Rank]++ }
      let have=0; for(const r of seq) if(r!=='2'&&sc[r]>0) have++
      if (sw >= (5-have)) return true
    }
    return false
  }
  switch(d.kind){
    case 'HIGH': return need(d.rank,1)
    case 'PAIR': return need(d.rank,2)
    case 'TWO_PAIR': if(d.high===d.low) return false; return wc >= (needWild(d.high,2)+needWild(d.low,2))
    case 'TRIPS': return need(d.rank,3)
    case 'STRAIGHT': return straight(d.highest)
    case 'FULL_HOUSE': if(d.three===d.two) return false; return wc >= (needWild(d.three,3)+needWild(d.two,2))
    case 'QUADS': return need(d.rank,4)
    case 'STRAIGHT_FLUSH': return sflush(d.highest)
    case 'FIVE': return need(d.rank,5)
    case 'SIX': return need(d.rank,6)
    case 'SEVEN': return need(d.rank,7)
    case 'EIGHT': return need(d.rank,8)
  }
}

export function declarationBeats(prev:Declaration|null, next:Declaration):boolean{
  if(!prev) return true
  const BASE:any={'HIGH':0,'PAIR':1,'TWO_PAIR':2,'TRIPS':3,'STRAIGHT':4,'FULL_HOUSE':5,'QUADS':6,'STRAIGHT_FLUSH':7,'FIVE':8,'SIX':9,'SEVEN':10,'EIGHT':11}
  const r=(x:Rank)=>IDX[x]
  const score=(d:Declaration)=>{
    switch(d.kind){
      case 'HIGH': return [BASE.HIGH, r(d.rank)]
      case 'PAIR': return [BASE.PAIR, r(d.rank)]
      case 'TWO_PAIR': return [BASE.TWO_PAIR, r(d.high), r(d.low)]
      case 'TRIPS': return [BASE.TRIPS, r(d.rank)]
      case 'STRAIGHT': return [BASE.STRAIGHT, r(d.highest)]
      case 'FULL_HOUSE': return [BASE.FULL_HOUSE, r(d.three), r(d.two)]
      case 'QUADS': return [BASE.QUADS, r(d.rank)]
      case 'STRAIGHT_FLUSH': return [BASE.STRAIGHT_FLUSH, r(d.highest)]
      case 'FIVE': return [BASE.FIVE, r(d.rank)]
      case 'SIX': return [BASE.SIX, r(d.rank)]
      case 'SEVEN': return [BASE.SEVEN, r(d.rank)]
      case 'EIGHT': return [BASE.EIGHT, r(d.rank)]
    }
  }
  const a = score(next) as number[]
  const b = score(prev) as number[]
  for (let i=0;i<Math.max(a.length,b.length);i++){
    const ai = a[i] ?? -1, bi = b[i] ?? -1
    if (ai===bi) continue
    return ai > bi
  }
  return false
}

export function labelDeclaration(d:Declaration):string{
  switch(d.kind){
    case 'HIGH': return `High Card, ${disp(d.rank)}`
    case 'PAIR': return `Pair, ${plural(d.rank)}`
    case 'TWO_PAIR': return `Two Pair, ${plural(d.high)} and ${plural(d.low)}`
    case 'TRIPS': return `Trips, ${plural(d.rank)}`
    case 'STRAIGHT': return `Straight, ${straightLabel(d.highest)}`
    case 'FULL_HOUSE': return `Full House, ${plural(d.three)} full of ${plural(d.two)}`
    case 'QUADS': return `Quads, ${plural(d.rank)}`
    case 'STRAIGHT_FLUSH': return `Straight Flush, ${straightLabel(d.highest)}`
    case 'FIVE': return `5OAK, ${plural(d.rank)}`
    case 'SIX': return `6OAK, ${plural(d.rank)}`
    case 'SEVEN': return `7OAK, ${plural(d.rank)}`
    case 'EIGHT': return `8OAK, ${plural(d.rank)}`
  }
}

export function straightSequence(highest: Rank): Rank[] {
  if (highest==='5') return ['A','2','3','4','5'] as Rank[]
  const end = IDX[highest]; const start=end-4
  return RANKS.slice(start, end+1) as Rank[]
}
