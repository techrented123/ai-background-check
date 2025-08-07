import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const token = searchParams.get("token") as string;

  // 2) Build URL & headers
  const base = (process.env.NEXT_PUBLIC_WORDPRESS_BASE_API || "").replace(
    /\/+$/,
    ""
  );
  const url = `${base}/scan_id/v1/get-token/?token=${encodeURIComponent(
    token
  )}`;
  const headers = {
    Accept: "application/json",
    "CF-Access-Client-Id": process.env
      .NEXT_PUBLIC_CF_ACCESS_CLIENT_ID as string,
    "CF-Access-Client-Secret": process.env
      .NEXT_PUBLIC_CF_ACCESS_CLIENT_SECRET as string,
  };

  console.log(
    { url },
    "clientid: ",
    headers["CF-Access-Client-Id"],
    "client-secret: ",
    headers["CF-Access-Client-Secret"]
  );
  // 3) Fetch
  const response = await fetch(url, { headers });
  const text = await response.text();

  // 4) Parse or error
  if (!response.ok) {
    return NextResponse.json({ message: text }, { status: response.status });
  }
  try {
    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e) { 
    console.error("❌  JSON parse error:", e);
    return NextResponse.json(
      { message: "Invalid JSON", details: text },
      { status: 500 }
    );
  }
}
