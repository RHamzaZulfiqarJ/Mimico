/*
  Warnings:

  - Added the required column `updatedAt` to the `SocialAccount` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WhatsAppScheduledMessageStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('OUTBOUND', 'INBOUND', 'STATUS');

-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "businessAccountId" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "phoneNumberDisplay" TEXT,
ADD COLUMN     "phoneNumberId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "waId" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT,
    "components" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppScheduledMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "content" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateParams" JSONB,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "WhatsAppScheduledMessageStatus" NOT NULL DEFAULT 'DRAFT',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metaMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "WhatsAppScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "scheduledMessageId" TEXT,
    "socialAccountId" TEXT NOT NULL,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "recipientPhone" TEXT,
    "metaMessageId" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppContact_userId_idx" ON "WhatsAppContact"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_socialAccountId_idx" ON "WhatsAppContact"("socialAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppContact_phoneNumber_idx" ON "WhatsAppContact"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_userId_socialAccountId_phoneNumber_key" ON "WhatsAppContact"("userId", "socialAccountId", "phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_socialAccountId_idx" ON "WhatsAppTemplate"("socialAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_status_idx" ON "WhatsAppTemplate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_socialAccountId_name_language_key" ON "WhatsAppTemplate"("socialAccountId", "name", "language");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_userId_idx" ON "WhatsAppScheduledMessage"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_socialAccountId_idx" ON "WhatsAppScheduledMessage"("socialAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_contactId_idx" ON "WhatsAppScheduledMessage"("contactId");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_status_idx" ON "WhatsAppScheduledMessage"("status");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_scheduledAt_idx" ON "WhatsAppScheduledMessage"("scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_recipientPhone_idx" ON "WhatsAppScheduledMessage"("recipientPhone");

-- CreateIndex
CREATE INDEX "WhatsAppScheduledMessage_metaMessageId_idx" ON "WhatsAppScheduledMessage"("metaMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_scheduledMessageId_idx" ON "WhatsAppMessageLog"("scheduledMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_socialAccountId_idx" ON "WhatsAppMessageLog"("socialAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_direction_idx" ON "WhatsAppMessageLog"("direction");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_metaMessageId_idx" ON "WhatsAppMessageLog"("metaMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_webhookEventId_idx" ON "WhatsAppMessageLog"("webhookEventId");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");

-- CreateIndex
CREATE INDEX "SocialAccount_phoneNumberId_idx" ON "SocialAccount"("phoneNumberId");

-- CreateIndex
CREATE INDEX "SocialAccount_businessAccountId_idx" ON "SocialAccount"("businessAccountId");

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppScheduledMessage" ADD CONSTRAINT "WhatsAppScheduledMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppScheduledMessage" ADD CONSTRAINT "WhatsAppScheduledMessage_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppScheduledMessage" ADD CONSTRAINT "WhatsAppScheduledMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_scheduledMessageId_fkey" FOREIGN KEY ("scheduledMessageId") REFERENCES "WhatsAppScheduledMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
