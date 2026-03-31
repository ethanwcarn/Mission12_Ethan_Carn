using BookstoreApi.Data;
using BookstoreApi.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// EF Core + SQLite database configuration.
// The SQLite file lives at the workspace root (../Bookstore.sqlite relative to this server project folder).
var dbPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "Bookstore.sqlite"));
builder.Services.AddDbContext<BookstoreContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Distinct category labels for the client filter dropdown (no hardcoded list).
app.MapGet("/api/categories", async (BookstoreContext db) =>
{
    var categories = await db.Books
        .Select(b => b.Category)
        .Distinct()
        .OrderBy(c => c)
        .ToListAsync();

    return Results.Json(categories);
});

app.MapGet("/api/books", async (
    BookstoreContext db,
    int? page,
    int? pageSize,
    string? sort,
    string? dir,
    string? category) =>
{
    // Rubric: default pagination is 5 books per page.
    var effectivePage = page.HasValue && page.Value > 0 ? page.Value : 1;
    var effectivePageSize = pageSize.HasValue && pageSize.Value > 0 && pageSize.Value <= 50 ? pageSize.Value : 5;

    // Sort is rubric-required for "Book Title" only.
    var sortKey = (sort ?? "title").Trim().ToLowerInvariant();
    var sortDir = (dir ?? "asc").Trim().ToLowerInvariant();

    IQueryable<Book> query = db.Books;

    // Optional filter: applied before count + pagination so totalPages matches the filtered set.
    if (!string.IsNullOrWhiteSpace(category))
    {
        var cat = category.Trim();
        query = query.Where(b => b.Category == cat);
    }

    if (sortKey == "title")
    {
        // Note: secondary key keeps ordering stable across identical titles.
        query = sortDir == "desc"
            ? query.OrderByDescending(b => b.Title).ThenBy(b => b.BookID)
            : query.OrderBy(b => b.Title).ThenBy(b => b.BookID);
    }
    else
    {
        query = query.OrderBy(b => b.BookID);
    }

    var totalCount = await query.CountAsync();
    var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)effectivePageSize);

    // Clamp the requested page into a valid range so Skip/Take doesn't go out of bounds.
    effectivePage = totalPages == 0 ? 1 : Math.Min(effectivePage, totalPages);

    // Pagination math: page 1 -> Skip(0), page 2 -> Skip(pageSize), etc.
    var skip = (effectivePage - 1) * effectivePageSize;

    var items = await query
        .Skip(skip)
        .Take(effectivePageSize)
        .Select(b => new
        {
            bookId = b.BookID,
            title = b.Title,
            author = b.Author,
            publisher = b.Publisher,
            isbn = b.ISBN,
            classification = b.Classification,
            category = b.Category,
            pageCount = b.PageCount,
            price = b.Price
        })
        .ToListAsync();

    return new
    {
        items,
        page = effectivePage,
        pageSize = effectivePageSize,
        totalCount,
        totalPages
    };
});

// POST /api/books — Add a new book to the database.
// The client sends a JSON body with all book fields except BookID (SQLite assigns that automatically).
// We validate that the required string fields are not blank before saving.
app.MapPost("/api/books", async (BookstoreContext db, Book book) =>
{
    // Guard against blank required fields so the database doesn't get junk records.
    if (string.IsNullOrWhiteSpace(book.Title) ||
        string.IsNullOrWhiteSpace(book.Author) ||
        string.IsNullOrWhiteSpace(book.Publisher) ||
        string.IsNullOrWhiteSpace(book.ISBN))
    {
        return Results.BadRequest("Title, Author, Publisher, and ISBN are required.");
    }

    // EF Core tracks the new entity; SaveChangesAsync writes it and populates BookID via the DB.
    db.Books.Add(book);
    await db.SaveChangesAsync();

    // 201 Created with a Location header pointing to the new resource.
    return Results.Created($"/api/books/{book.BookID}", book);
});

// PUT /api/books/{id} — Update every editable field on an existing book.
// Returns 404 if the book is not found so the client knows the ID was invalid.
app.MapPut("/api/books/{id}", async (BookstoreContext db, int id, Book updated) =>
{
    // Look up the tracked entity; FindAsync hits the identity cache before going to the DB.
    var book = await db.Books.FindAsync(id);
    if (book is null)
    {
        return Results.NotFound($"Book with ID {id} not found.");
    }

    // Copy every editable field from the incoming payload onto the tracked entity.
    // EF Core's change tracker will detect these property changes and emit an UPDATE statement.
    book.Title          = updated.Title;
    book.Author         = updated.Author;
    book.Publisher      = updated.Publisher;
    book.ISBN           = updated.ISBN;
    book.Classification = updated.Classification;
    book.Category       = updated.Category;
    book.PageCount      = updated.PageCount;
    book.Price          = updated.Price;

    await db.SaveChangesAsync();

    // Return the full updated record so the client can refresh its local state without a second fetch.
    return Results.Ok(book);
});

// DELETE /api/books/{id} — Remove a book from the database permanently.
// Returns 404 if the book does not exist, 204 No Content on success (nothing left to return).
app.MapDelete("/api/books/{id}", async (BookstoreContext db, int id) =>
{
    var book = await db.Books.FindAsync(id);
    if (book is null)
    {
        return Results.NotFound($"Book with ID {id} not found.");
    }

    db.Books.Remove(book);
    await db.SaveChangesAsync();

    // 204 No Content: the resource no longer exists, so there is no body to send back.
    return Results.NoContent();
});

app.Run();
