import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  // 2) Build URL & headers
  const base = (process.env.NEXT_PUBLIC_WORDPRESS_BASE_API || "").replace(
    /\/+$/,
    ""
  );
  const url = `${base}/complete-token/?token=${encodeURIComponent(token)}`;
  const headers = {
    Accept: "application/json",
    "CF-Access-Client-Id": process.env
      .NEXT_PUBLIC_CF_ACCESS_CLIENT_ID as string,
    "CF-Access-Client-Secret": process.env
      .NEXT_PUBLIC_CF_ACCESS_CLIENT_SECRET as string,
  };

  // 3) Fetch
  const response = await fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const text = await response.text();
  console.log("updated token response", text);
  // 4) Parse or error
  if (!response.ok) {
    return NextResponse.json({ message: text }, { status: response.status });
  }
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e) {
    console.error("❌ JSON parse error:", e);
    return NextResponse.json(
      { message: "Invalid JSON", details: text },
      { status: 500 }
    );
  }
}
