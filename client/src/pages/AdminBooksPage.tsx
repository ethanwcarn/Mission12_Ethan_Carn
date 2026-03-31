import { useCallback, useEffect, useState } from 'react'

// Shape of a book record returned by the API.
// Mirrors the anonymous projection in Program.cs's GET /api/books endpoint.
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

// Shape of the controlled form — all strings so <input> values are always strings.
// We convert pageCount and price to numbers only when sending to the API.
type BookFormData = {
  title: string
  author: string
  publisher: string
  isbn: string
  classification: string
  category: string
  pageCount: string
  price: string
}

// A blank form used to reset state after a save or cancel.
const emptyForm: BookFormData = {
  title: '',
  author: '',
  publisher: '',
  isbn: '',
  classification: '',
  category: '',
  pageCount: '',
  price: '',
}

// Converts a Book record into the string-based form shape for controlled inputs.
function bookToForm(b: Book): BookFormData {
  return {
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    isbn: b.isbn,
    classification: b.classification,
    category: b.category,
    pageCount: String(b.pageCount),
    price: String(b.price),
  }
}

export function AdminBooksPage() {
  // Full list of books displayed in the admin table. Fetched on mount and re-fetched after every mutation.
  const [books, setBooks] = useState<Book[]>([])

  // Loading/error state for the initial book list fetch.
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When editingBook is non-null we are in "edit mode" — the form is pre-populated with that book's data
  // and Save will call PUT instead of POST. null means we are adding a brand-new book.
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  // Controlled form state for all input fields.
  const [formData, setFormData] = useState<BookFormData>(emptyForm)

  // Tracks whether a save (POST/PUT) or delete (DELETE) request is in-flight so we can disable buttons.
  const [saving, setSaving] = useState(false)

  // Feedback message shown to the user after a successful or failed mutation.
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null)

  // Fetches all books from the API and updates the table. Uses a large pageSize so we get every
  // book in one request rather than paging through them in the admin view.
  const fetchBooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/books?pageSize=200&sort=title&dir=asc')
      if (!res.ok) throw new Error(`Failed to load books (${res.status})`)
      const data = (await res.json()) as { items: Book[] }
      setBooks(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error loading books')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch the book list once when the component first mounts.
  useEffect(() => {
    void fetchBooks()
  }, [fetchBooks])

  // Generic change handler for all form inputs — reads the field name from the input's `name` attribute
  // and updates just that key in formData, leaving all other fields unchanged.
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Resets the form to a blank state and exits edit mode. Called by the Cancel button and
  // after a successful save so the form is ready for the next operation.
  const resetForm = () => {
    setFormData(emptyForm)
    setEditingBook(null)
  }

  // Populates the form with an existing book's data and enters edit mode.
  // Called when the user clicks the Edit button on a table row.
  const handleEditClick = (book: Book) => {
    setEditingBook(book)
    setFormData(bookToForm(book))
    // Scroll the form into view so the user sees it filled in.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Submits the form. Decides whether to POST (add) or PUT (update) based on editingBook.
  // Validates that required fields are non-empty before sending the request.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    // Client-side guard — mirrors the server-side validation in Program.cs.
    if (!formData.title.trim() || !formData.author.trim() || !formData.publisher.trim() || !formData.isbn.trim()) {
      setFeedback({ type: 'danger', message: 'Title, Author, Publisher, and ISBN are required.' })
      return
    }

    // Build the JSON body. pageCount and price are stored as numbers in the database,
    // so we parse them out of their string form here before sending.
    const payload = {
      title: formData.title.trim(),
      author: formData.author.trim(),
      publisher: formData.publisher.trim(),
      isbn: formData.isbn.trim(),
      classification: formData.classification.trim(),
      category: formData.category.trim(),
      pageCount: parseInt(formData.pageCount, 10) || 0,
      price: parseFloat(formData.price) || 0,
    }

    setSaving(true)
    try {
      if (editingBook) {
        // Edit mode: PUT to update the existing book by its ID.
        const res = await fetch(`/api/books/${editingBook.bookId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Update failed (${res.status})`)
        setFeedback({ type: 'success', message: `"${payload.title}" updated successfully.` })
      } else {
        // Add mode: POST to create a new book. The server assigns the BookID.
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Create failed (${res.status})`)
        setFeedback({ type: 'success', message: `"${payload.title}" added successfully.` })
      }

      // After a successful save, reset the form and refresh the table so the change is visible.
      resetForm()
      await fetchBooks()
    } catch (e) {
      setFeedback({ type: 'danger', message: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Deletes a book after asking the user to confirm. Uses the browser's built-in confirm dialog
  // so no extra modal state is needed for a simple destructive action.
  const handleDeleteClick = async (book: Book) => {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return

    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/books/${book.bookId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setFeedback({ type: 'success', message: `"${book.title}" deleted.` })

      // If we were editing the book that just got deleted, clear the form too.
      if (editingBook?.bookId === book.bookId) resetForm()

      await fetchBooks()
    } catch (e) {
      setFeedback({ type: 'danger', message: e instanceof Error ? e.message : 'Delete failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Admin – Manage Books</h1>

      {/* ── Add / Edit Form ─────────────────────────────────────────────────────
          When editingBook is set the heading and Save button label change to reflect
          edit mode. Cancel clears the form and returns to add mode. */}
      <div className="card shadow-sm mb-5">
        <div className="card-header bg-dark text-white">
          <h2 className="h5 mb-0">{editingBook ? `Editing: ${editingBook.title}` : 'Add New Book'}</h2>
        </div>
        <div className="card-body">
          {/* Feedback alert shown after a mutation attempt (success or error). */}
          {feedback && (
            <div className={`alert alert-${feedback.type} alert-dismissible`} role="alert">
              {feedback.message}
              <button type="button" className="btn-close" onClick={() => setFeedback(null)} aria-label="Close" />
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)}>
            {/* Two-column layout on medium+ screens to keep the form compact. */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="title">Title <span className="text-danger">*</span></label>
                <input
                  id="title"
                  name="title"
                  className="form-control"
                  value={formData.title}
                  onChange={handleFormChange}
                  placeholder="Book title"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="author">Author <span className="text-danger">*</span></label>
                <input
                  id="author"
                  name="author"
                  className="form-control"
                  value={formData.author}
                  onChange={handleFormChange}
                  placeholder="Author name"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="publisher">Publisher <span className="text-danger">*</span></label>
                <input
                  id="publisher"
                  name="publisher"
                  className="form-control"
                  value={formData.publisher}
                  onChange={handleFormChange}
                  placeholder="Publisher name"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="isbn">ISBN <span className="text-danger">*</span></label>
                <input
                  id="isbn"
                  name="isbn"
                  className="form-control"
                  value={formData.isbn}
                  onChange={handleFormChange}
                  placeholder="ISBN"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="classification">Classification</label>
                <input
                  id="classification"
                  name="classification"
                  className="form-control"
                  value={formData.classification}
                  onChange={handleFormChange}
                  placeholder="e.g. Fiction"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="category">Category</label>
                <input
                  id="category"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleFormChange}
                  placeholder="e.g. Mystery"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="pageCount">Page Count</label>
                <input
                  id="pageCount"
                  name="pageCount"
                  type="number"
                  min={1}
                  className="form-control"
                  value={formData.pageCount}
                  onChange={handleFormChange}
                  placeholder="0"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label" htmlFor="price">Price ($)</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step={0.01}
                  className="form-control"
                  value={formData.price}
                  onChange={handleFormChange}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Action buttons: Save submits the form; Cancel resets it without saving. */}
            <div className="mt-4 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editingBook ? 'Update Book' : 'Add Book'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Books Table ─────────────────────────────────────────────────────────
          Shows every book with Edit (warning) and Delete (danger) buttons per row. */}
      <h2 className="h4 mb-3">All Books ({books.length})</h2>

      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}

      {loading ? (
        <p className="text-muted">Loading books…</p>
      ) : books.length === 0 ? (
        <div className="alert alert-info">No books in the database.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Publisher</th>
                <th>ISBN</th>
                <th>Classification</th>
                <th>Category</th>
                <th>Pages</th>
                <th>Price</th>
                {/* Action column — no visible header needed, screen readers get aria-labels on buttons */}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr
                  key={b.bookId}
                  // Highlight the row currently being edited so the user knows which record the form targets.
                  className={editingBook?.bookId === b.bookId ? 'table-warning' : ''}
                >
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.publisher}</td>
                  <td>{b.isbn}</td>
                  <td>{b.classification}</td>
                  <td>{b.category}</td>
                  <td>{b.pageCount}</td>
                  <td>${b.price.toFixed(2)}</td>
                  <td className="text-nowrap">
                    {/* Edit: populates the form above with this book's current data */}
                    <button
                      type="button"
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => handleEditClick(b)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    {/* Delete: asks for confirmation before permanently removing the record */}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => void handleDeleteClick(b)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
