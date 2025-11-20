import React, { useState } from "react";
import { X } from "./icons";
import { ProspectInfo } from "../../../types";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  reportId: string;
  personData?: any;
  prospect?: ProspectInfo | null;
  pdfUrl?: string | null;
  isPdfUploading?: boolean;
  uploadError?: string | null;
  onRetryUpload?: () => void;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  reportId,
  prospect,
  pdfUrl,
  isPdfUploading = false,
  uploadError,
  onRetryUpload,
}) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isLandlordMode, setIsLandlordMode] = useState(false);
  const [landlordEmail, setLandlordEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | null;
  }>({
    text: "",
    type: null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      if (!pdfUrl) {
        throw new Error(
          uploadError
            ? `Unable to send report: ${uploadError}`
            : "Report is still being prepared. Please try again shortly."
        );
      }

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
          pdfUrl,
        }),
      });

      if (!emailResponse.ok) {
        throw new Error(`Email sending failed: ${emailResponse.statusText}`);
      }

      const emailResult = await emailResponse.json();
      console.log("Email sent successfully:", emailResult);

      setMessage({ text: "Report sent successfully!", type: "success" });
      setTimeout(() => {
        onClose();
        setMessage({ text: "", type: null });
      }, 2000); // Close modal after 2 seconds on success
    } catch (error) {
      console.error("Failed to send email:", error);
      setMessage({
        text: `Failed to send email: ${(error as Error).message}`,
        type: "error",
      });
    } finally {
      setIsSending(false);
    }
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

          <div
            className={`rounded-md p-3 text-sm ${
              uploadError
                ? "bg-red-50 text-red-800 border border-red-200"
                : isPdfUploading
                ? "bg-blue-50 text-blue-800 border border-blue-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            {isPdfUploading && (
              <p>Preparing and uploading the PDF to S3. Please wait…</p>
            )}
            {!isPdfUploading && uploadError && (
              <p className="flex flex-wrap items-center gap-2">
                Failed to upload report.
                {onRetryUpload && (
                  <button
                    type="button"
                    onClick={onRetryUpload}
                    className="underline"
                  >
                    Retry upload
                  </button>
                )}
              </p>
            )}
            {!isPdfUploading && !uploadError && pdfUrl && (
              <p>Report is stored in S3 and ready to email.</p>
            )}
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
                (isLandlordMode && !landlordEmail) ||
                isPdfUploading ||
                !pdfUrl ||
                Boolean(uploadError)
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

          {/* Success/Error Message */}
          {message.text && (
            <div
              className={`mt-4 px-4 py-2 rounded-md text-sm font-medium text-center ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
