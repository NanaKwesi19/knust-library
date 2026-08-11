import os

# 1. Patch Book Routes (backend)
book_routes_path = "C:/Users/hp/knust-library/backend/src/routes/book.routes.ts"
with open(book_routes_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make it save to coverImage as well
if "coverUrl: coverUrl || null," in content and "coverImage: coverUrl || null," not in content:
    content = content.replace(
        "coverUrl: coverUrl || null,",
        "coverUrl: coverUrl || null,\n        coverImage: coverUrl || null,"
    )
    with open(book_routes_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched book.routes.ts")

# 2. Patch Reservation Management (frontend)
res_mgmt_path = "C:/Users/hp/knust-library/frontend/src/components/admin/reservations/ReservationManagement.tsx"
with open(res_mgmt_path, "r", encoding="utf-8") as f:
    res_content = f.read()

old_cancel = "API.patch(`/rooms/reservations/${reservationId}/cancel`)"
new_cancel = "API.patch(`/reservations/${reservationId}/status`, { status: 'CANCELLED' })"

old_fulfill = "API.patch(`/rooms/reservations/${reservationId}/fulfill`)"
new_fulfill = "API.patch(`/reservations/${reservationId}/status`, { status: 'FULFILLED' })"

if old_fulfill in res_content:
    res_content = res_content.replace(old_cancel, new_cancel).replace(old_fulfill, new_fulfill)
    with open(res_mgmt_path, "w", encoding="utf-8") as f:
        f.write(res_content)
    print("Patched ReservationManagement.tsx")

# 3. Patch Catalog Explorer to show Images (frontend)
catalog_path = "C:/Users/hp/knust-library/frontend/src/components/layout/modules/CatalogExplorer.tsx"
with open(catalog_path, "r", encoding="utf-8") as f:
    cat_content = f.read()

# Add coverImage to Book interface
if "coverImage?: string;" not in cat_content:
    cat_content = cat_content.replace(
        "totalCopies: number;",
        "coverImage?: string;\n  coverUrl?: string;\n  totalCopies: number;"
    )

# Add image rendering in the list
old_card_header = """            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-1">"""

new_card_header = """            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
              <div className="flex flex-col md:flex-row gap-5 flex-1">
                <div className="shrink-0">
                  {book.coverImage || book.coverUrl ? (
                    <img src={book.coverImage || book.coverUrl} alt={book.title} className="w-24 h-36 object-cover rounded-lg shadow-sm border border-slate-200" />
                  ) : (
                    <div className="w-24 h-36 bg-slate-100 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
              <div className="space-y-1">"""

if old_card_header in cat_content:
    cat_content = cat_content.replace(old_card_header, new_card_header)
    # We also need to close the extra div added
    old_shelf = """              <div className="text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500">
                Shelf: {book.shelfLocation}
              </div>
            </div>"""
    new_shelf = """              </div>
              </div>
              <div className="text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500">
                Shelf: {book.shelfLocation}
              </div>
            </div>"""
    cat_content = cat_content.replace(old_shelf, new_shelf)
    
    with open(catalog_path, "w", encoding="utf-8") as f:
        f.write(cat_content)
    print("Patched CatalogExplorer.tsx for images")
