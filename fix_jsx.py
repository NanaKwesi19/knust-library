import os

catalog_path = "C:/Users/hp/knust-library/frontend/src/components/layout/modules/CatalogExplorer.tsx"
with open(catalog_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the broken div structure
broken_block = """                {book.publisher && (
                  <p className="text-[10px] text-slate-400">Publisher: {book.publisher} {book.publishYear && `(${book.publishYear})`}</p>
                )}
              </div>
              </div>
              </div>
              <div className="text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500">
                Shelf: {book.shelfLocation}
              </div>
            </div>"""

fixed_block = """                {book.publisher && (
                  <p className="text-[10px] text-slate-400">Publisher: {book.publisher} {book.publishYear && `(${book.publishYear})`}</p>
                )}
              </div>
              </div>
              <div className="text-xs font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500 shrink-0 mt-4 md:mt-0">
                Shelf: {book.shelfLocation}
              </div>
            </div>"""

if broken_block in content:
    content = content.replace(broken_block, fixed_block)
    with open(catalog_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed div structure!")
else:
    print("Could not find the broken block!")
