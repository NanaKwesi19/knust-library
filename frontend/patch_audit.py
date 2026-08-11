path = "C:/Users/hp/knust-library/frontend/src/components/admin/audit/AuditLogs.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("id: number; fullName: string; role: string", "id: number; fullName: string; role: string; email?: string; studentId?: string")
content = content.replace("log.user?.studentId", "(log.user as any)?.studentId")
content = content.replace("log.user?.email", "(log.user as any)?.email")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
