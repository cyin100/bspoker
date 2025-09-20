
import type { Card } from '../lib/types'
import { cardImageURL, CARD_BACK_URL } from '../lib/deck'
import clsx from 'classnames'
export default function CardFace({ card, hidden=false, highlight=false }: { card: Card, hidden?: boolean, highlight?: boolean }) {
  const url = hidden ? CARD_BACK_URL : cardImageURL(card)
  return (
    <img
      src={url}
      alt={hidden ? 'Card back' : card}
      className={clsx("w-16 h-24 rounded-xl border shadow-soft object-cover", hidden ? "border-slate-700" : "border-slate-300", highlight && !hidden ? "highlight" : "")}
    />
  )
}
