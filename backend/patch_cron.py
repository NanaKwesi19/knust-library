import os

path = "C:/Users/hp/knust-library/backend/src/jobs/cron.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'LOAN_DUE_SOON'", "'DUE_REMINDER'")
content = content.replace("'LOAN_OVERDUE'", "'OVERDUE_ALERT'")
content = content.replace("'LOAN_AUTO_RENEWED'", "'SYSTEM'")
content = content.replace("'RESERVATION_EXPIRED'", "'BOOKING_CANCELLED'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed NotificationType enums")
