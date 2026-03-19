# Mission 11 Local Verification Checklist

## 1) “Program Runs Without Error” (5 points)
1. Start the API:
   - Run: `dotnet run` (in `server/`)
2. Start the React app:
   - Run: `npm run dev` (in `client/`)
3. Confirm there are no runtime errors:
   - Check the ASP.NET console output for exceptions.
   - Check the browser developer console for errors.

## 2) “Models Match Database” (5 points)
1. Confirm the EF Core model maps to the SQLite table:
   - `server/Data/BookstoreContext.cs` maps `Book` to table `Books`.
2. Confirm all required columns exist in the model:
   - `BookID`, `Title`, `Author`, `Publisher`, `ISBN`, `Classification`, `Category`, `PageCount`, `Price`.

## 3) “App Lists Books” (10 points)
1. Open the React UI in the browser.
2. Verify the table shows a list of all books available in the database (via the API).

## 4) “App Contains Dynamic Pagination” (15 points)
1. Verify the pagination controls are based on API metadata:
   - The number of pages should reflect `totalPages` returned by `/api/books`.
2. Set page size to a different value (e.g., `10` or `20`) and confirm:
   - The pagination updates.
   - The page contents match the selected page.

## 5) “App Allows User to Sort Books” (5 points)
1. Use the “Sort by Book Title” control.
2. Change between Ascending and Descending.
3. Confirm the rows reorder by `Title` immediately after the change.

## 6) “App is Styled with Bootstrap” (5 points)
1. Verify the layout uses Bootstrap styles:
   - Container spacing (`container`, `py-4`)
   - Table styling (`table`, `table-striped`, etc.)
   - Pagination styling (`pagination`, `page-link`)

## 7) Rubric Final Requirement: Ignore `node_modules/`
1. Verify root `.gitignore` includes:
   - `node_modules/`

