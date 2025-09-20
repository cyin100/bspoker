
import { doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore'
import { db } from './firebase'
import type { Card, Declaration, GameState, Rank, Suit } from './types'
import { makeDeck, shuffle, dealOne, dealN } from './deck'
import { canMakeDeclaration, declarationBeats, labelDeclaration, straightSequence } from './evaluator'

export function lobbyRef(code: string) { return doc(db, 'lobbies', code) }

export async function createLobby(code: string, hostUid: string): Promise<void> {
  const now = Date.now()
  const fresh: GameState = {
    status: 'lobby', code, hostUid, createdAt: now,
    maxPlayers: 6, minPlayers: 2, players: {}, seats: [], deck: [],
    turn: null, roundNumber: 0, lastDeclaration: null, lastBy: null, mustDeclareUid: null
  }
  await setDoc(lobbyRef(code), fresh as any)
}

export function subLobby(code: string, cb: (state: GameState | null) => void) {
  return onSnapshot(lobbyRef(code), (snap) => cb(snap.exists() ? (snap.data() as GameState) : null))
}

export async function joinLobby(code: string, uid: string, nickname?: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Lobby not found')
    const g = snap.data() as GameState
    if (g.status !== 'lobby') throw new Error('Game already started')
    if (!g.players[uid] && Object.keys(g.players).length >= g.maxPlayers) throw new Error('Lobby full')
    if (!g.players[uid]) {
      g.players[uid] = { uid, nickname: (nickname ?? '').trim(), joinedAt: Date.now(), ready: false, eliminated: false, cardCount: 1, cards: [], place: null }
    } else {
      if (typeof nickname === 'string' && nickname.trim().length > 0) g.players[uid].nickname = nickname.trim()
    }
    tx.set(ref, g as any)
  })
}

export async function leaveLobby(code: string, uid: string) {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const g = snap.data() as GameState
    if (g.status !== 'lobby') return
    if (g.players[uid]) { delete g.players[uid] }
    tx.set(ref, g as any)
  })
}

export async function toggleReady(code: string, uid: string) {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Lobby not found')
    const g = snap.data() as GameState
    if (g.status !== 'lobby') return
    if (!g.players[uid]) {
      g.players[uid] = { uid, nickname: '', joinedAt: Date.now(), ready: false, eliminated: false, cardCount: 1, cards: [], place: null }
    }
    g.players[uid].ready = !g.players[uid].ready

    const uids = Object.keys(g.players)
    const count = uids.length
    const allReady = uids.every(id => !!g.players[id].ready)
    const allowSolo = import.meta.env.VITE_DEV_SOLO === '1'

    if ((allowSolo && count === 1 && g.players[uid].ready) || (count >= g.minPlayers && count <= g.maxPlayers && allReady)) {
      const seats = uids.sort((a,b)=>(g.players[a].joinedAt??0)-(g.players[b].joinedAt??0))
      g.seats = [...seats]
      let deck = shuffle(makeDeck())
      for (const id of seats) { const {deck:d2, card}=dealOne(deck); deck=d2; g.players[id].cards=[card]; g.players[id].cardCount=1; g.players[id].lastCall=''; g.players[id].eliminated=false; g.players[id].place=null }
      g.deck = deck
      g.roundNumber = 1
      g.status = 'playing'
      g.lastDeclaration = null
      g.lastBy = null
      g.mustDeclareUid = seats[0]
      g.turn = seats[0]
      g.reveal = false
      g.awaitingAck = false
      g.acks = {}
      g.bsMessage = ''
      g.bsCaller = null
      g.bsLoser = null
      g.winnerUid = null
      g.pendingDraw = false
      g.pendingEliminate = false
      g.highlights = []
    }
    tx.set(ref, g as any)
  })
}

function nextActive(g: GameState, afterUid: string): string {
  const active = g.seats.filter(uid => !g.players[uid]?.eliminated)
  const i = active.indexOf(afterUid)
  if (i === -1) return active[0]
  return active[(i + 1) % active.length]
}

function esc(s:string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function nameFor(g: GameState, uid: string): string {
  const p = g.players[uid]
  if (!p) return uid
  if (p.nickname && p.nickname.trim()) return esc(p.nickname.trim())
  const idx = Math.max(0, g.seats.indexOf(uid))
  return `Player ${idx+1}`
}

// Witness selection helpers
function pickWitness(cards: Card[], decl: Declaration): Card[] {
  const pool = [...cards]
  const used: Card[] = []
  const takeWhere = (pred: (c:Card)=>boolean): Card | null => {
    const idx = pool.findIndex(pred)
    if (idx >= 0) { const [c] = pool.splice(idx,1); used.push(c); return c }
    return null
  }
  const takeRank = (r: any) => takeWhere(c=>c[0]===r)
  const takeWild = () => takeWhere(c=>c[0]==='2')
  const needRank = (r:any,n:number) => { for(let i=0;i<n;i++){ if(!takeRank(r)){ if(!takeWild()) return false } } return true }

  switch(decl.kind){
    case 'HIGH': if (!takeRank(decl.rank)) takeWild(); return used
    case 'PAIR': needRank(decl.rank,2); return used
    case 'TRIPS': needRank(decl.rank,3); return used
    case 'QUADS': needRank(decl.rank,4); return used
    case 'FIVE': needRank(decl.rank,5); return used
    case 'SIX': needRank(decl.rank,6); return used
    case 'SEVEN': needRank(decl.rank,7); return used
    case 'EIGHT': needRank(decl.rank,8); return used
    case 'TWO_PAIR': needRank(decl.high,2); needRank(decl.low,2); return used
    case 'FULL_HOUSE': needRank(decl.three,3); needRank(decl.two,2); return used
    case 'STRAIGHT':
    case 'STRAIGHT_FLUSH': {
      const seq = straightSequence(decl.highest)
      if (decl.kind==='STRAIGHT') { for (const r of seq) { if(!takeRank(r)) takeWild() } return used }
      const suits: Suit[] = ['S','H','D','C']
      let bestSuit: Suit | null = null, bestCount = -1
      for (const s of suits) {
        const count = cards.filter(c => c[1]===s && seq.includes(c[0] as any) && c[0] !== '2').length
        if (count > bestCount) { bestCount = count; bestSuit = s }
      }
      const suit = bestSuit || 'S'
      for (const r of seq) {
        if (!takeWhere(c => c[1]===suit && c[0]===r && c[0]!=='2')) {
          if (!takeWhere(c => c[0]===r && c[0]!=='2')) takeWild()
        }
      }
      return used
    }
  }
}

export async function declareHand(code: string, uid: string, decl: Declaration) {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Lobby not found')
    const g = snap.data() as GameState
    if (g.turn !== uid) throw new Error('Not your turn')
    if (g.mustDeclareUid && g.mustDeclareUid !== uid) throw new Error('Waiting for required player to declare')
    if (g.lastDeclaration && !declarationBeats(g.lastDeclaration, decl)) throw new Error('Must beat previous declaration')
    g.lastDeclaration = decl
    g.lastBy = uid
    g.players[uid].lastCall = labelDeclaration(decl)
    g.mustDeclareUid = null
    g.turn = nextActive(g, uid)
    g.highlights = []
    tx.set(ref, g as any)
  })
}

export async function callBS(code: string, uid: string) {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Lobby not found')
    const g = snap.data() as GameState
    if (g.turn !== uid) throw new Error('Not your turn')
    if (!g.lastDeclaration || !g.lastBy) throw new Error('Nothing to BS: someone must declare first')

    const allCards = Object.values(g.players).flatMap(p => p.cards)
    const truthful = canMakeDeclaration(allCards, g.lastDeclaration)
    const loserUid = truthful ? uid : g.lastBy

    const willEliminate = (g.players[loserUid].cardCount + 1) >= 5
    const active = g.seats.filter(s => !g.players[s].eliminated)
    const activeAfter = willEliminate ? active.filter(a => a !== loserUid) : active
    const gameEnded = activeAfter.length === 1
    const winnerUid = gameEnded ? activeAfter[0] : null

    const callerName = nameFor(g, uid)
    const lastByName = nameFor(g, g.lastBy!)
    const handText = esc(g.players[g.lastBy!]?.lastCall || 'a hand')

    let msg = `<span class="text-slate-200"><b>${callerName}</b> called BS on <b>${lastByName}</b> who declared <b class="text-sky-300">${handText}</b>. The hand <b class="${truthful?'':''}">${truthful?'could be made':'could not be made'}</b> from the board. <b class="text-rose-300">${nameFor(g, truthful ? uid : g.lastBy!)}</b> lost a life.</span>`
    if (willEliminate) msg += ` <span class="text-rose-300"><b>${nameFor(g, truthful ? uid : g.lastBy!)}</b> is eliminated.</span>`
    if (gameEnded && winnerUid) {
      const winnerName = nameFor(g, winnerUid)
      msg += `<div class="mt-3 font-extrabold text-amber-300">🏆 ${winnerName} won the game! 🏆</div>`
    }

    g.reveal = true
    g.awaitingAck = true
    g.acks = {}
    g.bsMessage = msg
    g.bsCaller = uid
    g.bsLoser = loserUid
    g.pendingDraw = true
    g.pendingEliminate = willEliminate
    g.turn = null
    g.highlights = truthful ? pickWitness(allCards, g.lastDeclaration) : []

    if (gameEnded) { g.status = 'ended'; g.winnerUid = winnerUid }
    tx.set(ref, g as any)
  })
}

export async function ackNextRound(code: string, uid: string) {
  await runTransaction(db, async (tx) => {
    const ref = lobbyRef(code)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Lobby not found')
    const g = snap.data() as GameState
    if (!g.awaitingAck) return
    g.acks = g.acks || {}
    g.acks[uid] = true

    const activeIds = g.seats.filter(id => !g.players[id]?.eliminated)
    const ackedActive = Object.keys(g.acks).filter(id => activeIds.includes(id)).length
    const activeCount = activeIds.length
    const allowSolo = import.meta.env.VITE_DEV_SOLO === '1'
    const everyoneAcked = ackedActive >= activeCount || (allowSolo && ackedActive >= 1)

    if (everyoneAcked) {
      if (g.status === 'ended' && g.winnerUid) {
        // Reset to lobby
        g.status = 'lobby'
        g.seats = []
        g.turn = null
        g.roundNumber = 0
        g.lastDeclaration = null
        g.lastBy = null
        g.mustDeclareUid = null
        g.reveal = false
        g.awaitingAck = false
        g.acks = {}
        g.bsMessage = ''
        g.bsLoser = null
        g.bsCaller = null
        g.winnerUid = null
        g.deck = []
        g.pendingDraw = false
        g.pendingEliminate = false
        g.highlights = []
        for (const id of Object.keys(g.players)) {
          g.players[id].cards = []
          g.players[id].cardCount = 1
          g.players[id].lastCall = ''
          g.players[id].eliminated = false
          g.players[id].place = null
          g.players[id].ready = false
        }
      } else {
        if (g.pendingDraw && g.bsLoser) {
          g.players[g.bsLoser].cardCount += 1
          if (g.pendingEliminate || g.players[g.bsLoser].cardCount >= 5) {
            g.players[g.bsLoser].eliminated = true
            g.players[g.bsLoser].place = (Object.values(g.players).filter(p => p.eliminated).length)
          }
        }
        let deck = shuffle(makeDeck())
        for (const id of g.seats) {
          const p = g.players[id]
          if (p.eliminated) { p.cards = []; continue }
          const { deck: d2, hand } = dealN(deck, p.cardCount)
          deck = d2; p.cards = hand
        }
        g.deck = deck

        const active = g.seats.filter(s => !g.players[s].eliminated)
        const starter = (g.bsLoser && !g.players[g.bsLoser]?.eliminated) ? g.bsLoser : active[(active.indexOf(g.bsLoser || '') + 1) % active.length] || active[0]
        g.roundNumber += 1
        g.lastDeclaration = null
        g.lastBy = null
        for (const id of g.seats) g.players[id].lastCall = ''
        g.mustDeclareUid = starter
        g.turn = starter
        g.reveal = false
        g.awaitingAck = false
        g.acks = {}
        g.bsMessage = ''
        g.pendingDraw = false
        g.pendingEliminate = false
        g.bsLoser = null
        g.bsCaller = null
        g.highlights = []
      }
    }
    tx.set(ref, g as any)
  })
}
