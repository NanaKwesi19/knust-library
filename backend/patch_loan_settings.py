import os

path = "C:/Users/hp/knust-library/backend/src/routes/loan.routes.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add fetch for LibrarySetting in overdue
content = content.replace(
    "const now = new Date();",
    "const now = new Date();\n    const settings = await prisma.librarySetting.findFirst() || { fineRatePerDay: 2.0, maxFineAmount: 50.0, loanDurationDays: 14, maxBooksPerStudent: 5, maxBooksPerStaff: 10, renewalLimit: 2 };",
    1 # Only the first one (in overdue)
)
content = content.replace(
    "const fineRate = 2.0; // GH₵2 per day — should come from LibrarySetting in production",
    "const fineRate = settings.fineRatePerDay;"
)
content = content.replace(
    "const fineAmount = Math.min(daysOverdue * fineRate, 50.0);",
    "const fineAmount = Math.min(daysOverdue * fineRate, settings.maxFineAmount);"
)

# 2. Add fetch for LibrarySetting in checkout
content = content.replace(
    "const { studentId, barcode, dueDate } = req.body;",
    "const { studentId, barcode, dueDate } = req.body;\n    const settings = await prisma.librarySetting.findFirst() || { fineRatePerDay: 2.0, maxFineAmount: 50.0, loanDurationDays: 14, maxBooksPerStudent: 5, maxBooksPerStaff: 10, renewalLimit: 2 };"
)
content = content.replace(
    "if (student._count.loans >= 5) {",
    "const limit = student.role === Role.STUDENT ? settings.maxBooksPerStudent : settings.maxBooksPerStaff;\n    if (student._count.loans >= limit) {"
)
content = content.replace(
    "error: 'Student has reached the maximum loan limit (5 books).'",
    "error: `Maximum loan limit reached (${limit} books).`"
)
content = content.replace(
    "new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)",
    "new Date(Date.now() + settings.loanDurationDays * 24 * 60 * 60 * 1000)"
)

# 3. Add fetch for LibrarySetting in return
content = content.replace(
    "const isOverdue = loan.dueDate < now;",
    "const isOverdue = loan.dueDate < now;\n    const settings = await prisma.librarySetting.findFirst() || { fineRatePerDay: 2.0, maxFineAmount: 50.0, loanDurationDays: 14, maxBooksPerStudent: 5, maxBooksPerStaff: 10, renewalLimit: 2 };"
)
content = content.replace(
    "const fineAmount = Math.min(daysOverdue * 2.0, 50.0);",
    "const fineAmount = Math.min(daysOverdue * settings.fineRatePerDay, settings.maxFineAmount);"
)

# 4. Add fetch for LibrarySetting in renew
content = content.replace(
    "const { loanUuid, newDueDate } = req.body;",
    "const { loanUuid, newDueDate } = req.body;\n    const settings = await prisma.librarySetting.findFirst() || { fineRatePerDay: 2.0, maxFineAmount: 50.0, loanDurationDays: 14, maxBooksPerStudent: 5, maxBooksPerStaff: 10, renewalLimit: 2 };"
)
content = content.replace(
    "if (loan.renewalCount >= 2) {",
    "if (loan.renewalCount >= settings.renewalLimit) {"
)
content = content.replace(
    "error: 'Maximum renewals (2) reached for this loan.'",
    "error: `Maximum renewals (${settings.renewalLimit}) reached for this loan.`"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("loan.routes.ts updated successfully")
