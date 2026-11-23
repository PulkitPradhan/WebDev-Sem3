# University Campus Management System

## Backend Development Capstone Project Report

> Complete all bracketed team details and insert genuine screenshots/test-run evidence before submission. Do not claim a test passed until it has been run against the application.

## 1. Cover page and team details

- **Course:** Backend Development
- **Project option:** Project 1 — University Campus Management System
- **Team name / number:** [Complete]
- **Team members:** [Full names and university IDs]
- **Faculty:** [Faculty name]
- **Technology stack:** Node.js, Express.js, MongoDB, Mongoose, JWT and Socket.IO

### Individual contributions

| Team member | Actual contribution | Evidence (files, commits or demo task) |
|---|---|---|
| [Member 1] | [Complete truthfully] | [Commit/file/demo] |
| [Member 2] | [Complete truthfully] | [Commit/file/demo] |
| [Member 3, if applicable] | [Complete truthfully] | [Commit/file/demo] |

## 2. Abstract

The University Campus Management System is a role-based backend application for managing core academic workflows. Administrators manage users, courses and sections; faculty members manage attendance and publish academic announcements; students enroll in sections and view their own academic information. The application exposes REST APIs through Express, stores related data in MongoDB with Mongoose, protects accounts and endpoints with bcrypt and JWT, and delivers selected updates through Socket.IO. MongoDB aggregation pipelines generate attendance and enrollment reports.

## 3. Problem statement

University workflows such as course allocation, student enrollment, attendance recording and announcements can be difficult to manage when information is separated across tools. The project provides a centralized API with role-based access so users can perform only the operations permitted to them.

## 4. Objectives

1. Develop a REST backend using Node.js and Express.js.
2. Organize the application using routes, controllers, models and middleware.
3. Model users, courses, sections, enrollments, attendance and announcements in MongoDB.
4. Implement bcrypt password hashing, JWT access/refresh tokens and role-based authorization.
5. Support academic CRUD workflows and validate references and business rules.
6. Calculate attendance summaries and enrollment reports with aggregation pipelines.
7. Use EventEmitter for internal domain events and Socket.IO for relevant real-time notifications.
8. Test the API using Postman and document setup, endpoints and database design.

## 5. Scope and limitations

### Included

- Admin, faculty and student roles.
- Student registration, login, token refresh, logout and profile operations.
- User, course and section administration.
- Enrollment creation, listing, status changes and removal.
- Attendance marking, history, correction, summary and administrative deletion.
- University, course and section announcements.
- Low-attendance and enrollment analytics.
- Authenticated Socket.IO notifications and repeatable demo seed data.

### Current limitations

- This deliverable is a backend API; a separate frontend is not included.
- The capacity counter is rebuilt from active enrollments at server startup. Run a single application instance with this implementation; a distributed multi-instance deployment should use a transaction-based or otherwise centrally consistent reservation design.
- Automated tests in `test/` check source-level contracts and configuration. They do not replace live integration testing against MongoDB.
- Attendance exports, timetable management and a full attendance audit-history collection are outside the current scope.

## 6. Functional and non-functional requirements

### Functional requirements

- Authenticate users and enforce role-specific access.
- Allow administrators to manage users, courses and sections.
- Allow students/admins to create enrollments, and authorized users to inspect permitted enrollment records.
- Allow assigned faculty/admins to mark and correct attendance.
- Allow students to see only their own enrollment and attendance information.
- Publish and retrieve audience-scoped announcements.
- Generate attendance and enrollment analytics.
- Deliver selected events through Socket.IO.

### Non-functional requirements

- Consistent JSON response structure and appropriate HTTP status codes.
- Password hashing and token-based authentication.
- Input validation and centralized error responses.
- Database indexes for important lookups and uniqueness constraints.
- Environment-based configuration and exclusion of secrets from version control.
- Pagination on large list endpoints where applicable.

## 7. System architecture

The project uses a layered Express architecture:

```text
Client / Postman
      |
      v
Express application middleware
      |
      v
REST route -> Authentication / RBAC -> Validation
      |
      v
Controller / Business rules
      |
      v
Mongoose model -> MongoDB
      |
      v
JSON response

Controller -> EventEmitter -> Socket.IO -> Authenticated room
```

Routes define endpoint paths and middleware order. Controllers implement application workflows. Mongoose models define schemas, validation, references and indexes. Shared middleware handles authentication, authorization, validation and errors.

## 8. Database design

The application uses six main collections:

| Collection | Purpose | Main relationships |
|---|---|---|
| `users` | Account/profile, role and authentication state | Faculty, students and administrators |
| `courses` | Course details | Parent of sections |
| `sections` | Course offering, faculty assignment, term and capacity | References course and faculty; parent of enrollment/attendance |
| `enrollments` | Student registration in a section | References student and section |
| `attendances` | Per-student attendance for a class date | References student, section and marking user |
| `announcements` | University/course/section messages | References creator and optional course/section |

Important unique indexes prevent duplicate email/student identifiers, duplicate course/section combinations, duplicate student-section enrollments and duplicate student-section-session attendance. Additional indexes support attendance and reference lookups. The detailed schema and index description is in `DATABASE.md`.

## 9. REST API documentation

The OpenAPI contract is stored in `docs/openapi.yaml`. The Postman collection is stored in `postman/Campus-Management.postman_collection.json`.

Core API groups include:

- Authentication: `/api/auth/*`
- Users: `/api/users`
- Courses: `/api/courses`
- Sections: `/api/sections`
- Enrollments: `/api/enrollments`
- Attendance: `/api/attendance`
- Announcements: `/api/announcements`
- Reports: `/api/reports/*`

Protected requests use `Authorization: Bearer <accessToken>`. The refresh token is delivered in an HttpOnly cookie.

## 10. Authentication and authorization

Passwords are hashed with bcryptjs and are never stored as plain text. Login issues a short-lived JWT access token and a refresh token stored in an HttpOnly cookie. Refresh operations rotate the refresh token. Protected middleware verifies the access token and reloads the active user. Role middleware restricts administrator-only and faculty/admin operations. Controller checks further restrict access to assigned sections and a student's own records.

## 11. Implementation details

- **Validation:** Express Validator checks request fields before controllers run.
- **Error handling:** one centralized middleware formats validation, missing-resource, duplicate-key and unexpected server errors.
- **Database integrity:** Mongoose schema validation and MongoDB unique indexes enforce important constraints.
- **Enrollment capacity:** `sections.enrolledCount` is rebuilt from active enrollment data at startup and updated during enroll/drop operations.
- **Aggregation:** attendance summary, low-attendance report and enrollment summary use MongoDB aggregation pipelines.
- **Event-driven updates:** controllers emit domain events after persistence; listeners forward selected updates through Socket.IO.

## 12. Testing strategy and test cases

Run `npm test` for the included source-level contract checks. Then start MongoDB, seed the database and run the Postman collection. Record the actual results below.

| Test case | Expected result | Actual result / evidence |
|---|---|---|
| Valid login | 200 and access token | [Record after running] |
| Invalid login/input | 400 or 401 as documented | [Record after running] |
| Protected endpoint without token | 401 | [Record after running] |
| Student accesses admin-only endpoint | 403 | [Record after running] |
| Student lists enrollment records | Own records only | [Record after running] |
| Faculty requests student attendance | Assigned sections only | [Record after running] |
| Duplicate enrollment | 409 | [Record after running] |
| Duplicate attendance session | 409 | [Record after running] |
| Unknown resource | 404 | [Record after running] |
| Socket.IO connection with valid/invalid token | Authenticated connection / rejection | [Record after running] |

## 14. Screenshots and demonstration evidence

The following figures are included in `docs/screenshots/` and embedded in Section 14 of the editable report:

1. `01-project-structure.png` — local repository structure and main backend layers.
2. `02-openapi-endpoints.png` — endpoint catalogue extracted from the OpenAPI specification.
3. `03-postman-collection.png` — request groups in the committed Postman collection.
4. `04-automated-tests.png` — actual output from `npm test -- --test-reporter=spec`, showing 10 source-contract tests passing.

These figures document project artefacts and source-contract tests. They do not claim that the API has been exercised against a live MongoDB database. Before final submission, add genuine Postman screenshots showing successful admin login, student enrollment, faculty attendance marking, duplicate attendance rejection, student attendance summary, analytics and a real Socket.IO notification after running the project locally.

## 15. Conclusion and future enhancements

The project demonstrates REST API development, layered architecture, Mongoose data modelling, authentication, role-based authorization, aggregation, middleware, error handling, EventEmitter and Socket.IO. Future work may include a frontend dashboard, automated integration tests, CSV/PDF attendance exports, timetable management and an attendance audit history.

## 16. References

- Node.js documentation: https://nodejs.org/docs/latest/api/
- Express documentation: https://expressjs.com/
- MongoDB manual: https://www.mongodb.com/docs/manual/
- Mongoose documentation: https://mongoosejs.com/docs/
- Socket.IO documentation: https://socket.io/docs/v4/
