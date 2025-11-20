import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_ACCESS_KEY_SECRET!;
const AWS_REGION = process.env.NEXT_PUBLIC_REGION!;

function emailToS3Prefix(email: string | undefined) {
  if (!email) return "";
  return email
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/\+/g, "_plus_")
    .replace(/\./g, "_dot_")
    .replace(/-/g, "_dash_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
}

export async function POST(req: Request) {
  const { PDFfile, fileName, email } = await req.json();

  // Convert the base64 or other file data to a Buffer
  const pdfBuffer = Buffer.from(PDFfile, "base64"); // Adjust encoding if necessary
  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
  const prefix = emailToS3Prefix(email);
  const folder = prefix
    ? `background-check-reports/${prefix}`
    : "background-check-reports";
  const params = {
    Bucket: "other-user-uploads",
    Key: `${folder}/${fileName}`,
    Body: pdfBuffer,
    ContentType: "application/pdf",
  };
 
  try {
    const data = await s3.send(new PutObjectCommand(params));
    console.log("File uploaded successfully:", data);
    return NextResponse.json({
      location: `https://${params.Bucket}.s3.${AWS_REGION}.amazonaws.com/${params.Key}`,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
