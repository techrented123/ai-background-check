"use client";
import { useCallback, useRef } from "react";
import { useJsApiLoader, StandaloneSearchBox } from "@react-google-maps/api";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    apartmentUnit?: string;
  }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  restrictToCanada?: boolean; // New prop to control Canadian restrictions
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address",
  className = "",
  error,
  disabled = false,
  name,
  restrictToCanada = false, // Default to false
}) => {
  interface InputRef extends HTMLInputElement {
    getPlaces: () => any;
  }
  const inputRef = useRef<InputRef | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
    libraries: ["places"],
  });

  // Canadian postal code validation
  const isValidCanadianPostalCode = (postalCode: string): boolean => {
    const canadianPostalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    return canadianPostalCodeRegex.test(postalCode);
  };

  // Canadian province validation
  const isValidCanadianProvince = (province: string): boolean => {
    const canadianProvinces = [
      "Alberta",
      "British Columbia",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Northwest Territories",
      "Nova Scotia",
      "Nunavut",
      "Ontario",
      "Prince Edward Island",
      "Québec",
      "Saskatchewan",
      "Yukon",
    ];
    return canadianProvinces.includes(province);
  };

  const handleOnPlacesChanged = useCallback(() => {
    let address;
    if (inputRef.current) {
      address = inputRef.current?.getPlaces();
    }

    if (!address || !address[0]) return;

    const addressComponents = address[0].address_components;
    let city, province, postalCode;
    let street_address = "";
    let country = "";

    addressComponents.forEach(
      (address: { types: string | string[]; long_name: string }) => {
        if (address.types.includes("street_number")) {
          street_address += address.long_name;
        }
        if (address.types.includes("route")) {
          street_address += " " + address.long_name;
        }
        if (address.types.includes("locality")) {
          city = address.long_name;
        } else if (address.types.includes("administrative_area_level_1")) {
          province = address.long_name;
        } else if (address.types.includes("postal_code")) {
          postalCode = address.long_name;
        } else if (address.types.includes("country")) {
          country = address.long_name;
        }
      }
    );

    // Only apply Canadian restrictions if restrictToCanada is true
    if (restrictToCanada) {
      // Validate that this is a Canadian address
      if (country !== "Canada" && country !== "CA") {
        alert("Please select a Canadian address only.");
        return;
      }

      // Validate Canadian postal code format
      if (postalCode && !isValidCanadianPostalCode(postalCode)) {
        alert(
          "Please select a valid Canadian address with proper postal code."
        );
        return;
      }
    }

    // Update the main address field
    onChange(street_address);

    // Call the onAddressSelect callback with parsed address
    if (onAddressSelect) {
      onAddressSelect({
        street: street_address,
        city: city || "",
        province: province || "",
        postalCode: postalCode || "",
        country: country || "",
        apartmentUnit: "",
      });
    }
  }, [onChange, onAddressSelect]);

  const loadHandler = useCallback((ref: any) => {
    inputRef.current = ref;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (!isLoaded) {
    return (
      <div>
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-12 px-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          } ${className}`}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <StandaloneSearchBox
        onLoad={loadHandler}
        onPlacesChanged={handleOnPlacesChanged}
      >
        <input
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full h-12 px-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? "border-red-500" : "border-gray-300"
          } ${className}`}
        />
      </StandaloneSearchBox>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default AddressAutocomplete;
