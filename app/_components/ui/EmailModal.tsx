import React, { useState } from "react";
import { X } from "./icons";
import { generatePDF } from "../utils/generatePDF";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  reportId: string;
  personData?: any; // Background check results
  prospect?: any; // Prospect info from form
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  reportId,
  personData,
  prospect,
}) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isLandlordMode, setIsLandlordMode] = useState(false);
  const [landlordEmail, setLandlordEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      // Generate PDF blob first
      const pdfBlob = generatePDF(personData, {
        subjectName,
        city: prospect?.city,
        region: prospect?.state,
        reportId,
        riskLevel: "medium", // Default for now
        generatedAt: new Date().toISOString(),
        save: false, // Return blob instead of saving
      });

      // Convert blob to base64 for S3 upload
      if (!pdfBlob) {
        throw new Error("Failed to generate PDF");
      }

      // Use a more efficient method to avoid stack overflow with large PDFs
      let pdfBase64: string;
      try {
        // Method 1: Use FileReader (most efficient for large files)
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data:application/pdf;base64, prefix
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read PDF"));
          reader.readAsDataURL(pdfBlob);
        });
      } catch (error) {
        // Fallback: Use arrayBuffer with chunking for large files
        const pdfBuffer = await pdfBlob.arrayBuffer();
        const bytes = new Uint8Array(pdfBuffer);

        // Process in chunks to avoid stack overflow
        const chunkSize = 8192; // 8KB chunks
        let binary = "";
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          binary += String.fromCharCode(...chunk);
        }
        pdfBase64 = btoa(binary);
      }

      const fileName = `background-report-${reportId}-${Date.now()}.pdf`;

      // Upload PDF to S3 first
      const storeResponse = await fetch("/api/store-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          PDFfile: pdfBase64,
          fileName: fileName,
        }),
      });

      if (!storeResponse.ok) {
        throw new Error(`S3 upload failed: ${storeResponse.statusText}`);
      }

      const s3Result = await storeResponse.json();
      const s3PdfUrl = s3Result.location;
      console.log("PDF uploaded to S3:", s3PdfUrl);

      // Prepare recipient emails
      const recipients = [recipientEmail];
      if (isLandlordMode && landlordEmail) {
        recipients.push(landlordEmail);
      }

      // Call the send email API with S3 link
      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userDetails: {
            first_name: prospect?.firstName?.split(" ")[0] || "",
            last_name:
              prospect?.lastName ||
              prospect?.firstName?.split(" ").slice(1).join(" ") ||
              "",
            email: prospect?.email || "",
          },
          recipientEmail: recipients,
          pdfUrl: s3PdfUrl,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error(`Email sending failed: ${emailResponse.statusText}`);
      }

      const emailResult = await emailResponse.json();
      console.log("Email sent successfully:", emailResult);

      alert("Report sent successfully!");
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to send email:", error);
      alert(`Failed to send email: ${(error as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setRecipientEmail("");
    setIsLandlordMode(false);
    setLandlordEmail("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md md:max-w-lg lg:max-w-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800">
            Send Report via Email
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label
              htmlFor="recipientEmail"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Recipient Email Address
            </label>
            <input
              type="email"
              id="recipientEmail"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter email address"
            />
          </div>

          {/* Landlord Checkbox */}
          <div className="flex items-center py-1">
            <input
              type="checkbox"
              id="landlordMode"
              checked={isLandlordMode}
              onChange={(e) => setIsLandlordMode(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <label
              htmlFor="landlordMode"
              className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
            >
              Send to landlord or another person
            </label>
          </div>

          {/* Landlord Email Field */}
          {isLandlordMode && (
            <div>
              <label
                htmlFor="landlordEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Landlord/Additional Recipient Email
              </label>
              <input
                type="email"
                id="landlordEmail"
                value={landlordEmail}
                onChange={(e) => setLandlordEmail(e.target.value)}
                required={isLandlordMode}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter landlord email address"
              />
            </div>
          )}

          {/* Report Info */}
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Report Details
            </h3>
            <p className="text-sm text-gray-600">
              <strong>Subject:</strong> {subjectName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Report ID:</strong> {reportId}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Recipients:</strong> {recipientEmail}
              {isLandlordMode && `, ${landlordEmail}`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSending ||
                !recipientEmail ||
                (isLandlordMode && !landlordEmail)
              }
              className="cursor-pointer px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                "Send Report"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
