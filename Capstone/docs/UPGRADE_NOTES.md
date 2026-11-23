# Upgrade notes

This document describes changes introduced by the capstone polish patch. The base project structure and Project 1 scope are retained.

## Correctness and privacy

- Student enrollment list and item reads are restricted to the authenticated student. A student cannot enumerate another student's enrollment record by changing a query parameter or URL ID.
- Faculty attendance summaries now apply a section filter before the aggregation, not only an initial permission check. This prevents summaries from including attendance in other faculties' sections.
- Attendance marking rejects a repeated student/session request. A correction must use the PATCH endpoint and include a correction note. If a concurrent duplicate is detected during a multi-student request, records inserted earlier in that same request are removed before the conflict response is returned.
- Enrollments can be read, status-managed and removed using item routes. Attendance records can be read, corrected and administratively deleted.

## Capacity integrity

- `sections.enrolledCount` stores the number of active enrollments for the section.
- The server rebuilds this count from enrollment documents after connecting to MongoDB.
- Enrollment, drop, reactivation and deletion update the counter using atomic MongoDB update operations.
- Capacity reduction is guarded by an atomic `$expr` condition, so the new capacity cannot be below the active enrollment count at the time the update is applied.
- This counter-based design assumes one running API instance. Do not horizontally scale this version without changing the seat reservation strategy.

## Error responses

Unexpected server errors are logged on the server and return a generic HTTP 500 response. Validation, cast and duplicate-key errors retain suitable client-facing status codes without exposing unexpected internal stack details.

## Verification levels

- `npm test`: source-level contract checks for the key authorization, capacity and route guarantees.
- `node --check`: syntax checks for server and changed JavaScript files.
- Postman + MongoDB: required live integration verification; capture actual responses and run exports before final submission.

The project includes genuine captures of the local repository structure, OpenAPI contract, Postman collection and successful source-contract test output. These are repository/test artefacts, not live API integration screenshots. Capture Postman and Socket.IO runtime evidence after starting MongoDB and the Express server.
