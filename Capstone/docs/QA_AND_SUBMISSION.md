# Capstone quality and submission checklist

Use this document to record real results. Do not mark a test complete until it has been run against the application and database.

## Run locally

1. Install Node.js 18+, npm and MongoDB 6+.
2. From the project root run:

   ```powershell
   npm install
   Copy-Item .env.example .env
   # Set strong, distinct JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values
   npm run seed
   npm test
   npm run dev
   ```

3. Confirm `GET http://localhost:3000/health` returns HTTP 200.
4. Import `postman/Campus-Management.postman_collection.json` into Postman and run the requests in order. Use the seeded demo accounts only on a local development database.

## Regression checks to record

| Scenario | Expected result | Actual result / evidence |
|---|---|---|
| Student lists enrollments | Only the signed-in student's records | Pending live test |
| Student requests another student's enrollment | 404 (record not disclosed) | Pending live test |
| Faculty requests a student's attendance summary | Only sections assigned to that faculty | Pending live test |
| Faculty requests a student outside their sections | 403 | Pending live test |
| Attendance is submitted twice for a session | Second request returns 409; corrections use PATCH | Pending live test |
| Section reaches capacity | Further enrollment returns 409 | Pending live test |
| Dropping an enrollment | Seat counter decreases | Pending live test |
| Re-enrolling a dropped student | Seat is reserved and enrollment becomes active | Pending live test |
| Request without JWT | 401 | Pending live test |
| Wrong role accesses admin endpoint | 403 | Pending live test |
| Invalid MongoDB ObjectId | 400 | Pending live test |
| Unknown endpoint | 404 | Pending live test |

The automated `npm test` suite is a static contract/sanity suite. It is not a substitute for the live Postman checks above.

## Evaluation walkthrough

1. Admin logs in and creates a course and section, then provisions one faculty and two students.
2. Student logs in, browses courses/sections, enrolls, and lists only their own enrollment.
3. Assigned faculty marks attendance and publishes a section announcement.
4. Student retrieves their attendance history and subject-wise percentage; a Socket.IO client receives the announcement/attendance event.
5. Faculty/admin views low-attendance and enrollment aggregation reports.
6. Demonstrate one 401 request and one 403 request in Postman.

## Final submission checklist

- [ ] Replace team-name placeholders in the report with actual names and truthful contribution descriptions.
- [ ] Add screenshots of live Postman responses and a real Socket.IO event after testing.
- [ ] Attach a Postman collection run/export showing success and negative cases.
- [ ] Confirm `.env` and secrets are not committed.
- [ ] Explain the route → middleware → controller → model → MongoDB → response flow.
- [ ] Each member can explain their own commits and make a small live code change.
- [ ] Record known limitations honestly in the report.
