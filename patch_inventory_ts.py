import os

inventory_path = "C:/Users/hp/knust-library/frontend/src/components/admin/inventory/BookInventory.tsx"
with open(inventory_path, "r", encoding="utf-8") as f:
    inv_content = f.read()

old_block = """src={row.coverImage || row.coverUrl}"""
new_block = """src={row.coverImage || row.coverUrl || undefined}"""

if old_block in inv_content:
    inv_content = inv_content.replace(old_block, new_block)
    with open(inventory_path, "w", encoding="utf-8") as f:
        f.write(inv_content)
    print("Patched BookInventory.tsx img src successfully.")
else:
    print("Could not find img src in BookInventory.tsx")
