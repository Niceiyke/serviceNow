# Incident Management Platform - Development Plan

A professional, fullstack incident management system built with **FastAPI**, **Next.js**, and **PostgreSQL**.

---

## 1. Conceptual Architecture
- [x] **Backend:** FastAPI (Python) for high-performance, type-safe API.
- [x] **Frontend:** Next.js (React) with Tailwind CSS and shadcn/ui.
- [x] **Database:** PostgreSQL for reliable, relational data management.
- [x] **State Management:** Incident lifecycle managed via a backend-enforced State Machine.
- [x] **Authentication:** JWT-based OAuth2 with Role-Based Access Control (RBAC).

---

## 2. User Roles & Permissions
- [x] **Reporter (End User):** Create incidents, track own incidents, add comments, close own incidents.
- [x] **Department Staff:** View department incidents, update status, add internal notes, resolve incidents.
- [x] **Department Manager:** Resource allocation, assignment control, department-level analytics.
- [x] **Admin:** System configuration, user management, global oversight, department/category creation.

---

## 3. Database Schema (PostgreSQL)
### Core Tables
- [x] **Users:** `id, email, hashed_password, role, department_id, is_active`
- [x] **Departments:** `id, name, description`
- [x] **Categories:** `id, name, department_id, description` (Linked to Departments)
- [x] **Incidents:** `id, incident_key (INC-XXX), title, description, status, priority, reporter_id, department_id, category_id, assignee_id, timestamps`
- [x] **Comments:** `id, incident_id, author_id, content, is_internal`
- [x] **Audit Logs:** `id, incident_id, actor_id, action, old_value, new_value, created_at`

---

## 4. API Design (FastAPI)
### Endpoints
- [x] `POST /auth/login` & `POST /auth/register`
- [x] `GET /incidents/` (Role-filtered)
- [x] `POST /incidents/` (Create new)
- [x] `PATCH /incidents/{id}` (Status/Priority updates)
- [x] `PATCH /incidents/{id}/assign` (Manager/Admin only)
- [x] `POST /incidents/{id}/comments` (Internal/Public)
- [x] `GET /incidents/{id}/timeline` (Audit history)

---

## 5. State Machine Logic (Incident Lifecycle)
- [x] **Transitions:**
    - `OPEN` -> `IN_PROGRESS` | `CANCELLED`
    - `IN_PROGRESS` -> `RESOLVED` | `OPEN`
    - `RESOLVED` -> `CLOSED` (Reporter) | `IN_PROGRESS` (Re-open)
- [x] **Enforcement:** Validation middleware to ensure only authorized roles can trigger specific transitions.

---

## 6. Frontend Roadmap (Next.js)
- [x] **Layout:** Responsive sidebar with role-based navigation.
- [x] **Mobile Friendly:** Toggleable sidebar and responsive tables.
- [x] **Dashboard Views:**
    - [x] **Reporter:** High-level status of personal tickets.
- [x] **Staff:** Task-oriented list with priority highlighting.
- [x] **Admin:** System management (Departments/Categories).
- [x] **Incident Detail:** 3-column view (Details/Comments/Metadata).
- [x] **Forms:** Validated with Zod and React Hook Form.

---

## 7. DevOps & Deployment
- [x] **Docker:** Multi-container setup (App, Frontend, DB).
- [x] **Traefik Routing:** `service-now.wordlyte.com` and `api-service-now.wordlyte.com`.
- [x] **HTTPS/TLS:** Fully configured with Traefik and Cloudflare.
- [x] **Migrations:** Alembic for versioned schema updates.
- [ ] **CI/CD:** GitHub Actions for linting, type-checking, and testing.
- [x] **Health Checks:** `/health` endpoint with DB connectivity check.

---

## 8. Implementation TODO List (REMAINING)

### Phase 4: Interactions, Polish & Management
- [x] **User Management:** Build `/admin/users` to manage roles and department assignments.
- [x] **Admin Analytics:** Visual charts using Recharts for incident trends and department workloads.
- [x] **Staff Experience:** Kanban-style board or priority-sorted feed for staff members.
- [ ] **Real-time UX:** Implement SWR/React Query for automatic data refreshing.
- [x] **UX Polish:** Replace alerts with Toast notifications and add empty states.
- [x] **Notifications:** Background tasks for email alerts on status changes.
