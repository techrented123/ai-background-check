import React, { useEffect, useState } from "react";
import { ProspectInfo } from "@/types";

import { UserCheck, AlertCircle } from "./icons";
import Tooltip from "./Tooltip/Tooltip";
import AddressAutocomplete from "./AddressAutocomplete";

interface BackgroundCheckFormProps {
  onSubmit: (info: ProspectInfo) => void;
  isLoading: boolean;
  onValidateForm: (formData: ProspectInfo) => boolean;
  inputFields: ProspectInfo;
  errors: Record<string, string>;
  toggleErrors: (name: string) => void;
  retries: number;
}

export const Form: React.FC<BackgroundCheckFormProps> = ({
  onSubmit,
  isLoading,
  onValidateForm,
  inputFields,
  errors,
  toggleErrors,
  retries,
}) => {
  const [formData, setFormData] = useState<ProspectInfo>({ ...inputFields });

  // Initialize from parent-provided defaults once, but don't reset after each submission
  useEffect(() => {
    setFormData({ ...inputFields });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  today.setFullYear(today.getFullYear() - 18);
  const maxDate = today.toISOString().split("T")[0];
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is updated

    if (errors[name as keyof ProspectInfo]) {
      toggleErrors(name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onValidateForm(formData)) {
      onSubmit(formData);
    }
  };
  return (
    <form onSubmit={handleSubmit} className={`space-y-4 px-2.5 ]`}>
      <div className="hidden md:flex justify-start items-center mb-6 ">
        <UserCheck className="h-6 w-6 text-[#293074] mr-2" />
        <p className="text-sm md:text-lg text-left font-semibold text-gray-800">
          Fill out the form below{" "}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.firstName ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.firstName}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.lastName ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.lastName}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="other_names"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Other Names
          </label>
          <input
            type="text"
            id="other_names"
            name="other_names"
            placeholder="Middle Names or alias"
            value={formData.other_names}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.other_names ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.other_names && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.other_names}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="dob"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date of Birth (Must be 18 or older)
          </label>
          <input
            type="date"
            id="dob"
            name="dob"
            max={maxDate}
            value={formData.dob}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.dob ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.dob && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.dob}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            placeholder="Most used email address"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.email ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.phone ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.phone}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="street_address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Street Address
          </label>
          <AddressAutocomplete
            name="street_address"
            value={formData.street_address}
            onChange={(value) => {
              setFormData((prev) => ({
                ...prev,
                street_address: value,
              }));
              if (errors.street_address) {
                toggleErrors("street_address");
              }
            }}
            onAddressSelect={({
              street,
              city,
              province,
              postalCode,
              country,
            }) => {
              setFormData((prev) => ({
                ...prev,
                street_address: street,
                city,
                state: province,
                postal_code: postalCode,
                country,
              }));
              if (errors.street_address) toggleErrors("street_address");
              if (errors.city) toggleErrors("city");
              if (errors.state) toggleErrors("state");
              if (errors.postal_code) toggleErrors("postal_code");
              if (errors.country) toggleErrors("country");
            }}
            placeholder="Enter your address"
            error={errors.street_address}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            City / Region
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.city ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.city}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Province/State
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.state ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.state && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.state}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.country ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.country && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.country}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="postal_code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Postal Code
          </label>
          <input
            type="text"
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.postal_code ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.postal_code && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.postal_code}
            </p>
          )}
        </div>
      </div>
      <fieldset className="mb-6">
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          Have you lived in the above location for more than 5 years?
        </legend>
        <div className="flex space-x-6">
          {/* Yes Option */}
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="lengthOfStay"
              value="yes"
              checked={formData.lengthOfStay === "yes"}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Yes</span>
          </label>

          {/* No Option */}
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="lengthOfStay"
              value="no"
              checked={formData.lengthOfStay === "no"}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">No</span>
          </label>
        </div>
      </fieldset>

      {formData.lengthOfStay === "no" && (
        <>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="street_address2"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous Street Address
              </label>
              <AddressAutocomplete
                name="street_address2"
                value={formData.street_address2 || ""}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    street_address2: value,
                  }));
                  if (errors.street_address2) {
                    toggleErrors("street_address2");
                  }
                }}
                onAddressSelect={({
                  street,
                  city,
                  province,
                  postalCode,
                  country,
                }) => {
                  setFormData((prev) => ({
                    ...prev,
                    street_address2: street,
                    city2: city,
                    state2: province,
                    postal_code2: postalCode,
                    country2: country,
                  }));
                  if (errors.street_address2) toggleErrors("street_address2");
                  if (errors.city2) toggleErrors("city2");
                  if (errors.state2) toggleErrors("state2");
                  if (errors.postal_code2) toggleErrors("postal_code2");
                  if (errors.country2) toggleErrors("country2");
                }}
                placeholder="Enter previous address"
                error={errors.street_address2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="city2"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous City / Region
              </label>
              <input
                type="text"
                id="city2"
                name="city2"
                value={formData.city2}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.city2 ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.city2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.city2}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="state2"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous Province / State
              </label>
              <input
                type="text"
                id="state2"
                name="state2"
                value={formData.state2}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.state2 ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.state2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.state2}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label
                htmlFor="postal_code2"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous Postal Code
              </label>
              <input
                type="text"
                id="postal_code2"
                name="postal_code2"
                value={formData.postal_code2 || ""}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.postal_code2 ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.postal_code2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.postal_code2}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="country2"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Previous Country
              </label>
              <input
                type="text"
                id="country2"
                name="country2"
                value={formData.country2 || ""}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${
                  errors.country2 ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.country2 && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.country2}
                </p>
              )}
            </div>
          </div>
        </>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            placeholder="Most Recent Employer"
            value={formData.company}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.company ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.company && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.company}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="school"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            School
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={formData.school}
            onChange={handleChange}
            placeholder="Most Recent School"
            className={`w-full px-3 py-2 border ${
              errors.school ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.school && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.school}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="social_media_profile"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Social Media Profile (Optional)
          </label>
          <input
            type="url"
            id="social_media_profile"
            name="social_media_profile"
            placeholder="LinkedIn, Facebook, etc."
            value={formData.social_media_profile}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${
              errors.social_media_profile ? "border-red-500" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.social_media_profile && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.social_media_profile}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6">
        {retries >= 3 ? (
          <Tooltip text="You have a max of 3 attempts">
            <button
              type="submit"
              disabled
              className={`w-full py-3 px-4 disabled:bg-gray-300 disabled:cursor-not-allowed  bg-blue-600 hover:bg-blue-500 cursor-pointer text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
            >
              Run Background Check
            </button>
          </Tooltip>
        ) : (
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4  bg-blue-600 hover:bg-blue-500 cursor-pointer text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Running Check...
              </span>
            ) : (
              "Run Background Check"
            )}
          </button>
        )}
        <div className="flex items-start justify-center !gap-0 text-center text-sm text-gray-500 mt-3 ">
          <span className="md:hidden">
            You agree to Rented123 using AI to run a background check on you.{" "}
            <a
              href="https://rented123.com/"
              className="underline"
              target="_blank"
            >
              Privacy policy
            </a>
          </span>
          <span className="hidden md:block">
            By proceeding you agree to Rented123 using AI to run a background
            check on you. Your personal information will not be stored anywhere.
            For more information, see our{" "}
            <a
              href="https://rented123.com/privacy-policy/"
              className="underline"
              target="_blank"
            >
              privacy policy
            </a>
          </span>
        </div>
      </div>
    </form>
  );
};
