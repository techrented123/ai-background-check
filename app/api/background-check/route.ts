/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { ProspectInfo } from "../../../types";

// ✅ server-side key (don't use NEXT_PUBLIC here)

// (Optional) force Node runtime (not Edge)
export const runtime = "nodejs";

// Company name validation to filter out hallucinations
function isValidCompanyName(company: string): boolean {
  // Reject obvious hallucinations
  if (!company || company.length < 2) return false;

  // Reject placeholder/generic names
  const invalidPatterns = [
    /^(xxx|cccc|zzz|[a-z]{1,4})$/i, // Single/double/triple letters
    /^(company|inc|ltd|llc)$/i, // Generic terms
    /^(test|sample|example)$/i, // Test data
    /^(unknown|n\/a|tbd)$/i, // Unknown indicators
    /^(fraud|fake)$/i, // Suspicious names
    /^fraud\s+ai$/i, // Fraud AI with space
  ];

  // Additional specific rejections
  const specificRejections = ["xxx", "ccc", "zzz", "fraud ai", "fraud ai inc"];
  if (specificRejections.includes(company.toLowerCase())) {
    console.log(`🚫 Specific rejection: "${company}"`);
    return false;
  }

  const isPatternMatch = invalidPatterns.some((pattern) =>
    pattern.test(company)
  );
  if (isPatternMatch) {
    console.log(`🚫 Pattern rejection: "${company}"`);
    return false;
  }

  console.log(`✅ Accepting company: "${company}"`);
  return true;
}

// Validate employment data to filter out hallucinations
function validateEmploymentData(employmentData: any[]): any[] {
  if (!Array.isArray(employmentData)) return [];

  return employmentData.filter((job) => {
    const hasValidCompany = isValidCompanyName(job.company);
    const hasValidPosition =
      job.position &&
      job.position.toLowerCase() !== "xxx" &&
      job.position.length > 2;

    // Debug logging
    if (!hasValidCompany) {
      console.log(
        `❌ Rejected company: "${job.company}" - Position: "${job.position}"`
      );
    }

    return hasValidCompany && hasValidPosition;
  });
}

const getSystemInstructions = (formData: ProspectInfo) => {
  return `const instructions = You are a highly-skilled automated public‐profile investigator. When given a tenant’s details, you will:
1. Perform a thorough web search (using Google as your primary source) to gather any available information (public or private).  
2. Focus on these categories:
   • Press mentions & news articles  
   • Employment History
   • Location History (City, State and Country)
   • Court or legal filings worldwide 
   • Public social media profiles (LinkedIn, Facebook, Twitter, Instagram)  
   • Company registrations or board affiliations  
   • Public comments, blog posts, forums, or other online activity  
   • Anything else that may reflect positively or negatively on their character  

3. Always verify that each URL returned is live and points to the correct person. **Some URLs returned in the past were incorrect**  

4. Return exactly one JSON object with these keys (no extra text):
   {
     "employment_history": [{ "start_date":"YYYY-MM-DD", "end_date":"YYYY-MM-DD", company:"", position:""}],
     "location_history": [{ "start_date":"YYYY-MM-DD", city:"", state:"", country:""}],
     "press_mentions": [ { "date":"YYYY-MM-DD", "topic":"", "description":"", "link":"" } ],
     "legal_appearances": [ { "date":"YYYY-MM-DD", "title":"", "description":"", "location":"", "plaintiff":"", "link":"" } ],
     "social_media_profiles": [ { "platform":"", "link":"" } ],
     "company_registrations": [ { "name":"", "link":"" } ],
     "public_comments": [ { "date":"YYYY-MM-DD", "platform":"", "content":"", "link":"" } ],
     "others": [ { "note":"", "link":"","platform":"" } ],
     "short_summary": ""
   }

- Use ISO date format (YYYY-MM-DD).  
- If a section has no entries, use an empty array ("[]").  
- Do **not** wrap the JSON in code fences or add any explanatory text.  
- Only output valid JSON.

Input format (as a user message):
Name: ${formData.firstName} ${formData.other_names || ""} ${formData.lastName}
Location1: ${formData.city}, ${formData.state}  
Email: <Email>  
DateOfBirth: ${formData.dob}
[Optional] Location2: formData.city2 && formData.state2
      ?  ${formData.city2}, ${formData.state2}
      : ""; 
`;

  /* const prevLoc =
    formData.city2 && formData.state2
      ? `• Previous location: ${formData.city2}, ${formData.state2}\n`
      : "";
  return `You are an automated public‐profile investigator. Search **all** accessible sources, using Google as your primary source for the target person below. 
Target
──────
• Full name: ${formData.firstName} ${formData.other_names || ""} ${
    formData.lastName
  }
• Aliases: ${formData.other_names || "None"}
• DOB or age: ${formData.dob || "Unknown"}
• Primary location: ${formData.city}, ${formData.state}
• Email(s): ${formData.email}
${prevLoc}
Rules
─────
• Verify each finding with ≥2 anchors (e.g., name+city or name+email).
• Neutral, factual; no guesses.
• Output **one** JSON object only, no markdown/fences.
• If a section has no verified hits, use [].
• Add a brief research_log of queries/tools used.`; */
};

async function fetchViaChatGPT(formData: ProspectInfo) {
  const apiKey = process.env.NEXT_PUBLIC_OPEN_AI_API_KEY;
  const client = new OpenAI({ apiKey });
  const userInput = `
Begin investigation:
Name: ${formData.firstName} ${formData.other_names || ""} ${formData.lastName}
Location 1: ${formData.city}, ${formData.state}
${
  formData.city2 && formData.state2
    ? `Location 2: ${formData.city2}, ${formData.state2}`
    : ""
}
Email: ${formData.email}
DOB: ${formData.dob || "Unknown"}
`.trim();
  try {
    // ✅ Single call: web search + strict JSON output
    const res = await client.responses.create({
      model: "gpt-4.1", // supports Responses API + web_search
      tools: [{ type: "web_search_preview" }], // enable browsing
      tool_choice: "auto",
      max_output_tokens: 2000,
      input: [
        { role: "system", content: getSystemInstructions(formData) },
        { role: "user", content: userInput },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "osint_report",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              employment_history: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    start_date: { type: "string" },
                    company: { type: "string" },
                    position: { type: "string" },
                    end_date: { type: "string" },
                  },
                  required: ["start_date", "company", "position", "end_date"],
                },
              },
              location_history: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    start_date: { type: "string" },
                    end_date: { type: "string" },
                    city: { type: "string" },
                    state: { type: "string" },
                    country: { type: "string" },
                  },
                  required: [
                    "start_date",
                    "city",
                    "state",
                    "country",
                    "end_date",
                  ],
                },
              },
              press_mentions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    topic: { type: "string" },
                    description: { type: "string" },
                    link: { type: "string" },
                  },
                  required: ["topic", "link", "date", "description"],
                },
              },
              legal_appearances: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    location: { type: "string" },
                    plaintiff: { type: "string" },
                    link: { type: "string" },
                  },
                  required: [
                    "date",
                    "location",
                    "plaintiff",
                    "link",
                    "title",
                    "description",
                  ],
                },
              },
              social_media_profiles: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    platform: { type: "string" },
                    link: { type: "string" },
                  },
                  required: ["platform", "link"],
                },
              },
              company_registrations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    link: { type: "string" },
                  },
                  required: ["name", "link"],
                },
              },
              public_comments: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    date: { type: "string" },
                    platform: { type: "string" },
                    content: { type: "string" },
                    link: { type: "string" },
                  },
                  required: ["date", "platform", "content", "link"],
                },
              },
              others: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    note: { type: "string" },
                    link: { type: "string" },
                    platform: { type: "string" },
                  },
                  required: ["platform", "note", "link"],
                },
              },
              short_summary: { type: "string" },
              research_log: { type: "array", items: { type: "string" } },
            },
            required: [
              "employment_history",
              "location_history",
              "press_mentions",
              "legal_appearances",
              "social_media_profiles",
              "company_registrations",
              "public_comments",
              "others",
              "short_summary",
              "research_log",
            ],
          },
          strict: true,
        },
      },
    });

    const output = res.output_text || "{}";
    console.log("🔍 OpenAI Response:", output);
    const data = JSON.parse(output);

    // Validate employment data to remove hallucinations
    const validatedEmployment = validateEmploymentData(
      data.employment_history || []
    );
    console.log(
      `✨ Original employment entries: ${data.employment_history?.length || 0}`
    );
    console.log(
      `✅ Validated employment entries: ${validatedEmployment.length}`
    );

    // Filter out filtered employment if validation removed too many
    const finalData = {
      ...data,
      employment_history:
        validatedEmployment.length > 0
          ? validatedEmployment
          : data.employment_history || [],
    };

    console.log("📊 Parsed OpenAI Data:", JSON.stringify(finalData, null, 2));
    const foundPerson = Boolean(
      finalData.company_registrations.length ||
        finalData.social_media_profiles.length ||
        finalData.employment_history.length ||
        finalData.public_comments.length ||
        finalData.legal_appearances.length ||
        finalData.press_mentions.length
    );

    return { ok: true, data: { ...finalData, foundPerson } };
  } catch (err: any) {
    // graceful fallback if web_search isn’t enabled on the account
    if (err?.status === 400 && /web_search/i.test(err?.message || "")) {
      return NextResponse.json(
        { error: "web_search tool not enabled for this account/model" },
        { status: 502 }
      );
    }
    console.error("OpenAI API failure:", err);
    return { ok: false, error: err?.message || "OpenAI API failure" };
  }
}

async function fetchViaPDL(body: ProspectInfo) {
  if (
    !body.firstName ||
    !body.lastName ||
    !body.city ||
    !body.state ||
    !body.dob
  ) {
    return { ok: false, error: `Missing a form field` };
  }

  const apiKey = process.env.NEXT_PUBLIC_PDL_API_KEY;
  // --- 3. Construct the request payload for the PDL API ---
  // We use the exact field names required by the PDL Identify API.
  const pdlParams = {
    first_name: body.firstName,
    last_name: body.lastName,
    middle_name: body.other_names, // Will be undefined if not provided, which is fine
    locality: body.city, // 'locality' is the PDL term for city
    region: body.state, // 'region' is the PDL term for state/province
    birth_date: body.dob,
  };
  try {
    const searchParams = new URLSearchParams();

    // Append parameters to the search params object, being careful to skip undefined/null values.
    for (const [key, value] of Object.entries(pdlParams)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const url = `https://api.peopledatalabs.com/v5/person/identify?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey as string,
      },
      signal: AbortSignal.timeout?.(15000) as any,
    });

    const pdlData = await response.json().catch(() => ({}));
    console.log(
      "📋 People Data Labs Response:",
      JSON.stringify(pdlData, null, 2)
    );

    if (!response.ok) {
      console.log("❌ PDL Error:", pdlData);
      return {
        ok: false,
        http: response.status,
        error:
          pdlData?.error?.message ||
          pdlData?.message ||
          `PDL error ${response.status}`,
      };
    }
    const matches = pdlData.matches;

    // --- 5. Handle the response from PDL ---
    // A status of 200 from PDL indicates a successful match was found.
    if (pdlData.status === 200) {
      const selectedMatch =
        matches.length > 1
          ? matches.sort((a: any, b: any) => b.match_score - a.match_score)[0]
          : matches[0];

      // Validate PDL employment data if it exists
      if (selectedMatch?.data?.experience) {
        const originalExperiences = selectedMatch.data.experience.length;

        // Convert PDL experience format to our format for validation
        const employmentData = selectedMatch.data.experience.map((exp: any) => ({
          company: exp.company?.name || "",
          position: exp.title?.name || "",
          start_date: exp.start_date || "",
          end_date: exp.end_date || "",
        }));

        const validatedEmployment = validateEmploymentData(employmentData);
        console.log(`🎯 PDL Original experiences: ${originalExperiences}`);
        console.log(
          `✅ PDL Validated experiences: ${validatedEmployment.length}`
        );

        // Convert back to PDL format and update the match
        if (validatedEmployment.length < originalExperiences) {
          selectedMatch.data.experience = validatedEmployment.map((job) => ({
            company: { name: job.company },
            title: { name: job.position },
            start_date: job.start_date,
            end_date: job.end_date,
          }));

          // If all experiences were invalid, remove them entirely
          if (validatedEmployment.length === 0) {
            selectedMatch.data.experience = [];
          }
        }
      }

      return { ok: true, data: selectedMatch };
    }

    // PDL returns a 404 if no match is found for the given criteria.
    return { ok: false, http: pdlData.status, error: "No match found" };
  } catch (error) {
    // --- 6. Handle unexpected errors ---
    // This catches issues like invalid JSON in the request body or network problems.
    console.error("Error in /api/identify-person:", error);
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof SyntaxError) {
      errorMessage = "Invalid JSON format in request body.";
      console.log({ errorMessage });
    }
    return { ok: false, error: errorMessage || "OpenAI API failure" };
  }
}
/* async function fetchViaChatdGPT(form) {
  return;
}
async function fetchViadPDL(form) {
  return;
} */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    if (!formData)
      return NextResponse.json(
        { error: "Bad Request. Missing body" },
        { status: 400 }
      );
    const [gptSettled, pdlSettled] = await Promise.allSettled([
      fetchViaChatGPT(formData),
      fetchViaPDL(formData),
    ]);
    /*  const gpt3 = {
      ok: true,
      data: {
        foundPerson: false,
        employment_history: [
             {
            start_date: "2019-01-01",
            company: "Outlier",
            position: "Front-end Developer",
            end_date: "2024-08-13",
          },
          {
            start_date: "2019-01-01",
            company: "KondarSoft",
            position: "Commercial Consultant",
            end_date: "2024-08-13",
          }, 
        ],
        location_history: [
          /*   {
            start_date: "2019-01-01",
            end_date: "2024-08-13",
            city: "Vancouver",
            state: "British Columbia",
            country: "Canada",
          }, 
        ],
        press_mentions: [],
        legal_appearances: [],
        social_media_profiles: [],
        company_registrations: [],
        public_comments: [],
        others: [],
        short_summary:
          "Tambi Asawo is a front-end developer at Outlier and a commercial consultant at KondarSoft, based in Vancouver, British Columbia, Canada.",
        research_log: [
          "Searched for 'Tambi Asawo Vancouver BC'",
          "Reviewed Uploadcare blog author page",
          "Checked Contra profile for services and work history",
          "Examined MobyGames profile for credits",
          "Visited KondarSoft website for consultant information",
        ],
      },
    }; */

    const gpt =
      gptSettled.status === "fulfilled"
        ? gptSettled.value
        : { ok: false, error: gptSettled.reason?.message || "OpenAI crashed" };

    console.log("🤖 GPT Result:", gpt);
    console.log("📊 GPT Settled Status:", gptSettled.status);
    if (gptSettled.status === "rejected") {
      console.log("❌ GPT Rejection Reason:", gptSettled.reason);
    }

    /*  const pdl3 = {
      ok: true,
      data: {
        data: {
          id: "X3BjH6b4XqAgcE43OGPMfg_0000",
          full_name: "tambi asawo",
          first_name: "tambi",
          middle_initial: null,
          middle_name: null,
          last_initial: "a",
          last_name: "asawo",
          sex: "female",
          birth_year: null,
          birth_date: null,
          linkedin_url: null,
          linkedin_username: null,
          linkedin_id: null,
          facebook_url: null,
          facebook_username: null,
          facebook_id: null,
          twitter_url: null,
          twitter_username: null,
          github_url: null,
          github_username: null,
          work_email: null,
          personal_emails: [],
          recommended_personal_email: null,
          mobile_phone: null,
          industry: "electrical/electronic manufacturing",
          job_title: null,
          job_title_role: null,
          job_title_sub_role: null,
          job_title_class: null,
          job_title_levels: [],
          job_company_id: null,
          job_company_name: null,
          job_company_website: null,
          job_company_size: null,
          job_company_founded: null,
          job_company_industry: null,
          job_company_linkedin_url: null,
          job_company_linkedin_id: null,
          job_company_facebook_url: null,
          job_company_twitter_url: null,
          job_company_location_name: null,
          job_company_location_locality: null,
          job_company_location_metro: null,
          job_company_location_region: null,
          job_company_location_geo: null,
          job_company_location_street_address: null,
          job_company_location_address_line_2: null,
          job_company_location_postal_code: null,
          job_company_location_country: null,
          job_company_location_continent: null,
          job_last_changed: null,
          job_last_verified: null,
          job_start_date: null,
          location_name: "winnipeg, manitoba, canada",
          location_locality: "winnipeg",
          location_metro: null,
          location_region: "manitoba",
          location_country: "canada",
          location_continent: "north america",
          location_street_address: null,
          location_address_line_2: null,
          location_postal_code: null,
          location_geo: "49.84,-97.12",
          location_last_updated: null,
          phone_numbers: [],
          emails: [],
          interests: [
            "children",
            "environment",
            "health",
            "poverty alleviation",
            "science and technology",
            "social services",
          ],
          skills: [],
          location_names: ["winnipeg, manitoba, canada"],
          regions: ["manitoba, canada"],
          countries: ["canada"],
          street_addresses: [],
          experience: [
            {
              company: {
                name: "university of manitoba",
                size: "501-1000",
                id: "naEjBJuZs2Bxz8l3nUedEw0IjLlg",
                founded: 1877,
                industry: "higher education",
                location: {
                  name: "winnipeg, manitoba, canada",
                  locality: "winnipeg",
                  region: "manitoba",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "r3t 2n2",
                  geo: "49.84,-97.12",
                },
                linkedin_url: "linkedin.com/company/university-of-manitoba",
                linkedin_id: "31403556",
                facebook_url: null,
                twitter_url: null,
                website: null,
              },
              location_names: [],
              end_date: "2014-06",
              start_date: "2014-05",
              title: {
                name: "research student",
                class: "services",
                role: "education",
                sub_role: "student",
                levels: [],
              },
              is_primary: false,
            },
            {
              company: {
                name: "msi",
                size: null,
                id: null,
                founded: null,
                industry: null,
                location: null,
                linkedin_url: null,
                linkedin_id: null,
                facebook_url: null,
                twitter_url: null,
                website: null,
              },
              location_names: ["calgary, alberta, canada"],
              end_date: "2013-08",
              start_date: "2013-05",
              title: {
                name: "warehouse associate",
                class: "services",
                role: "fulfillment",
                sub_role: "warehouse",
                levels: [],
              },
              is_primary: false,
            },
            {
              company: {
                name: "university of manitoba",
                size: "501-1000",
                id: "naEjBJuZs2Bxz8l3nUedEw0IjLlg",
                founded: 1877,
                industry: "higher education",
                location: {
                  name: "winnipeg, manitoba, canada",
                  locality: "winnipeg",
                  region: "manitoba",
                  metro: null,
                  country: "canada",
                  continent: "north america",
                  street_address: null,
                  address_line_2: null,
                  postal_code: "r3t 2n2",
                  geo: "49.84,-97.12",
                },
                linkedin_url: "linkedin.com/company/university-of-manitoba",
                linkedin_id: "31403556",
                facebook_url: null,
                twitter_url: null,
                website: null,
              },
              location_names: [],
              end_date: null,
              start_date: "2011-01",
              title: {
                name: "student",
                class: "services",
                role: "education",
                sub_role: "student",
                levels: [],
              },
              is_primary: false,
            },
          ],
          education: [
            {
              school: {
                name: "university of manitoba",
                type: "post-secondary institution",
                id: "fGOlVMNupjx3cjpHK3yiDw_0",
                location: {
                  name: "winnipeg, manitoba, canada",
                  locality: "winnipeg",
                  region: "manitoba",
                  country: "canada",
                  continent: "north america",
                },
                linkedin_url: "linkedin.com/school/umanitoba",
                facebook_url: "facebook.com/umanitoba",
                twitter_url: "twitter.com/umanitoba",
                linkedin_id: "11692",
                website: "umanitoba.ca",
                domain: "umanitoba.ca",
              },
              degrees: ["bachelors"],
              start_date: "2011",
              end_date: "2016",
              majors: [],
              minors: [],
              gpa: null,
            },
            {
              school: {
                name: "access high school",
                type: "secondary school",
                id: null,
                location: null,
                linkedin_url: null,
                facebook_url: null,
                twitter_url: null,
                linkedin_id: null,
                website: null,
                domain: null,
              },
              degrees: [],
              start_date: "2004",
              end_date: "2010",
              majors: [],
              minors: [],
              gpa: null,
            },
          ],
          profiles: [
            {
              network: "linkedin",
              id: "328933665",
              url: "linkedin.com/in/tambi-asawo-1691ab92",
              username: "tambi-asawo-1691ab92",
            },
          ],
          dataset_version: "31.0",
        },
      },
      match_score: 27,
      matched_on: ["name"],
    };
 */
    const pdl =
      pdlSettled.status === "fulfilled"
        ? pdlSettled.value
        : {
            ok: false,
            error: pdlSettled.reason?.message || "PDL crashed",
            data: null,
          };

    console.log("📋 PDL Result:", pdl);
    console.log("📊 PDL Settled Status:", pdlSettled.status);
    if (pdlSettled.status === "rejected") {
      console.log("❌ PDL Rejection Reason:", pdlSettled.reason);
    }

    const ok = Boolean(gpt?.ok || pdl?.ok);

    console.log("🎯 Final Combined Result - OK:", ok);
    console.log("🔄 GPT OK:", gpt?.ok);
    console.log("🔄 PDL OK:", pdl?.ok);

    // Only treat as server error if BOTH providers actually crashed/rejected
    const bothCrashed =
      gptSettled.status === "rejected" && pdlSettled.status === "rejected";

    const status = bothCrashed ? 502 : 200;
    const finalResponse = {
      ok,
      gpt,
      pdl: {
        ok: pdl?.ok,
        data: pdl?.data?.data,
        //match_score: pdl?.match_score,
      },
    };

    console.log(
      "📤 Final API Response:",
      JSON.stringify(finalResponse, null, 2)
    );
    console.log("📄 Response Status:", status);

    return NextResponse.json(finalResponse, { status });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: e instanceof Error ? e?.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
