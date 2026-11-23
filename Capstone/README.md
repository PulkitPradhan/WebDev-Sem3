# University Campus Management API

**Backend Development Capstone · Project 1 — University Campus Management System**

A role-based REST backend for university users, courses, sections, enrollments, attendance, announcements and academic reports. The implementation uses Node.js, Express, MongoDB, Mongoose, JWT, EventEmitter and Socket.IO.

## Core capabilities

- **Roles:** administrator, faculty and student, enforced on backend routes.
- **Authentication:** bcrypt password hashes, short-lived JWT access tokens, rotating refresh tokens in an HttpOnly cookie, and logout revocation.
- **Academic records:** CRUD for users, courses and sections; enrollment listing and status management; attendance create/read/correct/delete.
- **Privacy:** students can access only their own enrollments and attendance; faculty attendance reports are restricted to assigned sections.
- **Analytics:** subject-wise attendance summary, low-attendance report, and course/section enrollment aggregation.
- **Real time:** authenticated Socket.IO rooms for relevant users, sections and courses; EventEmitter decouples domain events from notifications.
- **Operations:** dotenv configuration, request validation, pagination, rate limiting, Helmet, CORS, request logging, centralized JSON errors and seed data.

## Technology

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| API | Express.js 4 |
| Database | MongoDB 6+ |
| ODM | Mongoose 8 |
| Authentication | bcryptjs, jsonwebtoken |
| Real-time | Socket.IO 4 and Node EventEmitter |
| API testing | Postman |

## Setup

Prerequisites: Node.js 18+, npm and MongoDB 6+.

```powershell
npm install
Copy-Item .env.example .env
# Edit .env and set a MongoDB URI plus two different strong JWT secrets
npm run seed
npm test
npm run dev
```

The API runs at `http://localhost:3000`. Health check: `GET /health`.

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret; must differ from access secret |
| `ACCESS_TOKEN_TTL` | Access token lifetime (default 15m) |
| `REFRESH_TOKEN_DAYS` | Refresh token lifetime (default 7 days) |
| `CLIENT_ORIGIN` | Allowed browser/Socket.IO origin |
| `ATTENDANCE_THRESHOLD` | Default low-attendance threshold (default 75) |

Never commit `.env` or real secrets. `.env.example` contains placeholders only.

## Demo accounts

`npm run seed` creates local demo users. The password for each is `CampusDemo123!`:

| Role | Email |
|---|---|
| Administrator | `admin@campus.test` |
| Faculty | `faculty@campus.test` |
| Student | `student1@campus.test` |
| Student | `student2@campus.test` |

Use these credentials only on a local demo database. Replace or remove them before any shared deployment.

## API overview

Protected endpoints use `Authorization: Bearer <accessToken>`. Successful responses use `{ success: true, data: ... }`; errors use `{ success: false, error: { message, details? } }`.

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me` | Register/login public; profile requires auth |
| Users | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id` | Admin |
| Courses | `GET/POST /api/courses`, `GET/PATCH/DELETE /api/courses/:id` | Read authenticated; write admin |
| Sections | `GET/POST /api/sections`, `GET/PATCH/DELETE /api/sections/:id` | Read authenticated; write admin |
| Enrollments | `GET/POST /api/enrollments`, `GET/PATCH/DELETE /api/enrollments/:id` | Student sees own; faculty sees assigned sections; admin manages |
| Attendance | `GET/POST /api/attendance`, `GET/PATCH/DELETE /api/attendance/:id`, `GET /api/attendance/summary` | Student own records; assigned faculty; admin |
| Announcements | `GET/POST /api/announcements`, admin `GET/PATCH/DELETE /api/announcements/:id` | Audience/role scoped |
| Reports | `GET /api/reports/low-attendance`, `GET /api/reports/enrollments` | Admin/faculty; faculty restricted to assigned sections |

List endpoints support pagination where applicable (`page`, `limit`, maximum 100). See `docs/openapi.yaml` for the OpenAPI contract and `postman/Campus-Management.postman_collection.json` for API requests.

## Database design

Collections: `users`, `courses`, `sections`, `enrollments`, `attendances` and `announcements`. Reference relationships and indexes are documented in `docs/DATABASE.md`.

The `sections.enrolledCount` field is a denormalized capacity counter. The server rebuilds it from active enrollment records on startup; enrollment/drop operations then update it atomically. Run a single application instance while using this counter-based approach.

## Real-time events

Socket.IO clients authenticate with `{ auth: { token: "<accessToken>" } }` during connection. Supported events include `announcement:new` and `attendance:updated`. Internal EventEmitter events include `announcement:created`, `attendance:marked` and `attendance:corrected`.

## Project structure

```text
src/
  config/          MongoDB connection
  controllers/     Authentication, academic and reusable resource logic
  middleware/      JWT/RBAC, request validation and error handling
  models/          Mongoose schemas and indexes
  routes/          REST endpoint definitions
  seed/            Repeatable demo data
  utils/           Tokens, async handler, events and counter maintenance
```

## Tests and evidence

Run `npm test` for the automated static contract checks. Then execute the Postman collection against a live MongoDB/API instance and record successful, validation-failure, 404, 401, 403, duplicate and capacity-boundary cases. The manual regression and evidence checklist is `docs/QA_AND_SUBMISSION.md`.

Project evidence images are included in `docs/screenshots/`: source structure, OpenAPI endpoint catalogue, Postman collection structure and the automated source-contract test run. These document repository artefacts and source-level tests; they are not live MongoDB/API integration evidence. Add Postman and Socket.IO screenshots after running the API against MongoDB.

## Submission files

- Source code: this repository
- Editable project report: `submission/University_Campus_Management_Capstone_Report.docx`
- PDF report preview: `submission/University_Campus_Management_Capstone_Report.pdf`
- GitHub upload steps: `PUSH_TO_GITHUB.md`
- README: this file
- Database design: `docs/DATABASE.md`
- API documentation: `docs/openapi.yaml`
- Postman collection: `postman/Campus-Management.postman_collection.json`
- Project report: `docs/PROJECT_REPORT.md` (complete team details and attach genuine test evidence)
- QA checklist: `docs/QA_AND_SUBMISSION.md`

## Academic integrity and contribution

Each team member should be able to explain the code they submit, identify their own contribution, and demonstrate at least one API flow. Do not claim tests, screenshots or individual contributions that have not actually been completed.
