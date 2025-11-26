import jsPDF from "jspdf";
import logo from "@/public/logo.png";
import { formatRange } from "./dateFormat";

/** -------- Types (same shape you shared) -------- */
type BasePerson = {
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
    institution_type?: string;
    location?: string;
    degree?: string;
  }>;
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
  social_media_profiles?: Array<{ platform?: string; link?: string }>;
  location_history?: Array<
    | string
    | {
        city?: string;
        locality?: string;
        region?: string;
        state?: string;
        country?: string;
        from?: string;
        start_date?: string;
        to?: string;
        end_date?: string;
      }
  >;
  public_comments?: Array<{
    date?: string;
    platform?: string;
    content?: string;
    link?: string;
  }>;
  others?: Array<{ note?: string; link?: string; platform?: string }>;
  short_summary?: string;
};

type PdfOptions = {
  subjectName?: string;
  city?: string;
  region?: string;
  reportId?: string;
  riskLevel?: string;
  generatedAt?: string | Date;
  save?: boolean; // default true
};

/** -------- Helpers -------- */
type RGB = [number, number, number];

const COLOR: Record<
  | "text"
  | "sub"
  | "border"
  | "panel"
  | "brand"
  | "chipLow"
  | "chipMed"
  | "chipHigh",
  RGB
> = {
  text: [31, 41, 55],
  sub: [75, 85, 99],
  border: [226, 232, 240],
  panel: [241, 245, 249],
  brand: [37, 99, 235],
  chipLow: [198, 239, 206],
  chipMed: [255, 242, 204],
  chipHigh: [255, 199, 206],
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toAbsoluteUrl(u?: string) {
  if (!u) return "";
  return /^(https?:|mailto:|tel:)/i.test(u)
    ? u
    : `https://${u.replace(/^\/+/, "")}`;
}

function formatMonthYear(d?: string | Date) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(+x)) return String(d ?? "");
  return `${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}

function titleCase(s?: string) {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

/** Text wrap util – returns next Y after writing */
function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH = 6,
  font = { family: "helvetica", style: "normal" as const, size: 11 },
  color: RGB = COLOR.text
) {
  doc
    .setFont(font.family, font.style)
    .setFontSize(font.size)
    .setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxW);
  for (const ln of lines) {
    doc.text(ln, x, y);
    y += lineH;
  }
  return y;
}

/** Page-fit helper */
function ensureSpace(doc: jsPDF, y: number, needH: number, marginY: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needH > pageH - marginY) {
    doc.addPage();
    return marginY;
  }
  return y;
}

/** Header band on report body pages */
function drawCoverHeader(doc: jsPDF, pageW: number) {
  doc.setFillColor(...COLOR.brand);
  doc.rect(0, 0, pageW, 22, "F");
}

/** Footer on each page */
function drawFooter(
  doc: jsPDF,
  pageIndex: number,
  totalPages: number,
  pageW: number,
  pageH: number
) {
  doc.setDrawColor(...COLOR.border).setLineWidth(0.2);
  doc.line(10, pageH - 12, pageW - 10, pageH - 12);
  doc
    .setFont("helvetica", "normal")
    .setFontSize(9)
    .setTextColor(...COLOR.sub);
  doc.text(`Page ${pageIndex} of ${totalPages}`, pageW - 10, pageH - 6, {
    align: "right",
  });
}

/** Rounded section outline */
function drawSectionBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) {
  doc.setDrawColor(...COLOR.border);
  doc.roundedRect(x, y, w, h, 2, 2);
}

/** Small risk badge */
function drawBadge(doc: jsPDF, label: string, x: number, y: number, fill: RGB) {
  const padX = 3,
    h = 7;
  const w = doc.getTextWidth(label) + padX * 2;
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setTextColor(...COLOR.text);
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text(label, x + w / 2, y + h - 2, { align: "center" });
}

/** Simple, centered cover page */
function createCoverPage(
  doc: jsPDF,
  pageWidth: number,
  textColor: RGB,
  heading: string
) {
  const primaryColor: RGB = [50, 66, 155]; // #32429B

  // Logo
  try {
    doc.addImage(logo.src, "PNG", (pageWidth - 60) / 2, 30, 60, 60);
  } catch {
    // ignore if asset not available at build-time
  }

  // Title
  doc
    .setFont("helvetica", "bold")
    .setFontSize(24)
    .setTextColor(...primaryColor);
  const title = "AI Background Check Report";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, 110);

  // Name
  doc
    .setFont("helvetica", "normal")
    .setFontSize(14)
    .setTextColor(...textColor);
  const nameWidth = doc.getTextWidth(heading);
  doc.text(heading, (pageWidth - nameWidth) / 2, 120);

  // Date
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(10);
  const dateText = `Generated on ${today}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (pageWidth - dateWidth) / 2, 130);
}

/** -------- Main: generate PDF (no overlap, safe page breaks) -------- */
export function generatePDF(
  base: BasePerson,
  opts: PdfOptions = {}
): Blob | void {
  const {
    subjectName = "Unknown Subject",
    city,
    region,
    reportId = `BCR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    riskLevel = "medium",
    generatedAt = new Date(),
    save = true,
  } = opts;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const marginY = 12;
  const textColor: RGB = COLOR.text;
  let y = marginY;
  /* ---- Cover page ---- */
  createCoverPage(doc, pageW, textColor, subjectName);
  doc.addPage();
  y = marginY;

  /* ---- Report header band + subject card ---- */
  drawCoverHeader(doc, pageW);
  y = 28;

  // Card
  doc.setFillColor(...COLOR.panel);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 26, 3, 3, "F");

  // Name + meta
  doc
    .setFont("helvetica", "bold")
    .setFontSize(16)
    .setTextColor(...COLOR.text);
  doc.text(subjectName, marginX + 6, y + 10);

  doc
    .setFont("helvetica", "normal")
    .setFontSize(11)
    .setTextColor(...COLOR.sub);
  const locLine = [city, region].filter(Boolean).join(", ");
  if (locLine) doc.text(locLine, marginX + 6, y + 16);
  const genStr = new Date(generatedAt).toLocaleDateString();
  doc.text(
    `Report ID: ${reportId} • Generated: ${genStr}`,
    marginX + 6,
    y + 22
  );

  // Risk chip
  const chipColor =
    riskLevel === "low"
      ? COLOR.chipLow
      : riskLevel === "high"
      ? COLOR.chipHigh
      : COLOR.chipMed;
  const chipText = `${riskLevel[0].toUpperCase()}${riskLevel.slice(1)} Risk`;
  const chipX = pageW - marginX - (doc.getTextWidth(chipText) + 6 + 2);
  drawBadge(doc, chipText, chipX, y + 4, chipColor);
  y += 26 + 8;

  /* ---- Executive Summary ---- */
  (function drawSummary() {
    const secW = pageW - marginX * 2;
    const padding = 6;
    const headerH = 10;

    const summaryText = base.short_summary?.trim() || "No summary available.";
    const lines = doc.splitTextToSize(summaryText, secW - padding * 2);
    const estH = headerH + padding * 2 + lines.length * 6;

    y = ensureSpace(doc, y, estH, marginY);
    const top = y;

    // Header
    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .setTextColor(...COLOR.text);
    doc.text("Executive Summary", marginX + padding, y + headerH - 2);

    // Body
    let yy = y + headerH + padding;
    yy = writeWrapped(
      doc,
      summaryText,
      marginX + padding,
      yy,
      secW - padding * 2
    );

    // Border after true height
    const sectionH = yy - top + padding;
    drawSectionBox(doc, marginX, top, secW, sectionH);

    y = top + sectionH + 6;
  })();

  /** Generic list section with accurate measurement and page breaks */
  function drawListSection(
    title: string,
    rows: Array<{
      primary: string;
      secondary?: string;
      meta?: string;
      link?: string;
    }>
  ) {
    const secW = pageW - marginX * 2;
    const padding = 6;
    const lineH = 6;
    const headerH = 10;

    let sectionTopY = y;

    // Ensure header fits
    y = ensureSpace(doc, y, headerH + padding * 2, marginY);
    sectionTopY = y;

    // Header
    doc
      .setFont("helvetica", "bold")
      .setFontSize(12)
      .setTextColor(...COLOR.text);
    doc.text(title, marginX + padding, y + headerH - 2);

    let yy = y + headerH + padding;
    rows.forEach((r, idx) => {
      // Pre-wrap with the same width we’ll render with
      doc.setFont("helvetica", "bold").setFontSize(11);
      const primaryLines = doc.splitTextToSize(
        r.primary || "",
        secW - padding * 2
      );

      doc.setFont("helvetica", "normal").setFontSize(10);
      const metaLines = r.meta
        ? doc.splitTextToSize(r.meta, secW - padding * 2)
        : [];

      doc.setFont("helvetica", "normal").setFontSize(11);
      const secondaryLines = r.secondary
        ? doc.splitTextToSize(r.secondary, secW - padding * 2)
        : [];

      const rowH =
        (primaryLines.length ? primaryLines.length * lineH : 0) +
        (metaLines.length ? metaLines.length * lineH : 0) +
        (secondaryLines.length ? secondaryLines.length * lineH : 0) +
        2;

      // If the row won't fit, close current section and continue on a new page
      if (yy + rowH + padding > pageH - marginY) {
        const drawnH = yy - sectionTopY + padding;
        drawSectionBox(doc, marginX, sectionTopY, secW, drawnH);

        doc.addPage();
        y = marginY;
        sectionTopY = y;

        // Re-draw header on the new page
        doc
          .setFont("helvetica", "bold")
          .setFontSize(12)
          .setTextColor(...COLOR.text);
        doc.text(title, marginX + padding, y + headerH - 2);
        yy = y + headerH + padding;
      }

      // PRIMARY (link if url)
      doc
        .setFont("helvetica", "bold")
        .setFontSize(11)
        .setTextColor(...COLOR.text);
      const url = r.link ? toAbsoluteUrl(r.link) : "";
      primaryLines.forEach((ln: any) => {
        if (url) {
          doc.setTextColor(0, 0, 255);
          doc.textWithLink(ln, marginX + padding, yy, {
            url,
            target: "_blank",
          });
          doc.setTextColor(...COLOR.text);
        } else {
          doc.text(ln, marginX + padding, yy);
        }
        yy += lineH;
      });

      // META (small/gray)
      if (metaLines.length) {
        doc
          .setFont("helvetica", "normal")
          .setFontSize(10)
          .setTextColor(...COLOR.sub);
        metaLines.forEach((ln: any) => {
          doc.text(ln, marginX + padding, yy);
          yy += lineH;
        });
      }

      // SECONDARY (normal)
      if (secondaryLines.length) {
        doc
          .setFont("helvetica", "normal")
          .setFontSize(11)
          .setTextColor(...COLOR.text);
        secondaryLines.forEach((ln: any) => {
          doc.text(ln, marginX + padding, yy);
          yy += lineH;
        });
      }

      if (idx < rows.length - 1) yy += 2; // row spacing
    });

    // Draw final border with the true height
    const sectionH = yy - sectionTopY + padding;
    drawSectionBox(doc, marginX, sectionTopY, secW, sectionH);

    // Advance below section
    y = sectionTopY + sectionH + 6;
  }

  /* ---- Employment ---- */
  {
    const rows =
      (base.employment_history || [])
        .filter((e) => e.company || e.position)
        .map((e) => ({
          primary: `${titleCase(e.position) || "Role Unknown"} · ${
            titleCase(e.company) || "Company"
          }`,
          meta: formatRange(e.start_date, e.end_date),
        })) || [];
    drawListSection(
      "Employment History",
      rows.length ? rows : [{ primary: "No employment history found." }]
    );
  }

  /* ---- Education (optional) ---- */
  if (Array.isArray(base.education_history) && base.education_history.length) {
    const rows = base.education_history.map((ed) => ({
      primary: `${titleCase(ed.school) || "School"}${
        ed.degree ? ` — ${titleCase(ed.degree)}` : ""
      }`,
      meta: formatRange(ed.start_date, ed.end_date),
      secondary: [titleCase(ed.institution_type), titleCase(ed.location)]
        .filter(Boolean)
        .join(" • "),
    }));
    drawListSection("Education", rows);
  }

  /* ---- Legal ---- */
  {
    const rows = (base.legal_appearances || []).map((L) => ({
      primary: titleCase(L.title) || "Legal record",
      meta: [L.location, L.date ? formatMonthYear(L.date) : ""]
        .filter(Boolean)
        .join(" • "),
      secondary: L.description ? L.description : "",
      url: L.link,
    }));
    drawListSection(
      "Legal Appearances",
      rows.length ? rows : [{ primary: "No legal appearances found." }]
    );
  }

  /* ---- Company Registrations ---- */
  {
    const rows = (base.company_registrations || []).map((c) => ({
      primary: titleCase(c.name) || "Company",
      url: c.link,
    }));
    drawListSection(
      "Company Registrations",
      rows.length ? rows : [{ primary: "No company registrations found." }]
    );
  }

  /* ---- Press ---- */
  {
    const rows = (base.press_mentions || []).map((p) => ({
      primary: titleCase(p.topic) || "Mention",
      meta: p.date ? formatMonthYear(p.date) : "",
      secondary: p.description || "",
      url: p.link,
    }));
    drawListSection(
      "Press Mentions",
      rows.length ? rows : [{ primary: "No press mentions found." }]
    );
  }

  /* ---- Social / Online Profiles ---- */
  {
    const rows = (base.social_media_profiles || []).map((s) => ({
      primary: titleCase(s.platform) || "Profile",
      link: s.link ? toAbsoluteUrl(s.link) : undefined,
    }));
    drawListSection(
      "Online / Social Profiles",
      rows.length ? rows : [{ primary: "No social profiles found." }]
    );
  }

  /* ---- Location History ---- */
  {
    const rows = (base.location_history || []).map((loc) => {
      if (typeof loc === "string") return { primary: titleCase(loc) };
      const city = loc.city || loc.locality;
      const region = loc.region || loc.state;
      const country = loc.country;
      const label = [city, region, country].filter(Boolean).join(", ");
      return {
        primary: titleCase(label) || "Location",
        meta: formatRange(loc.start_date || loc.from, loc.end_date || loc.to),
      };
    });
    drawListSection(
      "Locations",
      rows.length ? rows : [{ primary: "No location history found." }]
    );
  }

  /* ---- Public Comments ---- */
  {
    const rows = (base.public_comments || []).map((c) => ({
      primary: titleCase(c.platform) || "Comment",
      meta: c.date ? formatMonthYear(c.date) : "",
      secondary: c.content || "",
      url: c.link,
    }));
    drawListSection(
      "Public Comments",
      rows.length ? rows : [{ primary: "No public comments found." }]
    );
  }

  /* ---- Other Online Activity ---- */
  {
    const rows = (base.others || []).map((o) => ({
      primary: titleCase(o.platform) || "Other",
      secondary: o.note || "",
      url: o.link,
    }));
    drawListSection(
      "Other Online Activity",
      rows.length ? rows : [{ primary: "No additional items found." }]
    );
  }

  /* ---- Footer on every page ---- */
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, pageW, pageH);
  }

  doc.setProperties({
    title: "Rented123_AI_Background_Check",
    author: "Rented123",
    keywords: process.env.NEXT_PUBLIC_KEYWORDS,
  });

  if (save) {
    doc.save(`Background_Report_${subjectName.replace(/\s+/g, "_")}.pdf`);
  } else {
    return doc.output("blob");
  }
}
