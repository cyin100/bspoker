
import { Link } from 'react-router-dom'
export default function NotFound(){
  return (
    <div className="card max-w-xl mx-auto text-center">
      <div className="text-3xl font-black mb-2">404</div>
      <div className="text-slate-300 mb-4">This lobby or page doesn't exist.</div>
      <Link to="/" className="btn">Go Home</Link>
    </div>
  )
}
