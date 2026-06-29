'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, lat: string, lon: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder, required }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ignoreSearchRef = useRef(false);

  // Sync internal query with external value if it changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounce API call
  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (ignoreSearchRef.current) {
      ignoreSearchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, value]);

  const handleSelect = (suggestion: Suggestion) => {
    ignoreSearchRef.current = true;
    setQuery(suggestion.display_name);
    setShowDropdown(false);
    onSelect(suggestion.display_name, suggestion.lat, suggestion.lon);
    onChange(suggestion.display_name);
  };

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder || "Start typing an address..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        required={required}
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: 'absolute', right: '12px', top: '12px' }}>
          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
        </div>
      )}
      
      {showDropdown && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 10,
          maxHeight: '200px',
          overflowY: 'auto',
          marginTop: '4px',
          listStyle: 'none',
          padding: 0
        }}>
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                cursor: 'pointer',
                borderBottom: '1px solid var(--gray-100)',
                fontSize: 'var(--fs-sm)',
                color: 'var(--gray-800)',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {suggestion.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
