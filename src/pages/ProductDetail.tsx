import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProduct } from '../hooks/useProducts'
import { useCartStore } from '../stores/cartStore'
import { Star, ShoppingCart, Minus, Plus, ArrowLeft } from 'lucide-react'
import { useState } from 'react'

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

export default function ProductDetail() {
  const { id } = useParams()
  const { data: product, isLoading } = useProduct(id)
  const addItem = useCartStore((s) => s.addItem)
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Produit introuvable</p>
        <Link to="/" className="text-rose-600 mt-3 inline-block">Retour</Link>
      </div>
    )
  }

  const hasGroup = product.groupPrice && product.groupMin
  const displayPrice = hasGroup ? product.groupPrice! : product.price

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      groupPrice: product.groupPrice,
      image: product.images?.[0] || '',
      shopId: product.shopId,
      shopName: product.shopName,
      stock: product.stock,
    }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-10 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="aspect-square bg-gray-100">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 pb-28">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600">{formatPrice(displayPrice)}</span>
            {hasGroup && (
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          {hasGroup && (
            <p className="text-sm text-amber-600 mt-1 font-medium">
              Prix groupé dès {product.groupMin} pers.
            </p>
          )}
        </div>

        <h1 className="text-lg font-semibold text-gray-900 leading-snug">{product.name}</h1>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {product.rating || '—'}
          </span>
          <span>·</span>
          <span>{product.sold || 0} vendus</span>
          <span>·</span>
          <span className={product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-600' : 'text-red-600'}>
            {product.stock > 0 ? `${product.stock} en stock` : 'Rupture'}
          </span>
        </div>

        {product.shopName && (
          <Link to={`/shop/${product.shopId}`} className="flex items-center gap-2 text-sm text-gray-700 py-2 border-y border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
              {product.shopName[0]}
            </div>
            <span className="font-medium">{product.shopName}</span>
          </Link>
        )}

        {product.description && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-bottom flex items-center gap-3 z-30">
        <div className="flex items-center border border-gray-200 rounded-lg">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-gray-600">
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-medium">{qty}</span>
          <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-10 h-10 flex items-center justify-center text-gray-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={handleAdd}
          disabled={product.stock === 0}
          className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
        >
          <ShoppingCart className="w-5 h-5" />
          {added ? 'Ajouté !' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  )
}
