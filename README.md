# PreSkool ERP Platform

A comprehensive School/College ERP & Student Management System built with modern technologies.

## Tech Stack

### Frontend
- React 18+ with Vite
- Material-UI (MUI) v5
- Redux Toolkit
- React Router v6
- Axios

### Backend
- FastAPI (Python 3.10+)
- PostgreSQL 14+ with Row-Level Security
- SQLAlchemy 2.0
- Keycloak (OAuth 2.0/OIDC)
- Redis

### Infrastructure
- Docker & Docker Compose
- Kubernetes
- Prometheus & Grafana
- GitHub Actions (CI/CD)

## Project Structure

```
preskool-erp/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── infrastructure/   # K8s, Helm, Terraform
└── docs/            # Documentation
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+

### Quick Start with Docker

```bash
# Clone the repository
git clone <repo-url>
cd preskool-erp

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features

- 🔐 Role-based authentication (Admin, Teacher, Student, Parent)
- 📊 Interactive dashboards with real-time data
- 👥 People management (Students, Teachers, Guardians)
- 📚 Academic management (Classes, Subjects, Timetables, Exams)
- 💼 HRM (Attendance, Leave, Payroll)
- 💰 Fees management with UPI payment integration
- 📖 Library, Hostel, Transport management
- 📈 Comprehensive reporting system
- 🔌 Plugin architecture for extensibility

## Documentation

See the [docs](./docs) folder for detailed documentation.

## License

[Your License Here]
