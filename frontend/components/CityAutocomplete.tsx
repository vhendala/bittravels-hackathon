'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface Location {
    iataCode: string;
    name: string;
    cityName?: string;
    countryName?: string;
    type: string;
}

interface CityAutocompleteProps {
    value: string;
    onChange: (value: string, displayName?: string) => void;
    displayName?: string;
    placeholder?: string;
    label?: string;
    required?: boolean;
}

export default function CityAutocomplete({
    value,
    onChange,
    displayName = '',
    placeholder = 'Digite o nome da cidade',
    label = 'Cidade',
    required = false,
}: CityAutocompleteProps) {
    const [searchTerm, setSearchTerm] = useState(displayName);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isSelected, setIsSelected] = useState(!!value); // Initialize as true if we already have a value
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        // Don't search if a valid selection was made
        if (isSelected) {
            return;
        }

        if (searchTerm.length < 2) {
            setLocations([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `/api/locations/search?q=${encodeURIComponent(searchTerm)}`
                );
                const data = await response.json();

                if (response.ok) {
                    setLocations(data.data || []);
                    setIsOpen(true);
                } else {
                    setLocations([]);
                }
            } catch (error) {
                console.error('Location search error:', error);
                setLocations([]);
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm, isSelected]);

    const handleSelect = (location: Location) => {
        const name = `${location.cityName || location.name} (${location.iataCode})`;
        onChange(location.iataCode, name);
        setSearchTerm(name);
        setIsSelected(true); // Mark as selected
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleClear = () => {
        onChange('', '');
        setSearchTerm('');
        setLocations([]);
        setIsOpen(false);
        setIsSelected(false); // Reset selection state
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < locations.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && locations[selectedIndex]) {
                    handleSelect(locations[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Update search term when value is cleared or changed externally
    useEffect(() => {
        if (!value) {
            setSearchTerm('');
            setIsSelected(false);
        } else if (displayName && searchTerm !== displayName) {
            setSearchTerm(displayName);
            setIsSelected(true);
        }
    }, [value, displayName]);

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <MapPin size={20} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsSelected(false); // Reset selection when user types
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (locations.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    required={required}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                )}
                {!loading && value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && locations.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {locations.map((location, index) => (
                        <button
                            key={`${location.iataCode}-${index}`}
                            type="button"
                            onClick={() => handleSelect(location)}
                            className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-gray-100 last:border-b-0 ${index === selectedIndex ? 'bg-primary/5' : ''
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {location.cityName || location.name}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {location.name} • {location.countryName}
                                    </p>
                                </div>
                                <span className="text-primary font-bold text-lg">
                                    {location.iataCode}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {isOpen && !loading && searchTerm.length >= 2 && locations.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <p className="text-gray-500 text-center">
                        Nenhuma cidade ou aeroporto encontrado
                    </p>
                </div>
            )}

            {/* Hidden input for form validation */}
            <input type="hidden" value={value} required={required} />
        </div>
    );
}
