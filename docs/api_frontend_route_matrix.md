# API routes ↔ frontend (`frontend/src/lib/api.ts`)

Maps Express routes in `api/src/index.js` to the typed client. Routes with **no** `api.ts` wrapper are internal, manual, or test-only.

| Method | API route | Frontend (`api.ts` or page) | Role / notes |
| --- | --- | --- | --- |
| — | `GET /health` | — | Used by ops-001 / load balancers; not in SPA client |
| — | `POST /enqueue` | — | Dev-only queue smoke test; **404 in production** (`NODE_ENV === "production"`) |
| GET | `/api/private` | — | Auth probe; not used by app shell |
| GET/PUT | `/api/me` | `fetchMe`, `updateProfile` | Authenticated user |
| GET | `/api/users/:id` | — | Public profile by Mongo id (not wired in SPA) |
| POST | `/api/users/batch` | `batchFetchUsers` | Resolve display names |
| DELETE | `/api/account` | `deleteAccount` | Account deletion |
| POST | `/api/notes` | `createNote` | Topic access enforced server-side |
| POST | `/api/materials/:id/flashcards` | `generateFlashcards` | AI rate limit + circuit breaker |
| POST | `/api/materials/:id/summary` | `generateSummary` | Same |
| GET | `/api/jobs/:id` | `fetchJobStatus` | Job owner (auth-006) |
| GET | `/api/jobs` | `fetchJobs` | Caller’s jobs |
| GET | `/api/materials` | `fetchAllMaterials` | Filter query |
| GET | `/api/topics/:id/materials` | `fetchTopicMaterials` | |
| GET | `/api/materials/:id` | `fetchMaterial` | |
| GET/PUT/DELETE | `/api/materials/:id/note` | `fetchNote`, `updateNote`, `deleteNote` | |
| POST | `/api/flashcard-sets` | `createFlashcardSet` | |
| GET/PUT | `/api/materials/:id/flashcard-set` | `fetchFlashcardSet`, (update via cards) | |
| GET | `/api/flashcard-sets/:id/cards` | `fetchFlashcards` | |
| PUT | `/api/materials/:id/cards` | `updateFlashcard` | `:id` is **flashcard** `_id` (see `getFlashcardAccessContext`) |
| POST | `/api/flashcard-sets/:id/cards` | `createFlashcard` | |
| DELETE | `/api/flashcards/:id` | `deleteFlashcard` | |
| POST/GET | `/api/groups`, `/api/groups` | `createGroup`, `fetchGroups` | |
| GET | `/api/groups/available` | `fetchAvailableGroups` | Public groups (no joinCode) not yet joined — Browse section of Join Group page |
| POST | `/api/groups/join` | `joinGroup` | **Private/unlisted group** — requires `joinCode` in body; self-join only; used by "Join with a Code" card |
| PUT/DELETE | `/api/groups/:id` | `updateGroup`, `deleteGroup` | Owner-only |
| POST/DELETE | `/api/groups/:id/members` | `addMember`, `removeMember` | **Public self-join only** for non-owner (Browse section); owner can add any user; non-owner cannot add others |
| POST | `/api/groups/:id/leave` | `leaveGroup` | Self leave |
| POST/GET/PUT/DELETE | `/api/topics` … | `createTopic`, `fetchTopics`, `updateTopic`, `deleteTopic` | Owner / group membership |
| POST | `/api/topics/batch-delete` | `batchDeleteTopics` | |
| DELETE/POST | `/api/materials/:id`, `/api/materials/batch-delete` | `deleteMaterial`, `batchDeleteMaterials` | |

**Mismatch check (2026-03):** No blocking gaps found: group owner flows use `updateGroup` with `memberIds` where the UI exposes management; `JoinGroup` uses `addMember` for public self-join and `joinGroup` for code-gated private join, both aligned with API enforcement.

**Join flow summary:**

| Group type | Discovery | Join API |
| --- | --- | --- |
| Public (no `joinCode`) | `GET /api/groups/available` | `POST /api/groups/:id/members` (self) |
| Private (`joinCode` set) | Out-of-band (owner shares code) | `POST /api/groups/join` (code in body) |

**Future work:** Owner-driven invite UI (select a user or send an invite link) is not yet implemented. Current model: owner can add others via `POST /api/groups/:id/members` (API-only, no UI) or share a join code for private groups.
