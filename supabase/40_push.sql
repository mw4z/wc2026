-- Phase: Web Push reminders.
-- Paste this into the Supabase SQL Editor (this project initializes/migrates the
-- DB via the SQL editor, not `prisma migrate deploy`). Idempotent-ish: wrapped in
-- a transaction; safe to run once. Re-running will error on existing objects.

BEGIN;

-- Browser push subscriptions (one row per device/browser per user).
CREATE TABLE "PushSubscription" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "endpoint"  TEXT NOT NULL,
    "p256dh"    TEXT NOT NULL,
    "auth"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dedupe log: at most one reminder per (user, match).
CREATE TABLE "PushReminder" (
    "id"      TEXT NOT NULL,
    "userId"  TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sentAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushReminder_userId_matchId_key" ON "PushReminder"("userId", "matchId");
CREATE INDEX "PushReminder_sentAt_idx" ON "PushReminder"("sentAt");

COMMIT;
