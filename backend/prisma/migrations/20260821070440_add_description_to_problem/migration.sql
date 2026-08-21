-- DropIndex
DROP INDEX "problems_tags_idx";

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE INDEX "problems_tags_gin_idx" ON "problems" USING GIN ("tags");
