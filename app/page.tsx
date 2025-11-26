"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProspectInfo, BackgroundCheckResult } from "@/types";
import ResultsPanel from "./ResultsPanel";
import { Form } from "./_components/ui/Form";
import Header from "./_components/ui/Header";
import { getToken, updateToken } from "./actions";
import { useRouter, useSearchParams } from "next/navigation";

export default function BackgroundCheck() {
  const [, setActiveToken] = useState("");
  const [retries, setRetries] = useState(0);

  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [results, setResults] = useState<BackgroundCheckResult | null>(null);
  const [prospectInfo, setProspectInfo] = useState<ProspectInfo | null>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const inputFields: ProspectInfo = {
    firstName: "",
    lastName: "",
    other_names: "",
    email: "",
    phone: "",
    street_address: "",
    location: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    city2: "",
    state2: "",
    street_address2: "",
    postal_code2: "",
    country2: "",
    dob: "",
    lengthOfStay: "yes",
    company: "",
    school: "",
    social_media_profile: "",
  };
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProspectInfo, string>>
  >({});
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toggleErrors = (name: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };
  const validateForm = (formData: ProspectInfo): boolean => {
    const newErrors: Partial<Record<keyof ProspectInfo, string>> = {};
    let isValid = true;

    Object.entries(formData).forEach(([key, value]) => {
      if (
        !value &&
        key !== "city2" &&
        key !== "state2" &&
        key !== "street_address2" &&
        key !== "postal_code2" &&
        key !== "country2" &&
        key !== "location" &&
        key !== "other_names" &&
        key !== "social_media_profile" &&
        key !== "phone"
      ) {
        newErrors[key as keyof ProspectInfo] = "This field is required";
        isValid = false;
      }
      if (formData["lengthOfStay"] === "no") {
        if (!formData["city2"]) {
          newErrors["city2"] = "This field is required";
          isValid = false;
        }
        if (!formData["state2"]) {
          newErrors["state2"] = "This field is required";
          isValid = false;
        }
        if (!formData["street_address2"]) {
          newErrors["street_address2"] = "This field is required";
          isValid = false;
        }
        if (!formData["postal_code2"]) {
          newErrors["postal_code2"] = "This field is required";
          isValid = false;
        }
        if (!formData["country2"]) {
          newErrors["country2"] = "This field is required";
          isValid = false;
        }
      } else if (formData["lengthOfStay"] === "yes") {
        formData["city2"] = undefined;
        formData["state2"] = undefined;
        formData["street_address2"] = undefined;
        formData["postal_code2"] = undefined;
        formData["country2"] = undefined;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast({ message, variant });
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
        toastTimeoutRef.current = null;
      }, 3000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleAutoEmailSent = useCallback(
    (email: string) => {
      showToast(`Report emailed to ${email}`, "success");
    },
    [showToast]
  );

  const handleAutoEmailError = useCallback(
    (email: string, message: string) => {
      showToast(`Failed to email ${email}: ${message}`, "error");
    },
    [showToast]
  );

  const verifyToken = useCallback(
    async (token: string | null) => {
      const activeToken = await getToken(token as string);
      if (!activeToken || activeToken.product !== "ai-check")
        router.push("/404");
      else {
        setActiveToken(activeToken.token);
      }
    },
    [router]
  );

  const handleSubmit = useCallback(
    async (prospectInfo: ProspectInfo) => {
      setIsLoading(true);
      setApiError(null);
      setProspectInfo(prospectInfo);
      setRetries((prev) => (prev <= 3 ? prev + 1 : prev));
      try {
        const response = await fetch("/api/background-check", {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...prospectInfo }),
        });
        const raw = await response.text();
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          // If the server returned HTML or non-JSON, keep raw
          data = { error: raw };
        }

        if (!response.ok) {
          // Server-side failure (e.g., 502 when both providers actually crashed)
          const msg =
            data?.error ||
            data?.message ||
            `A network error occurred (HTTP ${response.status}). Please try again.`;
          throw new Error(msg);
        }
        setResults(data);
        // Call updateToken on successful background check
        if (token) {
          await updateToken(token);
        }
      } catch (error) {
        console.error("Error performing background check:", error);
        setApiError(
          error instanceof Error
            ? error.message
            : "Something Unexpected Happened"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  /* useEffect(() => {
    if (!token) {
      router.push("/404");
    } else {
      verifyToken(token);
    }
    const retries = localStorage.getItem("retries");
    if (retries) setRetries(JSON.parse(retries));
  }, [token, verifyToken, router]);
 */
  useEffect(() => {
    localStorage.setItem("retries", JSON.stringify(retries));
  }, [retries]);

  const hasResults = Boolean(results);
  const showResultsPanel = isLoading || hasResults;

  useEffect(() => {
    // When we first get results, default to a wide ResultsPanel / compact form.
    if (hasResults) {
      setIsFormCollapsed(true);
    } else {
      setIsFormCollapsed(false);
    }
  }, [hasResults]);

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex justify-end px-4">
          <div
            className={`px-4 py-2 rounded-md shadow-lg text-sm text-white ${
              toast.variant === "error" ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
      <Header />
      <main className="md:container mx-auto md:px-4 px-1 py-3 md:py-8">
        {/* Initial load: show only the form full-width */}
        {!showResultsPanel && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg md:shadow-md p-6 pt-0">
              <Form
                onSubmit={handleSubmit}
                isLoading={isLoading}
                onValidateForm={validateForm}
                inputFields={inputFields}
                errors={errors}
                toggleErrors={toggleErrors}
                retries={retries}
              />
            </div>
          </div>
        )}

        {/* After submit / when loading or results exist: split layout with toggle */}
        {showResultsPanel && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {!isFormCollapsed && (
              <div className="bg-white rounded-lg md:shadow-md p-6 pt-0 w-full md:w-1/2 transition-all duration-300 ease-in-out">
                <Form
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  onValidateForm={validateForm}
                  inputFields={inputFields}
                  errors={errors}
                  toggleErrors={toggleErrors}
                  retries={retries}
                />
              </div>
            )}

            <div
              className={`bg-white rounded-lg p-1 md:p-6 md:shadow-md mt-[-10px] md:mt-0 w-full transition-all duration-300 ease-in-out ${
                isFormCollapsed ? "md:w-full" : "md:w-1/2"
              }`}
            >
              <div className="flex items-center justify-end mb-2 md:mb-4">
                <button
                  type="button"
                  onClick={() => setIsFormCollapsed((prev) => !prev)}
                  className="cursor-pointer inline-flex items-center space-x-1 rounded-full border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-xs md:text-sm text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 transition-all duration-200"
                  aria-label={
                    isFormCollapsed
                      ? "Expand form panel"
                      : "Collapse form panel"
                  }
                  aria-pressed={!isFormCollapsed}
                >
                  <span>{isFormCollapsed ? "Show form" : "Hide form"}</span>
                  <span
                    className={`inline-block transform transition-transform duration-200 ${
                      isFormCollapsed ? "" : "rotate-180"
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      className="h-3 w-3 md:h-4 md:w-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 5L12 10L7 15"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
              <ResultsPanel
                results={results}
                isLoading={isLoading}
                error={apiError}
                retries={retries}
                prospect={prospectInfo}
                autoSendEmailTo={prospectInfo?.email || null}
                onAutoEmailSent={handleAutoEmailSent}
                onAutoEmailError={handleAutoEmailError}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
