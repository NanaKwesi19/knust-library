import os

path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const reshelvedCount = await prisma.bookCopy.updateMany({
        where: { status: 'MAINTENANCE', updatedAt: { lt: twoHoursAgo } },
        data: { status: 'AVAILABLE' }
      });"""

replacement = """      // Batch reshelve all books currently in maintenance (simulating bulk reshelving)
      const reshelvedCount = await prisma.bookCopy.updateMany({
        where: { status: 'MAINTENANCE' },
        data: { status: 'AVAILABLE' }
      });"""

content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("BookCopy updatedAt error fixed")
