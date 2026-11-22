import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../hooks/useProducts'
import { ChevronRight } from 'lucide-react'

const CATEGORIES = [
  { name: 'Électronique', icon: '📱', slug: 'electronique' },
  { name: 'Mode', icon: '👗', slug: 'mode' },
  { name: 'Maison', icon: '🏠', slug: 'maison' },
  { name: 'Beauté', icon: '💄', slug: 'beaute' },
  { name: 'Alimentation', icon: '🍎', slug: 'alimentation' },
  { name: 'Sport', icon: '⚽', slug: 'sport' },
]

export default function Home() {
  const { data: products = [], isLoading } = useProducts({ limit: 20 })
  const groupDeals = products.filter(p => p.groupPrice)

  return (
    <div className="pb-4">
      <div className="bg-rose-600 text-white px-4 py-5">
        <h1 className="text-xl font-bold">VenteLigne</h1>
        <p className="text-rose-100 text-sm mt-0.5">Prix groupés · Livraison rapide</p>
      </div>

      <section className="px-3 py-4">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} to={`/category/${cat.slug}`} className="flex flex-col items-center shrink-0 w-16">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-2xl">
                {cat.icon}
              </div>
              <span className="text-[11px] mt-1.5 text-gray-700 text-center leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {groupDeals.length > 0 && (
        <section className="px-3 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Offres groupées</h2>
            <Link to="/search?group=1" className="text-xs text-rose-600 flex items-center">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {groupDeals.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="px-3">
        <h2 className="font-bold text-gray-900 mb-3">Tous les produits</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] rounded-xl skeleton" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Aucun produit pour le moment</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
