import os

# 1. Patch OpenLibrarySearch.tsx
path_openlib = "C:/Users/hp/knust-library/frontend/src/components/admin/openlibrary/OpenLibrarySearch.tsx"
with open(path_openlib, 'r', encoding='utf-8') as f:
    content = f.read()

# Add API import
if "import API from" not in content:
    content = content.replace("import { useToast } from '../../../hooks/useToast';", "import { useToast } from '../../../hooks/useToast';\nimport API from '../../../services/api';")

# Uncomment and fix endpoint
old_comment = "// await API.post('/books/import', bookData);"
new_code = "await API.post('/books/import-open-library', bookData);"
content = content.replace(old_comment, new_code)

with open(path_openlib, 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Patch Login.tsx
path_login = "C:/Users/hp/knust-library/frontend/src/pages/Login.tsx"
with open(path_login, 'r', encoding='utf-8') as f:
    login_content = f.read()

old_footer = """            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">"""

new_footer = """            {/* Registration Link */}
            <div className="mt-6 text-center">
              <span className="text-xs font-semibold text-slate-500">
                Don't have an account?{' '}
                <a href="/register" className="text-[#7A1C2C] hover:text-[#5A0A16] font-bold hover:underline transition-all">
                  Register here
                </a>
              </span>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">"""

login_content = login_content.replace(old_footer, new_footer)

with open(path_login, 'w', encoding='utf-8') as f:
    f.write(login_content)

print("Frontend patched successfully.")
