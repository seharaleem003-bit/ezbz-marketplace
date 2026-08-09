import "server-only";

// Checkr's field names/package names below are written from their published
// API docs, not verified live — CHECKR_API_KEY hasn't been provided yet.
// Same situation Easyship was in before its base URL/field names were
// confirmed against the real sandbox; expect to adjust once a real key and
// account are available.
const CHECKR_API_BASE = "https://api.checkr.com/v1";

export function isCheckrConfigured(): boolean {
  return Boolean(process.env.CHECKR_API_KEY);
}

async function checkrFetch(path: string, init?: RequestInit) {
  const key = process.env.CHECKR_API_KEY;
  if (!key) throw new Error("CHECKR_API_KEY is not set");

  // Checkr uses HTTP Basic auth with the API key as username, blank password.
  const auth = Buffer.from(`${key}:`).toString("base64");
  const res = await fetch(`${CHECKR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || data?.error || `Checkr request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function createBackgroundCheckInvitation({
  email,
  firstName,
  lastName,
}: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  const candidate = await checkrFetch("/candidates", {
    method: "POST",
    body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
  });

  // "tasker_pro" is Checkr's commonly-used standard package for
  // gig/contractor screening — the actual package slug is account-specific
  // and configured in the Checkr dashboard, so this will likely need to
  // change to whatever package the real account has set up.
  const invitation = await checkrFetch("/invitations", {
    method: "POST",
    body: JSON.stringify({ candidate_id: candidate.id, package: "tasker_pro" }),
  });

  return {
    candidateId: candidate.id as string,
    invitationId: invitation.id as string,
    invitationUrl: invitation.invitation_url as string | undefined,
  };
}
