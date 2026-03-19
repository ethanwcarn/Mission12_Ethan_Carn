using BookstoreApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BookstoreApi.Data;

public class BookstoreContext : DbContext
{
    public BookstoreContext(DbContextOptions<BookstoreContext> options) : base(options)
    {
    }

    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Explicit mapping ensures our EF model matches the pre-populated SQLite schema.
        modelBuilder.Entity<Book>(entity =>
        {
            entity.ToTable("Books");

            entity.HasKey(e => e.BookID);

            entity.Property(e => e.BookID).HasColumnName("BookID");
            entity.Property(e => e.Title).HasColumnName("Title").IsRequired();
            entity.Property(e => e.Author).HasColumnName("Author").IsRequired();
            entity.Property(e => e.Publisher).HasColumnName("Publisher").IsRequired();
            entity.Property(e => e.ISBN).HasColumnName("ISBN").IsRequired();
            entity.Property(e => e.Classification).HasColumnName("Classification").IsRequired();
            entity.Property(e => e.Category).HasColumnName("Category").IsRequired();
            entity.Property(e => e.PageCount).HasColumnName("PageCount").IsRequired();
            entity.Property(e => e.Price).HasColumnName("Price").IsRequired();
        });
    }
}

