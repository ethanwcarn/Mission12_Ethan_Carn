import { Toast } from 'bootstrap'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { saveBookListReturnSearch } from '../cartStorage'
import { useCart } from '../useCart'

// Book list: URL query string is the source of truth for page, page size, sort direction, and
// category filter (?page=&pageSize=&dir=&category=). That keeps filters/bookmarking in sync and
// lets "Continue shopping" from the cart restore this exact view. Changing category or page
// size resets to page 1 so we do not request an out-of-range page. The API filters before it
// counts and pages, so totalPages/totalCount match the selected category; pagination links are
// built from that filtered total. If the server clamps page (e.g. fewer pages after a filter),
// we write the corrected page/pageSize back into the URL.
//
// === TWO NEW BOOTSTRAP COMPONENTS (not covered in class videos) ===
// 1. Bootstrap Toast  — "Added to cart" notification (see <div class="toast-container"> below)
//    Uses the Bootstrap Toast JS API: Toast.getOrCreateInstance(el).show()
// 2. Bootstrap Offcanvas — mobile cart-summary drawer (see <div class="offcanvas offcanvas-end"> below)
//    Toggled via data-bs-toggle="offcanvas" / data-bs-target="#cartOffcanvas"
// Both components are imported from 'bootstrap/dist/js/bootstrap.bundle.min.js' in main.tsx.

type Book = {
  bookId: number
  title: string
  author: string
  publisher: string
  isbn: string
  classification: string
  category: string
  pageCount: number
  price: number
}

type BooksApiResponse = {
  items: Book[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

// Reads the book-list state from the current location search string with safe defaults.
function parseBookListSearchParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  let pageSize = parseInt(searchParams.get('pageSize') || '5', 10)
  if (!PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number])) {
    pageSize = 5
  }
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const category = searchParams.get('category') ?? ''
  return { page, pageSize, sortDir, category }
}

export function BookListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, pageSize, sortDir, category } = useMemo(
    () => parseBookListSearchParams(searchParams),
    [searchParams],
  )

  // Updates the URL query; category "" means "all" and removes the category param.
  const mergeParams = useCallback(
    (patch: Partial<{ page: number; pageSize: number; sortDir: 'asc' | 'desc'; category: string }>) => {
      const next = new URLSearchParams(searchParams)
      const cur = parseBookListSearchParams(next)

      const pageVal = patch.page ?? cur.page
      const pageSizeVal = patch.pageSize ?? cur.pageSize
      const sortDirVal = patch.sortDir ?? cur.sortDir
      const categoryVal = patch.category !== undefined ? patch.category : cur.category

      next.set('page', String(pageVal))
      next.set('pageSize', String(pageSizeVal))
      next.set('dir', sortDirVal)
      if (categoryVal) {
        next.set('category', categoryVal)
      } else {
        next.delete('category')
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const [items, setItems] = useState<Book[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addItem, totalItemCount, totalPrice } = useCart()
  const toastRef = useRef<HTMLDivElement | null>(null)

  const showAddedToast = useCallback(() => {
    const el = toastRef.current
    if (el) {
      Toast.getOrCreateInstance(el).show()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories', { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as string[]
        setCategories(Array.isArray(data) ? data : [])
      } catch {
        if (!controller.signal.aborted) setCategories([])
      }
    }

    void fetchCategories()
    return () => controller.abort()
  }, [])

  // Refetch whenever the URL-driven book-list state changes; pass category to the API so
  // pagination totals reflect the filtered set.
  useEffect(() => {
    const parsed = parseBookListSearchParams(searchParams)
    const controller = new AbortController()

    async function fetchBooks() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: String(parsed.page),
          pageSize: String(parsed.pageSize),
          sort: 'title',
          dir: parsed.sortDir,
        })
        if (parsed.category) {
          params.set('category', parsed.category)
        }

        const res = await fetch(`/api/books?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`)
        }

        const data = (await res.json()) as BooksApiResponse
        setItems(data.items)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)

        // Server may clamp page when filters shrink the result set; sync URL so UI matches API.
        if (data.page !== parsed.page || data.pageSize !== parsed.pageSize) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('page', String(data.page))
              next.set('pageSize', String(data.pageSize))
              return next
            },
            { replace: true },
          )
        }
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void fetchBooks()
    return () => controller.abort()
  }, [searchParams, setSearchParams])

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  const handleAddToCart = (b: Book) => {
    addItem({ bookId: b.bookId, title: b.title, price: b.price })
    showAddedToast()
  }

  // Persist current list query string when opening the cart from here (pairs with navbar Cart link in App.tsx).
  const cartSummaryInner = (
    <>
      <h2 className="h6 mb-3">Cart summary</h2>
      <p className="mb-1">
        <span className="text-muted">Items in cart:</span>{' '}
        <strong>{totalItemCount}</strong>
      </p>
      <p className="mb-3">
        <span className="text-muted">Subtotal:</span> <strong>${totalPrice.toFixed(2)}</strong>
      </p>
      <Link
        to="/cart"
        className="btn btn-primary w-100"
        onClick={() => saveBookListReturnSearch(window.location.search)}
      >
        View cart
      </Link>
    </>
  )

  return (
    <>
      {/* NEW BOOTSTRAP #1: Toast — "Added to cart" notification */}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        <div
          ref={toastRef}
          id="addToCartToast"
          className="toast"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="toast-header">
            <strong className="me-auto">Bookstore</strong>
            <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close" />
          </div>
          <div className="toast-body">Added to cart.</div>
        </div>
      </div>

      {/* NEW BOOTSTRAP #2: Offcanvas — mobile cart-summary slide-in drawer */}
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="cartOffcanvas" aria-labelledby="cartOffcanvasLabel">
        <div className="offcanvas-header">
          <h2 className="offcanvas-title h5" id="cartOffcanvasLabel">
            Your cart
          </h2>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body">{cartSummaryInner}</div>
      </div>

      <div className="container py-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h1 className="mb-1">Online Bookstore</h1>
            <p className="text-muted mb-0">Filter, paginate, and sort books from the API.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary d-lg-none"
            data-bs-toggle="offcanvas"
            data-bs-target="#cartOffcanvas"
            aria-controls="cartOffcanvas"
          >
            Cart summary
          </button>
        </div>

        <div className="row g-4">
          <div className="col-lg-9">
            <div className="d-flex flex-wrap align-items-end gap-3 mb-4">
              <div>
                <label className="form-label mb-1" htmlFor="filterCategory">
                  Category
                </label>
                <select
                  id="filterCategory"
                  className="form-select"
                  value={category}
                  onChange={(e) => mergeParams({ category: e.target.value, page: 1 })}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label mb-1" htmlFor="pageSize">
                  Results per page
                </label>
                <select
                  id="pageSize"
                  className="form-select"
                  value={pageSize}
                  onChange={(e) => mergeParams({ pageSize: Number(e.target.value), page: 1 })}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label mb-1" htmlFor="sortDir">
                  Sort by Book Title
                </label>
                <select
                  id="sortDir"
                  className="form-select"
                  value={sortDir}
                  onChange={(e) => mergeParams({ sortDir: e.target.value as 'asc' | 'desc' })}
                >
                  <option value="asc">Ascending (A-Z)</option>
                  <option value="desc">Descending (Z-A)</option>
                </select>
              </div>

              <div className="ms-lg-auto text-end">
                <div className="text-muted">Matching books: {totalCount}</div>
                <div className="small">
                  Page {page} of {totalPages || 1}
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-muted">Loading books...</div>
            ) : items.length === 0 ? (
              <div className="alert alert-info">No books found.</div>
            ) : (
              <>
                <div className="table-responsive mb-3">
                  <table className="table table-striped table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Publisher</th>
                        <th>ISBN</th>
                        <th>Classification</th>
                        <th>Category</th>
                        <th>Pages</th>
                        <th>Price</th>
                        <th aria-label="Add to cart" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((b) => (
                        <tr key={b.bookId}>
                          <td>{b.title}</td>
                          <td>{b.author}</td>
                          <td>{b.publisher}</td>
                          <td>{b.isbn}</td>
                          <td>{b.classification}</td>
                          <td>{b.category}</td>
                          <td>{b.pageCount}</td>
                          <td>${b.price.toFixed(2)}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-success" onClick={() => handleAddToCart(b)}>
                              Add to cart
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav aria-label="Books pagination">
                  <ul className="pagination justify-content-center flex-wrap">
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => mergeParams({ page: Math.max(1, page - 1) })}
                        disabled={page <= 1}
                      >
                        Prev
                      </button>
                    </li>

                    {pages.map((p) => (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button type="button" className="page-link" onClick={() => mergeParams({ page: p })}>
                          {p}
                        </button>
                      </li>
                    ))}

                    <li className={`page-item ${totalPages > 0 && page >= totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => mergeParams({ page: Math.min(totalPages, page + 1) })}
                        disabled={totalPages > 0 && page >= totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </>
            )}
          </div>

          <aside className="col-lg-3 d-none d-lg-block">
            <div className="card shadow-sm sticky-top" style={{ top: '1rem' }}>
              <div className="card-body">{cartSummaryInner}</div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
