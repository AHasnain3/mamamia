-- CreateEnum
CREATE TYPE "public"."DeliveryType" AS ENUM ('VAGINAL', 'C_SECTION', 'VBAC', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MoodScore" AS ENUM ('VERY_LOW', 'LOW', 'NEUTRAL', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "public"."BleedingLevel" AS ENUM ('NONE', 'LIGHT', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "public"."FeedingMode" AS ENUM ('BREAST', 'PUMP', 'FORMULA', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('PENDING', 'ANSWERED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PpdStage" AS ENUM ('UNDIAGNOSED', 'ACUTE', 'SUBACUTE', 'DELAYED');

-- CreateEnum
CREATE TYPE "public"."RiskSignal" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateTable
CREATE TABLE "public"."MotherProfile" (
    "id" SERIAL NOT NULL,
    "preferredName" TEXT NOT NULL,
    "deliveryType" "public"."DeliveryType" NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "contactMethods" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tz" TEXT,
    "ppdStage" "public"."PpdStage" NOT NULL DEFAULT 'UNDIAGNOSED',

    CONSTRAINT "MotherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CheckIn" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mood" "public"."MoodScore" NOT NULL,
    "sleepMin" INTEGER NOT NULL,
    "painScore" INTEGER NOT NULL,
    "bleeding" "public"."BleedingLevel" NOT NULL,
    "feeding" "public"."FeedingMode" NOT NULL,
    "flags" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CareContact" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "emailSMS" TEXT NOT NULL,
    "consented" BOOLEAN NOT NULL DEFAULT false,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RelayTicket" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riskFlags" JSONB NOT NULL,
    "summarySnapshot" JSONB NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'PENDING',
    "providerLinkExpiry" TIMESTAMP(3),

    CONSTRAINT "RelayTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderDraft" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "draftText" TEXT NOT NULL,
    "modelMeta" JSONB NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderReply" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "finalText" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackByMother" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProviderReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WearableSample" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sleepMin" INTEGER,
    "hrvMs" INTEGER,
    "steps" INTEGER,
    "restingHr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WearableSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyPrompt" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "prompts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiaryEntry" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "freeText" TEXT NOT NULL,
    "responses" JSONB,
    "riskSignal" "public"."RiskSignal",
    "redactedNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderAlert" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "signal" "public"."RiskSignal" NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_motherId_date_idx" ON "public"."CheckIn"("motherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_motherId_date_key" ON "public"."CheckIn"("motherId", "date");

-- CreateIndex
CREATE INDEX "CareContact_motherId_idx" ON "public"."CareContact"("motherId");

-- CreateIndex
CREATE INDEX "RelayTicket_motherId_idx" ON "public"."RelayTicket"("motherId");

-- CreateIndex
CREATE INDEX "RelayTicket_providerLinkExpiry_idx" ON "public"."RelayTicket"("providerLinkExpiry");

-- CreateIndex
CREATE INDEX "ProviderDraft_ticketId_idx" ON "public"."ProviderDraft"("ticketId");

-- CreateIndex
CREATE INDEX "ProviderReply_ticketId_idx" ON "public"."ProviderReply"("ticketId");

-- CreateIndex
CREATE INDEX "WearableSample_motherId_date_idx" ON "public"."WearableSample"("motherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WearableSample_motherId_date_key" ON "public"."WearableSample"("motherId", "date");

-- CreateIndex
CREATE INDEX "DailyPrompt_motherId_date_idx" ON "public"."DailyPrompt"("motherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPrompt_motherId_date_key" ON "public"."DailyPrompt"("motherId", "date");

-- CreateIndex
CREATE INDEX "DiaryEntry_motherId_date_idx" ON "public"."DiaryEntry"("motherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_motherId_date_key" ON "public"."DiaryEntry"("motherId", "date");

-- CreateIndex
CREATE INDEX "ProviderAlert_motherId_createdAt_idx" ON "public"."ProviderAlert"("motherId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."CheckIn" ADD CONSTRAINT "CheckIn_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareContact" ADD CONSTRAINT "CareContact_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RelayTicket" ADD CONSTRAINT "RelayTicket_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProviderDraft" ADD CONSTRAINT "ProviderDraft_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."RelayTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProviderReply" ADD CONSTRAINT "ProviderReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."RelayTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WearableSample" ADD CONSTRAINT "WearableSample_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPrompt" ADD CONSTRAINT "DailyPrompt_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiaryEntry" ADD CONSTRAINT "DiaryEntry_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProviderAlert" ADD CONSTRAINT "ProviderAlert_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProviderAlert" ADD CONSTRAINT "ProviderAlert_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."DiaryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
