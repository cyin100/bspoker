
export type Suit = 'S'|'H'|'D'|'C'
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A'
export type Card = `${Rank}${Suit}`
export type Declaration =
  | { kind:'HIGH'; rank:Rank }
  | { kind:'PAIR'; rank:Rank }
  | { kind:'TWO_PAIR'; high:Rank; low:Rank }
  | { kind:'TRIPS'; rank:Rank }
  | { kind:'STRAIGHT'; highest:Rank }
  | { kind:'STRAIGHT_FLUSH'; highest:Rank }
  | { kind:'FULL_HOUSE'; three:Rank; two:Rank }
  | { kind:'QUADS'; rank:Rank }
  | { kind:'FIVE'|'SIX'|'SEVEN'|'EIGHT'; rank:Rank }
export type GameState = {
  status:'lobby'|'playing'|'ended'
  code:string
  hostUid:string
  createdAt:number
  maxPlayers:number
  minPlayers:number
  players:Record<string,{
    uid:string
    nickname:string
    joinedAt:number
    ready?:boolean
    eliminated?:boolean
    place?:number|null
    lastCall?:string
    cardCount:number
    cards:Card[]
  }>
  seats:string[]
  deck:Card[]
  turn:string|null
  roundNumber:number
  lastDeclaration:Declaration|null
  lastBy:string|null
  mustDeclareUid:string|null
  reveal?:boolean
  awaitingAck?:boolean
  acks?:Record<string,boolean>
  bsMessage?:string
  bsCaller?:string|null
  bsLoser?:string|null
  winnerUid?:string|null
  pendingDraw?:boolean
  pendingEliminate?:boolean
  highlights?:Card[]
}
