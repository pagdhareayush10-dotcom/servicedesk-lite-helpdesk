# ServiceDesk Lite — Full-Stack IT Helpdesk & Automation Project

Portfolio project for an entry-level IT Trainee role. This is a learning starter, not a production-ready system.

## Features
- React + Vite frontend
- Node.js + Express REST API
- MySQL relational database
- JWT login and role-based permissions (admin, agent, employee)
- Create/view/update tickets, priority/status filtering
- Dashboard metrics
- Input validation, parameterized SQL, password hashing, rate limiting, Helmet
- Scheduled SLA scan endpoint/function can be added as an extension

## Prerequisites
- Node.js 20+
- MySQL 8+
- Git
- VS Code recommended

## 1. Create the database
Open MySQL Workbench and run `database/schema.sql`.

## 2. Configure the backend
```bash
cd server
npm install
```
Copy `.env.example` to `.env`, then set your MySQL credentials and a long random JWT_SECRET.
```bash
npm run seed
npm run dev
```
API: http://localhost:5000
Health check: http://localhost:5000/api/health

Demo accounts created by seed:
- admin@servicedesk.local / AdminDemo!123
- agent@servicedesk.local / AgentDemo!123
- employee@servicedesk.local / EmployeeDemo!123

Change these passwords for any deployment. Do not reuse them on other sites.

## 3. Run the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the local URL shown by Vite (usually http://localhost:5173).

## API overview
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/tickets`
- `POST /api/tickets`
- `PATCH /api/tickets/:id`
- `GET /api/dashboard/stats`

Login with the demo accounts to explore role differences. Employees can create and view their own tickets; agents/admins can view and update all tickets.

## Recommended project extensions
1. Add comments and an audit timeline for every status change.
2. Add overdue-ticket alerts and daily CSV reports.
3. Add Power BI dashboard using exported ticket data.
4. Add unit/integration tests and Postman collection.
5. Deploy frontend and API, configure CORS and environment variables, and use a managed MySQL service.
6. Add screenshots and a short demo video to this README.

## Resume bullets (use only after implementing/testing)
- Built a full-stack IT service desk using React, Node.js, Express and MySQL to create, assign, filter and track incidents.
- Designed REST endpoints with JWT authentication, role-based authorization, input validation and parameterized SQL queries.
- Developed an operational dashboard for ticket volume, status and priority, with documented setup and API workflows.

## Important
This is a starter project. Review the code, test it, and be able to explain each file before describing it as your own work.

## How to start ServiceDesk Lite next time
Step 1: Open your project in VS Code
Open this folder:

C:\Users\ayush\Downloads\ServiceDesk_Lite_Colgate_IT_Project
Step 2: Start the backend
In VS Code, click Terminal → New Terminal and run:
cd server
npm.cmd run dev


Wait for:
ServiceDesk Lite API listening on http://localhost:5000


Keep this terminal open.
Step 3: Start the frontend
Click Terminal → New Terminal again to create a second terminal, then run:
cd client
npm.cmd run dev


Wait for Vite to show its local URL.
Step 4: Open your website
ServiceDesk Lite

Local development website


Open website
Your existing accounts and tickets should remain saved in MySQL, so you shouldn't need to register again.
Important things to remember
- Keep both terminal sessions running while using the website.
- If you see EADDRINUSE on port 5000, the backend may already be running. Don't start another copy.
- If you only close the browser, you can reopen the same website link while the servers are running.
- If you shut down your computer, start both servers again when you return.
Want to make it easier? We can create a start-project.bat file in your project folder that opens both servers with one double-click, so you don't have to type the commands each time.