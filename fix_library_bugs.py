import os

# 1. Fix backend import (isbn required, category mapping, adding copies)
book_routes_path = "C:/Users/hp/knust-library/backend/src/routes/book.routes.ts"
with open(book_routes_path, "r", encoding="utf-8") as f:
    backend_content = f.read()

# Replace the req.body destructuring and book creation
old_backend_destruct = "const { title, author, isbn, publishedYear, coverUrl, openLibraryKey } = req.body;"
new_backend_destruct = "const { title, author, isbn, publishedYear, coverUrl, openLibraryKey, genre } = req.body;"

old_backend_create = """    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        publishYear: publishedYear || null,
        coverUrl: coverUrl || null,
        coverImage: coverUrl || null,
        openLibraryKey: openLibraryKey || null,
        category: 'Uncategorized',
        publisher: null,
        shelfLocation: 'Unknown',
      },
    });"""

new_backend_create = """    const fallbackIsbn = isbn || `OL-${openLibraryKey || Date.now()}`;
    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn: fallbackIsbn,
        publishYear: publishedYear || null,
        coverUrl: coverUrl || null,
        coverImage: coverUrl || null,
        openLibraryKey: openLibraryKey || null,
        category: genre || 'Uncategorized',
        publisher: null,
        shelfLocation: 'New Arrivals',
        copies: {
          create: [
            { barcode: `LIB-${Date.now().toString().slice(-6)}-1` },
            { barcode: `LIB-${Date.now().toString().slice(-6)}-2` },
            { barcode: `LIB-${Date.now().toString().slice(-6)}-3` }
          ]
        }
      },
    });"""

if old_backend_destruct in backend_content and old_backend_create in backend_content:
    backend_content = backend_content.replace(old_backend_destruct, new_backend_destruct)
    backend_content = backend_content.replace(old_backend_create, new_backend_create)
    with open(book_routes_path, "w", encoding="utf-8") as f:
        f.write(backend_content)
    print("Patched backend book.routes.ts for ISBN, categories, and stock copies.")
else:
    print("Could not find exact text in backend book.routes.ts")


# 2. Fix BookInventory.tsx images
inventory_path = "C:/Users/hp/knust-library/frontend/src/components/admin/inventory/BookInventory.tsx"
with open(inventory_path, "r", encoding="utf-8") as f:
    inv_content = f.read()

# I need to add coverImage/coverUrl to the Book interface if not there
if "coverImage?: string;" not in inv_content:
    inv_content = inv_content.replace(
        "totalCopies: number;",
        "coverImage?: string;\n  coverUrl?: string;\n  totalCopies: number;"
    )

# And render the image in the table rows
old_title_col = """                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{book.title}</span>
                      <span className="text-xs text-slate-500">{book.author}</span>
                    </div>
                  </td>"""

new_title_col = """                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {book.coverImage || book.coverUrl ? (
                        <img src={book.coverImage || book.coverUrl} alt={book.title} className="w-10 h-14 object-cover rounded shadow-sm border border-slate-200" />
                      ) : (
                        <div className="w-10 h-14 bg-slate-100 rounded shadow-sm border border-slate-200 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 max-w-[200px] truncate" title={book.title}>{book.title}</span>
                        <span className="text-xs text-slate-500 max-w-[200px] truncate">{book.author}</span>
                      </div>
                    </div>
                  </td>"""

if old_title_col in inv_content:
    # Need to make sure BookOpen icon is imported
    if "BookOpen" not in inv_content:
        inv_content = inv_content.replace("import {", "import {\n  BookOpen,")
        
    inv_content = inv_content.replace(old_title_col, new_title_col)
    with open(inventory_path, "w", encoding="utf-8") as f:
        f.write(inv_content)
    print("Patched BookInventory.tsx with images.")
else:
    print("Could not find table row in BookInventory.tsx")
