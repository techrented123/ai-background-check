/*eslint-disable @typescript-eslint/no-explicit-any*/

import OpenAI from "openai";
import { ProspectInfo, BackgroundCheckResult } from "../../../types";
import { NextRequest } from "next/server";

// Initialize OpenAI client with your API key
const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPEN_AI_API_KEY,
});

// System prompt instructions for background check
const instructions = `You are an automated public‐profile investigator. When given a tenant’s details, you will:
1. Perform a thorough web search (using Google as your primary source) to gather any publicly available information.  
2. Focus on these categories:
   • Press mentions & news articles  
   • Court or legal filings worldwide 
   • Public social media profiles (LinkedIn, Facebook, Twitter, Instagram)  
   • Company registrations or board affiliations  
   • Public comments, blog posts, forums, or other online activity  
   • Anything else that may reflect positively or negatively on their character  

3. Always verify that each URL returned is live and points to the correct person. *Some URLs returned in the past were incorrect*  

4. Return exactly one JSON object with these keys (no extra text):
   {
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
Name: <Full Name>  
Location1: <City, Province>  
Email: <Email>  
DateOfBirth: <YYYY-MM-DD>  
[Optional] Location2: <City 2, Province 2>  
[Optional] Employer: <Company or Organization>

Example user message:
Name: Jane Doe
Location1: Vancouver, BC
Email: jane.doe@example.com
Date Of Birth: 1985-07-15
`;

export async function POST(request: NextRequest) {
  try {
    const formData: ProspectInfo = await request.json();

    // Construct user input for the model
    const userInput = `
        Name: ${formData.firstName} ${formData.other_names} ${formData.lastName}
        Location 1: ${formData.city}, ${formData.state}
        Email: ${formData.email}
        Date of Birth: ${formData.dob}
        ${
          formData.city2
            ? `Location 2: ${formData.city2}, ${formData.state2}`
            : ""
        }
        `;

    // Call OpenAI chat completion
    /*   const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: userInput.trim() },
      ],
      temperature: 0,
    }); */
    const response = await client.chat.completions.create({
      model: "gpt-4o-search-preview",
      messages: [
        {
          role: "system",
          content: instructions,
        },
        {
          role: "user",
          content: userInput.trim(),
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    let openAIResult;

    try {
      openAIResult = JSON.parse(
        content?.replace(/```json\s*|\s*```/g, "") || "{}"
      );
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse model response");
    }

    // Transform the OpenAI response into our BackgroundCheckResult format
    const result: BackgroundCheckResult = {
      id: "BCR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: new Date().toISOString(),
      prospect: formData,
      newsArticles: {
        found: openAIResult.press_mentions.length > 0,
        articles: openAIResult.press_mentions.map(
          (mention: { date: string; description: string; topic: string }) => ({
            title: mention.topic,
            date: mention.date,
            source: "Web Search",
            summary: mention.description,
          })
        ),
        // recommendation: openAIResult.short_summary,
      },
      legalAppearances: {
        found: openAIResult.legal_appearances.length > 0,
        cases: openAIResult.legal_appearances.map(
          (appearance: { date: string; location: string; title: string }) => ({
            caseNumber: Math.random()
              .toString(36)
              .substring(2, 10)
              .toUpperCase(),
            date: appearance.date,
            court: appearance.location,
            type: appearance.title,
            status: "Recorded",
          })
        ),
        recommendation:
          openAIResult.legal_appearances.length > 0
            ? "Review any legal proceedings carefully and consider their relevance to the application."
            : "",
      },
      socialMedia: {
        found: openAIResult.social_media_profiles.length > 0,
        profiles: openAIResult.social_media_profiles.map(
          (profile: { platform: string; link: string }) => ({
            platform: profile.platform,
            url: profile.link,
            summary: "Profile found through web search",
          })
        ),
        recommendation:
          "Review social media presence for professional conduct and consistency.",
      },
      businessAssociations: {
        found: openAIResult.company_registrations.length > 0,
        companies: openAIResult.company_registrations.map(
          (company: { name: string }) => ({
            name: company.name,
            role: "Associated",
            status: "Found in Records",
            registrationDate: new Date().toISOString().split("T")[0],
          })
        ),
        recommendation:
          "Verify current status of business associations and assess potential impacts.",
      },
      onlineActivity: {
        found: Boolean(
          openAIResult.public_comments.length || openAIResult.others.length
        ),
        details: {
          others: openAIResult.others,
          public_comments: openAIResult.public_comments,
        },
        fallback: "No significant online activity found.",
        recommendation:
          "Consider the overall online presence and its relevance to the application.",
      },
      riskLevel: determineRiskLevel(openAIResult),
      overallRecommendation: openAIResult.short_summary,
    };
    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Background check error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

/*

*/
function determineRiskLevel(data: any): "low" | "medium" | "high" {
  let riskScore = 0;
  // Increase risk score based on various factors
  if (data.legal_appearances.length > 0) riskScore += 3;
  if (
    data.press_mentions.some((m: { description: string }) =>
      m.description.toLowerCase().includes("negative")
    )
  )
    riskScore += 2;
  if (!data.social_media_profiles.length) riskScore += 1;

  // Determine risk level based on score
  if (riskScore >= 3) return "high";
  if (riskScore >= 1) return "medium";
  return "low";
}
