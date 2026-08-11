import os

admin_types_path = "C:/Users/hp/knust-library/frontend/src/types/admin.ts"
with open(admin_types_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("coverImage?: string | null;", "coverImage?: string | null;\n  coverUrl?: string | null;")
with open(admin_types_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched coverUrl into admin.ts")
