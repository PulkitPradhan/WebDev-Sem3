# Database Design

MongoDB collections use Mongoose schemas and ObjectId references. Collections are `users`, `courses`, `sections`, `enrollments`, `attendances` and `announcements`.

## Collections and relationships

| Collection | Main fields | Relationships and validation |
|---|---|---|
| User | `name`, `email`, `passwordHash`, `role`, `studentId`, `department`, `active`, refresh token hash/expiry | Role enum: admin/faculty/student. Email is unique. Password and refresh hash fields are excluded from reads/serialization. |
| Course | `code`, `title`, `description`, `credits`, `department`, `active` | Unique course code; credits constrained to 1–12. |
| Section | `course`, `faculty`, `name`, `term`, `capacity`, `enrolledCount`, `active` | References Course and faculty User. Unique course/name/term combination. `enrolledCount` tracks active seats and is rebuilt on startup. |
| Enrollment | `student`, `section`, `status`, `enrolledAt` | References student User and Section. Unique student/section pair; status enrolled/dropped. |
| Attendance | `student`, `section`, `sessionDate`, `status`, `markedBy`, `correctionNote` | References student, section and marking User. Status present/absent/late. Unique student/section/date session. |
| Announcement | `title`, `body`, `audience`, `section`, `course`, `createdBy`, `publishedAt` | Audience university/section/course; target references as needed; creator references User. |

Relationship summary:

```text
User (faculty) ──< Section >── Course
User (student) ──< Enrollment >── Section
User (student) ──< Attendance >── Section
User (creator) ──< Announcement >── Course / Section
```

## Indexes

1. `users.email` unique index supports account lookup and prevents duplicate accounts.
2. `users.role` supports role-filtered administration.
3. `sections(course, name, term)` unique index prevents duplicate section identifiers.
4. `enrollments(student, section)` unique index prevents duplicate enrollment.
5. `attendances(student, section, sessionDate)` unique index prevents duplicate student attendance for a session.
6. `attendances(section, sessionDate desc)` supports class roster/date lookups.
7. Single-field references on section, student, course, and announcement audience improve joins/filters.

## Aggregations

- Attendance subject summary groups records by section and student, calculates attended/total and percentage, then looks up section and course metadata.
- Low attendance report groups by student and section, filters by a configurable percentage threshold, then joins student/course details.
- Enrollment report joins enrollments to sections and courses, then groups to produce section-wise counts.
