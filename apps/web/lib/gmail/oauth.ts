import { createHash, randomBytes } from "crypto";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GMAIL_OAUTH_CSRF_COOKIE = "stride_gmail_oauth_csrf";

export type GmailOAuthState = {
  outletId: string;
  userId: string;
  csrfTokenHash: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GmailProfileResponse = {
  emailAddress?: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashCsrfToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encodeGmailOAuthState(state: GmailOAuthState): string {
  return base64UrlEncode(JSON.stringify(state));
}

export function decodeGmailOAuthState(value: string): GmailOAuthState {
  const parsed = JSON.parse(base64UrlDecode(value)) as Partial<GmailOAuthState>;
  if (!parsed.outletId || !parsed.userId || !parsed.csrfTokenHash) {
    throw new Error("Invalid Gmail OAuth state.");
  }
  return {
    outletId: parsed.outletId,
    userId: parsed.userId,
    csrfTokenHash: parsed.csrfTokenHash,
  };
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_GMAIL_CLIENT_SECRET;
  const redirectUri =
    process.env.GMAIL_OAUTH_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/gmail/callback`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/gmail/callback`
        : process.env.NODE_ENV === "production"
          ? null
          : "http://localhost:3000/api/gmail/callback");

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Gmail OAuth is not configured.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function buildGmailAuthUrl(args: { state: string }): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state: args.state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGmailCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
}> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || "Gmail OAuth token exchange failed."
    );
  }

  const scopes = (payload.scope ?? "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!scopes.includes(GMAIL_READONLY_SCOPE)) {
    throw new Error("Gmail OAuth did not grant the required readonly scope.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    tokenExpiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null,
    scopes,
  };
}

export async function refreshGmailAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  tokenExpiresAt: string | null;
  scopes: string[];
}> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    const error = new Error(
      payload.error_description || payload.error || "Gmail OAuth token refresh failed."
    ) as Error & { code?: string };
    error.code = payload.error;
    throw error;
  }

  const scopes = (payload.scope ?? GMAIL_READONLY_SCOPE)
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (!scopes.includes(GMAIL_READONLY_SCOPE)) {
    throw new Error("Refreshed Gmail token does not include gmail.readonly.");
  }

  return {
    accessToken: payload.access_token,
    tokenExpiresAt: payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
      : null,
    scopes,
  };
}

export async function fetchGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = (await response.json()) as GmailProfileResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !payload.emailAddress) {
    throw new Error(payload.error?.message || "Could not read Gmail profile.");
  }

  return { emailAddress: payload.emailAddress };
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });

  if (!response.ok) {
    throw new Error("Could not revoke Gmail authorization.");
  }
}
