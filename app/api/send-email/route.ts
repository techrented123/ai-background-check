import { NextResponse } from "next/server";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
const AWS_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_ACCESS_KEY_SECRET!;
const AWS_REGION = process.env.NEXT_PUBLIC_REGION!;

export async function POST(req: Request) {
  const { userDetails, recipientEmail, pdfUrl } = await req.json();

  // Handle both single email string and array of emails
  const emails = Array.isArray(recipientEmail)
    ? recipientEmail
    : [recipientEmail];

  // Determine email template type
  const getEmailType = () => {
    const nonReportsEmails = emails.filter(
      (email) => email.toLowerCase() !== "reports@rented123.com"
    );

    if (
      emails.every((email) => email.toLowerCase() === "reports@rented123.com")
    ) {
      return "reports-only"; // Auto-notification to reports
    } else if (nonReportsEmails.length > 1) {
      return "mixed"; // Multiple recipients including reports
    } else if (
      nonReportsEmails.length === 1 &&
      emails.includes("reports@rented123.com")
    ) {
      return "user-with-reports"; // User + auto-send to reports
    } else {
      return "user-only"; // Single user email
    }
  };

  const emailType = getEmailType();

  // Helper functions for email templates
  const getSubjectByType = (type: string) => {
    switch (type) {
      case "reports-only":
        return `${userDetails.first_name} ${userDetails.last_name} just completed a background check`;
      case "mixed":
        return `Background Check Report - ${userDetails.first_name} ${userDetails.last_name}`;
      case "user-with-reports":
        return `Your Background Check Report is Ready`;
      default:
        return `Your Background Check Report is Ready`;
    }
  };

  const addNoReplyNotice = (content: string) => {
    return content + "\n\n---\n***Please do not reply to this email.***";
  };

  const getTextBodyByType = (type: string) => {
    switch (type) {
      case "reports-only":
        return (
          `
Hello,

${userDetails.first_name} ${userDetails.last_name} just completed their background check.

Please find the background check report below:

View Report:` +
          ` ${pdfUrl}` +
          `

This report is available for your review and can be accessed through the secure link provided above. 

Best regards,
Rented123 Background Check System
https://www.rented123.com`
        );

      case "mixed":
        return (
          `
Hello,

Please find the background check report for ${userDetails.first_name} ${userDetails.last_name} below.

This report has been shared with you as part of the background check process.

View Report:` +
          ` ${pdfUrl}` +
          `

This is an automated notification. Please do not reply to this email. If you have questions, contact our support team directly.

Best regards,
Rented123 Team
https://www.rented123.com`
        );

      default: // 'user-only' and 'user-with-reports'
        return (
          `
Hello ${userDetails.first_name},

Congratulations! Your background check has been successfully completed. For your security, the link to view the report below is temporary and will expire in 24 hours.

View Your Report:` +
          ` ${pdfUrl}` +
          `

If you did not request this report or have any concerns about your account's security, please contact our support team immediately at support@rented123.com.

Thank you,
The Rented123 Team
https://www.rented123.com`
        );
    }
  };

  const getHtmlBodyByType = (type: string) => {
    const baseHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; }
        .header { text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
        .header img { max-width: 150px; }
        .content { padding: 0 10px; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { display: inline-block; padding: 12px 28px; background-color: #077BFB; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; }
        .footer { font-size: 12px; color: #888888; margin-top: 25px; text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;}
        .no-reply { font-size: 10px; color: #999999; text-align: center; margin-top: 15px; font-style: italic; }
        p { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
            <img width="100px" height="100px" src="https://rented123-brand-files.s3.us-west-2.amazonaws.com/logo_white.svg" alt="Rented123 Logo">
        </div>
        <div class="content">
          ${getHtmlContentByType(type)}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Rented123. All rights reserved.</p>
          <p>2185 Austin Ave., Coquitlam, BC, Canada</p>
          <div class="no-reply">Please do not reply to this email.</div>
        </div>
      </div>
    </body>
    </html>`;

    return baseHtml;
  };

  const getHtmlContentByType = (type: string) => {
    switch (type) {
      case "reports-only":
        return `
          <h2 style="color: #1a202c;">Background Check Completed</h2>
          <p>Hello,</p>
          <p><strong>${userDetails.first_name} ${userDetails.last_name}</strong> just completed their background check.</p>
          <p>Please find the background check report accessible through the secure link below:</p>
          <div class="button-container">
            <a href="${pdfUrl}" class="button">View Background Check Report</a>
          </div>
          <p>This report is available for your review and can be accessed through the secure link provided above. </p><br><br>
          <p>Best regards,<br>The Rented123 Background Check System</p>`;

      case "mixed":
        return `
          <h2 style="color: #1a202c;">Background Check Report</h2>
          <p>Hello,</p>
          <p>Please find the background check report for <strong>${userDetails.first_name} ${userDetails.last_name}</strong> below.</p>
          <p>This report has been shared with you as part of the background check process.</p>
          <div class="button-container">
            <a href="${pdfUrl}" class="button">View Background Check Report</a>
          </div>
          <p>This is an automated notification. Please do not reply to this email. If you have questions, contact our support team directly.</p>
          <p>Best regards,<br>The Rented123 Background Check System</p>`;

      default: // 'user-only' and 'user-with-reports'
        return `
          <h2 style="color: #1a202c;">Your Background Check Report is Ready</h2>
          <p>Hello ${userDetails.first_name.toUpperCase()},</p>
          <p>Congratulations! Your background check has been successfully completed. For your security, the link to view the report below is temporary and will expire in 24 hours.</p>
          <div class="button-container">
            <a href="${pdfUrl}" class="button">View Your Secure Report</a>
          </div>
          <p>If you did not request this report or have any concerns about your account's security, please contact our support team immediately at <a href="mailto:support@rented123.com" style="color: #077BFB; text-decoration: underline;">support@rented123.com</a>.</p>
          <p>Thank you,<br>The Rented123 Team</p>`;
    }
  };

  // Initialize SES client
  const ses = new SESClient({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const params = {
    Source: "Rented123 Reports <reports@rented123.com>",
    Destination: {
      ToAddresses: ["reports@rented123.com", ...emails],
    },
    Message: {
      Subject: {
        Data: getSubjectByType(emailType),
      },
      Body: {
        // Plain text version for email clients that don't render HTML
        Text: {
          Data: addNoReplyNotice(getTextBodyByType(emailType)),
        },
        // Rich HTML version for modern email clients
        Html: {
          Data: getHtmlBodyByType(emailType),
        },
      },
    },
    ConfigurationSetName: "my-first-configuration-set",
  };

  try {
    // Send email via SES
    const data = await ses.send(new SendEmailCommand(params));
    console.log(data);
    console.log("Email sent successfully");
    return NextResponse.json(data);
  } catch (err) {
    console.error("Email sending error:", err);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
