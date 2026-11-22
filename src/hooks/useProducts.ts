import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Product } from '../types'

export function useProducts(options?: { category?: string; shopId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let q = query(collection(db, 'products'), where('isActive', '==', true), orderBy('createdAt', 'desc'))
      if (options?.category) {
        q = query(collection(db, 'products'), where('isActive', '==', true), where('category', '==', options.category), orderBy('createdAt', 'desc'))
      }
      if (options?.shopId) {
        q = query(collection(db, 'products'), where('isActive', '==', true), where('shopId', '==', options.shopId), orderBy('createdAt', 'desc'))
      }
      if (options?.limit) {
        q = query(q, limit(options.limit))
      }
      try {
        const snap = await getDocs(q)
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
      } catch {
        const snap = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)))
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
        if (options?.category) list = list.filter(p => p.category === options.category)
        if (options?.shopId) list = list.filter(p => p.shopId === options.shopId)
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        if (options?.limit) list = list.slice(0, options.limit)
        return list
      }
    },
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null
      const snap = await getDoc(doc(db, 'products', id))
      if (!snap.exists()) return null
      return { id: snap.id, ...snap.data() } as Product
    },
  })
}

export function useSearchProducts(q: string, groupOnly = false) {
  return useQuery({
    queryKey: ['search', q, groupOnly],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'products'), where('isActive', '==', true)))
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
      if (groupOnly) list = list.filter(p => p.groupPrice)
      if (q) {
        const lower = q.toLowerCase()
        list = list.filter(p =>
          p.name?.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.shopName?.toLowerCase().includes(lower) ||
          p.category?.toLowerCase().includes(lower)
        )
      }
      return list
    },
  })
}
