'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FlightSegment {
    departure: {
        iataCode: string;
        terminal?: string;
        at: string;
    };
    arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
    };
    carrierCode: string;
    number: string;
    duration: string;
    aircraft?: {
        code: string;
    };
    operating?: {
        carrierName: string;
    };
}

interface FlightOffer {
    id: string;
    source: string;
    price: {
        total: string;
        currency: string;
        base: string;
        grandTotal?: string;
    };
    itineraries: Array<{
        duration: string;
        segments: FlightSegment[];
    }>;
    travelerPricings?: Array<{
        travelerId: string;
        travelerType: string;
        price: {
            currency: string;
            total: string;
            base: string;
        };
        fareDetailsBySegment: Array<{
            segmentId: string;
            cabin: string;
            fareBasis: string;
            brandedFare?: string;
            brandedFareLabel?: string;
            class: string;
            includedCheckedBags?: {
                quantity?: number;
                weight?: number;
                weightUnit?: string;
            };
            includedCabinBags?: {
                quantity?: number;
                weight?: number;
                weightUnit?: string;
            };
        }>;
    }>;
    validatingAirlineCodes?: string[];
    numberOfBookableSeats?: number;
}

interface SearchParams {
    origin: string;
    destination: string;
    departureDate: string;
    adults: number;
    children?: number;
    childrenAges?: number[];
    babies?: number;
    segments?: Array<{ origin: string; destination: string; date: string }>;
    travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
}

/** Persists the search form inputs so we can restore them on back-navigation */
interface SearchFormState {
    tripType: 'one-way' | 'round-trip' | 'multi-city';
    origin: string;
    originName: string;
    destination: string;
    destinationName: string;
    departureDate: string;
    returnDate: string;
    adults: number;
    children: number;
    childrenAges: number[];
    travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
    multiCitySegments: Array<{
        origin: string;
        destination: string;
        date: string;
        originName?: string;
        destinationName?: string;
    }>;
}

interface FlightContextType {
    selectedFlight: FlightOffer | null;
    searchParams: SearchParams | null;
    /** Results returned by the last search — kept so we can restore the list on back */
    searchResults: FlightOffer[];

    /** Full form-state so SearchForm can be pre-populated on back */
    searchFormState: SearchFormState | null;

    /** Map of IATA -> resolved names for UI display */
    locationNames: Record<string, { cityName?: string; countryName?: string }>;



    setSelectedFlight: (flight: FlightOffer | null) => void;
    setSearchParams: (params: SearchParams | null) => void;
    setSearchResults: (flights: FlightOffer[]) => void;
    setSearchFormState: (state: SearchFormState | null) => void;

    /** Fetch missing IATA names and store in context */
    resolveLocationNames: (iatas: string[]) => Promise<void>;

}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: ReactNode }) {
    const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
    const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
    const [searchResults, setSearchResults] = useState<FlightOffer[]>([]);
    const [searchFormState, setSearchFormState] = useState<SearchFormState | null>(null);
    const [locationNames, setLocationNames] = useState<Record<string, { cityName?: string; countryName?: string }>>({});

    const resolveLocationNames = async (iatas: string[]) => {
        // Collect missing IATAs
        const missing = iatas.filter(i => !locationNames[i]);
        if (missing.length === 0) return;

        try {
            const res = await fetch(`/api/locations/resolve?iatas=${missing.join(',')}`);
            if (!res.ok) return;
            const resData = await res.json();

            if (resData.data) {
                setLocationNames(prev => ({ ...prev, ...resData.data }));
            }
        } catch (error) {
            console.error('Failed to resolve location names:', error);
        }
    };


    return (
        <FlightContext.Provider
            value={{
                selectedFlight,
                searchParams,
                searchResults,
                searchFormState,

                locationNames,
                setSelectedFlight,
                setSearchParams,
                setSearchResults,
                setSearchFormState,
                resolveLocationNames,
            }}
        >
            {children}
        </FlightContext.Provider>
    );
}

export function useFlightContext() {
    const context = useContext(FlightContext);
    if (context === undefined) {
        throw new Error('useFlightContext must be used within a FlightProvider');
    }
    return context;
}

export type { FlightOffer, SearchParams, FlightSegment, SearchFormState };
