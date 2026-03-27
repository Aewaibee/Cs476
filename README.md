<!--
Simple English comments version
This documentation file belongs to the CS476 Spray Records project.
-->
# Spray Records Web App (Commented Version)
HTML / CSS / JavaScript + MySQL + JSON REST API

## What is included
- Frontend: pure HTML/CSS/JavaScript pages (no frameworks)
- Backend: Django
- Authentication: JWT (token-based)
- Authorization: Role-based (Operator vs Admin)
- Workflow: Draft → Submit → Approve/Flag
- Audit logs for status changes (Observer-like design)
- Export: CSV / JSON / PDF (Factory-like design)

## Run backend
1) Create DB tables (MySQL):
   - Run `schema.sql` in your MySQL client

2) Configure environment:
   - Copy `Backend/.env.example` to `Backend/.env`
   - Fill in DB credentials

3) Install and run:
   - cd Backend
   - python -m venv venv
   - .venv\Scripts\activate
   - pip install -r requirements.txt
   - python manage.py migrate
   - python manage.py runserver
   - API at: http://localhost:4000

4) Seed demo users:
   - POST http://localhost:4000/auth/seed
   - Accounts:
     - operator@test.com / pass123
     - admin@test.com / pass123

## Run frontend
- Open `frontend/login.html` directly in a browser (or host with a static server)
- Make sure `API_BASE` in `frontend/assets/app.js` matches your backend URL

## Pages included
Operator:
- operator-dashboard.html
- operator-new-record.html
- operator-map.html
- operator-review.html
- operator-confirm.html
- operator-records.html

Admin:
- admin-dashboard.html
- admin-search.html
- admin-map.html