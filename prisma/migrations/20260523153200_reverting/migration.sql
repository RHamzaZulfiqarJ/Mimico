-- DropForeignKey
ALTER TABLE "ScheduledMessage" DROP CONSTRAINT "ScheduledMessage_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledMessage" DROP CONSTRAINT "ScheduledMessage_socialAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledMessage" DROP CONSTRAINT "ScheduledMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledPost" DROP CONSTRAINT "ScheduledPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppContact" DROP CONSTRAINT "WhatsAppContact_socialAccountId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppContact" DROP CONSTRAINT "WhatsAppContact_userId_fkey";

-- DropIndex (use IF EXISTS since some may have been from previous migration)
DROP INDEX IF EXISTS "ScheduledPost_socialAccountId_idx";
DROP INDEX IF EXISTS "ScheduledPost_status_scheduledAt_idx";
DROP INDEX IF EXISTS "ScheduledPost_userId_idx";
DROP INDEX IF EXISTS "ScheduledPost_status_idx";
DROP INDEX IF EXISTS "SocialAccount_platform_idx";
DROP INDEX IF EXISTS "SocialAccount_userId_idx";
DROP INDEX IF EXISTS "SocialAccount_userId_platform_accountId_key";

-- AlterTable: safely convert status from enum to text, preserving data
ALTER TABLE "ScheduledPost" DROP COLUMN "userId";
ALTER TABLE "ScheduledPost" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ScheduledPost" ALTER COLUMN "status" SET DATA TYPE TEXT USING "status"::TEXT;

-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN "tokenExpiry" TIMESTAMP(3);

-- DropTable
DROP TABLE "ScheduledMessage";

-- DropTable
DROP TABLE "WhatsAppContact";

-- DropEnum
DROP TYPE "ScheduleStatus";

-- CreateIndex
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_accountId_key" ON "SocialAccount"("platform", "accountId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
