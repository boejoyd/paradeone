import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { normalizeCampWaiverPdfReference } from "@/lib/campNackteWaiverPdf";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function diagnosticPath(path: string) {
  const parts = path.split("/");
  return parts.length > 1 ? `${parts.slice(0, -1).join("/")}/<redacted-file>` : "<redacted-file>";
}

function logStorageDiagnostic(input: { recordType: "historical" | "annual"; bucket: string; objectPath: string; error: string }) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[CAMP_WAIVER_PDF]", {
      recordType: input.recordType,
      bucket: input.bucket,
      normalizedObjectPath: diagnosticPath(input.objectPath),
      storageError: input.error,
    });
  }
}

function staffErrorPage(title: string, message: string, status: number) {
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#020617;color:#e2e8f0;font-family:system-ui,sans-serif"><main style="max-width:42rem;margin:4rem auto;padding:2rem"><section style="border:1px solid #334155;border-radius:1rem;background:#0f172a;padding:2rem"><p style="color:#94a3b8;text-transform:uppercase;letter-spacing:.15em;font-size:.75rem">Camp Nackte Staff</p><h1 style="color:#fff">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(message)}</p><a href="/camp-nackte/waiver/submissions" style="color:#93c5fd">Return to waiver submissions</a></section></main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ waiverId: string }> }) {
  await requireUser();
  const { waiverId } = await params;
  const supabase = await createServerSupabaseClient();
  const storageClient = createAdminSupabaseClient();
  if (!storageClient) return staffErrorPage("PDF service is not configured", "The server-only Supabase service-role credential is missing. Contact an administrator.", 503);
  const { data: waiver, error } = await supabase.from("camp_nackte_waivers").select("pdf_storage_path, pdf_url, waiver_version").eq("id", waiverId).maybeSingle();
  if (error) return staffErrorPage("Unable to open waiver PDF", "The waiver record could not be loaded. Please try again.", 500);
  if (!waiver) return staffErrorPage("Waiver not found", "The requested waiver record does not exist.", 404);

  const recordType = waiver.waiver_version === "legacy" || !waiver.pdf_storage_path ? "historical" : "annual";
  const reference = normalizeCampWaiverPdfReference({ pdfStoragePath: waiver.pdf_storage_path, pdfUrl: waiver.pdf_url });
  if (reference.kind === "missing") return staffErrorPage("PDF reference missing", "This waiver record does not contain a PDF reference.", 404);
  if (reference.kind === "unsupported") return staffErrorPage("Unsupported PDF reference", "This waiver record contains a PDF reference that cannot be safely opened.", 404);
  if (reference.kind === "inline") {
    try {
      const bytes = Buffer.from(reference.data, "base64");
      return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="waiver-${waiverId}.pdf"`, "Cache-Control": "private, no-store" } });
    } catch {
      return staffErrorPage("Invalid waiver PDF", "The PDF data stored with this waiver could not be decoded.", 500);
    }
  }

  const { data, error: signedUrlError } = await storageClient.storage.from(reference.bucket).createSignedUrl(reference.objectPath, 60 * 10);
  if (!signedUrlError && data?.signedUrl) {
    if (waiver.pdf_storage_path !== reference.objectPath) {
      const { error: backfillError } = await supabase.from("camp_nackte_waivers").update({ pdf_storage_path: reference.objectPath }).eq("id", waiverId);
      if (backfillError && process.env.NODE_ENV !== "production") console.error("[CAMP_WAIVER_PDF_PATH]", { waiverId, backfillError: backfillError.message });
    }
    return NextResponse.redirect(data.signedUrl);
  }

  const storageError = signedUrlError?.message || "Signed URL generation returned no URL.";
  logStorageDiagnostic({ recordType, bucket: reference.bucket, objectPath: reference.objectPath, error: storageError });
  const notFound = /not found/i.test(storageError);
  return staffErrorPage(
    notFound ? "Waiver PDF not found" : "Unable to open waiver PDF",
    notFound ? "The waiver record exists, but the referenced PDF object could not be found in the private Camp Nackte waiver bucket." : "Supabase Storage could not create a temporary PDF link. Please try again or contact an administrator.",
    notFound ? 404 : 500
  );
}
