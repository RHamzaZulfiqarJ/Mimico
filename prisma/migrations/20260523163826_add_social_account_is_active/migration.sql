-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "SocialAccount_isActive_idx" ON "SocialAccount"("isActive");
