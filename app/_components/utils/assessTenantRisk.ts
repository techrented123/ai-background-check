// utils/risk.ts — UPDATED

type ProviderMeta = {
  gptOk?: boolean;
  pdlOk?: boolean;
  pdlMatchScore?: number; // 0..1 or 0..100
  sanctionsCount?: number; // number of watchlist hits
};

type PersonShape = {
  employment_history?: Array<{
    start_date?: string;
    end_date?: string;
    company?: string;
    position?: string;
  }>;
  education_history?: any[];
  legal_appearances?: Array<{
    date?: string;
    title?: string;
    description?: string;
    location?: string;
    link?: string;
  }>;
  company_registrations?: Array<{ name?: string; link?: string }>;
  press_mentions?: Array<{
    date?: string;
    topic?: string;
    description?: string;
    link?: string;
  }>;
  social_media_profiles?: any[];
  public_comments?: Array<{
    date?: string;
    platform?: string;
    content?: string;
    link?: string;
  }>;
  location_history?: Array<
    | string
    | {
        city?: string;
        locality?: string;
        town?: string;
        region?: string;
        state?: string;
        country?: string;
        start_date?: string;
        end_date?: string;
        from?: string;
        to?: string;
      }
  >;
  others?: any[];
  short_summary?: string;
};

//Tenancy-specific (Canada + US)
const TENANCY_KEYWORDS = new RegExp(
  [
    // General tenancy/eviction
    "eviction",
    "landlord[- ]tenant",
    "housing court",
    "tenancy tribunal",
    // US variants
    "unlawful detainer",
    "\\bUD\\b",
    "forcible entry and detainer",
    "\\bFED\\b",
    "summary ejectment",
    "writ of possession",
    "rent escrow",
    // Canada bodies/terms
    "residential tenanc(?:y|ies)",
    "\\bRTB\\b", // BC Residential Tenancy Branch
    "civil resolution tribunal",
    "\\bCRT\\b", // BC CRT
    "\\bLTB\\b",
    "landlord and tenant board", // Ontario
    "tribunal administratif du logement",
    "\\bRTDRS\\b", // Alberta
    "residential tenancies (?:board|branch)",
  ].join("|"),
  "i"
);

// Broader adverse legal (includes financial/violence/harassment etc.)
const NEGATIVE_LEGAL = new RegExp(
  [
    "eviction",
    "unlawful detainer",
    "judg(?:e)?ment",
    "arrears",
    "bankrupt",
    "insolvenc(?:y|ies)",
    "lien",
    "garnish(?:ment)?",
    "collection",
    "civil claim",
    "small claims",
    "fraud",
    "theft",
    "embezzl",
    "money laundering",
    "extortion",
    "assault",
    "harassment",
    "restraining order",
    "stalking",
  ].join("|"),
  "i"
);

// Adverse media & comments (kept light)
const NEG_PRESS =
  /(charged|arrested|lawsuit|fraud|scam|sexual|assault|harassment|indicted|theft|embezzl|money laundering|extortion|violent)/i;
const NEG_COMMENTS =
  /(hate|threat|violence|harass|racist|incite|extremis|doxx)/i;

function monthsBetween(a?: string | Date, b?: string | Date) {
  const A = a ? new Date(a) : null;
  const B = b ? new Date(b) : new Date();
  if (!A || isNaN(+A) || !B || isNaN(+B)) return 0;
  return Math.max(
    0,
    (B.getFullYear() - A.getFullYear()) * 12 + (B.getMonth() - A.getMonth())
  );
}

function recentYears(date?: string, years = 5) {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(+d)) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return d >= cutoff;
}

function normalizePdlScore(x?: number) {
  if (x == null) return null;
  return x > 1
    ? Math.max(0, Math.min(1, x / 100))
    : Math.max(0, Math.min(1, x));
}

export function assessTenantRisk(person: PersonShape, meta: ProviderMeta) {
  let score = 0;
  const reasons: string[] = [];

  // 1) Identity confidence (small)
  const ms = normalizePdlScore(meta.pdlMatchScore);
  if (meta.pdlOk && ms != null) {
    if (ms >= 0.9) {
      score -= 1;
      reasons.push("High identity confidence (PDL)");
    } else if (ms < 0.6) {
      score += 1;
      reasons.push("Low identity confidence (PDL)");
    }
  }

  // 2) Sanctions / watchlists (hard red flag)
  if ((meta.sanctionsCount ?? 0) > 0) {
    score += 6;
    reasons.push("Watchlist / sanctions match");
  }

  // 3) Legal appearances (Canada + US, last 7 years)
  const legal = person.legal_appearances ?? [];
  const recentLegal = legal.filter((l) => recentYears(l.date, 7));

  const tenancyRelated = recentLegal.filter(
    (l) =>
      TENANCY_KEYWORDS.test(l.title || "") ||
      TENANCY_KEYWORDS.test(l.description || "")
  );
  const negativeLegal = recentLegal.filter(
    (l) =>
      NEGATIVE_LEGAL.test(l.title || "") ||
      NEGATIVE_LEGAL.test(l.description || "")
  );

  if (tenancyRelated.length) {
    score += Math.min(6, 2 * tenancyRelated.length);
    reasons.push(
      `${tenancyRelated.length} recent tenancy-related legal record(s)`
    );
  } else if (negativeLegal.length) {
    score += Math.min(4, negativeLegal.length);
    reasons.push(`${negativeLegal.length} recent adverse legal record(s)`);
  }

  // 4) Address/location stability (moves in last 3 years)
  const locs = person.location_history ?? [];
  let moves36 = 0;
  for (const loc of locs) {
    const start =
      typeof loc === "string" ? undefined : loc.start_date || (loc as any).from;
    const end =
      typeof loc === "string" ? undefined : loc.end_date || (loc as any).to;
    if (start || end) {
      const endUse = end || new Date().toISOString();
      if (recentYears(endUse, 3) || recentYears(start, 3)) moves36++;
    }
  }
  if (moves36 >= 5) {
    score += 3;
    reasons.push("Frequent moves in last 3 years");
  } else if (moves36 >= 3) {
    score += 2;
    reasons.push("Several moves in last 3 years");
  }

  // 5) Employment stability
  const jobs = person.employment_history ?? [];
  const mostRecent = jobs[jobs.length - 1];
  if (jobs.length === 0) {
    score += 1;
    reasons.push("No employment history available");
  } else {
    const tenureMo = monthsBetween(
      mostRecent?.start_date,
      mostRecent?.end_date
    );
    if (tenureMo < 3) {
      score += 1;
      reasons.push("Short recent employment tenure");
    }
    const totalMonths = jobs.reduce(
      (acc, j) => acc + monthsBetween(j.start_date, j.end_date),
      0
    );
    if (totalMonths >= 60) {
      score -= 1;
      reasons.push("5+ years cumulative employment history");
    }
  }

  // 6) Press (light)
  const press = person.press_mentions ?? [];
  const negPress = press.filter(
    (p) => NEG_PRESS.test(p.topic || "") || NEG_PRESS.test(p.description || "")
  );
  if (negPress.length) {
    score += Math.min(2, negPress.length);
    reasons.push("Adverse media mentions");
  }

  // 7) Public comments (very light)
  const comments = person.public_comments ?? [];
  const negComments = comments.filter((c) =>
    NEG_COMMENTS.test(c.content || "")
  );
  if (negComments.length) {
    score += 1;
    reasons.push("Concerning public comments");
  }

  // Final mapping
  const level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";

  return { level, score, reasons };
}
