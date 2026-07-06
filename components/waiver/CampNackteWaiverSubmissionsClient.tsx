"use client";

import { useMemo, useState } from "react";

type WaiverSubmission = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  visit_date: string | null;
  waiver_text: string | null;
  signature_data_url: string | null;
  pdf_url: string | null;
  created_at: string | null;
};

type CampNackteWaiverSubmissionsClientProps = {
  submissions: WaiverSubmission[];
};

function getDateOnlyValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isWithinDateRange(
  createdAt: string | null,
  startDate: string,
  endDate: string
) {
  if (!startDate && !endDate) {
    return true;
  }

  if (!createdAt) {
    return false;
  }

  const submissionDate = new Date(createdAt);

  if (Number.isNaN(submissionDate.getTime())) {
    return false;
  }

  const submissionDateValue = getDateOnlyValue(submissionDate);

  if (startDate && submissionDateValue < startDate) {
    return false;
  }

  if (endDate && submissionDateValue > endDate) {
    return false;
  }

  return true;
}

export function CampNackteWaiverSubmissionsClient({
  submissions,
}: CampNackteWaiverSubmissionsClientProps) {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const searchableText = [
        submission.full_name,
        submission.email,
        submission.phone,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);
      const matchesDateRange = isWithinDateRange(
        submission.created_at,
        startDate,
        endDate
      );

      return matchesSearch && matchesDateRange;
    });
  }, [endDate, search, startDate, submissions]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">
              Total submissions: {submissions.length}
            </p>
            <p className="text-sm text-slate-400">
              Showing {filteredSubmissions.length} matching record
              {filteredSubmissions.length === 1 ? "" : "s"}.
            </p>
          </div>

          <label className="w-full md:max-w-sm">
            <span className="sr-only">Search submissions</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or phone"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-300">
            <span>Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-300">
            <span>End date</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          No waiver submissions match your search and date filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((submission) => {
            const isExpanded = expandedId === submission.id;

            return (
              <article
                key={submission.id}
                className="rounded-2xl border border-slate-800 bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((currentId) =>
                      currentId === submission.id ? null : submission.id
                    )
                  }
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {submission.full_name || "Unnamed guest"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Submitted {submission.created_at ? new Date(submission.created_at).toLocaleString() : "Unknown time"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-slate-400 md:items-end">
                    {submission.email ? <span>{submission.email}</span> : null}
                    {submission.phone ? <span>{submission.phone}</span> : null}
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      {isExpanded ? "Hide details" : "Show details"}
                    </span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-slate-800 bg-slate-950/50 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Captured fields
                        </h3>
                        <dl className="mt-4 space-y-3 text-sm text-slate-300">
                          <div>
                            <dt className="text-slate-500">Full name</dt>
                            <dd className="mt-1 font-medium text-white">
                              {submission.full_name || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Email</dt>
                            <dd className="mt-1 font-medium text-white">
                              {submission.email || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Phone</dt>
                            <dd className="mt-1 font-medium text-white">
                              {submission.phone || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Visit date</dt>
                            <dd className="mt-1 font-medium text-white">
                              {submission.visit_date || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Submission timestamp</dt>
                            <dd className="mt-1 font-medium text-white">
                              {submission.created_at ? new Date(submission.created_at).toLocaleString() : "—"}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Attachments
                        </h3>
                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                          {submission.pdf_url ? (
                            <a
                              href={submission.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-blue-600/40 bg-blue-600/10 px-3 py-2 font-medium text-blue-300 hover:bg-blue-600/20"
                            >
                              Open PDF
                            </a>
                          ) : (
                            <p className="text-slate-400">No PDF available.</p>
                          )}

                          {submission.signature_data_url ? (
                            <div>
                              <p className="mb-2 text-slate-500">Signature image</p>
                              <img
                                src={submission.signature_data_url}
                                alt="Waiver signature"
                                className="max-h-48 rounded-lg border border-slate-800 bg-white p-2"
                              />
                            </div>
                          ) : (
                            <p className="text-slate-400">No signature image available.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {submission.waiver_text ? (
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Waiver text
                        </h3>
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-slate-300">
                          {submission.waiver_text}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
