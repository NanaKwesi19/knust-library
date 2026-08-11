import os

admin_types_path = "C:/Users/hp/knust-library/frontend/src/types/admin.ts"
with open(admin_types_path, "r", encoding="utf-8") as f:
    content = f.read()

if "coverImage?:" not in content:
    content = content.replace("  pages?: number;", "  pages?: number;\n  coverImage?: string;\n  coverUrl?: string;")
    with open(admin_types_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched admin.ts types.")
else:
    print("Already patched admin.ts types.")
