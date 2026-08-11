import os

path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "const students = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' }, include: { loans: true, fines: true } });"
replacement = "const students = await prisma.user.findMany({ where: { role: 'STUDENT', status: 'ACTIVE' }, include: { loans: { include: { fines: true } } } });"
content = content.replace(target, replacement)

target2 = "const hasDebt = student.fines.some((f: any) => f.status === 'UNPAID') || student.loans.some((l: any) => l.status === 'OVERDUE' || l.status === 'BORROWED');"
replacement2 = "const hasDebt = student.loans.some((l: any) => l.status === 'OVERDUE' || l.status === 'BORROWED' || l.fines.some((f: any) => f.status === 'UNPAID'));"
content = content.replace(target2, replacement2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("cron.ts fixed")
