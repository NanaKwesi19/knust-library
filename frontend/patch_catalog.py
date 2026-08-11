import os

catalog_path = "C:/Users/hp/knust-library/frontend/src/components/layout/modules/CatalogExplorer.tsx"
with open(catalog_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make the Reserve button always visible and change the text to "Request to Borrow"
old_button = """                {book.availableCopies === 0 && (
                  <button
                    onClick={() => reserveMutation.mutate(book.id)}
                    disabled={reserveMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {reserveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                    Reserve Book
                  </button>
                )}"""

new_button = """                <button
                  onClick={() => reserveMutation.mutate(book.id)}
                  disabled={reserveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#800020] hover:bg-[#66001a] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {reserveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
                  Request to Borrow
                </button>"""

if "Reserve Book" in content:
    content = content.replace(old_button, new_button)
    with open(catalog_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched CatalogExplorer.")
else:
    print("Already patched or could not find old button.")
