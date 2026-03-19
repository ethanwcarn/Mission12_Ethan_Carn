namespace BookstoreApi.Models;

public class Book
{
    // Matches the SQLite table's primary key column name: BookID
    public int BookID { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Publisher { get; set; } = string.Empty;
    public string ISBN { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;

    // Database has both "Classification" and "Category".
    public string Category { get; set; } = string.Empty;

    public int PageCount { get; set; }
    public decimal Price { get; set; }
}

