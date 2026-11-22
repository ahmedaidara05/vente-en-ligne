import { useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../hooks/useProducts'

const NAMES: Record<string, string> = {
  electronique: 'Électronique',
  mode: 'Mode',
  maison: 'Maison',
  beaute: 'Beauté',
  alimentation: 'Alimentation',
  sport: 'Sport',
}

export default function CategoryPage() {
  const { slug } = useParams()
  const { data: products = [], isLoading } = useProducts({ category: slug })

  return (
    <div className="p-3">
      <h1 className="text-xl font-bold mb-4">{NAMES[slug || ''] || slug}</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] rounded-xl skeleton" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="text-gray-400 text-center py-12">Aucun produit</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
