
import { useState } from 'react'
export default function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),1200) }} className="btn-secondary ml-2">
      {ok ? 'Copied!' : 'Copy'}
    </button>
  )
}
