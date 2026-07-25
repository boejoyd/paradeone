import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { saveQuickBooksAuthorization } from "@/lib/quickbooks";
import { requireQuickBooksAdministrator } from "@/lib/quickbooksAccess";

export async function GET(request: Request) {
  await requireQuickBooksAdministrator();
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("quickbooks_oauth_state")?.value;
  cookieStore.delete("quickbooks_oauth_state");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  if (!expectedState || !state || expectedState !== state || !code || !realmId) {
    return NextResponse.json({ error: "QuickBooks authorization could not be verified." }, { status: 400 });
  }
  await saveQuickBooksAuthorization(code, realmId);
  return NextResponse.redirect(new URL("/camp-nackte/waiver/submissions?quickbooks=connected", request.url));
}
