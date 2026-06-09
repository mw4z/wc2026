import "server-only";

// Authentica (authentica.sa) OTP integration — EMAIL verification for sign-in.
// Docs: POST https://api.authentica.sa/api/v2/{send-otp,verify-otp}
// Header: X-Authorization: <API_KEY>. Authentica generates AND verifies the code,
// so we never store or compare codes ourselves.
const API = "https://api.authentica.sa/api/v2";
const API_KEY = process.env.AUTHENTICA_API_KEY || "";

/** OTP is only enforced when a key is configured; otherwise we skip it gracefully. */
export const otpConfigured = API_KEY.length > 0;

function headers() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Authorization": API_KEY,
  };
}

/** Send an email OTP. Throws on failure. */
export async function sendEmailOtp(email: string): Promise<void> {
  const res = await fetch(`${API}/send-otp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ method: "email", email }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Authentica send-otp failed (${res.status}): ${detail.slice(0, 300)}`);
  }
}

/** Verify a code for an email. Returns true only when Authentica confirms it. */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const res = await fetch(`${API}/verify-otp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) return false;
  const data = (await res.json().catch(() => ({}))) as { verified?: boolean; success?: boolean };
  return data.verified === true || data.success === true;
}
