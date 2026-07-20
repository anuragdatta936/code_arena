# CodeArena — Real-Time Competitive Programming & Interview Prep Platform

**A $0-budget, resume-grade project combining deep DSA and distributed systems design**

---

## 0. Why this idea, specifically for you

You already have three things most students applying for SDE roles don't:
1. A real competitive programming background (LeetCode ~1797, Codeforces Specialist) — you understand this product as a *user*, not just a builder.
2. Distributed systems experience from Live Traffic Router (Azure, WebSockets, concurrent Bidirectional A*).
3. Claude/OpenAI API integration experience from Shield.

CodeArena is designed to combine all three into one project instead of three separate ones — and it goes noticeably deeper than a CRUD app into the territory interviewers actually probe: sandboxed execution, queueing under load, custom data structures for ranking, and real-time state sync.

---

## 1. The idea

**CodeArena**: a platform where users solve DSA problems against a custom-built online judge, battle each other 1v1 in real time (rating-based matchmaking, like chess.com but for coding), get AI-assisted mock interviews and code review, and climb a live leaderboard.

Think "a slimmed-down LeetCode + CodeSignal, built and owned end-to-end by you."

**Why this over a generic web app**: almost every component has a legitimate, non-decorative reason to use a specific algorithm or system-design pattern. You're not bolting DSA onto a to-do app — the DSA *is* the product.

---

## 2. System architecture

*(See the diagram above — this section explains what each tier does.)*

- **Client**: React web app with a Monaco-based code editor (the actual VS Code editor component, open source, free) and a WebSocket client for live battles.
- **API gateway + auth**: single entry point, JWT-based auth, request validation, rate limiting.
- **Core services**: four logically separate services (can start as modules in one backend, split later) — Judge, Battle, Leaderboard, AI Interview.
- **Job queue (Redis)**: every code submission becomes a job; queue absorbs bursts and lets you scale judging independently of the API.
- **Worker pool**: stateless workers that pull jobs, execute code in a sandbox, and write results back.
- **Data layer**: Postgres as the system of record; Redis doubles as cache + leaderboard store + rate-limit counters.

---

## 3. Component deep dive

### 3.1 Judge engine (code execution sandbox)
Runs untrusted user code safely and measures correctness + performance.
- Each submission spins up a short-lived Docker container with hard limits: `--memory`, `--cpus`, `--pids-limit`, `--network none`, read-only filesystem except a scratch dir.
- Output comparison: exact-match diffing for most problems; a "special judge" mode for problems with multiple valid outputs (e.g. floating-point tolerance, any valid topological order) — this is a real algorithmic design decision, not just `output == expected`.
- Time/memory limits enforced via `cgroups`, not just wall-clock timers (wall-clock alone is exploitable and inaccurate under load).

### 3.2 Submission queue & worker pool
- Redis list (or Redis Streams for replay/consumer groups) as the queue backbone — `BRPOPLPUSH` pattern gives you at-least-once delivery with a reliable "processing" list you can recover from if a worker crashes.
- **Priority queue**: paid/contest submissions jump the line — implemented with a min-heap keyed by (priority, timestamp) rather than FIFO.
- Workers are stateless and horizontally scalable — this is the "scale out, not up" story interviewers want to hear.

### 3.3 Real-time battle mode
- Two users matched by rating, given the same problem, race to solve it — live opponent progress bar over WebSockets.
- **Matchmaking**: maintain users-in-queue sorted by rating (a balanced BST or a sorted skip-list structure) so finding the nearest-rated opponent is O(log n) instead of scanning a list.
- **Rating system**: implement Glicko-2 or classic ELO yourself — it's genuinely non-trivial math (expected score function, K-factor / rating deviation updates) and shows you can implement a spec correctly, not just call a library.
- Reconnection handling: if a socket drops mid-battle, state must be recoverable from the server's source of truth, not lost.

### 3.4 Plagiarism / anti-cheat detection
This is the single highest DSA-density component — genuinely impressive in an interview.
- **Rabin–Karp rolling hash**: fingerprint code in O(n) instead of O(n²) pairwise comparison.
- **Winnowing algorithm** (the technique behind MOSS, Stanford's plagiarism detector): tokenize code, hash k-grams, keep only local minima hashes — this makes the fingerprint robust to variable renaming, reordering, and whitespace changes, which naive hashing is not.
- Flag submission pairs above a similarity threshold for review rather than auto-rejecting (false positives are costly).

### 3.5 Leaderboard / ranking service
- **Option A (production-pragmatic)**: Redis sorted sets (`ZADD`/`ZRANK`), which are backed by a skip list internally — O(log n) insert and rank queries.
- **Option B (DSA-flex, build it yourself)**: implement a **Fenwick Tree (Binary Indexed Tree)** over rating buckets to answer "what percentile is this user in" in O(log n) instead of resorting the whole table. Doing *both* — Redis for the live leaderboard, your own Fenwick Tree for percentile analytics — gives you a genuine "I used the right tool, and I also understand what's under the hood" story.

### 3.6 Recommendation engine
- Model problems and their prerequisite tags as a graph (e.g. "two pointers" before "sliding window optimizations"); use graph traversal (BFS/topological ordering) to recommend the next unlocked concept.
- Layer in spaced repetition (the SM-2 algorithm, the same one Anki uses) so problems you got wrong resurface at increasing intervals — directly useful for your own LeetCode grinding, so you can dogfood it.

### 3.7 Rate limiter
- Implement token bucket (or sliding-window log) yourself rather than pulling a library — it's a small, self-contained algorithm that's a very common interview question, and here it's load-bearing in a live system.

### 3.8 Caching layer
- Build a custom **LRU cache** (hashmap + doubly linked list, O(1) get/put) for hot data like problem statements and user profiles, in front of Postgres. This is one of the most-asked DSA interview questions — having it running in production, not just on LeetCode, is a strong talking point.

### 3.9 AI mock interview / code review assistant
- Reuse the Claude API integration pattern from Shield: after a submission, optionally send the code + verdict to Claude for a short review (complexity analysis, style feedback, alternative approaches) or run a simulated verbal interview (Claude asks follow-up questions about the approach).
- Design this as an *optional*, feature-flagged call — if the AI service is slow or down, the judge verdict still returns immediately (a small but real circuit-breaker pattern).

### 3.10 Auth & API gateway
- JWT access + refresh tokens, OAuth login (GitHub — natural for a dev-tool audience), request validation at the edge before it touches any service.

---

## 4. Database design (Postgres)

Core tables:
- `users` (id, email, rating, created_at, plan)
- `problems` (id, title, difficulty, tags[], time_limit_ms, memory_limit_mb)
- `testcases` (id, problem_id, input, expected_output, is_sample)
- `submissions` (id, user_id, problem_id, language, code, status, created_at)
- `submission_results` (submission_id, verdict, runtime_ms, memory_kb, testcase_id)
- `contests` / `contest_problems`
- `battles` (id, player_a, player_b, problem_id, winner, started_at, ended_at)
- `ratings_history` (user_id, rating, delta, reason, created_at)
- `plagiarism_flags` (submission_id_a, submission_id_b, similarity_score)

Indexing choices worth documenting on your resume/README:
- Composite index on `(problem_id, status)` for fast "how many people solved this" queries.
- Index on `(user_id, created_at)` for a user's submission history.
- Partial index on `submissions WHERE status = 'pending'` to keep queue-recovery scans cheap.
- GIN index on `problems.tags` for tag-based search/filtering.

---

## 5. System design principles this demonstrates

- **CAP trade-offs, applied deliberately**: submissions are strongly consistent (Postgres, never lose a verdict); the leaderboard is eventually consistent (Redis cache, refreshed async) — and you can explain *why* each choice was made, which is exactly what system design interviews probe.
- **Idempotency**: submission endpoint accepts an idempotency key so a client retry after a timeout doesn't double-judge the same code.
- **Backpressure**: if queue depth crosses a threshold, the API returns `429` with `Retry-After` instead of accepting unbounded work.
- **Graceful degradation**: AI review is optional and fails open; judge verdicts are the critical path and never depend on it.
- **Horizontal scaling**: workers are stateless and independently scalable from the API tier.
- **Observability**: correlation IDs propagated from submission → queue → worker → result, so a single submission's path through the whole system is traceable in logs.

---

## 6. DSA → real-world mapping (your interview cheat sheet)

| Algorithm / structure | Where it's used | Why it's the right tool |
|---|---|---|
| Rolling hash (Rabin–Karp) | Plagiarism detection | O(n) fingerprinting vs. O(n²) naive pairwise diff |
| Winnowing | Code similarity fingerprinting | Robust to renaming/reordering, unlike naive hashing |
| Fenwick Tree (BIT) | Leaderboard percentile lookup | O(log n) update + rank query |
| Skip list (via Redis ZSET) | Live leaderboard | O(log n) insert/rank at scale |
| Min-heap / priority queue | Submission scheduling | Paid/contest jobs pre-empt free-tier jobs in O(log n) |
| Token bucket | API rate limiting | O(1) amortized check, smooths bursts |
| LRU cache (hashmap + DLL) | Problem/profile caching | O(1) get/put, classic interview question in production |
| Graph traversal (BFS) | Tag prerequisite recommendations | Correct ordering through a dependency graph |
| SM-2 spaced repetition | Problem resurfacing | Interval scheduling based on recall performance |
| ELO / Glicko-2 | Battle rating updates | Probabilistic skill estimation from match outcomes |

---

## 7. Tech stack at $0 cost

| Component | Choice | Why free |
|---|---|---|
| Frontend hosting | Vercel (free tier) | Generous free tier for React/Next.js |
| Backend + judge workers | Oracle Cloud "Always Free" VM (4 ARM OCPUs, 24GB RAM) | Genuinely free forever, real VM — you need this for Docker-based sandboxing |
| Database | Supabase or Neon (free Postgres tier) | 500MB+, enough for an MVP |
| Cache / queue | Upstash Redis (free tier) | Serverless Redis, free request quota |
| Sandboxing | Docker (self-hosted on the Oracle VM) | Free, and the isolation work is itself a resume point |
| CI/CD | GitHub Actions | Free for public repos |
| Monitoring | Grafana Cloud free tier / self-hosted Prometheus | Free tier covers a solo project easily |
| Email notifications | Resend or Brevo free tier | Free quota sufficient for MVP volume |
| AI review | Anthropic API | Pay-as-you-go, tiny cost per call if you cap usage — the only line item that isn't strictly $0, keep a hard rate limit on it |

---

## 8. Build roadmap (roughly 10–12 weeks, part-time)

1. **Week 1** — Repo, CI/CD, auth, Postgres schema, deploy skeleton to free infra.
2. **Weeks 2–3** — Judge engine MVP: one language, Docker sandbox, submission API, Redis-backed worker queue.
3. **Weeks 4–5** — Problem catalog, custom LRU cache, rate limiter, frontend with Monaco editor.
4. **Weeks 6–7** — Leaderboard service (Fenwick Tree + Redis ZSET), timed contest mode.
5. **Weeks 8–9** — Real-time 1v1 battle mode: WebSockets, ELO/Glicko-2, matchmaking.
6. **Week 10** — Plagiarism detection (Rabin–Karp + Winnowing).
7. **Week 11** — Recommendation engine + AI mock interview integration.
8. **Week 12** — Load testing, observability, polish, README + demo video, deploy.

Ship the judge engine + problem catalog first — that alone is already a legitimate, demoable project if time runs short later.

---

## 9. Monetization — realistic expectations

Be honest with yourself here: as a solo, zero-marketing-budget project, meaningful revenue is unlikely in the short term. The primary ROI is the resume/interview leverage. That said, plausible small income paths:
- Freemium: free daily problems + limited battles; paid tier unlocks unlimited AI mock interviews and advanced analytics (a few hundred rupees/month).
- Run a paid mock-interview bootcamp for juniors at your own college using the platform you built — modest, but real revenue and a nice "customers, not just users" line for your resume.
- Sponsored contests (small ed-tech/bootcamp sponsors pay a flat fee to run a branded contest on your platform).

Don't build the business model first — build the product, get a few dozen real users (your own college is a natural first audience), and let monetization ideas prove or disprove themselves.

---

## 10. Resume / interview framing

List it as **Independent Developer (Self-Employed)** with dates, not as a "hobby project" — the scope justifies it. Draft bullets (fill in real numbers once measured, don't estimate):

- Designed and built CodeArena, a distributed competitive-programming platform with real-time code execution, live rating-based 1v1 battles, and AI-assisted interview prep, architected and shipped independently end-to-end.
- Built a sandboxed code execution pipeline (Docker resource isolation + cgroups) behind a Redis-backed priority job queue, scaling judging horizontally across independent worker processes.
- Implemented a plagiarism-detection engine using Rabin–Karp rolling hashes and the Winnowing fingerprinting algorithm to catch near-duplicate submissions robust to variable renaming and reordering.
- Designed a leaderboard/ranking service using a custom Fenwick Tree for O(log n) percentile computation, alongside Redis sorted sets for horizontally scalable live rank queries.
- Implemented Glicko-2-based skill rating and O(log n) rating-based matchmaking for real-time WebSocket coding battles, including reconnection and state-recovery handling.

Be ready to explain trade-offs out loud (why Redis queue over Kafka at this scale, why Docker over gVisor/Firecracker, why eventual consistency is fine for the leaderboard but not for submissions) — that's what separates "I built a project" from "I made a design decision and can defend it," which is what SDE interviews are actually testing.

---

## 11. Risks & how to mitigate them

- **Scope creep**: the full feature set above is ambitious for a solo student. Treat the judge engine + leaderboard as the non-negotiable core; battles, plagiarism detection, and recommendations are stretch goals you can cut if time runs short without losing the project's credibility.
- **Sandboxing security**: running arbitrary user code is genuinely risky. Never skip the resource limits and `--network none` — document this explicitly in your README, since interviewers will ask about it.
- **Free-tier limits**: Oracle's free VM and Upstash's free Redis have caps. Fine for a portfolio project with real but modest traffic; note this as a known scaling boundary in your README rather than pretending it's infinite.
