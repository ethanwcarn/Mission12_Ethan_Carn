import { useEffect, useMemo, useState } from 'react'

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

function App() {
  const [items, setItems] = useState<Book[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageSizeOptions = useMemo(() => [5, 10, 20], [])
  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchBooks() {
      setLoading(true)
      setError(null)

      try {
        // Comment: we map React pagination/sort state directly into the API query params.
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          sort: 'title',
          dir: sortDir,
        })

        const res = await fetch(`/api/books?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`)
        }

        const data = (await res.json()) as BooksApiResponse
        setItems(data.items)
        setPage(data.page)
        setPageSize(data.pageSize)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void fetchBooks()
    return () => controller.abort()
  }, [page, pageSize, sortDir])

  return (
    <div className="container py-4">
      <h1 className="mb-1">Online Bookstore</h1>
      <p className="text-muted">Pagination and sorting powered by the `/api/books` endpoint.</p>

      <div className="d-flex flex-wrap align-items-end gap-3 my-4">
        <div>
          <label className="form-label mb-1">Results per page</label>
          <select
            className="form-select"
            value={pageSize}
            onChange={(e) => {
              // Keep pagination in range when changing page size.
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label mb-1">Sort by Book Title</label>
          <select className="form-select" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}>
            <option value="asc">Ascending (A-Z)</option>
            <option value="desc">Descending (Z-A)</option>
          </select>
        </div>

        <div className="ms-auto text-end">
          <div className="text-muted">Total books: {totalCount}</div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Books pagination">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </button>
              </li>

              {/*
                Comment: pagination controls are generated dynamically from `totalPages`,
                so they expand/contract based on the dataset size.
              */}
              {pages.map((p) => (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>
                    {p}
                  </button>
                </li>
              ))}

              <li className={`page-item ${totalPages > 0 && page >= totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  )
}

export default App
