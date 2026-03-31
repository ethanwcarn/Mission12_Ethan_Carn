import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
// JS bundle: needed for interactive components (e.g. Offcanvas toggles via data-bs-toggle) in addition to Toast API usage in BookListPage.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import App from './App.tsx'
import { CartProvider } from './CartProvider.tsx'
import { BookListPage } from './pages/BookListPage.tsx'
import { CartPage } from './pages/CartPage.tsx'
import { AdminBooksPage } from './pages/AdminBooksPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route element={<App />}>
            <Route path="/" element={<BookListPage />} />
            <Route path="/cart" element={<CartPage />} />
            {/* Admin CRUD page — lets staff add, edit, and delete books in the database */}
            <Route path="/adminbooks" element={<AdminBooksPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
)
