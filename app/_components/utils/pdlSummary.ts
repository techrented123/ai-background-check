// --- summary-merge helpers ---
// --- PDL-enriched summary builder (employment + education + locations)

function parseYMD(s?: string | null) {
  if (!s) return undefined;
  const [y, m = "1", d = "1"] = String(s).split("-");
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return isNaN(+dt) ? undefined : dt;
}
function yearsBetween(a?: Date, b?: Date) {
  if (!a || !b) return 0;
  return Math.max(
    0,
    Math.round(((+b - +a) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
  );
}
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}
function titleCase(s?: string) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}
function countryFromString(s: string) {
  const low = s.toLowerCase();
  if (/(^|[, ])canada\b/.test(low)) return "Canada";
  if (/(united states|usa|u\.s\.a\.|u\.s\.)/.test(low)) return "United States";
  return undefined;
}

// Rank degrees roughly: PhD > Master's > Bachelor's > Associate > Diploma/Cert
const DEGREE_RANKS: Record<string, number> = {
  phd: 5,
  doctorate: 5,
  "doctor of philosophy": 5,
  masters: 4,
  master: 4,
  msc: 4,
  ma: 4,
  meng: 4,
  mba: 4,
  mfa: 4,
  bachelors: 3,
  bachelor: 3,
  bsc: 3,
  ba: 3,
  beng: 3,
  bba: 3,
  bed: 3,
  associate: 2,
  assoc: 2,
  aa: 2,
  as: 2,
  diploma: 1,
  cert: 1,
  certificate: 1,
};

function degreeRank(s?: string) {
  if (!s) return 0;
  const low = s.toLowerCase();
  let best = 0;
  for (const [k, v] of Object.entries(DEGREE_RANKS)) {
    if (low.includes(k)) best = Math.max(best, v);
  }
  return best;
}

function normalizeDegreeName(s?: string) {
  if (!s) return undefined;
  const low = s.toLowerCase();
  if (/phd|doctor of philosophy|doctorate/.test(low)) return "Ph.D.";
  if (/mba/.test(low)) return "MBA";
  if (/msc|m\.sc|master of science|masters/.test(low))
    return "Master of Science";
  if (/ma|m\.a|master of arts/.test(low)) return "Master of Arts";
  if (/meng|m\.eng/.test(low)) return "Master of Engineering";
  if (/bsc|b\.sc|bachelor of science|bachelors/.test(low))
    return "Bachelor of Science";
  if (/ba|b\.a|bachelor of arts/.test(low)) return "Bachelor of Arts";
  if (/beng|b\.eng/.test(low)) return "Bachelor of Engineering";
  if (/associate/.test(low)) return "Associate Degree";
  if (/diploma/.test(low)) return "Diploma";
  if (/certificate|cert\b/.test(low)) return "Certificate";
  return titleCase(s);
}

function extractGradYear(ed: any) {
  const end = parseYMD(ed?.end_date);
  const start = parseYMD(ed?.start_date);
  const dt = end || start;
  return dt ? dt.getUTCFullYear() : undefined;
}

function pickTopEducation(education: any[] = []) {
  // Choose by highest degree rank, tiebreak by most recent year.
  let best: any | undefined;
  let bestRank = -1;
  let bestYear = -1;

  for (const ed of education) {
    const rank = degreeRank(ed?.degree);
    const year = extractGradYear(ed) ?? -1;
    if (rank > bestRank || (rank === bestRank && year > bestYear)) {
      best = ed;
      bestRank = rank;
      bestYear = year;
    }
  }
  return best;
}

export function buildPDLEnhancedSummary(
  base: {
    employment_history?: Array<{
      start_date?: string;
      end_date?: string | null;
      company?: string;
      position?: string;
    }>;
    education_history?: Array<{
      start_date?: string;
      end_date?: string | null;
      school?: string;
      degree?: string;
    }>;
    location_history?: Array<
      | string
      | {
          country?: string;
          city?: string;
          locality?: string;
          region?: string;
          state?: string;
        }
    >;
  },
  fullName?: string
) {
  const name = fullName?.trim() || "This person";
  const parts: string[] = [];

  // ---- Employment (span + companies + current role)
  const jobs = base.employment_history || [];
  const companies = uniq(
    jobs.map((j) => (j.company || "").trim().toLowerCase())
  ).filter(Boolean);
  const starts = jobs
    .map((j) => parseYMD(j.start_date))
    .filter(Boolean) as Date[];
  const ends = jobs
    .map((j) => parseYMD(j.end_date) || new Date())
    .filter(Boolean) as Date[];
  const earliest = starts.length
    ? new Date(Math.min(...starts.map(Number)))
    : undefined;
  const latest = ends.length
    ? new Date(Math.max(...ends.map(Number)))
    : undefined;
  const yrs = yearsBetween(earliest, latest);
  const yrsStr = yrs
    ? yrs >= 1
      ? `${yrs} years`
      : `${Math.round(yrs * 12)} months`
    : "";

  // Current role: prefer entry with no end_date; else the one with latest end/start
  const current =
    jobs.find((j) => !j.end_date) ||
    [...jobs].sort(
      (a, b) =>
        (parseYMD(b.end_date)?.getTime() ?? 0) -
        (parseYMD(a.end_date)?.getTime() ?? 0)
    )[0] ||
    [...jobs].sort(
      (a, b) =>
        (parseYMD(b.start_date)?.getTime() ?? 0) -
        (parseYMD(a.start_date)?.getTime() ?? 0)
    )[0];

  const hasEmploymentSignal =
    companies.length || yrsStr || current?.position || current?.company;
  if (hasEmploymentSignal) {
    const a: string[] = [];
    a.push(`${name} has ${yrsStr || "professional"} experience`);
    if (companies.length)
      a.push(
        `across ${companies.length} compan${
          companies.length === 1 ? "y" : "ies"
        }`
      );
    let sentence = a.join(" ");
    if (current && (current.position || current.company)) {
      const role = current.position ? titleCase(current.position) : "working";
      const co = current.company ? ` at ${titleCase(current.company)}` : "";
      sentence += `. Currently ${role}${co}`;
    }
    parts.push(sentence + ".");
  }

  // ---- Education (highest credential)
  const edList = base.education_history || [];
  if (edList.length) {
    const top = pickTopEducation(edList);
    if (top) {
      const deg = normalizeDegreeName(top.degree);
      const school = titleCase(top.school);
      const year = extractGradYear(top);
      const eduBits = [];
      if (deg && school) eduBits.push(`a ${deg} from ${school}`);
      else if (deg) eduBits.push(`${deg}`);
      else if (school) eduBits.push(`studies at ${school}`);
      if (year) eduBits.push(`(${year})`);
      if (eduBits.length)
        parts.push(`Education includes ${eduBits.join(" ")}.`);
    }
  }

  // ---- Locations (countries breadth)
  const locs = base.location_history || [];
  const countries = uniq(
    locs
      .map((l: any) =>
        typeof l === "string" ? countryFromString(l) : l?.country
      )
      .filter(Boolean)
  );
  if (countries.length) {
    if (countries.length === 1)
      parts.push(`Location history shows time in ${countries[0]}.`);
    else parts.push(`Location history spans ${countries.join(" and ")}.`);
  }

  // Return concise summary (max 3 sentences), or empty string if nothing real
  const out = parts.filter(Boolean).slice(0, 3).join(" ");
  return out || "";
}

/** Merge GPT + PDL summaries without clumsy repetition */
export function mergeSummaries(gptSummary?: string, pdlSentence?: string) {
  const clean = (s?: string) =>
    (s || "")
      .replace(/\s+/g, " ")
      .replace(/[ \t]+\./g, ".")
      .trim();

  const gpt = clean(gptSummary);
  const pdl = clean(pdlSentence);

  if (gpt && !pdl) return gpt;
  if (!gpt && pdl) return pdl;
  if (!gpt && !pdl) return "";

  // If GPT already conveys PDL facts, skip appending
  const hasWork = /worked at \d+ compan(y|ies)/i.test(gpt);
  const hasYears =
    /(years?|months?) of experience/i.test(gpt) ||
    /\b\d+ (years?|months?)\b/i.test(gpt);
  const hasLived =
    /(lived in \d+ countries|lived in (canada|united states))/i.test(gpt);
  const hasCurrent = /(currently|presently)\s+\w+/i.test(gpt);

  const addParts: string[] = [];
  if (!hasWork || !hasYears || !hasLived || !hasCurrent) {
    // Only add PDL sentence if it brings something new
    const pdlLower = pdl.toLowerCase();
    const contributes =
      (!hasWork && /worked at \d+ compan(y|ies)/.test(pdlLower)) ||
      (!hasYears && /\b\d+ (years?|months?)\b/.test(pdlLower)) ||
      (!hasLived &&
        /(lived in \d+ countries|lived in (canada|united states))/.test(
          pdlLower
        )) ||
      (!hasCurrent && /\bcurrently\b/.test(pdlLower));

    if (contributes) addParts.push(pdl);
  }

  // Merge & de-duplicate sentences
  const sentSplit = (s: string) =>
    s
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((x) => x.trim())
      .filter(Boolean);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .trim();

  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...sentSplit(gpt), ...addParts.flatMap(sentSplit)]) {
    const key = normalize(s);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }

  // Keep it concise (max ~3 sentences)
  return out.slice(0, 3).join(" ");
}
