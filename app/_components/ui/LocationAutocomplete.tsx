"use client";

import { useCallback, useRef } from "react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: {
    city: string;
    provinceCode: string;
    countryCode: string;
  }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Vancouver,BC,CAN",
  className = "",
  error,
  disabled = false,
  name,
}) => {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY as string,
    libraries: ["places"],
  });

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.address_components) return;

    let city = "";
    let provinceCode = "";
    let countryCode = "";

    place.address_components.forEach((component) => {
      if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        provinceCode = component.short_name;
      } else if (component.types.includes("country")) {
        countryCode = component.short_name;
      }
    });

    const display = [city, provinceCode, countryCode].filter(Boolean).join(",");

    onChange(display);

    if (onLocationSelect) {
      onLocationSelect({ city, provinceCode, countryCode });
    }
  }, [onChange, onLocationSelect]);

  const handleLoad = useCallback((ref: google.maps.places.Autocomplete) => {
    autocompleteRef.current = ref;
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
      <Autocomplete
        onLoad={handleLoad}
        onPlaceChanged={handlePlaceChanged}
        options={{
          types: ["(cities)"],
          fields: ["address_components"],
        }}
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
      </Autocomplete>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default LocationAutocomplete;
