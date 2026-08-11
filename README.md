# KNUST Library Management System

A comprehensive full-stack library management system designed for KNUST, featuring a React frontend, Node/Express/Prisma backend, and a Python FastApi ML Service for predictive analytics.

## Project Structure

- `/frontend` - React/Vite application (Port 5173)
- `/backend` - Node.js Express API with Prisma ORM (Port 5000)
- `/ml-service` - Python FastAPI service for AI insights (Port 8000)

## Features

- **Dashboard:** Unified dashboard for Students and Admins.
- **Catalog Management:** Add, track, and manage book resources.
- **Loans & Reservations:** Book loans, fines management, and study room reservations.
- **Analytics:** Data insights for library usage and trends.
- **AI Forecasting:** Predicting book demand via the ML service.

## Setup Instructions

### Backend
1. `cd backend`
2. `npm install`
3. Configure `.env` with `DATABASE_URL` (PostgreSQL) and `JWT_SECRET`.
4. Run `npx prisma db push` to sync schema.
5. `npm run dev` to start server.

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` to start the web application.

### ML Service
1. `cd ml-service`
2. `python -m venv venv`
3. Activate virtual environment.
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload`

## Tech Stack
- Frontend: React, Vite, TailwindCSS, Framer Motion
- Backend: Node.js, Express, Prisma, PostgreSQL
- ML Service: Python, FastAPI, NumPy, Pandas
