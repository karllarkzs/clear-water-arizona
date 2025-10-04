"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

/* -------------------------------- Types -------------------------------- */

type Contam = {
  ContaminantCode: string;
  ContaminantName: string | null;
  ContaminantEffect: string | null;
  ContaminantDisplayUnits: string | null;
  ContaminantUnits: string | null;
  SystemAverage: number | null;
  ContaminantMCLValue: number | null;
  ContaminantHGValue: number | null;
  contaminantOverLimitRatio?: number | null;
};

type Info = {
  PWS: string;
  Systemname: string | null;
  Population: number | null;
  exceedsList: Contam[];
  othersList: Contam[];
  totalContaminantsCount: number;
  totalAllCount: number;
  waterdropCount: number;
};

type ApiResponse = {
  zip: string;
  systems: { title: string; message: string; information: Info }[];
  meta: { count: number; generated_at: string };
};

/* --------------------------- Helper Functions --------------------------- */

function computeFactor(c: Contam) {
  if (c.contaminantOverLimitRatio && c.contaminantOverLimitRatio > 0) {
    return c.contaminantOverLimitRatio;
  }
  if (
    c.SystemAverage != null &&
    c.ContaminantHGValue &&
    c.ContaminantHGValue > 0
  ) {
    return c.SystemAverage / c.ContaminantHGValue || 0;
  }
  return 0;
}

function severityColor(factor: number) {
  if (factor >= 10) return "text-rose-600 bg-rose-50 ring-rose-200";
  if (factor >= 5) return "text-orange-600 bg-orange-50 ring-orange-200";
  if (factor >= 2) return "text-amber-600 bg-amber-50 ring-amber-200";
  if (factor > 1) return "text-yellow-700 bg-yellow-50 ring-yellow-200";
  if (factor === 1) return "text-slate-700 bg-slate-50 ring-slate-200";
  if (factor === 0) return "text-slate-500 bg-slate-50 ring-slate-200";
  return "text-emerald-700 bg-emerald-50 ring-emerald-200";
}

function clamp01(n: number) {
  if (!isFinite(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function percent(n: number) {
  return Math.round(clamp01(n) * 100);
}

/* ------------------------------- Component ------------------------------ */

export default function ExplorePage() {
  const params = useParams<{ zip: string }>();
  const zip = (params.zip || "").padStart(5, "0");

  const [data, setData] = useState<ApiResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [show, setShow] = useState<"exceeds" | "others">("exceeds");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"severity" | "name">("severity");

  useEffect(() => {
    let on = true;
    setErr(null);
    setData(null);
    fetch(`/api/${zip}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(j))))
      .then((j: ApiResponse) => {
        if (!on) return;
        setData(j);
        setActive(0);
      })
      .catch((e) => {
        if (!on) return;
        setErr(e?.message || "Failed to load.");
      });
    return () => {
      on = false;
    };
  }, [zip]);

  const info: Info | null = useMemo(() => {
    if (!data || !data.systems.length) return null;
    return data.systems[active]?.information ?? null;
  }, [data, active]);

  /* ----------------------------- Derived lists ---------------------------- */
  const filtered = useMemo(() => {
    const s = info;
    if (!s)
      return { exceeds: [], others: [] } as {
        exceeds: Contam[];
        others: Contam[];
      };

    const filterFn = (c: Contam) =>
      !query.trim() ||
      (c.ContaminantName || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.ContaminantEffect || "").toLowerCase().includes(query.toLowerCase());

    const sorter = (a: Contam, b: Contam) => {
      if (sortBy === "name") {
        return (a.ContaminantName || "").localeCompare(b.ContaminantName || "");
      }
      // severity
      return computeFactor(b) - computeFactor(a);
    };

    return {
      exceeds: [...s.exceedsList].filter(filterFn).sort(sorter),
      others: [...s.othersList].filter(filterFn).sort(sorter),
    };
  }, [info, query, sortBy]);

  /* -------------------------------- Renders -------------------------------- */

  if (err) {
    return (
      <Shell>
        <Empty zip={zip} message="Could not load results." />
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-4 py-24">
          <SkeletonHeader />
          <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
            <SkeletonCard className="h-48" />
            <div className="grid gap-6 sm:grid-cols-2">
              <SkeletonCard className="h-24 sm:col-span-2" />
              <SkeletonCard className="h-24" />
              <SkeletonCard className="h-24" />
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-56" />
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  if (!data.systems.length) {
    return (
      <Shell>
        <Empty zip={zip} message="No systems found for this ZIP." />
      </Shell>
    );
  }

  const systems = data.systems.map((s) => s.information);
  const s = info!;

  return (
    <Shell>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-64 max-w-5xl rounded-full bg-sky-200/20 blur-3xl"
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 md:pt-14">
          {/* Decorative waterline */}
          <svg
            aria-hidden
            className="-z-10 absolute inset-x-0 top-0 h-40 w-full text-sky-100"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="currentColor"
              d="M0,160L48,154.7C96,149,192,139,288,122.7C384,107,480,85,576,101.3C672,117,768,171,864,176C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
          </svg>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                ZIP {zip}
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 md:text-4xl">
                Water Quality Report
              </h1>
              {data.meta?.generated_at && (
                <p className="mt-2 text-sm text-slate-500">
                  Updated{" "}
                  <time dateTime={data.meta.generated_at}>
                    {new Date(data.meta.generated_at).toLocaleDateString()}
                  </time>
                  {typeof data.meta.count === "number" && (
                    <>
                      {" · "}
                      <span className="tabular-nums">
                        {data.meta.count}
                      </span>{" "}
                      providers scanned
                    </>
                  )}
                </p>
              )}
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← Try another ZIP
            </Link>
          </div>

          {/* ---------- Summary Cards ---------- */}
          <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
            {/* Big stat */}
            <Glass className="p-7 md:p-8">
              <div className="flex items-center gap-6">
                {/* Progress ring */}
                <div className="relative h-20 w-20">
                  {(() => {
                    const ratio = s.totalAllCount
                      ? s.totalContaminantsCount / s.totalAllCount
                      : 0;
                    const pct = percent(ratio);
                    return (
                      <>
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `conic-gradient(#0284c7 ${pct}%, #e2e8f0 ${pct}% 100%)`,
                          }}
                        />
                        <div className="absolute inset-1 rounded-full bg-white shadow-inner" />
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="text-2xl font-black text-sky-700 tabular-nums">
                            {s.totalContaminantsCount}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-500">
                    Contaminants
                  </div>
                  <div className="text-xl font-bold text-slate-900 md:text-2xl">
                    Exceed EWG Health Guidelines
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    <span className="tabular-nums font-medium">
                      {s.totalAllCount}
                    </span>{" "}
                    total contaminants detected ·
                    <span className="ml-1 tabular-nums">
                      {percent(
                        s.totalAllCount
                          ? s.totalContaminantsCount / s.totalAllCount
                          : 0
                      )}
                      %
                    </span>{" "}
                    above guideline
                  </div>
                </div>
              </div>
            </Glass>

            {/* Provider / Population / Source */}
            <div className="grid gap-6 sm:grid-cols-2">
              <Glass className="p-6 sm:col-span-2">
                <Label>Water Provider</Label>
                <ValueLink>{s.Systemname ?? s.PWS}</ValueLink>
              </Glass>
              <Glass className="p-6">
                <Label>Population Affected</Label>
                <ValueText>
                  {s.Population != null ? s.Population.toLocaleString() : "—"}
                </ValueText>
              </Glass>
              <Glass className="p-6">
                <Label>Water Source</Label>
                <ValueText title="Detected source type (if available)">
                  Surface water
                </ValueText>
              </Glass>
            </div>
          </div>

          {/* ---------- PWS Tabs (sticky) ---------- */}
          {systems.length > 1 && (
            <div className="sticky top-0 z-10 mt-8 -mx-4 bg-gradient-to-b from-white/90 to-white/80 px-4 pb-2 pt-3 backdrop-blur supports-[backdrop-filter]:bg-white/70">
              <h3 className="text-center text-sm font-semibold tracking-wide text-slate-700">
                View water providers in your area
              </h3>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {systems.map((sys, idx) => (
                  <button
                    key={sys.PWS}
                    onClick={() => setActive(idx)}
                    className={`group relative rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      active === idx
                        ? "bg-sky-600 text-white shadow"
                        : "bg-white/80 text-slate-700 ring-1 ring-slate-200 hover:ring-sky-300"
                    }`}
                    aria-pressed={active === idx}
                  >
                    {sys.Systemname ?? sys.PWS}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Contaminants ---------- */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:pt-10">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Contaminants Detected in{" "}
          <span className="text-sky-700">{s.Systemname ?? s.PWS}</span>
        </h2>

        {/* Controls */}
        <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contaminant or health risk…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                aria-label="Search contaminants"
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-slate-400">
                ⌘K
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setShow("exceeds")}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  show === "exceeds"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                aria-pressed={show === "exceeds"}
              >
                Exceeds
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {filtered.exceeds.length}
                </span>
              </button>
              <button
                onClick={() => setShow("others")}
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  show === "others"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                aria-pressed={show === "others"}
              >
                Others
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {filtered.others.length}
                </span>
              </button>
            </div>
          </div>
          <div className="sm:col-span-3 flex items-center justify-end gap-2 text-xs text-slate-600">
            <span>Sort by</span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setSortBy("severity")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  sortBy === "severity"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                Severity
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  sortBy === "name"
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                Name
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(show === "exceeds" ? filtered.exceeds : filtered.others).map(
            (c) => {
              const factor = computeFactor(c);
              const unit =
                c.ContaminantDisplayUnits || c.ContaminantUnits || "";
              const sev = severityColor(factor);
              const pct = clamp01(factor / 10); // scale against 10× guideline
              return (
                <Glass
                  key={`${c.ContaminantCode}-${c.ContaminantName}`}
                  className="group p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Contaminant
                      </div>
                      <div
                        className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900"
                        title={c.ContaminantName || undefined}
                      >
                        {c.ContaminantName ?? "Unknown"}
                      </div>
                      {c.ContaminantEffect && (
                        <div
                          className="mt-1 line-clamp-2 text-xs text-slate-500"
                          title={c.ContaminantEffect || undefined}
                        >
                          Health Risk: {c.ContaminantEffect}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${sev}`}
                      title={
                        factor
                          ? `${factor.toFixed(2)}× above guideline`
                          : "No ratio available"
                      }
                    >
                      {factor ? `${factor.toFixed(2)}×` : "—"}
                    </span>
                  </div>

                  {/* Meter */}
                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
                        style={{ width: `${pct * 100}%` }}
                        aria-label="Relative severity meter"
                        role="img"
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Guideline</span>
                      <span>10×</span>
                    </div>
                  </div>

                  <div className="mt-5 h-px bg-slate-200/70" />

                  <dl className="mt-5 space-y-3 text-sm">
                    <Row label="This Utility">
                      {c.SystemAverage != null ? (
                        <span className="tabular-nums">
                          {c.SystemAverage} {unit}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Row>
                    <Row label="EWG Health Guideline">
                      {c.ContaminantHGValue != null ? (
                        <span className="tabular-nums">
                          {c.ContaminantHGValue} {unit}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Row>
                    <Row label="Legal Limit">
                      {c.ContaminantMCLValue != null &&
                      c.ContaminantMCLValue >= 0 ? (
                        <span className="tabular-nums">
                          {c.ContaminantMCLValue} {unit}
                        </span>
                      ) : (
                        <span className="text-slate-500">No legal limit</span>
                      )}
                    </Row>
                  </dl>
                </Glass>
              );
            }
          )}
        </div>

        {/* Footnote */}
        <p className="mt-10 text-center text-xs leading-relaxed text-slate-500">
          Ratios compare utility averages against the EWG Health Guideline.
          Visual meter scales up to 10× for context.
        </p>
      </section>
    </Shell>
  );
}

/* ------------------------------ UI Building ------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_800px_at_50%_-200px,rgba(56,189,248,0.08),transparent)] bg-white">
      {children}
    </div>
  );
}

function Glass({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-500">{children}</div>;
}

function ValueText({
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div {...rest} className="mt-1 text-xl font-semibold text-slate-900">
      {" "}
      {children}{" "}
    </div>
  );
}
function ValueLink({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 text-xl font-semibold">
      <span className="text-sky-700 hover:text-sky-800">{children}</span>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

function SkeletonHeader() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-80 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-56 rounded bg-slate-200" />
    </div>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    />
  );
}

/* --------------------------------- Empty -------------------------------- */

function Empty({ zip, message }: { zip: string; message: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <h1 className="text-5xl font-black tracking-tight text-slate-900">
        ZIP <span className="text-sky-700">{zip}</span>
      </h1>
      <p className="mt-4 text-slate-600">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        ← Try another ZIP
      </Link>
    </div>
  );
}
