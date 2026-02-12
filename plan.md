# Incident Management Platform - Development Plan

A professional, fullstack incident management system built with **FastAPI**, **Next.js**, and **PostgreSQL**.

---

## 1. Conceptual Architecture
- **Backend:** FastAPI (Python) for high-performance, type-safe API.
- **Frontend:** Next.js (React) with Tailwind CSS and shadcn/ui.
- **Database:** PostgreSQL for reliable, relational data management.
- **State Management:** Incident lifecycle managed via a backend-enforced State Machine.
- **Authentication:** JWT-based OAuth2 with Role-Based Access Control (RBAC).

---

## 2. User Roles & Permissions
- [ ] **Reporter (End User):** Create incidents, track own incidents, add comments, close own incidents.
- [ ] **Department Staff:** View department incidents, update status, add internal notes, resolve incidents.
- [ ] **Department Manager:** Resource allocation, assignment control, department-level analytics.
- [ ] **Admin:** System configuration, user management, global oversight, department/category creation.

---

## 3. Database Schema (PostgreSQL)
### Core Tables
- [ ] **Users:** `id, email, hashed_password, role, department_id, is_active`
- [ ] **Departments:** `id, name, description`
- [ ] **Categories:** `id, name, department_id, description` (Linked to Departments)
- [ ] **Incidents:** `id, incident_key (INC-XXX), title, description, status, priority, reporter_id, department_id, category_id, assignee_id, timestamps`
- [ ] **Comments:** `id, incident_id, author_id, content, is_internal`
- [ ] **Audit Logs:** `id, incident_id, actor_id, action, old_value, new_value, created_at`

---

## 4. API Design (FastAPI)
### Endpoints
- [ ] `POST /auth/login` & `POST /auth/register`
- [ ] `GET /incidents` (Role-filtered)
- [ ] `POST /incidents` (Create new)
- [ ] `PATCH /incidents/{id}` (Status/Priority updates)
- [ ] `PATCH /incidents/{id}/assign` (Manager/Admin only)
- [ ] `POST /incidents/{id}/comments` (Internal/Public)
- [ ] `GET /incidents/{id}/timeline` (Audit history)

---

## 5. State Machine Logic (Incident Lifecycle)
- [ ] **Transitions:**
    - `OPEN` -> `IN_PROGRESS` | `CANCELLED`
    - `IN_PROGRESS` -> `RESOLVED` | `OPEN`
    - `RESOLVED` -> `CLOSED` (Reporter) | `IN_PROGRESS` (Re-open)
- [ ] **Enforcement:** Validation middleware to ensure only authorized roles can trigger specific transitions.

---

## 6. Frontend Roadmap (Next.js)
- [ ] **Layout:** Responsive sidebar with role-based navigation.
- [ ] **Dashboard Views:**
    - **Reporter:** High-level status of personal tickets.
    - **Staff:** Task-oriented list with priority highlighting.
    - **Admin:** Analytical charts (Recharts) and system management.
- [ ] **Incident Detail:** 3-column view (Details/Comments/Metadata).
- [ ] **Forms:** Validated with Zod and React Hook Form.

---

## 7. DevOps & Deployment
- [ ] **Docker:** Multi-container setup (App, Frontend, DB).
- [ ] **Migrations:** Alembic for versioned schema updates.
- [ ] **CI/CD:** GitHub Actions for linting, type-checking, and testing.
- [ ] **Health Checks:** `/health` endpoint for monitoring.

---

## 8. Implementation TODO List

### Phase 1: Foundation
- [ ] Initialize Git repository.
- [ ] Setup Project Structure (Backend/Frontend/Docker).
- [ ] Configure PostgreSQL with SQLAlchemy/Alembic.
- [ ] Implement Base Auth (JWT).

### Phase 2: Core Backend (Incident Logic)
- [ ] Implement Department & Category CRUD.
- [ ] Implement Incident Reporting & List (Role-filtered).
- [ ] Build the State Machine transition logic.
- [ ] Setup Audit Logging middleware.

### Phase 3: Frontend (UI/UX)
- [ ] Scaffold Next.js with Tailwind & shadcn/ui.
- [ ] Build Auth Pages (Login/Register).
- [ ] Build Dashboard Shell & Sidebar.
- [ ] Build Incident Feed & Detail View.

### Phase 4: Interactions & Polish
- [ ] Implement Comments system.
- [ ] Add Real-time updates (SWR/React Query).
- [ ] Add Admin Analytics Dashboard.
- [ ] Finalize E2E Tests (Playwright).
