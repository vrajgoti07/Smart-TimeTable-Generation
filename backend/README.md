# 🎓 Smart Timetable Backend API

Powerful and lightweight **FastAPI** backend for the Smart Timetable ecosystem. This service manages scheduling logic, role-based access control (RBAC), and intelligent conflict detection, backed by **MongoDB Atlas**.

---

## 🚀 Built with Modern Tech
- **FastAPI**: High-performance Python web framework.
- **MongoDB Atlas**: Fully managed cloud database via **Motor** (Async).
- **JWT Authentication**: Secure token-based auth with `python-jose`.
- **Pydantic v2**: State-of-the-art data validation and settings management.
- **SMTP Integration**: Transactional emails for invites and password recovery.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Python 3.9+ 
- MongoDB Atlas account (or local MongoDB instance)

### 2. Installation
```bash
# Install required packages
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
MONGODB_URL=your_mongodb_connection_string
DATABASE_NAME=timetable_db

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Smart Timetable

FRONTEND_URL=http://localhost:5173
```

### 4. Database Setup & First Admin
Initialize the database and create your root administrative account:
```bash
python -m app.init_db
```

### 5. Launch the API
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Endpoints Summary

### 🔐 Authentication
- `POST /auth/login` - Secure login (Admin/Faculty/Student)
- `POST /auth/forgot-password` - Initiate recovery flow
- `POST /auth/reset-password` - Complete password reset
- `POST /auth/set-password` - Finalize account setup from invite

### 👥 User Management
- `GET /users` - List all users (Role-filtered)
- `POST /admin/create-user` - Register new faculty or student

### 📅 Timetable Logic
- `GET /timetable` - Fetch schedules based on role
- `POST /timetable` - Generate/Create new schedule entries

---

## 📂 Project Architecture
```
backend/
├── app/
│   ├── main.py              # Entry point & Middleware
│   ├── database.py          # MongoDB connectivity
│   ├── routes/              # Modular API controllers
│   ├── models/              # DB Document models
│   ├── schemas/             # Pydantic Req/Res schemas
│   ├── core/                # JWT & Encryption logic
│   └── utils/               # Email & background tasks
├── scripts/                 # Maintenance scripts
├── requirements.txt
└── README.md
```

---

## 🧪 Admin Utilities
We provide several CLI tools for rapid management:
- `python app/add_user.py`: Interactively add new users.
- `python app/list_users.py`: View formatted list of all registered users.
- `python list_users_simple.py`: Lightweight user check.

---

## 🛡️ Security Features
- **Bcrypt Hashing**: Industry-standard password encryption.
- **Lifespan Context**: Managed DB connections to prevent leaks.
- **CORS Guards**: Strict origin filtering for frontend security.
- **Token Expiry**: 24-hour rolling JWT sessions.
