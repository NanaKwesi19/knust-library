import os

# 1. Patch backend/src/index.ts
index_path = "C:/Users/hp/knust-library/backend/src/index.ts"
with open(index_path, "r", encoding="utf-8") as f:
    index_content = f.read()

if "import reservationRoutes" not in index_content:
    index_content = index_content.replace(
        "import roomRoutes from './routes/room.routes.js';",
        "import roomRoutes from './routes/room.routes.js';\nimport reservationRoutes from './routes/reservation.routes.js';"
    )
    index_content = index_content.replace(
        "app.use('/api/v1/rooms', roomRoutes);",
        "app.use('/api/v1/rooms', roomRoutes);\napp.use('/api/v1/reservations', reservationRoutes);"
    )
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_content)
    print("Patched index.ts successfully.")

# 2. Patch ReservationManagement.tsx
res_path = "C:/Users/hp/knust-library/frontend/src/components/admin/reservations/ReservationManagement.tsx"
with open(res_path, "r", encoding="utf-8") as f:
    res_content = f.read()

old_post = "const res = await API.post('/rooms/reservations', payload);"
new_post = "const res = await API.post('/reservations/create', payload);"

if old_post in res_content:
    res_content = res_content.replace(old_post, new_post)
    with open(res_path, "w", encoding="utf-8") as f:
        f.write(res_content)
    print("Patched ReservationManagement.tsx successfully.")
