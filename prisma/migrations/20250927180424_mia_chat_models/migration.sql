-- CreateEnum
CREATE TYPE "public"."ChatMode" AS ENUM ('GENERAL', 'MOOD', 'BONDING', 'HEALTH');

-- CreateEnum
CREATE TYPE "public"."MessageRole" AS ENUM ('MOTHER', 'MIA', 'PROVIDER');

-- CreateEnum
CREATE TYPE "public"."OversightStatus" AS ENUM ('NONE', 'AWAITING_PROVIDER', 'APPROVED', 'MODIFIED');

-- CreateTable
CREATE TABLE "public"."ChatSession" (
    "id" SERIAL NOT NULL,
    "motherId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "seqInDay" INTEGER NOT NULL,
    "mode" "public"."ChatMode" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "role" "public"."MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "oversight" "public"."OversightStatus" NOT NULL DEFAULT 'NONE',
    "relayTicketId" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_motherId_date_idx" ON "public"."ChatSession"("motherId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_motherId_date_seqInDay_key" ON "public"."ChatSession"("motherId", "date", "seqInDay");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "public"."ChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."ChatSession" ADD CONSTRAINT "ChatSession_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."MotherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_relayTicketId_fkey" FOREIGN KEY ("relayTicketId") REFERENCES "public"."RelayTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
