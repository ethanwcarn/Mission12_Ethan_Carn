import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CartContext } from './cartContext'
import { loadCartFromStorage, saveCartToStorage, type CartLine } from './cartStorage'

// Holds shopping-cart state in React and mirrors it to sessionStorage so the cart survives
// route changes and reloads within the same tab (assignment: persist while navigating the site).
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => loadCartFromStorage())

  useEffect(() => {
    saveCartToStorage(lines)
  }, [lines])

  // Adding the same book again merges into the existing line (increment quantity) instead of duplicating rows.
  const addItem = useCallback((book: { bookId: number; title: string; price: number }) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.bookId === book.bookId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 }
        return next
      }
      return [...prev, { ...book, quantity: 1 }]
    })
  }, [])

  // Quantity at or below zero removes the line (same as "empty" for that book).
  const setLineQuantity = useCallback((bookId: number, quantity: number) => {
    const q = Math.floor(quantity)
    if (q <= 0) {
      setLines((prev) => prev.filter((l) => l.bookId !== bookId))
      return
    }
    setLines((prev) => prev.map((l) => (l.bookId === bookId ? { ...l, quantity: q } : l)))
  }, [])

  const removeLine = useCallback((bookId: number) => {
    setLines((prev) => prev.filter((l) => l.bookId !== bookId))
  }, [])

  const totalItemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])
  const totalPrice = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines])

  const value = useMemo(
    () => ({
      lines,
      addItem,
      setLineQuantity,
      removeLine,
      totalItemCount,
      totalPrice,
    }),
    [lines, addItem, setLineQuantity, removeLine, totalItemCount, totalPrice],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
