'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plane, Calendar, Users, Luggage, Info, Clock, Loader2, Backpack, ShoppingCart, Briefcase } from 'lucide-react';
import { useFlightContext, FlightOffer, FlightSegment } from '@/contexts/FlightContext';
import { useLanguage } from '@/contexts/LanguageContext';
import CityAutocomplete from './CityAutocomplete';
import PassengerSelector, { PassengerData } from './PassengerSelector';

const airlineNames: Record<string, string> = {
    'G3': 'GOL',
    'LA': 'LATAM',
    'AD': 'Azul',
    'AA': 'American Airlines',
    'DL': 'Delta',
    'UA': 'United',
    'TP': 'TAP',
    'AF': 'Air France',
    'KL': 'KLM',
    'LH': 'Lufthansa',
    'IB': 'Iberia',
    'AC': 'Air Canada',
    'CM': 'Copa Airlines',
};

// Lista conservadora: se qualquer segmento tiver origem/destino fora do Brasil,
// o voo é tratado como internacional e o seguro é oferecido.
const BR_AIRPORTS = new Set([
    'GRU', 'CGH', 'GIG', 'SDU', 'BSB', 'VCP', 'CNF', 'POA', 'SSA', 'REC',
    'CWB', 'FOR', 'FLN', 'GYN', 'VIX', 'MCZ', 'NAT', 'MAO', 'CGB', 'BEL',
]);

function isInternationalFlight(flight: FlightOffer): boolean {
    return flight.itineraries.some(iti =>
        iti.segments.some(
            seg => !BR_AIRPORTS.has(seg.departure.iataCode) || !BR_AIRPORTS.has(seg.arrival.iataCode)
        )
    );
}

export default function FlightSearch() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const {
        setSelectedFlight,
        setSearchParams,
        searchResults,
        searchFormState,
        setSearchResults,
        setSearchFormState,
        locationNames,
        resolveLocationNames,
    } = useFlightContext();

    // Compute trip duration in days from flight itineraries
    const getTripDateRange = (flight: FlightOffer) => {
        const firstDep = new Date(flight.itineraries[0].segments[0].departure.at);
        const lastIti = flight.itineraries[flight.itineraries.length - 1];
        const lastArr = new Date(lastIti.segments[lastIti.segments.length - 1].arrival.at);
        const days = Math.max(1, Math.ceil((lastArr.getTime() - firstDep.getTime()) / (1000 * 60 * 60 * 24)));
        return { start: firstDep, end: lastArr, days };
    };

    const formatShortDate = (d: Date) =>
        d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');

    const insurancePlans = [
        {
            id: 'none',
            name: 'Sem seguro viagem',
            pricePerDay: 0,
            tagline: null,
            heading: 'Vai viajar sem seguro?',
            warning: 'O seguro viagem te protege em caso de imprevistos, como atraso de bagagem, cancelamentos ou emergências médicas.',
            badge: 'Opção não recomendada',
            benefits: [] as { text: string; icon: string }[],
            extraBenefits: undefined as { text: string; icon: string }[] | undefined,
        },
        {
            id: 'ouro',
            name: 'Ouro Nacional',
            pricePerDay: 11,
            tagline: 'Melhor preço agora',
            heading: null,
            warning: null,
            badge: null,
            benefits: [
                { text: 'Cancelamento grátis', icon: '✅' },
                { text: 'Despesas hospitalares de até BRL$ 50.000', icon: '🏥' },
                { text: 'Despesas farmacêuticas de até BRL$ 2.000', icon: '💊' },
            ],
            extraBenefits: [
                { text: 'Assistência jurídica de até BRL$ 5.000', icon: '⚖️' },
                { text: 'Perda de bagagem de até BRL$ 1.500', icon: '🧳' },
                { text: 'Translado médico ilimitado', icon: '🚑' },
            ],
        },
        {
            id: 'platina',
            name: 'Platina Nacional',
            pricePerDay: 12,
            tagline: null,
            heading: null,
            warning: null,
            badge: null,
            benefits: [
                { text: 'Cancelamento grátis', icon: '✅' },
                { text: 'Despesas hospitalares de até BRL$ 100.000', icon: '🏥' },
                { text: 'Despesas farmacêuticas de até BRL$ 2.000', icon: '💊' },
                { text: 'Atraso de bagagem de até BRL$ 2.500', icon: '🕒' },
            ],
            extraBenefits: [
                { text: 'Assistência jurídica de até BRL$ 10.000', icon: '⚖️' },
                { text: 'Perda de bagagem de até BRL$ 3.000', icon: '🧳' },
                { text: 'Translado médico ilimitado', icon: '🚑' },
                { text: 'Cancel. de viagem de até BRL$ 15.000', icon: '💰' },
            ],
        },
    ];

    // ── Restore state when coming back from checkout ──────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        // Restore form inputs
        if (searchFormState) {
            setTripType(searchFormState.tripType);
            setOrigin(searchFormState.origin);
            setOriginName(searchFormState.originName);
            setDestination(searchFormState.destination);
            setDestinationName(searchFormState.destinationName);
            setDepartureDate(searchFormState.departureDate);
            setReturnDate(searchFormState.returnDate);
            setPassengers({
                adults: searchFormState.adults,
                children: searchFormState.children,
                childrenAges: searchFormState.childrenAges,
                travelClass: searchFormState.travelClass,
            });
            setMultiCitySegments(searchFormState.multiCitySegments);
        }

        // Restore search results
        if (searchResults.length > 0) {
            setFlights(searchResults);
        }

        // Run only on initial mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveFlightToContext = (flight: FlightOffer) => {
        setSelectedFlight(flight);
        setSearchResults(flights);
        setSearchFormState({
            tripType,
            origin,
            originName,
            destination,
            destinationName,
            departureDate,
            returnDate,
            adults: passengers.adults,
            children: passengers.children,
            childrenAges: passengers.childrenAges,
            travelClass: passengers.travelClass,
            multiCitySegments,
        });
        setSearchParams({
            origin: tripType === 'multi-city' ? multiCitySegments[0].origin : origin,
            destination: tripType === 'multi-city' ? multiCitySegments[0].destination : destination,
            departureDate: tripType === 'multi-city' ? multiCitySegments[0].date : departureDate,
            segments: tripType === 'multi-city' ? multiCitySegments : undefined,
            adults: passengers.adults,
            children: passengers.children,
            childrenAges: passengers.childrenAges,
            travelClass: passengers.travelClass,
        });
    };

    const handleSelectFlight = (flight: FlightOffer) => {
        saveFlightToContext(flight);
        router.push('/checkout');
    };

    const [tripType, setTripType] = useState<'one-way' | 'round-trip' | 'multi-city'>(searchFormState?.tripType ?? 'round-trip');
    const [origin, setOrigin] = useState(searchFormState?.origin ?? '');
    const [originName, setOriginName] = useState(searchFormState?.originName ?? '');
    const [destination, setDestination] = useState(searchFormState?.destination ?? '');
    const [destinationName, setDestinationName] = useState(searchFormState?.destinationName ?? '');
    const [departureDate, setDepartureDate] = useState(searchFormState?.departureDate ?? '');
    const [returnDate, setReturnDate] = useState(searchFormState?.returnDate ?? '');
    const [passengers, setPassengers] = useState<PassengerData>({
        adults: searchFormState?.adults ?? 1,
        children: searchFormState?.children ?? 0,
        childrenAges: searchFormState?.childrenAges ?? [],
        travelClass: searchFormState?.travelClass ?? 'ECONOMY',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
    const [flights, setFlights] = useState<FlightOffer[]>(searchResults ?? []);
    const [hasSearched, setHasSearched] = useState(searchFormState !== null);

    const [expandedItineraries, setExpandedItineraries] = useState<Set<string>>(new Set());

    const toggleItinerary = (itinerary: FlightOffer['itineraries'][0]) => {
        const key = itinerary.segments.map(s => `${s.carrierCode}${s.number}|${s.departure.at}`).join('_');
        setExpandedItineraries(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const isItineraryExpanded = (itinerary: FlightOffer['itineraries'][0]) => {
        const key = itinerary.segments.map(s => `${s.carrierCode}${s.number}|${s.departure.at}`).join('_');
        return expandedItineraries.has(key);
    };

    // Track selected outbound/inbound index per price group
    const [groupSelections, setGroupSelections] = useState<Record<string, { outIdx: number; inIdx: number }>>({});

    // Group flights by price total
    interface FlightGroup {
        priceKey: string;
        price: FlightOffer['price'];
        flights: FlightOffer[];
        // Unique outbound itineraries (index 0) across all flights in group
        outboundOptions: Array<{ itinerary: FlightOffer['itineraries'][0]; flightIds: string[] }>;
        // Unique inbound itineraries (index 1) across all flights in group (round-trip only)
        inboundOptions: Array<{ itinerary: FlightOffer['itineraries'][0]; flightIds: string[] }>;
    }

    const flightGroups = useMemo<FlightGroup[]>(() => {
        const map = new Map<string, FlightGroup>();

        flights.forEach((flight) => {
            const key = parseFloat(flight.price.total).toFixed(2);

            if (!map.has(key)) {
                map.set(key, {
                    priceKey: key,
                    price: flight.price,
                    flights: [],
                    outboundOptions: [],
                    inboundOptions: [],
                });
            }
            const group = map.get(key)!;
            group.flights.push(flight);

            // Helper to get a unique key for an itinerary
            const itiKey = (iti: FlightOffer['itineraries'][0]) =>
                iti.segments.map(s => `${s.carrierCode}${s.number}|${s.departure.at}`).join('_');

            // Outbound (index 0)
            const outKey = itiKey(flight.itineraries[0]);
            const existingOut = group.outboundOptions.find(
                o => itiKey(o.itinerary) === outKey
            );
            if (existingOut) {
                existingOut.flightIds.push(flight.id);
            } else {
                group.outboundOptions.push({ itinerary: flight.itineraries[0], flightIds: [flight.id] });
            }

            // Inbound (index 1) – only for round-trip
            if (flight.itineraries.length > 1) {
                const inKey = itiKey(flight.itineraries[1]);
                const existingIn = group.inboundOptions.find(
                    o => itiKey(o.itinerary) === inKey
                );
                if (existingIn) {
                    existingIn.flightIds.push(flight.id);
                } else {
                    group.inboundOptions.push({ itinerary: flight.itineraries[1], flightIds: [flight.id] });
                }
            }
        });

        // Convert to array and sort by price (ascending)
        return Array.from(map.values()).sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));
    }, [flights]);

    const getGroupSelection = (priceKey: string) =>
        groupSelections[priceKey] ?? { outIdx: 0, inIdx: 0 };

    const setGroupOutIdx = (priceKey: string, outIdx: number) =>
        setGroupSelections(prev => ({ ...prev, [priceKey]: { ...getGroupSelection(priceKey), outIdx } }));

    const setGroupInIdx = (priceKey: string, inIdx: number) =>
        setGroupSelections(prev => ({ ...prev, [priceKey]: { ...getGroupSelection(priceKey), inIdx } }));

    // Find the best matching FlightOffer for the selected out/in indices in a group
    const getSelectedFlight = (group: FlightGroup): FlightOffer => {
        const { outIdx, inIdx } = getGroupSelection(group.priceKey);
        const outOption = group.outboundOptions[outIdx] ?? group.outboundOptions[0];
        const inOption = group.inboundOptions[inIdx] ?? group.inboundOptions[0];

        const itiKey = (iti: FlightOffer['itineraries'][0]) =>
            iti.segments.map(s => `${s.carrierCode}${s.number}|${s.departure.at}`).join('_');

        const targetOutKey = itiKey(outOption.itinerary);
        const targetInKey = inOption ? itiKey(inOption.itinerary) : null;

        // Try to find a flight that matches both itineraries
        const match = group.flights.find(f => {
            const outMatch = itiKey(f.itineraries[0]) === targetOutKey;
            const inMatch = !targetInKey || (f.itineraries[1] && itiKey(f.itineraries[1]) === targetInKey);
            return outMatch && inMatch;
        });

        return match ?? group.flights[0];
    };
    const [multiCitySegments, setMultiCitySegments] = useState<Array<{ origin: string; destination: string; date: string; originName?: string; destinationName?: string }>>(searchFormState?.multiCitySegments ?? [
        { origin: '', originName: '', destination: '', destinationName: '', date: '' },
        { origin: '', originName: '', destination: '', destinationName: '', date: '' },
    ]);

    const handleTripTypeChange = (newType: 'one-way' | 'round-trip' | 'multi-city') => {
        if (newType === 'multi-city' && tripType !== 'multi-city') {
            const newSegments = [...multiCitySegments];
            newSegments[0] = { ...newSegments[0], origin, destination, date: departureDate, originName, destinationName };
            setMultiCitySegments(newSegments);
            setReturnDate('');
        } else if (newType !== 'multi-city' && tripType === 'multi-city') {
            setOrigin(multiCitySegments[0].origin);
            setOriginName(multiCitySegments[0].originName || '');
            setDestination(multiCitySegments[0].destination);
            setDestinationName(multiCitySegments[0].destinationName || '');
            setDepartureDate(multiCitySegments[0].date);
        }

        if (newType === 'one-way') {
            setReturnDate('');
        }

        setTripType(newType);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFlights([]);
        setHasSearched(true);

        if (passengers.children > 0 && passengers.childrenAges.some(age => age === -1)) {
            setError('Por favor, selecione a idade de todas as crianças.');
            setLoading(false);
            return;
        }

        if (tripType === 'multi-city') {
            for (let i = 0; i < multiCitySegments.length; i++) {
                const seg = multiCitySegments[i];
                if (!seg.origin || !seg.destination || !seg.date) {
                    setError(`Por favor, preencha todos os campos do trecho ${i + 1}.`);
                    setLoading(false);
                    return;
                }
            }
        }

        try {
            let response;

            if (tripType === 'multi-city') {
                response = await fetch(`/api/flights/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        segments: multiCitySegments,
                        adults: passengers.adults,
                        children: passengers.children,
                        childrenAges: passengers.childrenAges,
                        travelClass: passengers.travelClass,
                        currency: currency,
                    }),
                });
            } else {
                response = await fetch(`/api/flights/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        origin: origin.toUpperCase(),
                        destination: destination.toUpperCase(),
                        departureDate,
                        returnDate: tripType === 'round-trip' ? returnDate : undefined,
                        adults: passengers.adults,
                        children: passengers.children,
                        childrenAges: passengers.childrenAges,
                        travelClass: passengers.travelClass,
                        currency: currency,
                    }),
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to search flights');
            }

            const flights = data.data || [];

            // Extract all unique IATAs
            const iatas = new Set<string>();
            flights.forEach((f: FlightOffer) => {
                f.itineraries.forEach(iti => {
                    iti.segments.forEach(seg => {
                        iatas.add(seg.departure.iataCode);
                        iatas.add(seg.arrival.iataCode);
                    });
                });
            });

            if (iatas.size > 0) {
                // Background fetch for names
                resolveLocationNames(Array.from(iatas));
            }

            setFlights(flights);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (duration: string) => {
        if (!duration) return '';
        const match = duration.match(/PT(\d+H)?(\d+M)?/);
        if (!match) return duration;
        const hours = match[1] ? match[1].replace('H', 'h ') : '';
        const minutes = match[2] ? match[2].replace('M', 'm') : '';
        return (hours + minutes).trim();
    };

    const formatDateTime = (dateTime: string) => {
        const date = new Date(dateTime);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <>
            <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 pt-4 pb-8">
                <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">

                    <form onSubmit={handleSearch} className="space-y-6">
                        <div className="grid grid-cols-2 md:flex md:gap-4 gap-2 pb-4 border-b border-gray-200">
                            <button
                                type="button"
                                onClick={() => handleTripTypeChange('one-way')}
                                className={`px-2 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all ${tripType === 'one-way'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {t('oneWay')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTripTypeChange('round-trip')}
                                className={`px-2 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all ${tripType === 'round-trip'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {t('roundTrip')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTripTypeChange('multi-city')}
                                className={`col-span-2 md:col-span-1 px-2 sm:px-6 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all ${tripType === 'multi-city'
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {t('multiCity')}
                            </button>
                        </div>

                        {tripType !== 'multi-city' ? (
                            <div className="space-y-4">
                                {/* Linha 1: Origem e Destino */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CityAutocomplete
                                        value={origin}
                                        displayName={originName}
                                        onChange={(value, name) => {
                                            setOrigin(value);
                                            if (name) setOriginName(name);
                                        }}
                                        label={t('search.origin')}
                                        placeholder="Ex: São Paulo"
                                        required
                                    />

                                    <CityAutocomplete
                                        value={destination}
                                        displayName={destinationName}
                                        onChange={(value, name) => {
                                            setDestination(value);
                                            if (name) setDestinationName(name);
                                        }}
                                        label={t('search.destination')}
                                        placeholder="Ex: Nova York"
                                        required
                                    />
                                </div>

                                {/* Linha 2: Datas e Passageiros */}
                                <div className={`grid grid-cols-1 md:grid-cols-2 ${tripType === 'round-trip' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Calendar size={16} />
                                            {t('search.departure')}
                                        </label>
                                        <input
                                            type="date"
                                            value={departureDate}
                                            onChange={(e) => setDepartureDate(e.target.value)}
                                            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                            required
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                                        />
                                    </div>

                                    {tripType === 'round-trip' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                <Calendar size={16} />
                                                {t('search.return')}
                                            </label>
                                            <input
                                                type="date"
                                                value={returnDate}
                                                onChange={(e) => setReturnDate(e.target.value)}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                required
                                                min={departureDate || new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                                            />
                                        </div>
                                    )}

                                    <div className={tripType === 'one-way' ? '' : ''}>
                                        <PassengerSelector
                                            value={passengers}
                                            onChange={setPassengers}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    {t('multiCityDescription') || 'Adicione até 5 trechos para sua viagem multidestino'}
                                </p>
                                {multiCitySegments.map((segment, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <CityAutocomplete
                                            value={segment.origin}
                                            displayName={segment.originName}
                                            onChange={(value, name) => {
                                                const newSegments = [...multiCitySegments];
                                                newSegments[index].origin = value;
                                                if (name) newSegments[index].originName = name;
                                                setMultiCitySegments(newSegments);
                                            }}
                                            label={`Origem ${index + 1}`}
                                            placeholder="Ex: São Paulo"
                                            required
                                        />
                                        <CityAutocomplete
                                            value={segment.destination}
                                            displayName={segment.destinationName}
                                            onChange={(value, name) => {
                                                const newSegments = [...multiCitySegments];
                                                newSegments[index].destination = value;
                                                if (name) newSegments[index].destinationName = name;
                                                setMultiCitySegments(newSegments);
                                            }}
                                            label={`Destino ${index + 1}`}
                                            placeholder="Ex: Nova York"
                                            required
                                        />
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Data {index + 1}
                                            </label>
                                            <input
                                                type="date"
                                                value={segment.date}
                                                onChange={(e) => {
                                                    const newSegments = [...multiCitySegments];
                                                    newSegments[index].date = e.target.value;
                                                    setMultiCitySegments(newSegments);
                                                }}
                                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                                required
                                                min={index === 0 ? new Date().toISOString().split('T')[0] : multiCitySegments[index - 1]?.date}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            {index > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMultiCitySegments(multiCitySegments.filter((_, i) => i !== index));
                                                    }}
                                                    className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                >
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {multiCitySegments.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMultiCitySegments([...multiCitySegments, { origin: '', destination: '', date: '' }]);
                                        }}
                                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors"
                                    >
                                        + Adicionar Trecho
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                            <Users size={16} />
                                            {t('search.passengers')}
                                        </label>
                                        <input
                                            type="number"
                                            value={passengers.adults}
                                            onChange={(e) => setPassengers({ ...passengers, adults: parseInt(e.target.value) })}
                                            min={1}
                                            max={9}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-4 rounded-lg font-semibold hover:from-primary/90 hover:to-primary/70 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {t('searching') || 'Buscando...'}
                                </>
                            ) : (
                                <>
                                    <Search size={20} />
                                    {t('search.button')}
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            <p className="font-medium text-red-800">{t('search.errorTitle') || 'Erro ao buscar voos:'}</p>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {flightGroups.length > 0 && (
                        <div className="mt-8">
                            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4 mb-6">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {flights.length} {t('flightsFound')}
                                    {flightGroups.length < flights.length && (
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                            ({flightGroups.length} {flightGroups.length > 1 ? t('search.priceCombinations') : t('search.priceCombination')})
                                        </span>
                                    )}
                                </h3>

                                {/* Seletor de Moeda */}
                                <div className="flex items-center gap-3">

                                    <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currency !== 'BRL') {
                                                    setCurrency('BRL');
                                                    // Trigger new search automatically when currency changes
                                                    setTimeout(() => {
                                                        const form = document.querySelector('form');
                                                        if (form) form.requestSubmit();
                                                    }, 0);
                                                }
                                            }}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${currency === 'BRL'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            BRL (R$)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currency !== 'USD') {
                                                    setCurrency('USD');
                                                    // Trigger new search automatically when currency changes
                                                    setTimeout(() => {
                                                        const form = document.querySelector('form');
                                                        if (form) form.requestSubmit();
                                                    }, 0);
                                                }
                                            }}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${currency === 'USD'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            USD ($)
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {flightGroups.map((group) => {
                                    const { outIdx, inIdx } = getGroupSelection(group.priceKey);
                                    const selectedFlight = getSelectedFlight(group);
                                    const isRoundTrip = group.inboundOptions.length > 0;

                                    // Helper to render one itinerary row
                                    const renderItinerary = (itinerary: FlightOffer['itineraries'][0]) => (
                                        <div className="flex flex-col w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center gap-1 min-w-[56px]">
                                                    <img
                                                        src={`https://pics.avs.io/200/200/${itinerary.segments[0].carrierCode}.png`}
                                                        alt={itinerary.segments[0].carrierCode}
                                                        className="w-9 h-9 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                    <span className="text-xs font-semibold text-gray-600 text-center leading-tight">
                                                        {airlineNames[itinerary.segments[0].carrierCode] || itinerary.segments[0].carrierCode}
                                                    </span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xl font-bold text-gray-900">
                                                        {itinerary.segments[0].departure.iataCode}
                                                    </p>
                                                    {locationNames[itinerary.segments[0].departure.iataCode] && (
                                                        <p className="text-[10px] text-gray-500 font-medium leading-tight my-0.5">
                                                            {locationNames[itinerary.segments[0].departure.iataCode].cityName}
                                                            {locationNames[itinerary.segments[0].departure.iataCode].countryName ? `, ${locationNames[itinerary.segments[0].departure.iataCode].countryName}` : ''}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateTime(itinerary.segments[0].departure.at)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-center flex-1">
                                                    <div className="flex items-center w-full gap-1">
                                                        <div className="h-px flex-1 bg-gray-300"></div>
                                                        <Plane className="text-primary" size={16} />
                                                        <div className="h-px flex-1 bg-gray-300"></div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {formatDuration(itinerary.duration)}
                                                    </p>
                                                    {itinerary.segments.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); toggleItinerary(itinerary); }}
                                                            className="text-xs text-primary font-medium underline hover:text-primary/80 cursor-pointer"
                                                        >
                                                            {itinerary.segments.length - 1} escala{itinerary.segments.length > 2 ? 's' : ''}
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs text-green-600 font-medium">Direto</p>
                                                    )}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xl font-bold text-gray-900">
                                                        {itinerary.segments[itinerary.segments.length - 1].arrival.iataCode}
                                                    </p>
                                                    {locationNames[itinerary.segments[itinerary.segments.length - 1].arrival.iataCode] && (
                                                        <p className="text-[10px] text-gray-500 font-medium leading-tight my-0.5">
                                                            {locationNames[itinerary.segments[itinerary.segments.length - 1].arrival.iataCode].cityName}
                                                            {locationNames[itinerary.segments[itinerary.segments.length - 1].arrival.iataCode].countryName ? `, ${locationNames[itinerary.segments[itinerary.segments.length - 1].arrival.iataCode].countryName}` : ''}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateTime(itinerary.segments[itinerary.segments.length - 1].arrival.at)}
                                                    </p>
                                                </div>
                                                <div className="ml-2 text-right hidden sm:block">
                                                    {itinerary.segments.map((seg, si) => (
                                                        <p key={si} className="text-xs text-gray-400">
                                                            {seg.carrierCode}{seg.number}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Expanded Segment Details */}
                                            {isItineraryExpanded(itinerary) && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 p-2">
                                                    {itinerary.segments.map((seg, si) => {
                                                        let connectionTime = '';
                                                        if (si > 0) {
                                                            const prevArr = new Date(itinerary.segments[si - 1].arrival.at).getTime();
                                                            const currDep = new Date(seg.departure.at).getTime();
                                                            const diff = currDep - prevArr;
                                                            if (diff > 0) {
                                                                const h = Math.floor(diff / (1000 * 60 * 60));
                                                                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                                connectionTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                                            }
                                                        }

                                                        return (
                                                            <div key={si} className="flex flex-col mb-4 last:mb-0">
                                                                {si > 0 && (
                                                                    <div className="flex items-center gap-2 mb-4 ml-6 pl-4 border-l-2 border-dashed border-gray-200">
                                                                        <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-md">
                                                                            Conexão em {seg.departure.iataCode}: {connectionTime}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-4">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                                                        <div className="flex-1 w-px bg-gray-200 my-1 min-h-[40px]" />
                                                                        <div className="w-2 h-2 rounded-full border-2 border-primary bg-white" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start">
                                                                            <div>
                                                                                <p className="font-bold text-gray-900">{seg.departure.iataCode}</p>
                                                                                {locationNames[seg.departure.iataCode] && (
                                                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                                                        {locationNames[seg.departure.iataCode].cityName}
                                                                                        {locationNames[seg.departure.iataCode].countryName ? `, ${locationNames[seg.departure.iataCode].countryName}` : ''}
                                                                                    </p>
                                                                                )}
                                                                                <p className="text-sm text-gray-600 mt-0.5">{formatDateTime(seg.departure.at)}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-bold text-gray-700">{airlineNames[seg.carrierCode] || seg.carrierCode} {seg.number}</p>
                                                                                <p className="text-xs text-gray-500">Voo operado por {seg.operating?.carrierName || seg.carrierCode}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="my-2 py-1 flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                                            <Clock size={12} className="text-gray-400" />
                                                                            Duração do voo: {formatDuration(seg.duration)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900">{seg.arrival.iataCode}</p>
                                                                            {locationNames[seg.arrival.iataCode] && (
                                                                                <p className="text-[10px] text-gray-500 font-medium">
                                                                                    {locationNames[seg.arrival.iataCode].cityName}
                                                                                    {locationNames[seg.arrival.iataCode].countryName ? `, ${locationNames[seg.arrival.iataCode].countryName}` : ''}
                                                                                </p>
                                                                            )}
                                                                            <p className="text-sm text-gray-600 mt-0.5">{formatDateTime(seg.arrival.at)}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );

                                    // Helper to render option pills for a leg
                                    const renderOptionPills = (
                                        options: FlightGroup['outboundOptions'],
                                        selectedIdx: number,
                                        onSelect: (i: number) => void,
                                        label: string
                                    ) => (
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
                                                {options.length > 1 && (
                                                    <span className="text-xs text-primary font-medium">
                                                        {options.length} opç{options.length > 1 ? 'ões' : 'ão'} disponív{options.length > 1 ? 'eis' : 'el'}
                                                    </span>
                                                )}
                                            </div>
                                            {options.length > 1 && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {options.map((opt, i) => {
                                                        const seg0 = opt.itinerary.segments[0];
                                                        const segLast = opt.itinerary.segments[opt.itinerary.segments.length - 1];
                                                        const airline = airlineNames[seg0.carrierCode] || seg0.carrierCode;
                                                        const dep = new Date(seg0.departure.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                                        const arr = new Date(segLast.arrival.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                                        const stops = opt.itinerary.segments.length - 1;
                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => onSelect(i)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${selectedIdx === i
                                                                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:bg-primary/5'
                                                                    }`}
                                                            >
                                                                <img
                                                                    src={`https://pics.avs.io/200/200/${seg0.carrierCode}.png`}
                                                                    alt={seg0.carrierCode}
                                                                    className="w-5 h-5 object-contain"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <span>{airline}</span>
                                                                <span className="text-gray-400">·</span>
                                                                <span>{dep} → {arr}</span>
                                                                {stops > 0 && (
                                                                    <span className="text-xs text-primary font-semibold">
                                                                        {stops} escala{stops > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                                {selectedIdx === i && (
                                                                    <span className="ml-1 text-primary">✓</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                {renderItinerary(options[selectedIdx]?.itinerary ?? options[0].itinerary)}
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <div
                                            key={group.priceKey}
                                            className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 bg-white"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                                {/* Itineraries section */}
                                                <div className="flex-1 min-w-0">
                                                    {renderOptionPills(
                                                        group.outboundOptions,
                                                        outIdx,
                                                        (i) => setGroupOutIdx(group.priceKey, i),
                                                        isRoundTrip ? `✈ ${t('checkout.departure')}` : `✈ ${passengers.adults > 0 ? t('passenger.adult') : t('nav.flights')}`
                                                    )}
                                                    {isRoundTrip && renderOptionPills(
                                                        group.inboundOptions,
                                                        inIdx,
                                                        (i) => setGroupInIdx(group.priceKey, i),
                                                        `↩ ${t('checkout.return')}`
                                                    )}
                                                </div>

                                                {/* Price + action section */}
                                                <div className="lg:w-56 shrink-0 flex flex-col items-end gap-3">
                                                    <div className="text-right">
                                                        <p className="text-3xl font-bold text-primary">
                                                            {group.price.currency} {Math.floor(parseFloat(group.price.total))}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {(() => {
                                                                const totalPassengers = passengers.adults + passengers.children;
                                                                if (tripType === 'round-trip') {
                                                                    return 'Final ida e volta';
                                                                }
                                                                return `Final ${totalPassengers} pessoa${totalPassengers > 1 ? 's' : ''}`;
                                                            })()}
                                                        </p>
                                                    </div>

                                                    {(() => {
                                                        const checkedBags = selectedFlight?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity || 0;
                                                        // Use ?? 0 para assumir 0 se ausente, mas note que algumas cias (latam light) explicitamente omitem ou enviam 0.
                                                        // Vamos tratar estritamente o que o Amadeus devolver.
                                                        const cabinBags = selectedFlight?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCabinBags?.quantity || 0;
                                                        
                                                        return (
                                                            <div className="flex items-center justify-end gap-2 mb-3">
                                                                <div className="group relative">
                                                                    <Backpack size={20} className="text-gray-700 cursor-help" />
                                                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                        <p className="font-bold mb-1">{t('search.backpackOption')} / Item Pessoal</p>
                                                                        <p>{t('search.backpackSub')}</p>
                                                                        <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                                                    </div>
                                                                </div>
                                                                
                                                                {cabinBags > 0 ? (
                                                                    <div className="group relative">
                                                                        <Briefcase size={20} className="text-gray-700 cursor-help" />
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                            <p className="font-bold mb-1">{t('search.carryonOption')} / Mala de Mão</p>
                                                                            <p>{t('search.carryonSub')}</p>
                                                                            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="group relative">
                                                                        <div className="relative">
                                                                            <Briefcase size={20} className="text-gray-300 cursor-help" />
                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                <div className="w-full h-0.5 bg-gray-400 rotate-45"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                            <p className="font-bold mb-1">Sem Mala de Mão Inclusa</p>
                                                                            <p>Esta tarifa básica não inclui mala de compartimento superior.</p>
                                                                            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {checkedBags > 0 ? (
                                                                    <div className="group relative flex items-center gap-1">
                                                                        <Luggage size={20} className="text-green-600 cursor-help" />
                                                                        <span className="text-xs font-bold text-green-600">{checkedBags}</span>
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                            <p className="font-bold mb-1">Bagagem Despachada</p>
                                                                            <p>{checkedBags} {checkedBags === 1 ? 'volume incluído' : 'volumes incluídos'}.</p>
                                                                            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                     <div className="group relative">
                                                                        <div className="relative">
                                                                            <Luggage size={20} className="text-gray-300 cursor-help" />
                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                <div className="w-full h-0.5 bg-gray-400 rotate-45"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                                            <p className="font-bold mb-1">{t('search.noCheckedOption')} / Sem Despacho</p>
                                                                            <p>{t('search.noCheckedSub')}</p>
                                                                            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    <button
                                                        onClick={() => handleSelectFlight(selectedFlight)}
                                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-5 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                                                    >
                                                        <ShoppingCart size={20} />
                                                        {t('search.select')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!loading && flights.length === 0 && !error && hasSearched && (
                        <div className="mt-8 text-center py-12">
                            <Plane className="mx-auto text-gray-300 mb-4" size={64} />
                            <p className="text-gray-500">Nenhum voo encontrado para esta busca.</p>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
}
