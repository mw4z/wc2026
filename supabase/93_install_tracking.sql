-- PWA install tracking, for the "add to home screen" push reminder.
--   appInstalledAt    : first time the app was opened in standalone (installed) mode
--   installRemindedAt : last time we sent the install push (throttle)
-- Safe to re-run.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appInstalledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "installRemindedAt" TIMESTAMP(3);
