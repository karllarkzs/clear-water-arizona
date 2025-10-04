"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = zip.replace(/\D/g, "").slice(0, 5);
    if (!/^\d{5}$/.test(cleaned)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setError(null);
    router.push(`/explore/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-white flex items-center">
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Left image */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm">
            <Image
              src="https://plus.unsplash.com/premium_photo-1729537378649-066872523a70?q=80&w=1600&auto=format&fit=crop"
              alt="Pouring a glass of water"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          {/* Right card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 md:p-8 shadow-sm">
            <div className="mx-auto max-w-md text-center">
              <h2 className="font-semibold text-sky-600">
                Clear Water Arizona
              </h2>
              <p className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">
                Is Your Tap Water Safe for Drinking?
              </p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-sky-700 md:text-4xl">
                ENTER YOUR ZIP CODE
              </h3>

              <form onSubmit={onSubmit} className="mt-6">
                <div className="flex items-stretch gap-2">
                  <input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="Zip Code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none transition focus:border-sky-500
             text-black placeholder:text-slate-400"
                    aria-label="ZIP code"
                  />

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 text-lg font-semibold text-white transition hover:bg-sky-700 active:bg-sky-800 md:px-5"
                    aria-label="Search"
                    title="Search"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="-mr-0.5"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-rose-600" role="alert">
                    {error}
                  </p>
                )}
              </form>

              <ul className="mt-6 space-y-2 text-left text-slate-700">
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-500" />
                  <span>Explore the hidden impurities in your tap water</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-500" />
                  <span>Uncover potential health hazards of contaminants</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-500" />
                  <span>Get effective home filtration solutions</span>
                </li>
              </ul>

              <p className="mt-6 text-sm leading-6 text-slate-600">
                Waterdrop works with the Environmental Working Group (EWG) to
                unveil the truth about your tap water. Enter your ZIP code to
                uncover specific contaminants and how to safeguard yourself and
                your loved ones.
              </p>

              <p className="mt-4 text-xs text-slate-500">
                * Data Source: licensed from Environmental Working Group,{" "}
                <a
                  href="https://www.ewg.org"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-sky-400 underline-offset-2 hover:text-sky-700"
                >
                  www.ewg.org
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
