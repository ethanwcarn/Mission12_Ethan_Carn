// sessionStorage helpers for Mission 12: cart lines persist for the browser tab/session while
// navigating between routes; the "return search" string remembers the book list query string
// (page, filters, sort) so "Continue shopping" can restore that view from the cart page.
const CART_KEY = 'bookstore-cart'
const RETURN_SEARCH_KEY = 'bookstore-return-search'

export type CartLine = {
  bookId: number
  title: string
  price: number
  quantity: number
}

export function loadCartFromStorage(): CartLine[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is CartLine =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as CartLine).bookId === 'number' &&
        typeof (row as CartLine).title === 'string' &&
        typeof (row as CartLine).price === 'number' &&
        typeof (row as CartLine).quantity === 'number',
    )
  } catch {
    return []
  }
}

export function saveCartToStorage(lines: CartLine[]): void {
  sessionStorage.setItem(CART_KEY, JSON.stringify(lines))
}

// Call when the user leaves the book list for /cart (nav link or "View cart") so we can
// navigate back to the same ?page=&category=&… state from the cart page.
export function saveBookListReturnSearch(search: string): void {
  sessionStorage.setItem(RETURN_SEARCH_KEY, search)
}

export function readBookListReturnSearch(): string {
  return sessionStorage.getItem(RETURN_SEARCH_KEY) ?? ''
}
