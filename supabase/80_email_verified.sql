-- Optional email-ownership verification flag. Sign-in/sign-up no longer use OTP;
-- this just records whether a user chose to verify their email from the profile.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
