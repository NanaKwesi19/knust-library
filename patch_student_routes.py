import os

routes_path = "C:/Users/hp/knust-library/backend/src/routes/student.routes.ts"
with open(routes_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      coverImage: book.coverImage,
      description: book.description,"""
new_block = """      coverImage: book.coverImage,
      coverUrl: book.coverUrl,
      description: book.description,"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(routes_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched student.routes.ts")
else:
    print("Could not find the block in student.routes.ts")
