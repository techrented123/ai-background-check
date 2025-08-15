import * as React from "react";
import { BackgroundCheckResult, ProspectInfo } from "@/types";
import { Download, FileText, InfoIcon } from "./_components/ui/icons";
import { generatePDF } from "./_components/utils/generatePDF";
import Tooltip from "./_components/ui/Tooltip/Tooltip";
import { formatDate, formatRange } from "./_components/utils/dateFormat";
import { EmptyBlock } from "./_components/ui/EmptyBlock";
import { Section } from "./_components/ui/Section";
import { riskBadgeClass } from "./_components/utils/riskBadge";
import { assessTenantRisk } from "./_components/utils/assessTenantRisk";
import { toAbsoluteUrl } from "./_components/utils/toAbsoluteURls";

type ResultsPanelProps = {
  results: BackgroundCheckResult | null;
  isLoading: boolean;
  error: string | null;
  retries: number;
  prospect: ProspectInfo | null;
};

/* ---------- component ---------- */
const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  isLoading,
  error,
  retries,
  prospect,
}) => {
  /* Hooks must always run in the same order — put them BEFORE any early return */

  // Mobile auto-scroll when data/error appears
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth <= 768 && (error || results)) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }, [error, results]);

  // Stable report metadata (no flicker across re-renders)
  const reportIdRef = React.useRef(
    "BCR-" + Math.random().toString(36).slice(2, 8).toUpperCase()
  );
  const generatedOnRef = React.useRef(new Date());

  // Merge GPT + PDL into one presentation model
  const { person, foundResult, riskLevel } = React.useMemo(() => {
    const r: any = results ?? {};
    const gpt = r?.gpt;
    const pdl = r?.pdl;
    const foundResult = Boolean(gpt?.data.foundPerson || pdl?.ok);

    // Base from GPT
    const base = {
      employment_history:
        gpt?.data?.employment_history?.map((exp: any) => ({
          start_date: exp?.start_date,
          end_date: exp?.end_date,
          company: exp?.company,
          position: exp?.position,
        })) ?? [],
      short_summary: gpt?.data.foundPerson ? gpt?.data?.short_summary : "",
      education_history: [],
      legal_appearances: gpt?.data?.legal_appearances ?? [],
      company_registrations: gpt?.data?.company_registrations ?? [],
      press_mentions: gpt?.data?.press_mentions ?? [],
      social_media_profiles: gpt?.data?.social_media_profiles ?? [],
      location_history: gpt?.data?.location_history ?? [],
      public_comments: gpt?.data?.public_comments ?? [],
      others: gpt?.data?.others ?? [],
    };

    const meta = {
      gptOk: gpt?.ok,
      pdlOk: pdl?.ok,
      pdlMatchScore: pdl?.data?.[0]?.match_score ?? pdl?.match_score, // if available
      //sanctionsCount: sanctions?.matches?.length ?? sanctions?.length ?? 0,
    };

    if (pdl?.ok === false) {
      base.education_history = [];
    }

    // Merge PDL if OK
    const pdlRoot = pdl?.ok ? pdl?.data : null;
    if (pdlRoot) {
      const pdlExperience =
        pdlRoot?.experience?.map((exp: any) => ({
          start_date: exp?.start_date,
          end_date: exp?.end_date,
          company: exp?.company?.name,
          position: exp?.title?.name,
        })) ?? [];

      const pdlEducation =
        pdlRoot?.education?.map((edu: any) => ({
          start_date: edu?.start_date,
          end_date: edu?.end_date,
          school: edu?.school?.name,
          institution_type: edu?.school?.type,
          location:
            (edu?.school?.location?.locality || "") +
            (edu?.school?.location?.region
              ? `, ${edu?.school?.location?.region}`
              : ""),
          degree:
            edu?.degrees
              ?.map((d: any) => (Array.isArray(d) ? d.join(", ") : d))
              .join("; ") || "",
        })) ?? [];

      const pdlProfiles =
        pdlRoot?.profiles?.map((p: any) => ({
          platform: p?.network,
          url: p?.url,
        })) ?? [];

      const includeGptEmployment =
        !pdlRoot?.job_title && !pdlRoot?.job_company_name;

      base.employment_history = [
        ...(includeGptEmployment ? base.employment_history : []),
        ...pdlExperience,
      ];
      if (pdlEducation.length) base.education_history = pdlEducation;
      base.social_media_profiles = [
        ...base.social_media_profiles,
        ...pdlProfiles,
      ];

      const extraRegions = Array.isArray(pdl?.data?.regions)
        ? pdl.data.regions
        : [];
      base.location_history = [...base.location_history, ...extraRegions];
      console.log({ pdlProfiles, gpt, base });
    }
    const { level, score, reasons } = assessTenantRisk(base, meta);
    console.log({ base, level, score, reasons });

    return {
      person: base,
      foundResult,
      riskLevel: level, //r?.riskLevel ?? "medium",
      riskScore: score,
      reasons: reasons,
    };
  }, [results]);

  const handleDownloadPDF = React.useCallback(() => {
    if (person && prospect) {
      generatePDF(person, {
        subjectName: `${prospect.firstName} ${prospect.lastName}`,
        city: prospect.city,
        region: prospect.state,
        reportId: "",
        riskLevel: results?.riskLevel ?? "medium",
        generatedAt: results?.timestamp ?? new Date().toISOString(),
        save: true, // default}
      });
    }
  }, [results]);

  /* Early returns AFTER all hooks */
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-6">
        <p className="mb-4 text-gray-600">Generating background check…</p>
        <div className="animate-pulse w-full max-w-md">
          <div className="h-8 bg-gray-200 rounded mb-4" />
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
          <div className="h-4 bg-gray-200 rounded mb-6 w-1/2" />
          <div className="h-24 bg-gray-200 rounded-lg mb-4" />
          <div className="h-24 bg-gray-200 rounded-lg mb-4" />
          <div className="h-24 bg-gray-200 rounded-lg mb-4" />
          <div className="h-10 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-full">
        <div className="absolute top-[40%] pt-5 pb-9 text-red-600 text-center px-4">
          {error}. If the issue persists, please contact{" "}
          <a
            href="mailto:tech@rented123.com,tambi@rented123.com"
            className="underline"
          >
            tech@rented123.com
          </a>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No Results Yet
        </h3>
        <p className="text-gray-500 text-center max-w-xs">
          Submit prospect information on the left to generate a background
          report.
        </p>
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className="!max-h-[370px] md:!max-h-[490px] md:overflow-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:justify-between items-center mb-6">
        <div className="hidden md:flex">
          <h2 className="md:text-xl font-semibold text-gray-800">
            Background Check Results
          </h2>
        </div>

        {foundResult && (
          <button
            onClick={handleDownloadPDF}
            disabled={!results}
            className="text-md md:text-lg w-fit cursor-pointer flex items-center text-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        )}
      </div>

      {!foundResult && (
        <div className="text-sm text-center mb-4 text-red-500">
          We couldn't find enough information about {prospect?.firstName}{" "}
          {prospect?.lastName}.
          {retries < 2 ? (
            <> Please try again.</>
          ) : (
            <p>
              Please{" "}
              <a
                href="mailto:tech@rented123.com,rob@rented123.com"
                className="underline"
              >
                contact us
              </a>{" "}
              for more info.
            </p>
          )}
        </div>
      )}

      {/* Prospect summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">
            {prospect?.firstName} {prospect?.lastName}
          </h3>
          {foundResult && (
            <Tooltip text="This is ONLY an estimated risk level based on available public signals.">
              <span
                className={`cursor-default flex justify-center items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${riskBadgeClass(
                  riskLevel
                )}`}
              >
                <InfoIcon className="h-4 w-4" />
                {String(riskLevel).charAt(0).toUpperCase() +
                  String(riskLevel).slice(1)}{" "}
                Risk
              </span>
            </Tooltip>
          )}
        </div>
        <p className="text-gray-600 text-sm">
          DOB: {formatDate(prospect?.dob)}
        </p>
        <p className="text-gray-600 text-sm">
          {prospect?.city}, {prospect?.state}
        </p>
        <p className="text-gray-600 text-sm">
          Report ID: {reportIdRef.current} • Generated on{" "}
          {generatedOnRef.current.toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Location History */}
        <Section title="Location History">
          {person.location_history?.length ? (
            <ul className="space-y-3">
              {person.location_history.map((loc: any, idx: number) => {
                // Support both string and object shapes
                const label =
                  typeof loc === "string"
                    ? loc
                    : [
                        loc.locality || loc.city || loc.town,
                        loc.region || loc.state,
                        loc.country,
                      ]
                        .filter(Boolean)
                        .join(", ");

                const start =
                  loc.start_date || loc.from || loc.start || loc.begin;
                const end = loc.end_date || loc.to || loc.end;

                return (
                  <li key={idx} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">
                        {label || "Location"}
                      </span>
                      {(start || end) && (
                        <span className="text-gray-600">
                          {formatRange(start, end)}
                        </span>
                      )}
                    </div>
                    {/* optional extra address line if you have it */}
                    {loc.address_line && (
                      <p className="text-gray-700 capitalize">
                        {loc.address_line}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyBlock text="No location history found." />
          )}
        </Section>

        {/* Legal */}
        <Section title="Legal Appearances">
          {person.legal_appearances?.length ? (
            <ul className="space-y-3">
              {person.legal_appearances.map((c: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.title || c.type}</span>
                    <span className="text-gray-600">{formatDate(c.date)}</span>
                  </div>
                  <p className="text-gray-700">
                    {[c.location, c.plaintiff].filter(Boolean).join(" • ")}
                  </p>
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View source
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock text="No legal appearances found." />
          )}
        </Section>

        {/* Employment */}
        <Section title="Employment History">
          {person.employment_history?.length ? (
            <ul className="space-y-3">
              {person.employment_history.map(
                (job: any, idx: number) =>
                  (job?.company || job?.position) && (
                    <li key={idx} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium capitalize">
                          {job.position || "Role unknown"}
                        </span>
                        <span className="text-gray-600">
                          {formatRange(job.start_date, job.end_date)}
                        </span>
                      </div>
                      {job.company && (
                        <p className="text-gray-700 capitalize">
                          {job.company}
                        </p>
                      )}
                    </li>
                  )
              )}
            </ul>
          ) : (
            <EmptyBlock text="No employment history found." />
          )}
        </Section>

        {/* Education */}
        {person.education_history.length > 0 && (
          <Section title="Education">
            {person.education_history?.length ? (
              <ul className="space-y-3">
                {person.education_history.map((edu: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">
                        {edu.school || edu.institution || "School"}
                      </span>
                      <span className="text-gray-600">
                        {formatRange(edu.start_date, edu.end_date)}
                      </span>
                    </div>
                    {(edu.degree || edu.institution_type || edu.location) && (
                      <p className="text-gray-700 capitalize">
                        {[edu.degree, edu.location].filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyBlock text="No education records found." />
            )}
          </Section>
        )}

        {/* Companies */}
        <Section title="Company Registrations">
          {person.company_registrations?.length ? (
            <ul className="space-y-3">
              {person.company_registrations.map((co: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <span className="font-medium">{co.name}</span>{" "}
                  {co.link && (
                    <a
                      href={co.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Registry
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock text="No company registrations found." />
          )}
        </Section>

        {/* Press */}
        <Section title="Press Mentions">
          {person.press_mentions?.length ? (
            <ul className="space-y-3">
              {person.press_mentions.map((pr: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{pr.topic || "Mention"}</span>
                    <span className="text-gray-600">{formatDate(pr.date)}</span>
                  </div>
                  {pr.description && (
                    <p className="text-gray-700">{pr.description}</p>
                  )}
                  {pr.link && (
                    <a
                      href={pr.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Read article
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBlock text="No press mentions found." />
          )}
        </Section>

        {/* Social */}
        <Section title="Online / Social Profiles">
          {person.social_media_profiles?.length ? (
            <ul className="space-y-3">
              {person.social_media_profiles.map((p: any, idx: number) => {
                const href = toAbsoluteUrl(p.url);
                const label = href.replace(/^https?:\/\//, ""); // nicer display
                return (
                  <li key={idx} className="text-sm">
                    <span className="font-medium capitalize">
                      {p.platform || "Profile"}
                    </span>
                    {href && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {label}
                        </a>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyBlock text="No social profiles found." />
          )}
        </Section>

        {/* Public comments (optional) */}
        {person.public_comments?.length ? (
          <Section title="Public Comments">
            <ul className="space-y-3">
              {person.public_comments.map((c: any, idx: number) => (
                <li key={idx} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{c.platform}</span>
                    <span className="text-gray-600">{formatDate(c.date)}</span>
                  </div>
                  {c.content && <p className="text-gray-700">{c.content}</p>}
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* Summary */}
        {foundResult && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="font-medium mb-2">Overall Summary</h4>
            <p className="text-gray-800">
              {person.short_summary || "No summary available."}
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-xs mt-2 text-black">
        AI can make mistakes. Some results may be incorrect.
      </p>
    </div>
  );
};

export default ResultsPanel;
