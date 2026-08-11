import os

inventory_path = "C:/Users/hp/knust-library/frontend/src/components/admin/inventory/BookInventory.tsx"
with open(inventory_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add view state
if "const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');" not in content:
    content = content.replace("  const [showImportModal, setShowImportModal] = useState(false);",
                              "  const [showImportModal, setShowImportModal] = useState(false);\n  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');")

# 2. Add LayoutGrid and List icons to import
if "LayoutGrid," not in content:
    content = content.replace("Pencil, // ADDED", "Pencil, // ADDED\n  LayoutGrid,\n  List,")

# 3. Add the toggle button next to the search/filter controls
old_filter_block = """      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title, author, or ISBN..."
          className="flex-1"
        />
        <FilterSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
          placeholder="Category"
          className="w-full sm:w-44"
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          placeholder="Status"
          className="w-full sm:w-44"
        />
      </motion.div>"""

new_filter_block = """      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title, author, or ISBN..."
          className="flex-1 w-full"
        />
        <div className="flex gap-2 w-full sm:w-auto">
          <FilterSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            placeholder="Category"
            className="flex-1 sm:w-36"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="Status"
            className="flex-1 sm:w-36"
          />
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>"""

content = content.replace(old_filter_block, new_filter_block)

# 4. Modify the render logic
old_table_block = """            <>
              <DataTable
                columns={columns}
                data={books}
                keyExtractor={(row) => row.id}
              />
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">"""

new_table_block = """            <>
              {viewMode === 'list' ? (
                <DataTable
                  columns={columns}
                  data={books}
                  keyExtractor={(row) => row.id}
                />
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.map((book) => {
                      const available = book.copies.filter(c => c.status === 'AVAILABLE').length;
                      return (
                        <div key={book.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col group relative">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 z-10">
                            <button
                              onClick={() => setEditingBook(book)}
                              className="h-8 w-8 rounded-lg bg-white shadow flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit Book"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setBookToDelete(book);
                                setShowDeleteConfirm(true);
                              }}
                              className="h-8 w-8 rounded-lg bg-white shadow flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete Book"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="h-56 bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer" onClick={() => setViewingBook(book)}>
                            {book.coverImage || book.coverUrl ? (
                              <img
                                src={book.coverImage || book.coverUrl || undefined}
                                alt={book.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <BookOpen className="w-12 h-12 text-slate-300" />
                            )}
                          </div>
                          
                          <div className="flex-1 cursor-pointer" onClick={() => setViewingBook(book)}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-bold uppercase tracking-wide truncate max-w-[120px]" title={book.category}>
                                {book.category}
                              </span>
                              {available > 0 ? (
                                <Badge variant="success" size="sm" dot>In Stock</Badge>
                              ) : (
                                <Badge variant="warning" size="sm" dot>Out</Badge>
                              )}
                            </div>
                            
                            <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1" title={book.title}>{book.title}</h3>
                            <p className="text-[11px] text-slate-500 mb-2 truncate" title={book.author}>
                              {book.author}
                            </p>
                            
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[10px] font-mono text-slate-400">{book.isbn}</span>
                              <span className="text-[10px] font-bold text-slate-600">{available}/{book.copies.length} avail</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">"""

content = content.replace(old_table_block, new_table_block)

with open(inventory_path, "w", encoding="utf-8") as f:
    f.write(content)
print("BookInventory refactored to support Grid Layout!")
