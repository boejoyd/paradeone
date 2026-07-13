export const CAMP_NACKTE_WAIVER_BUCKET = "camp-nackte-waivers";

export type CampWaiverPdfReference =
  | { kind: "inline"; data: string }
  | { kind: "storage"; bucket: string; objectPath: string; trustedUrl: string | null }
  | { kind: "unsupported" }
  | { kind: "missing" };

function cleanStorageObjectPath(value: string, bucket: string) {
  let path: string;
  try {
    path = decodeURIComponent(value).trim().replace(/\\/g, "/").replace(/^\/+/, "");
  } catch {
    return "";
  }
  const storagePrefixes = [
    `storage/v1/object/public/${bucket}/`,
    `storage/v1/object/sign/${bucket}/`,
    `storage/v1/object/${bucket}/`,
    `${bucket}/`,
  ];
  let prefix = storagePrefixes.find((candidate) => path.startsWith(candidate));
  while (prefix) {
    path = path.slice(prefix.length).replace(/^\/+/, "");
    prefix = storagePrefixes.find((candidate) => path.startsWith(candidate));
  }
  if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return "";
  return path;
}

function normalizeReference(reference: string): CampWaiverPdfReference {
  if (reference.startsWith("data:application/pdf;base64,")) return { kind: "inline", data: reference.slice("data:application/pdf;base64,".length) };

  try {
    const url = new URL(reference);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || url.origin !== new URL(supabaseUrl).origin) return { kind: "unsupported" };
    const pathParts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
    const objectIndex = pathParts.indexOf("object");
    if (objectIndex < 0) return { kind: "unsupported" };
    const visibility = pathParts[objectIndex + 1];
    const bucketIndex = visibility === "public" || visibility === "sign" ? objectIndex + 2 : objectIndex + 1;
    if (pathParts[bucketIndex] !== CAMP_NACKTE_WAIVER_BUCKET) return { kind: "unsupported" };
    const objectPath = cleanStorageObjectPath(pathParts.slice(bucketIndex + 1).join("/"), CAMP_NACKTE_WAIVER_BUCKET);
    return objectPath ? { kind: "storage", bucket: CAMP_NACKTE_WAIVER_BUCKET, objectPath, trustedUrl: null } : { kind: "missing" };
  } catch {
    const objectPath = cleanStorageObjectPath(reference, CAMP_NACKTE_WAIVER_BUCKET);
    return objectPath ? { kind: "storage", bucket: CAMP_NACKTE_WAIVER_BUCKET, objectPath, trustedUrl: null } : { kind: "missing" };
  }
}

export function normalizeCampWaiverPdfReference(input: { pdfStoragePath: string | null; pdfUrl: string | null }) : CampWaiverPdfReference {
  const references = [input.pdfStoragePath?.trim(), input.pdfUrl?.trim()].filter((value): value is string => Boolean(value));
  if (references.length === 0) return { kind: "missing" };
  for (const reference of references) {
    const normalized = normalizeReference(reference);
    if (normalized.kind === "storage" || normalized.kind === "inline") return normalized;
  }
  return { kind: "unsupported" };
}

export function extractCampWaiverStoragePath(pdfUrl: string | null) {
  if (!pdfUrl) return null;
  try {
    const pathname = decodeURIComponent(new URL(pdfUrl).pathname);
    const prefixes = [
      `/storage/v1/object/public/${CAMP_NACKTE_WAIVER_BUCKET}/`,
      `/storage/v1/object/sign/${CAMP_NACKTE_WAIVER_BUCKET}/`,
      `/storage/v1/object/${CAMP_NACKTE_WAIVER_BUCKET}/`,
    ];
    const prefix = prefixes.find((value) => pathname.startsWith(value));
    return prefix ? pathname.slice(prefix.length) || null : null;
  } catch {
    return null;
  }
}

export function campWaiverSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type WaiverPdfRecord = {
  pdf_storage_path: string | null;
  pdf_url: string | null;
  visit_date: string | null;
  full_name: string | null;
  created_at: string | null;
};

type StorageClient = {
  storage: {
    from(bucket: string): {
      list(path: string, options: { search: string }): Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
    };
  };
};

export async function resolveCampWaiverPdfPath(client: StorageClient, waiver: WaiverPdfRecord) {
  const reference = normalizeCampWaiverPdfReference({ pdfStoragePath: waiver.pdf_storage_path, pdfUrl: waiver.pdf_url });
  if (reference.kind === "storage") return reference.objectPath;
  if (!waiver.visit_date || !waiver.pdf_url) return null;
  const storedFilename = extractCampWaiverStoragePath(waiver.pdf_url)?.split("/").pop();
  if (!storedFilename || !/^[A-Za-z0-9._-]+\.pdf$/i.test(storedFilename)) return null;
  const { data, error } = await client.storage.from(CAMP_NACKTE_WAIVER_BUCKET).list(waiver.visit_date, { search: storedFilename });
  if (error) throw new Error(error.message);
  return (data || []).some((file) => file.name === storedFilename) ? `${waiver.visit_date}/${storedFilename}` : null;
}
