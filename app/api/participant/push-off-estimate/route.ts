import { NextResponse } from "next/server";

import { getParticipantPushOffEstimateByToken } from "@/lib/participantPushOffEstimate";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json({ ok: false, error: "Token is required." }, { status: 400 });
  }

  const estimate = await getParticipantPushOffEstimateByToken(token);

  if (!estimate) {
    return NextResponse.json({ ok: false, error: "Invalid participant token." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, estimate });
}
