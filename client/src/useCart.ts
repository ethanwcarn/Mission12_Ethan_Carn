import { useContext } from 'react'
import { CartContext, type CartContextValue } from './cartContext'

// Consumer hook for cart state (must be under <CartProvider> in main.tsx).
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
