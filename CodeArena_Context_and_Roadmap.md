# CodeArena — Project Context & Roadmap

**Purpose of this file**: this is the handoff document for continuing this project in Claude Code. It contains everything decided and built so far, why it was built that way, what's left, and a ready-to-paste starting prompt. Paste this whole file (or point Claude Code at it) at the start of a session so nothing has to be re-explained.

---

## 0. What this project is

**CodeArena** — a real-time competitive programming judge + 1v1 coding battle platform with AI-assisted mock interviews. Built solo, at $0 cost, specifically to be listed as **Independent Developer (Self-Employed)** on a resume — the goal is genuine DSA and system-design depth (a custom judge engine, plagiarism detection via rolling hashes, a hand-built Fenwick Tree leaderboard, ELO/Glicko-2 matchmaking), not a minimal CRUD MVP. Real income is a secondary, uncertain bonus — the primary ROI is interview-defensible engineering decisions.

Builder background: strong competitive programming (LeetCode ~1797, Codeforces Specialist), prior projects include a distributed traffic router (Azure, WebSockets, concurrent Bidirectional A*) and a Claude/OpenAI-API-integrated project (Shield). No professional work experience yet — this project is meant to fill that gap credibly.

---

## 1. Current state — Week 1 is complete

### Repo
- GitHub: `anuragdatta936/code_arena` (private), `main` branch
- Root layout:
  ```
  .github/workflows/    ci.yml (active), deploy.yml (dead — see note below)
  backend/               all backend source
  BACKEND_WEEK1.md
  CodeArena_Project_Plan.md   (the original full project plan — read this too for the complete DSA/system-design rationale, all 12 weeks, and resume bullet drafts)
  ```

### Stack decisions (locked in, carry forward)
- **Language/runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Validation**: Zod
- **Auth**: JWT (custom-built, no auth-as-a-service)

### Backend file structure (`backend/src/`)
```
config/
  env.ts         # Zod-validated env vars, fails fast on boot if misconfigured
  prisma.ts      # shared PrismaClient singleton
middleware/
  auth.ts        # `authenticate` — verifies Bearer access token, attaches userId/userEmail to req
  errorHandler.ts
routes/
  auth.routes.ts     # POST /register /login /refresh /logout, GET /me (protected)
  health.routes.ts   # GET / — also runs SELECT 1 against Postgres, not just a liveness ping
controllers/
  auth.controller.ts # Zod-validates request bodies, calls services, shapes responses
services/
  auth.service.ts    # registerUser, loginUser — bcrypt (cost factor 12), throws AuthError
  token.service.ts   # issueTokenPair, rotateRefreshToken, revokeRefreshToken
utils/
  jwt.ts         # sign/verify for access + refresh tokens
app.ts           # helmet, cors, json, route mounting, error handler
server.ts        # listens on env.PORT
```

Other backend files: `prisma/schema.prisma`, `docker-compose.yml` (local Postgres only), `Dockerfile` (built, currently **unused** in deployment — see note), `ecosystem.config.js` (pm2 config, also currently **unused**), `.env.example`, `package.json`, `tsconfig.json`.

### Auth design (the actual security-relevant decisions — preserve these when extending)
- Passwords hashed with bcrypt, cost factor 12.
- Access tokens: JWT, 15 min expiry.
- Refresh tokens: JWT, 7 day expiry, but **the token itself isn't what grants access** — each one is SHA-256 hashed and stored in a `refresh_tokens` table (`userId`, `tokenHash`, `expiresAt`, `revoked`). A DB leak alone doesn't yield usable tokens.
- **Rotation on every refresh**: calling `/refresh` issues a brand-new pair and revokes the old refresh token's DB row. A stolen refresh token reused after the legitimate user already rotated it fails, because it's already revoked.
- `/logout` revokes a specific refresh token by hash.
- Register/login return the same generic "Invalid email or password" error and don't leak which emails exist.

### Database schema so far
```prisma
model User {
  id, email (unique), passwordHash, rating (default 1200), plan (default "free"), createdAt
  refreshTokens RefreshToken[]
}
model RefreshToken {
  id, tokenHash (unique), userId (FK), expiresAt, revoked (default false), createdAt
}
```
(Full future schema — `problems`, `testcases`, `submissions`, `contests`, `battles`, `ratings_history`, `plagiarism_flags` — is designed in `CodeArena_Project_Plan.md` section 4. Not yet implemented.)

### CI/CD
- **`ci.yml`** (active, verified passing): on push/PR to `main` — spins up an ephemeral Postgres service container in GitHub Actions, runs `prisma migrate deploy` against it for real (not just typecheck), then `tsc --noEmit`, then `npm run build`.
- **`deploy.yml`** — **dead code**, written for an Oracle Cloud VM SSH-based deploy (`appleboy/ssh-action`) that was never used (see pivot below). Has no matching `VM_HOST`/`VM_USER`/`VM_SSH_KEY` secrets configured, so it would fail if it ever ran. Safe to delete; Claude Code should flag this as cleanup if it notices it.

### Deployment — pivoted from the original plan
The original plan called for an Oracle Cloud "Always Free" VM (chosen specifically because Week 2+ needs real Docker-in-Docker for sandboxing user code). **That plan hit a real blocker: no credit card available**, and Oracle's free tier requires one for identity verification even though it never charges. Pivoted to:

- **Hosting**: Render (free web service tier, no card required)
  - Service name: `codearena-api`, region: Singapore
  - **Language: Node** (not Docker — this was a deliberate fix; Render auto-detected the Dockerfile and defaulted to Docker language, which would have used the Dockerfile's `CMD` and silently skipped `prisma migrate deploy`. Switched to Node language explicitly so the custom Start Command runs migrations.)
  - Root directory: `backend`
  - Build Command: `npm ci && npx prisma generate && npm run build`
  - Start Command: `npx prisma migrate deploy && npm start`
  - Env vars set: `NODE_ENV`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`
  - Auto-deploys on every push to `main` — no SSH/manual deploy step needed
- **Database**: Postgres on Supabase or Neon free tier (whichever was actually provisioned — confirm connection host in the live `DATABASE_URL` if unsure)
- **Verified live**: `/health` returns `{"status":"ok"}`, and the full register → login → `/me` flow was tested successfully against the deployed URL.

**Known limitation carried forward**: Render's free tier spins down after 15 min idle (~30–60s cold start on the next request) — fine for a portfolio demo, but **Render's free web services do not support Docker-in-Docker**, which the Week 2 judge engine needs to sandbox arbitrary user code. **Decision**: Use Fly.io (free allowance, real Firecracker micro-VMs, no card needed) for worker nodes. API remains on Render.

---

## 2. Constraints to keep carrying forward

- **$0 budget, no credit card.** Every new service added from here needs a genuine free tier that doesn't require card verification. Fly.io is the leading candidate for anything needing real container/VM access.
- **This is deliberately over-engineered relative to a minimal MVP**, on purpose — every component should have a defensible algorithmic or system-design reason, because the point is interview-ready depth, not shipping speed. Don't let Claude Code "simplify" toward a generic CRUD implementation without flagging the trade-off first.
- **Match existing code conventions**: layered structure (routes → controllers → services), Zod validation at the controller boundary, Prisma as the only DB access layer, explanatory comments on *why* a security/design decision was made (not just what the code does) — the existing auth code is the style reference.

---

## 3. Roadmap — what's left (Weeks 2–12)

| Week | Focus | Key deliverables |
|---|---|---|
| 2–3 | **Judge engine MVP** | Docker-sandboxed code execution (`--memory`, `--cpus`, `--pids-limit`, `--network none`), one language to start (Python), submission API, Redis-backed job queue (BRPOPLPUSH), worker pool pulling from queue. **Completed**: API routes/controllers/services, Prisma Submission model, Problem/Testcase tables, Redis config, Docker executor utility, worker implementation, problem-specific time/memory limits, Fly.io worker deployment configuration, reliable BRPOPLPUSH job queue with crash recovery, accurate memory usage reporting. **Remaining**: Special judge mode for multiple valid outputs, queue monitoring/metrics, priority queue with min-heap (Week 6-7), idempotency keys + 429/Retry-After backpressure (Week 4-5), submission_results table normalization (Week 6-7). |
| 4–5 | **Problem catalog + frontend** | Problem/testcase tables, custom LRU cache (hashmap + doubly linked list) in front of hot reads, token-bucket rate limiter with idempotency keys and 429/Retry-After backpressure, React frontend with Monaco editor. |
| 6–7 | **Leaderboard + contests** | Redis sorted sets for the live leaderboard; a hand-built Fenwick Tree for O(log n) percentile lookups (the DSA differentiator — don't skip this in favor of Redis alone); timed contest mode; priority queue with min-heap for paid/contest submissions; submission_results table normalization for per-testcase historical results. |
| 8–9 | **Real-time battles** | WebSocket-based 1v1 battles, ELO or Glicko-2 rating implementation, rating-sorted matchmaking (balanced BST/skip-list for nearest-rating lookup), reconnection/state-recovery handling. |
| 10 | **Plagiarism detection** | Rabin–Karp rolling hash + Winnowing algorithm (MOSS-style) fingerprinting, flagged (not auto-rejected) similarity pairs; special judge mode for problems with multiple valid outputs (floating-point tolerance, etc.). |
| 11 | **Recommendation engine + AI features** | Tag/prerequisite graph traversal for recommendations, SM-2 spaced repetition for resurfacing missed problems, Claude API integration for mock interview feedback (reuse the pattern from the Shield project) — feature-flagged so it fails open if the AI call is slow/down. |
| 12 | **Hardening + polish** | Observability (correlation IDs end-to-end), load testing, README + architecture writeup, demo video, resume bullets finalized with real numbers. |

Full algorithmic rationale, the DSA→real-world mapping table, the complete future DB schema, and draft resume bullets all live in `CodeArena_Project_Plan.md` — Claude Code should read that alongside this file.
