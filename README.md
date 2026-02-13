# ServiceNow Clone - Incident Management Platform

A professional, full-stack incident management system built with **FastAPI**, **Next.js**, and **PostgreSQL**. This platform provides a robust solution for tracking, managing, and resolving organizational incidents with role-based access control and real-time updates.

## 🚀 Features

- **Role-Based Access Control (RBAC):** Distinct workflows for Reporters, Staff, Managers, and Admins.
- **Incident Lifecycle Management:** State-machine enforced transitions (Open -> In Progress -> Resolved -> Closed).
- **Real-time Updates:** Powered by TanStack Query for a responsive, modern UX.
- **Advanced Analytics:** Visual dashboards for managers and admins using Recharts.
- **Mobile-First Design:** Responsive UI built with Tailwind CSS and shadcn/ui.
- **Automated Workflows:** Background notifications and audit logging for every action.
- **CI/CD Integrated:** Automated testing and linting via GitHub Actions.

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Migrations:** Alembic
- **Validation:** Pydantic v2
- **Auth:** JWT-based OAuth2

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack Query (React Query) + Zustand
- **Forms:** React Hook Form + Zod
- **Animations:** Framer Motion

## 📦 Project Structure

```text
service-now/
├── backend/            # FastAPI Application
│   ├── app/           # Core logic, models, schemas, and API routes
│   ├── alembic/       # Database migrations
│   └── tests/         # Pytest suite
├── frontend/           # Next.js Application
│   ├── src/           # Components, hooks, and app routes
│   └── tests/         # Playwright E2E tests
├── docker-compose.yml  # Orchestration for local development
└── plan.md             # Development roadmap and status
```

## 🛠️ Setup & Installation

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Running with Docker (Recommended)
1. Clone the repository.
2. Run the following command:
   ```bash
   docker-compose up --build
   ```
3. The frontend will be available at `http://localhost:3000` and the API at `http://localhost:8000`.

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Run migrations
alembic upgrade head
# Start server
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run lint
npx playwright test
```

## 📄 License
MIT
