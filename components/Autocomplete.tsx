
import React, { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
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

  // Local state to handle list visibility
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
        console.log("Error selecting place: ", error);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-grow w-full"> 
      <div className="relative">
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm disabled:bg-gray-50 transition-all"
          onFocus={() => { if(value) setShowSuggestions(true); }}
        />
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        {value && (
            <button 
                type="button"
                onClick={() => { setValue("", false); clearSuggestions(); }}
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
