import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Anon key is fine for read-only server routes when RLS allows it
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Contam = {
  ContaminantCode: string;
  ContaminantName: string | null;
  ContaminantEffect: string | null;
  ContaminantDisplayUnits: string | null; // from this_utility_unit
  ContaminantUnits: string | null; // not available in details; null
  SystemAverage: number | null; // from this_utility_value
  ContaminantMCLValue: number | null; // from legal_limit_value
  ContaminantHGValue: number | null; // from ewg_guideline_value
  contaminantOverLimitRatio?: number | null; // computed if possible
};

function ratioOrNull(a: number | null, b: number | null) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export async function GET(
  _req: Request,
  { params }: { params: { zip: string } }
) {
  try {
    const zip = (params.zip || "").padStart(5, "0");

    // 1) Distinct PWS for the ZIP
    const { data: zips, error: zErr } = await supabase
      .from("ewg_zip_pwsids")
      .select("pwsid")
      .eq("zip_code", zip);

    if (zErr) {
      return NextResponse.json(
        { title: "information data", message: zErr.message },
        { status: 500 }
      );
    }

    const pwsids = Array.from(new Set((zips ?? []).map((r) => r.pwsid))).filter(
      Boolean
    );
    if (pwsids.length === 0) {
      return NextResponse.json(
        {
          zip,
          systems: [],
          meta: {
            message: "success!",
            count: 0,
            generated_at: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // 2) Pull all details rows for those PWS
    const { data: rows, error: dErr } = await supabase
      .from("ewg_contaminant_details")
      .select(
        `
        pwsid,
        code,
        name,
        potential_effect,
        this_utility_value,
        this_utility_unit,
        legal_limit_value,
        ewg_guideline_value,
        times_above_ewg,
        utility_name,
        serves_population
      `
      )
      .in("pwsid", pwsids);

    if (dErr) {
      return NextResponse.json(
        { title: "information data", message: dErr.message },
        { status: 500 }
      );
    }

    // Group by PWS
    const byPws = new Map<string, any[]>();
    (rows ?? []).forEach((r) => {
      if (!byPws.has(r.pwsid)) byPws.set(r.pwsid, []);
      byPws.get(r.pwsid)!.push(r);
    });

    // Build the expected payload per PWS
    const systems = pwsids.map((pwsid) => {
      const list = byPws.get(pwsid) ?? [];

      const mapRow = (r: any): Contam => ({
        ContaminantCode: String(r.code ?? ""),
        ContaminantName: r.name ?? null,
        ContaminantEffect: r.potential_effect ?? null,
        ContaminantDisplayUnits: r.this_utility_unit ?? null,
        ContaminantUnits: null, // not present in details
        SystemAverage: r.this_utility_value ?? null,
        ContaminantMCLValue: r.legal_limit_value ?? null,
        ContaminantHGValue: r.ewg_guideline_value ?? null,
        contaminantOverLimitRatio:
          r.times_above_ewg ??
          ratioOrNull(
            r.this_utility_value ?? null,
            r.ewg_guideline_value ?? null
          ),
      });

      // We don’t have an explicit list_type column in details,
      // so use a heuristic: if guideline exists and SystemAverage > HG → exceeds.
      const exceedsList: Contam[] = [];
      const othersList: Contam[] = [];

      for (const r of list) {
        const item = mapRow(r);
        const exceeds =
          (r.ewg_guideline_value != null &&
            r.this_utility_value != null &&
            r.this_utility_value > r.ewg_guideline_value) ||
          (r.times_above_ewg != null && r.times_above_ewg > 1);

        (exceeds ? exceedsList : othersList).push(item);
      }

      // Pull one row for utility metadata if available
      const metaRow = list[0] ?? {};
      const Systemname = metaRow.utility_name ?? null;
      const Population = metaRow.serves_population ?? null;

      return {
        title: "information data",
        message: "success!",
        information: {
          PWS: pwsid,
          Systemname,
          Population,
          exceedsList,
          othersList,
          totalContaminantsCount: exceedsList.length,
          totalAllCount: exceedsList.length + othersList.length,
          waterdropCount: 0,
        },
      };
    });

    return NextResponse.json(
      {
        zip,
        systems,
        meta: {
          message: "success!",
          count: systems.length,
          generated_at: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { title: "information data", message: e?.message ?? "unexpected error" },
      { status: 500 }
    );
  }
}
