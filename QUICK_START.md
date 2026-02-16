# Quick Start Guide

## Prerequisites

Make sure you have the following installed:
- **Docker** and **Docker Compose**
- **Python 3.11+** (for local backend development)
- **Node.js 18+** (for local frontend development)
- **Git**

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose, which will set up all services:

```bash
# Navigate to project directory
cd preskool-erp

# Start all services (PostgreSQL, Redis, Keycloak, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Access Points

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Keycloak Admin**: http://localhost:8080 (admin/admin)
- **PostgreSQL**: localhost:5432 (preskool_user/preskool_password)
- **Redis**: localhost:6379

## Local Development Setup

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and configure
cp .env.template .env
# Edit .env with your database credentials

# Run the development server
uvicorn app.main:app --reload

# Visit http://localhost:8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Run the development server
npm run dev

# Visit http://localhost:5173 or http://localhost:3000
```

## Project Structure

```
preskool-erp/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── core/        # Core functionality (config, db, auth)
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── api/v1/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── features/    # Feature-specific components
│   │   ├── layouts/     # Layout components
│   │   ├── store/       # Redux store and slices
│   │   ├── services/    # API client
│   │   ├── theme/       # MUI theme configuration
│   │   └── App.tsx      # Main app component
│   ├── package.json
│   └── Dockerfile
│
├── infrastructure/       # K8s, Helm, Terraform configs
│   ├── k8s/
│   ├── helm/
│   └── terraform/
│
├── docker-compose.yml    # Local development environment
└── README.md
```

## What's Included

### Backend
✅ FastAPI application structure
✅ SQLAlchemy with PostgreSQL support
✅ Multi-tenancy with `tenant_id` in base model
✅ JWT authentication system
✅ Pydantic configuration management
✅ CORS middleware
✅ Health check endpoints

### Frontend
✅ React 18 with TypeScript
✅ Vite for fast development
✅ Material-UI (MUI) theme with PreSkool colors
✅ Redux Toolkit for state management
✅ React Router for navigation
✅ Axios API client with auth interceptors
✅ Responsive layout foundation

### Infrastructure
✅ Docker Compose with all services
✅ PostgreSQL 14 database
✅ Redis cache
✅ Keycloak authentication server

## Next Steps

Now that the foundation is set up, the next phases are:

1. **Database Models** - Create Student, Teacher, Guardian models
2. **Authentication** - Implement login/signup/password reset
3. **Dashboards** - Build role-based dashboards
4. **People Management** - Students, Teachers CRUD operations
5. **Academic Module** - Classes, Subjects, Timetables, Exams
6. **And more...**

See `task.md` and `implementation_plan.md` for the complete roadmap.

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Troubleshooting

### Port Already in Use
If ports 3000, 5173, 8000, 5432, 6379, or 8080 are already in use:
- Stop the conflicting services
- Or modify the ports in `docker-compose.yml`

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Try: `docker-compose down -v` to reset volumes

### Frontend Build Issues
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Material-UI](https://mui.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Figma Design](https://www.figma.com/design/niUvjseHB5f6UFCT6fckOI/PreSkool)

## Support

For issues or questions, please refer to the `implementation_plan.md` and `walkthrough.md` documents.

Happy coding! 🚀
