import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useSearchProducts } from '../hooks/useProducts'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const groupOnly = params.get('group') === '1'
  const { data: results = [], isLoading } = useSearchProducts(q, groupOnly)

  return (
    <div className="p-3">
      <h1 className="text-lg font-bold mb-3">
        {q ? `« ${q} »` : groupOnly ? 'Offres groupées' : 'Tous les produits'}
      </h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] rounded-xl skeleton" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Aucun résultat</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
