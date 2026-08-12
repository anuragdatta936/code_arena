-- CreateIndex
CREATE INDEX "submissions_problem_status_idx" ON "submissions"("problemId", "status");

-- CreateIndex
CREATE INDEX "submissions_user_created_idx" ON "submissions"("userId", "createdAt");
