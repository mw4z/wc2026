import webpush from "web-push";
import { prisma } from "./prisma";

// Web Push (VAPID). Keys live in env and are generated once with
// `npx web-push generate-vapid-keys` (see docs/HANDOFF.md). The PUBLIC key is
// also exposed to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY.
const PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
// Contact URI/email required by the push services; mailto: is fine.
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:moayad.1420@gmail.com";

/** True only when both VAPID keys are configured — otherwise push is a no-op. */
export const pushConfigured = Boolean(PUBLIC && PRIVATE);

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!pushConfigured) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send one notification. Returns true if delivered. If the push service reports
 * the subscription is gone (404/410), it is pruned from the DB and we return false.
 */
export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<boolean> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Subscription expired/unsubscribed — clean it up so we stop trying.
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
    } else {
      console.error("push send failed:", status, (e as Error).message);
    }
    return false;
  }
}
