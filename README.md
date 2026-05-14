# Smart Timetable Generation

A comprehensive system for generating and managing academic timetables automatically. This repository contains both the frontend user interface and the backend server.

## 📁 Project Structure

This project is structured as a monorepo containing two main parts:

- **/frontend** - The user interface built with React, Vite, and Tailwind CSS.
- **/backend** - The server, database, and scheduling logic built with Python and FastAPI.

## 🚀 Getting Started

To run this project locally, you will need to start both the backend and frontend development servers.

### 1. Backend Setup (Python/FastAPI)

Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Install the required Python packages:
```bash
pip install -r requirements.txt
```

Start the backend server:
```bash
uvicorn app.main:app --reload
```
The backend API will typically run on `http://localhost:8000`.

### 2. Frontend Setup (React/Vite)

Open a **new** terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install the Node.js dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will typically run on `http://localhost:5173`.

## 🌍 Deployment
This repository is set up so that you can easily deploy the `/frontend` folder to platforms like **Vercel** or **Netlify**, and deploy the `/backend` folder to platforms like **Render**, **Heroku**, or **Railway**.
