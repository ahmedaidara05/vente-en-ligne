import { useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useProducts } from '../hooks/useProducts'
import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Shop } from '../types'

export default function ShopPage() {
  const { id } = useParams()
  const { data: shop } = useQuery({
    queryKey: ['shop', id],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'shops', id!))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Shop
    },
  })
  const { data: products = [], isLoading } = useProducts({ shopId: id })

  return (
    <div>
      <div className="bg-white p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {shop?.logo ? (
            <img src={shop.logo} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold">
              {shop?.name?.[0] || '?'}
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg">{shop?.name || 'Boutique'}</h1>
            {shop?.description && <p className="text-sm text-gray-500">{shop.description}</p>}
          </div>
        </div>
      </div>
      <div className="p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[3/4] rounded-xl skeleton" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-400 py-12">Aucun produit</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
