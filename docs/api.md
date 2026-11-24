# CampusSaathi HTTP API

All routes are under `/api`. Sign-in sets the HTTP-only `campus_session` cookie. Send JSON request bodies unless a route accepts a PDF upload. Errors use `{"message":"…"}`. Entity responses return a record, and list responses return an array unless stated below.

| Routes | Operations |
| --- | --- |
| `GET /health` | Public readiness check, database type, demo status |
| `/auth` | `GET /me`, `GET /demo-users`, `POST /login`, `/register`, `/logout`, `/forgot-password`, `/reset-password` |
| `/users` | `GET/PATCH /profile`, `GET/PUT /preferences` |
| `GET /dashboard` | Signed-in overview with classes, courses, attendance, assignments, events and campus activity |
| `/timetable` | `GET/POST /`, `PATCH /:id`, `GET /export` (iCalendar), `POST /import` (CSV with optional preview) |
| `/assignments`, `/exams`, `/subjects`, `/announcements` | `GET/POST /`. Publishing requires faculty or admin |
| `/assignments/:id/submissions` | `GET` scoped submissions, `POST` signed-in student submission before deadline |
| `/attendance` | `GET /`, staff `GET/PUT /:classId/roster` |
| `/tasks`, `/notes`, `/goals`, `/bookmarks`, `/study-plans`, `/applications`, `/interviews`, `/flashcards`, `/quizzes` | `GET/POST /`, `PATCH/DELETE /:id`, owner-only |
| `/events` | `GET/POST /`, admins `PATCH /:id`, `POST/DELETE /:id/registration`, `POST /:id/save`, `POST /:id/check-in` |
| `/library` | `GET/POST /`, `GET /activity`, `POST/DELETE /:bookId/reservation`, staff `POST /:bookId/issue`, `POST /loans/:id/return` |
| `/documents` | `GET /`, `POST /` with multipart `file`, optional `title`, `kind`, `visibility`, `index`. `GET /:id/file`, owner `DELETE /:id` |
| `/ai` | `GET /status`, `GET/POST /conversations`, `PATCH/DELETE /conversations/:id`, `GET/POST /conversations/:id/messages`, `POST /draft`, `POST /exam-plan`, `POST /study-schedule` |
| `/practice` | `GET/POST /` saved practice decks, `POST /draft`, `GET /attempts`, `POST /:id/attempt` |
| `/careers` | `POST /resume-match`, `GET/POST /sessions`, `PUT /sessions/:id/answers`, `POST /sessions/:id/feedback` |
| `/complaints` | `GET/POST /`, `GET /:id`, `POST /preview`, admin `PATCH /:id`, owner `POST /:id/feedback` |
| `/placements` | `GET /`, admin or placement officer `POST /` |
| `/navigation` | `GET /`, `GET /route?from=&to=&accessible=true`, admin `POST /buildings` and `/edges` |
| `/notifications` | `GET /`, `PATCH /:id/read`, `POST /mark-all-read` |
| `GET /analytics` | Admin aggregates. Accepts `from`, `to`, `format=csv` |
| `/admin` | `GET /accounts?q=&role=&page=` returns `{items,total,page}`; `GET /audit`; `PATCH /users/:id`; `POST /users/:id/reset` |
| `/departments`, `/students`, `/faculty` | Scoped lists. Admin `POST /departments` |

## Common payloads

- Login needs `email` and `password`. Register adds `name`. The server assigns the student role.
- Class writes need `title`, `department`, `section`, `semester`, `room`, `startsAt`, and `endsAt`. Admin writes also need `facultyId`. Schedule mutations reject overlaps for a shared room, faculty member, or cohort.
- Event writes need `title`, `category`, `organizer`, `room`, `description`, ISO `startsAt`, integer `capacity`, and `status` (draft, published or cancelled).
- Complaint creation needs `description`; optional fields are `title`, `locationDetails`, and base64 `image` as a PNG, JPEG, or WebP data URL.
- A message POST accepts `content`, optional `language`, `mode`, `agent`, `documentId`, or `image`. With `regenerate:true`, the latest user prompt is reused. A successful stream sends `data: {"delta":"…"}` followed by `data: {"done":true,"answer":{…}}`. Stream errors send `data: {"error":"…"}`.
- The Socket.IO `notifications:changed` event signals that an authorized client should reload its notifications.

