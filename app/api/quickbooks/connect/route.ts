import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { quickBooksAuthorizationUrl } from "@/lib/quickbooks";
import { requireQuickBooksAdministrator } from "@/lib/quickbooksAccess";

export async function GET() {
  await requireQuickBooksAdministrator();
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("quickbooks_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return NextResponse.redirect(quickBooksAuthorizationUrl(state));
}
