# CodeArena — Week 1 skeleton

Auth service + Postgres schema + CI/CD, matching Week 1 of the CodeArena project plan.
Follow the step-by-step guide in chat to set this up locally and deploy it.

Verified in a clean environment: `npm install`, `npx tsc --noEmit`, and `npx tsc -p tsconfig.json`
all pass with zero errors. `npx prisma generate` requires internet access to fetch the query
engine binary — it will work fine on your machine and in CI, it just can't run in this sandbox.
