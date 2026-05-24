-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('pending', 'processing', 'posted', 'failed');

-- DropForeignKey
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_userId_fkey";

-- DropIndex
DROP INDEX "SocialAccount_platform_accountId_key";

-- Step 1: Add userId as NULLABLE first (safe for existing rows)
ALTER TABLE "ScheduledPost" ADD COLUMN "userId" TEXT;

-- Step 2: Backfill userId from the related SocialAccount
UPDATE "ScheduledPost"
SET "userId" = "SocialAccount"."userId"
FROM "SocialAccount"
WHERE "ScheduledPost"."socialAccountId" = "SocialAccount"."id";

-- Step 3: Now make userId NOT NULL (all rows have been populated)
ALTER TABLE "ScheduledPost" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Convert status column to enum type
ALTER TABLE "ScheduledPost"
DROP COLUMN "status",
ADD COLUMN "status" "ScheduleStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "SocialAccount" DROP COLUMN "tokenExpiry";

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ScheduleStatus" NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppContact_userId_idx" ON "WhatsAppContact"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_socialAccountId_idx" ON "WhatsAppContact"("socialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_userId_socialAccountId_phoneNumber_key" ON "WhatsAppContact"("userId", "socialAccountId", "phoneNumber");

-- CreateIndex
CREATE INDEX "ScheduledMessage_status_idx" ON "ScheduledMessage"("status");

-- CreateIndex
CREATE INDEX "ScheduledMessage_scheduledAt_idx" ON "ScheduledMessage"("scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledMessage_userId_idx" ON "ScheduledMessage"("userId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_socialAccountId_idx" ON "ScheduledMessage"("socialAccountId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_contactId_idx" ON "ScheduledMessage"("contactId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_status_scheduledAt_idx" ON "ScheduledMessage"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");

-- CreateIndex
CREATE INDEX "ScheduledPost_userId_idx" ON "ScheduledPost"("userId");

-- CreateIndex
CREATE INDEX "ScheduledPost_socialAccountId_idx" ON "ScheduledPost"("socialAccountId");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_scheduledAt_idx" ON "ScheduledPost"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_accountId_key" ON "SocialAccount"("userId", "platform", "accountId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
