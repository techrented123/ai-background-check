"use client";
import React, { useState } from "react";
import { ProspectInfo, BackgroundCheckResult } from "@/types";
import ResultsPanel from "./ResultsPanel";
import { Form } from "./_components/Form";
import Header from "./_components/Header";

export default function BackgroundCheck() {
  const [isLoading, setIsLoading] = useState(false);
  const inputFields: ProspectInfo = {
    firstName: "",
    lastName: "",
    email: "",
    city: "",
    state: "",
    dob: "",
    city2: "",
    state2: "",
    lengthOfStay: "yes",
  };

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProspectInfo, string>>
  >({});

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
      if (!value && key !== "city2" && key !== "state2") {
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
      } else if (formData["lengthOfStay"] === "yes") {
        formData["city2"] = undefined;
        formData["state2"] = undefined;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const [results, setResults] = useState<BackgroundCheckResult | null>(null);

  const handleSubmit = async (prospectInfo: ProspectInfo) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/background-check", {
        method: "post",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...prospectInfo }),
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error performing background check:", error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [results]);
  return (
    <div>
      <Header />
      <main
        className={`md:container mx-auto md:px-4 px-1 py-3 md:py-8 ${
          results ? "h-[500px]" : "max-h-[60vh]"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <p className="text-lg font-semibold mt-5 text-center text-[#293074] md:hidden">
            AI Powered Background Verification
          </p>
          <div
            className={`bg-white rounded-lg md:shadow-md p-6 pt-0 ${
              results ? "hidden md:block" : ""
            } `}
          >
            <Form
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onValidateForm={validateForm}
              inputFields={inputFields}
              errors={errors}
              toggleErrors={toggleErrors}
            />
          </div>

          <div className="bg-white rounded-lg p-1 md:p-6 md:shadow-md mt-[-10px] md:mt-0">
            <ResultsPanel results={results} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
