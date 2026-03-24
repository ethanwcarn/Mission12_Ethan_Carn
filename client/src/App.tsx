import { Link, Outlet, useLocation } from 'react-router-dom'
import { saveBookListReturnSearch } from './cartStorage'

// Shell with nav: when opening Cart from the book list, stash the current ?query so /cart can
// "Continue shopping" back to the same page, filters, and sort.
function Layout() {
  const location = useLocation()

  const handleCartNavClick = () => {
    if (location.pathname === '/') {
      saveBookListReturnSearch(location.search)
    }
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand" to="/">
            Bookstore
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" to="/">
              Books
            </Link>
            <Link className="nav-link" to="/cart" onClick={handleCartNavClick}>
              Cart
            </Link>
          </div>
        </div>
      </nav>
      <Outlet />
    </>
  )
}

export default function App() {
  return <Layout />
}
