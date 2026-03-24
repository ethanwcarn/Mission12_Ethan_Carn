import { useNavigate } from 'react-router-dom'
import { readBookListReturnSearch } from '../cartStorage'
import { useCart } from '../useCart'

// Full cart: line subtotals (price × qty), grand totals, and "Continue shopping" which sends the
// user back to / with the saved query string from cartStorage (set when they last left the book list).
export function CartPage() {
  const navigate = useNavigate()
  const { lines, setLineQuantity, removeLine, totalItemCount, totalPrice } = useCart()

  const continueShopping = () => {
    const raw = readBookListReturnSearch()
    // React Router wants `search` with a leading `?`; sessionStorage may store `location.search` as-is.
    const search = raw.startsWith('?') ? raw : raw ? `?${raw}` : ''
    navigate({ pathname: '/', search })
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Shopping cart</h1>

      {lines.length === 0 ? (
        <div className="alert alert-info">
          Your cart is empty.{' '}
          <button type="button" className="btn btn-link p-0 align-baseline" onClick={continueShopping}>
            Continue shopping
          </button>
        </div>
      ) : (
        <>
          <div className="table-responsive mb-4">
            <table className="table table-striped align-middle">
              <thead>
                <tr>
                  <th>Title</th>
                  <th className="text-end">Unit price</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-end">Subtotal</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const subtotal = line.price * line.quantity
                  return (
                    <tr key={line.bookId}>
                      <td>{line.title}</td>
                      <td className="text-end">${line.price.toFixed(2)}</td>
                      <td className="text-center" style={{ maxWidth: '12rem' }}>
                        <input
                          type="number"
                          className="form-control form-control-sm mx-auto"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => setLineQuantity(line.bookId, Number(e.target.value))}
                          aria-label={`Quantity for ${line.title}`}
                        />
                      </td>
                      <td className="text-end">${subtotal.toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeLine(line.bookId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="row justify-content-end">
            <div className="col-md-5 col-lg-4">
              <div className="card shadow-sm">
                <div className="card-body">
                  <p className="mb-2 d-flex justify-content-between">
                    <span className="text-muted">Total items</span>
                    <strong>{totalItemCount}</strong>
                  </p>
                  <p className="mb-3 d-flex justify-content-between">
                    <span className="text-muted">Total</span>
                    <strong>${totalPrice.toFixed(2)}</strong>
                  </p>
                  <div className="d-grid gap-2">
                    <button type="button" className="btn btn-primary" onClick={continueShopping}>
                      Continue shopping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
