
import type { Card, Rank, Suit } from './types'
export const RANKS: Rank[] = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
export const SUITS: Suit[] = ['S','H','D','C']
export function makeDeck(): Card[] { const d: Card[] = []; for (const r of RANKS) for (const s of SUITS) d.push(`${r}${s}` as Card); return d }
export function shuffle<T>(arr:T[]):T[]{ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a }
export function dealOne(deck:Card[]){ if(!deck.length) throw new Error('Deck empty'); const [card,...rest]=deck; return {deck:rest, card} }
export function dealN(deck:Card[], n:number){ let d=deck; const hand:Card[]=[]; for(let i=0;i<n;i++){ const t=dealOne(d); d=t.deck; hand.push(t.card) } return { deck:d, hand } }
export function cardToDeckApiCode(c: Card){ const rank = c[0]==='T'?'0':c[0]; const suit=c[1]; return `${rank}${suit}` }
export const CARD_BACK_URL='https://deckofcardsapi.com/static/img/back.png'
export function cardImageURL(c: Card){ return `https://deckofcardsapi.com/static/img/${cardToDeckApiCode(c)}.png` }
