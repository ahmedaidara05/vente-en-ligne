import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

export default function Header() {
  const totalItems = useCartStore((s) => s.totalItems())
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 bg-rose-600 text-white safe-top shadow-md">
      <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center gap-2">
        <Link to="/" className="font-bold text-lg tracking-tight shrink-0">
          Vente<span className="text-rose-200">Ligne</span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 rounded-full text-sm text-gray-900 bg-white/95 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </form>

        <div className="flex items-center gap-1">
          <Link to="/cart" className="relative p-2 rounded-full hover:bg-rose-500 transition">
            <ShoppingCart className="w-5 h-5" />
            {totalItems() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-rose-900 text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {totalItems() > 99 ? '99+' : totalItems()}
              </span>
            )}
          </Link>
          <Link to={user ? '/profile' : '/login'} className="p-2 rounded-full hover:bg-rose-500 transition">
            {user && profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
