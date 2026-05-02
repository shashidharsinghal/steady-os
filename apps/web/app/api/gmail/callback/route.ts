import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  decodeGmailOAuthState,
  exchangeGmailCodeForTokens,
  fetchGmailProfile,
  GMAIL_OAUTH_CSRF_COOKIE,
  hashCsrfToken,
} from "@/lib/gmail/oauth";

function redirectToIngest(request: Request, params: Record<string, string>) {
  const url = new URL("/ingest", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}

function classifyGmailCallbackError(error: unknown): string {
  const message = error instanceof Error ? error.message : "gmail_oauth_failed";

  if (/gmail\.googleapis\.com|has not been used in project|Enable it by visiting/i.test(message)) {
    return "gmail_api_disabled";
  }
  if (/refresh token/i.test(message)) {
    return "missing_refresh_token";
  }
  if (/state verification/i.test(message)) {
    return "state_verification_failed";
  }
  if (/Only partners can connect Gmail/i.test(message)) {
    return "not_partner";
  }
  if (/schema cache|gmail_connections|gmail_sync_runs/i.test(message)) {
    return "gmail_tables_missing";
  }
  if (/user verification/i.test(message)) {
    return "user_verification_failed";
  }

  return "gmail_oauth_failed";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return redirectToIngest(request, { gmail: "error", reason: oauthError });
  }

  if (!code || !stateParam) {
    return redirectToIngest(request, { gmail: "error", reason: "missing_oauth_params" });
  }

  const cookieStore = await cookies();
  const csrfToken = cookieStore.get(GMAIL_OAUTH_CSRF_COOKIE)?.value;
  cookieStore.delete(GMAIL_OAUTH_CSRF_COOKIE);

  let outletIdForRedirect: string | null = null;

  try {
    const state = decodeGmailOAuthState(stateParam);
    outletIdForRedirect = state.outletId;
    if (!csrfToken || hashCsrfToken(csrfToken) !== state.csrfTokenHash) {
      throw new Error("Gmail OAuth state verification failed.");
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== state.userId) {
      throw new Error("Gmail OAuth user verification failed.");
    }

    const { data: isPartner, error: partnerError } = await supabase.rpc("is_partner", {
      user_id: user.id,
    });
    if (partnerError || !isPartner) {
      throw new Error("Only partners can connect Gmail.");
    }

    const tokenBundle = await exchangeGmailCodeForTokens(code);
    const profile = await fetchGmailProfile(tokenBundle.accessToken);

    const { data: existingConnection, error: existingError } = await supabase
      .from("gmail_connections")
      .select("refresh_token")
      .eq("outlet_id", state.outletId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    const refreshToken = tokenBundle.refreshToken ?? existingConnection?.refresh_token ?? null;
    if (!refreshToken) {
      throw new Error(
        "Google did not return a refresh token. Reconnect Gmail and approve consent."
      );
    }

    const { error: upsertError } = await supabase.from("gmail_connections").upsert(
      {
        outlet_id: state.outletId,
        connected_by: user.id,
        gmail_address: profile.emailAddress,
        access_token: tokenBundle.accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenBundle.tokenExpiresAt,
        scopes: tokenBundle.scopes,
        status: "active",
        last_sync_error: null,
      },
      { onConflict: "outlet_id" }
    );

    if (upsertError) throw new Error(upsertError.message);

    return redirectToIngest(request, {
      gmail: "connected",
      outletId: state.outletId,
      gmailAddress: profile.emailAddress,
    });
  } catch (error) {
    const reason = classifyGmailCallbackError(error);
    return redirectToIngest(request, {
      gmail: "error",
      reason,
      ...(outletIdForRedirect ? { outletId: outletIdForRedirect } : {}),
    });
  }
}
