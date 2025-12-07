
import React, { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X, MapPin, AlertTriangle } from "lucide-react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

interface AutocompleteProps {
  setNewPlace?: (newPlace: google.maps.LatLngLiteral) => void;
  onAddressSelect?: (address: string) => void;
  placeholder?: string;
  defaultValue?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  setNewPlace,
  onAddressSelect,
  placeholder = "Search for a location",
  defaultValue = ""
}) => {
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Check global failure flag
    if (window.gm_authFailure_detected) {
      setMapError(true);
    }
    // Listen for auth failure during runtime
    const original = window.gm_authFailure;
    window.gm_authFailure = () => {
        window.gm_authFailure_detected = true;
        setMapError(true);
        if(original) original();
    };
  }, []);

  const isMapsLoaded = typeof window !== "undefined" && window.google && window.google.maps && window.google.maps.places;

  if (!isMapsLoaded || mapError) {
      return (
        <div className="relative flex-grow w-full">
            <input
                type="text"
                defaultValue={defaultValue}
                placeholder={placeholder}
                className={`w-full pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all ${mapError ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-300'}`}
                onChange={(e) => onAddressSelect && onAddressSelect(e.target.value)}
                title={mapError ? "Map services unavailable. Manual entry only." : ""}
            />
            {mapError ? (
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" title="Map services unavailable" />
            ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            )}
        </div>
      );
  }

  return <MapsAutocomplete 
            setNewPlace={setNewPlace} 
            onAddressSelect={onAddressSelect} 
            placeholder={placeholder} 
            defaultValue={defaultValue} 
         />;
};

// Internal component that uses the hook (isolated to prevent crash if maps missing)
const MapsAutocomplete: React.FC<AutocompleteProps> = ({
  setNewPlace,
  onAddressSelect,
  placeholder,
  defaultValue
}) => {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      /* Define search scope here */
    },
    debounce: 300,
    defaultValue: defaultValue
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Sync local value if defaultValue changes externally
  useEffect(() => {
    if (defaultValue && defaultValue !== value) {
      setValue(defaultValue, false);
    }
  }, [defaultValue, setValue]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (onAddressSelect) {
        onAddressSelect(e.target.value);
    }
    setShowSuggestions(true);
  };

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    setShowSuggestions(false);

    if (onAddressSelect) {
      onAddressSelect(address);
    }

    if (setNewPlace) {
      try {
        const results = await getGeocode({ address });
        const { lat, lng } = await getLatLng(results[0]);
        setNewPlace({ lat, lng });
      } catch (error) {
        console.log("Error selecting place (Billing or Network): ", error);
        // Fail silently for coordinates, address string is already set
      }
    }
  };

  // Check specifically for billing/quota errors from the Places API
  const hasError = status === "REQUEST_DENIED" || status === "OVER_QUERY_LIMIT";

  return (
    <div ref={wrapperRef} className="relative flex-grow w-full"> 
      <div className="relative">
        <input
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          title={hasError ? "Google Maps API Error: Billing not enabled. Manual entry mode." : ""}
          className={`w-full pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all ${hasError ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-gray-300'}`}
          onFocus={() => { if(value) setShowSuggestions(true); }}
        />
        {hasError ? (
            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
        ) : (
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        )}
        
        {value && (
            <button 
                type="button"
                onClick={() => { setValue("", false); clearSuggestions(); if(onAddressSelect) onAddressSelect(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
                <X className="w-3 h-3" />
            </button>
        )}
      </div>

      {showSuggestions && status === "OK" && data.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0 transition-colors"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;
