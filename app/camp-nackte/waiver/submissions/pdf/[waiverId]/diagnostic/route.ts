import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { normalizeCampWaiverPdfReference } from "@/lib/campNackteWaiverPdf";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ waiverId: string }> }) {
  await requireUser();
  const { waiverId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: waiver, error } = await supabase.from("camp_nackte_waivers").select("id, waiver_version, pdf_storage_path, pdf_url, full_name, waiver_text, signature_data_url, signed_at, created_at, visit_date").eq("id", waiverId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!waiver) return NextResponse.json({ error: "Waiver not found." }, { status: 404 });

  const reference = normalizeCampWaiverPdfReference({ pdfStoragePath: waiver.pdf_storage_path, pdfUrl: waiver.pdf_url });
  let validPdfObject = reference.kind === "inline";
  let classification: "database_embedded_pdf" | "valid_storage_pdf" | "trusted_legacy_url" | "stale_storage_reference" | "missing_pdf" | "unsupported_format" = reference.kind === "inline" ? "database_embedded_pdf" : reference.kind === "missing" ? "missing_pdf" : reference.kind === "unsupported" ? "unsupported_format" : "stale_storage_reference";
  let storageError: string | null = null;
  if (reference.kind === "storage") {
    const signed = await supabase.storage.from(reference.bucket).createSignedUrl(reference.objectPath, 60);
    validPdfObject = !signed.error && Boolean(signed.data?.signedUrl);
    if (validPdfObject) classification = "valid_storage_pdf";
    storageError = signed.error?.message || (!signed.data?.signedUrl ? "Signed URL generation returned no URL." : null);
    if (!validPdfObject && reference.trustedUrl) {
      const response = await fetch(reference.trustedUrl, { method: "HEAD", cache: "no-store" }).catch(() => null);
      validPdfObject = Boolean(response?.ok);
      if (validPdfObject) { storageError = null; classification = "trusted_legacy_url"; }
    }
  }

  const retainedEvidence = [waiver.full_name ? "legal_name" : null, waiver.waiver_text ? "historical_waiver_text" : null, waiver.visit_date ? "visit_date" : null, waiver.created_at ? "database_submission_timestamp" : null, waiver.signed_at ? "annualized_signed_at" : null, waiver.signature_data_url ? "signature_image" : null].filter((value): value is string => Boolean(value));
  const missingEvidence = [!waiver.signature_data_url ? "original_signature_image" : null, waiver.waiver_version === "legacy" ? "exact_original_signed_at_timestamp" : null].filter((value): value is string => Boolean(value));
  const recoverableSourceData = Boolean(waiver.full_name && waiver.waiver_text && waiver.signature_data_url && waiver.signed_at && waiver.visit_date);
  const staleStorageReference = reference.kind === "storage" && !validPdfObject;

  return NextResponse.json({
    waiverId,
    recordType: waiver.waiver_version === "legacy" ? "historical" : "annual",
    classification,
    validPdfObject,
    staleStorageReference,
    recoverableSourceData,
    unrecoverableMissingPdf: !validPdfObject && !recoverableSourceData,
    retainedEvidence,
    missingEvidence,
    storageError,
    message: validPdfObject ? "The PDF object is available." : recoverableSourceData ? "The PDF object is missing, but complete immutable source data is retained for staff recovery." : "The historical waiver record exists, but the original PDF is unavailable.",
  }, { headers: { "Cache-Control": "private, no-store" } });
}
