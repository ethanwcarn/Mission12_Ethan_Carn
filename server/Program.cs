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

app.MapGet("/api/books", async (
    BookstoreContext db,
    int? page,
    int? pageSize,
    string? sort,
    string? dir) =>
{
    // Rubric: default pagination is 5 books per page.
    var effectivePage = page.HasValue && page.Value > 0 ? page.Value : 1;
    var effectivePageSize = pageSize.HasValue && pageSize.Value > 0 && pageSize.Value <= 50 ? pageSize.Value : 5;

    // Sort is rubric-required for "Book Title" only.
    var sortKey = (sort ?? "title").Trim().ToLowerInvariant();
    var sortDir = (dir ?? "asc").Trim().ToLowerInvariant();

    IQueryable<Book> query = db.Books;

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

app.Run();
