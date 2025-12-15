# Multi-Tenant Project Management System

A lightweight project management system with **organization-based multi-tenancy**, built as a screening task.

The application supports multiple organizations (tenants), each with isolated projects, tasks, and statistics, enforced end-to-end at the API layer.

---

## Features

### Multi-Tenancy
- Organizations identified via `x-org-slug` request header
- Tenant context resolved in backend middleware
- All GraphQL resolvers and mutations enforce organization scope
- No cross-tenant data access

### Core Functionality
- Organization discovery
- Project listing per organization
- Task creation and status updates
- Project-level statistics (total tasks, completed tasks, completion rate)
- Optimistic UI updates with Apollo cache synchronization

### Frontend UX
- Organization selection flow (`/orgs`)
- Dynamic tenant switching
- Apollo cache reset on org change to prevent data leakage
- Clean, SaaS-style UI using plain CSS

---

## Tech Stack

### Backend
- Python
- Django
- Graphene (GraphQL)
- PostgreSQL (SQLite for local development)

### Frontend
- React 18
- TypeScript (strict)
- Apollo Client
- React Router
- Vite

---

## Architecture Notes

- Multi-tenancy enforced via Django middleware attaching `request.org`
- Organization discovery (`organizations` query) is global and does not require a tenant header
- Tenant-specific queries and mutations require an active organization context
- Task completion rate is calculated server-side and displayed as a percentage
- Tenant header is injected dynamically on every request by Apollo Client

---

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```