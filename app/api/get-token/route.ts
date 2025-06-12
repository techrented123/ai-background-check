import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // Get the token from the query parameters

  if (!token) {
    return NextResponse.json({ message: "Token is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.WORDPRESS_TOKEN_BASE_API}/get-token/?token=${token}`, // Send token as a query parameter
      {
        method: "GET",
        headers: {
          Accept: "application/json", // Optional: Specify that you expect a JSON response
        },
      }
    );
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        {
          message:
            error.message || "Something went wrong. Please try again later",
        },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Could not fetch token:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
