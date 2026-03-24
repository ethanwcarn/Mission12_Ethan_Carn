import { createContext } from 'react'
import type { CartLine } from './cartStorage'

// Shared cart shape for CartProvider + useCart (kept in a .ts file so the hook can live separately for Fast Refresh lint rules).
export type CartContextValue = {
  lines: CartLine[]
  addItem: (book: { bookId: number; title: string; price: number }) => void
  setLineQuantity: (bookId: number, quantity: number) => void
  removeLine: (bookId: number) => void
  totalItemCount: number
  totalPrice: number
}

export const CartContext = createContext<CartContextValue | null>(null)
