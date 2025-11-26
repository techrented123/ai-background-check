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
  return `You are a highly-skilled automated public‐profile investigator. When given a tenant’s details, you will:
1. Perform a thorough web search (using Google as your primary source) to gather any available information.  
2. Focus STRICTLY on:
   • Press mentions & news articles about this specific person  
   • Public social media profiles (LinkedIn, Facebook, Twitter/X, Instagram, TikTok, etc.)  
   • Location history (cities/regions/countries where this person has lived or worked)  
   • Company registrations, directorships, or beneficial ownership that clearly match this person  

Rules:
- You MUST verify that each URL or location returned is about the correct person (matching name + at least one of: city/region/country, company, or school).
- If you are not reasonably confident a hit is about this person, DO NOT include it.
- If there are no verified items for a section, return an empty array for that section.
- Output one JSON object only, with this structure (no extra commentary):
{
  "press_mentions": [
    { "date": "YYYY-MM-DD", "topic": "", "description": "", "link": "" }
  ],
  "social_media_profiles": [
    { "platform": "", "link": "" }
  ],
  "location_history": [
    { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "city": "", "state": "", "country": "" }
  ],
  "company_registrations": [
    { "name": "", "role": "", "link": "" }
  ],
  "short_summary": "",
  "research_log": [
    "short notes on what you searched and which sources you used"
  ]
}

Input (about the person):
Name: ${formData.firstName} ${formData.other_names || ""} ${formData.lastName}
Location: ${formData.city}, ${formData.state}, ${formData.country}
DateOfBirth: ${formData.dob}
Company: ${formData.company}
School: ${formData.school}
Email: ${formData.email}`;
};

async function fetchViaChatGPT(formData: ProspectInfo) {
  const apiKey = process.env.NEXT_PUBLIC_OPEN_AI_API_KEY;
  if (!apiKey) {
    console.error("Missing NEXT_PUBLIC_OPEN_AI_API_KEY");
    return { ok: false, error: "Missing OpenAI API key" };
  }

  const client = new OpenAI({ apiKey });

  const userInput = `
Begin investigation:
Name: ${formData.firstName} ${formData.other_names || ""} ${formData.lastName}
Location: ${formData.city}, ${formData.state}, ${formData.country}
Date of Birth: ${formData.dob || "Unknown"}
Company: ${formData.company}
School: ${formData.school}
Email: ${formData.email}
`.trim();

  try {
    const res = await client.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search_preview" }],
      tool_choice: "auto",
      max_output_tokens: 1800,
      input: [
        {
          role: "system",
          content: getSystemInstructions(formData),
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "osint_press_social_location",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
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
                  required: ["date", "topic", "description", "link"],
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
                  // OpenAI's json_schema requires 'required' to include every key in properties
                  required: [
                    "start_date",
                    "end_date",
                    "city",
                    "state",
                    "country",
                  ],
                },
              },
              company_registrations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    role: { type: "string" },
                    link: { type: "string" },
                  },
                  required: ["name", "link"],
                },
              },
              short_summary: { type: "string" },
              research_log: { type: "array", items: { type: "string" } },
            },
            required: [
              "press_mentions",
              "social_media_profiles",
              "location_history",
              "company_registrations",
              "short_summary",
              "research_log",
            ],
          },
          strict: true,
        },
      },
    });

    const output = res.output_text || "{}";
    console.log("🔍 OpenAI OSINT Response:", output);
    const data = JSON.parse(output);

    return { ok: true, data };
  } catch (err: any) {
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
    street_address: body.street_address,
    postal_code: body.postal_code,
    country: body.country,
    phone: body.phone,
    email: body.email,
    profile: body?.social_media_profile || null,
    company: body.company,
    school: body.school,
  };
  try {
    const searchParams = new URLSearchParams();

    // Append parameters to the search params object, being careful to skip undefined/null values.
    for (const [key, value] of Object.entries(pdlParams)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const url = `https://api.peopledatalabs.com/v5/person/enrich?${searchParams.toString()}`;

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

    // --- 5. Handle the response from PDL ---
    // A status of 200 from PDL indicates a successful match was found.
    if (pdlData.status === 200 && pdlData.data) {
      const person = pdlData.data;
      if (Array.isArray(person.experience)) {
        const employmentData = person.experience.map((exp: any) => ({
          company: exp.company?.name || "",
          position: exp.title?.name || "",
          start_date: exp.start_date || "",
          end_date: exp.end_date || "",
        }));

        const validatedEmployment = validateEmploymentData(employmentData);
        if (validatedEmployment.length < person.experience.length) {
          person.experience = validatedEmployment.map((job) => ({
            company: { name: job.company },
            title: { name: job.position },
            start_date: job.start_date,
            end_date: job.end_date,
          }));
          if (validatedEmployment.length === 0) {
            person.experience = [];
          }
        }

        // Keep your existing shape: finalResponse expects pdl.data.data
        //return { ok: true, data: pdlData };
        // Convert back to PDL format and update the match
        /* if (validatedEmployment.length < originalExperiences) {
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
        } */
      }

      return { ok: true, data: pdlData };
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

    // 1) Call PDL to get a structured profile
    const pdlResult = await fetchViaPDL(formData);

    // 2) Only call GPT OSINT if PDL found a person
    let gpt: any = { ok: false, error: "PDL did not find a person" };
    if (pdlResult?.ok) {
      gpt = await fetchViaChatGPT(formData);
    }

    const pdl = pdlResult ?? {
      ok: false,
      error: "PDL crashed",
      data: null,
    };

    console.log("🤖 GPT Result:", gpt);
    console.log("📋 PDL Result:", pdl);

    const ok = Boolean(gpt?.ok || pdl?.ok);
    console.log("🎯 Final Combined Result - OK:", ok);
    console.log("🤖 GPT OK:", gpt?.ok);
    console.log("🔄 PDL OK:", pdl?.ok);

    const status = ok ? 200 : 502;
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
