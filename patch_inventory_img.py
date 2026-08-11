import os

inventory_path = "C:/Users/hp/knust-library/frontend/src/components/admin/inventory/BookInventory.tsx"
with open(inventory_path, "r", encoding="utf-8") as f:
    inv_content = f.read()

old_block = """        <div className="flex items-center gap-3">
          <div className="h-10 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate">{row.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{row.author}</div>
          </div>
        </div>"""

new_block = """        <div className="flex items-center gap-3">
          {row.coverImage || row.coverUrl ? (
            <img src={row.coverImage || row.coverUrl} alt={row.title} className="h-12 w-8 object-cover rounded shadow-sm border border-slate-200 shrink-0" />
          ) : (
            <div className="h-12 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs truncate max-w-[200px]" title={row.title}>{row.title}</div>
            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{row.author}</div>
          </div>
        </div>"""

if old_block in inv_content:
    inv_content = inv_content.replace(old_block, new_block)
    with open(inventory_path, "w", encoding="utf-8") as f:
        f.write(inv_content)
    print("Patched BookInventory.tsx table row successfully.")
else:
    print("Could not find table row in BookInventory.tsx")
