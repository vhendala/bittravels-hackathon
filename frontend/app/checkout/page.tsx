'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFlightContext } from '@/contexts/FlightContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PassengerForm, { PassengerData } from '@/components/PassengerForm';
import { ArrowLeft, Plane, Check, AlertCircle, Info, Mail, MessageCircle, CreditCard, QrCode, Copy, Wallet, Lock, Loader2, X } from 'lucide-react';
import Header from '@/components/Header';
import { usePrivy } from '@privy-io/react-auth';
import { useEscrow } from '@/hooks/useEscrow';

const COUNTRIES = [
    { name: 'Brasil', code: '55', flag: '🇧🇷' },
    { name: 'Estados Unidos', code: '1', flag: '🇺🇸' },
    { name: 'Portugal', code: '351', flag: '🇵🇹' },
    { name: 'Espanha', code: '34', flag: '🇪🇸' },
    { name: 'Argentina', code: '54', flag: '🇦🇷' },
    { name: 'Chile', code: '56', flag: '🇨🇱' },
    { name: 'Colômbia', code: '57', flag: '🇨🇴' },
    { name: 'Uruguai', code: '598', flag: '🇺🇾' },
    { name: 'Paraguai', code: '595', flag: '🇵🇾' },
    { name: 'Bolívia', code: '591', flag: '🇧🇴' },
    { name: 'Peru', code: '51', flag: '🇵🇪' },
    { name: 'Equador', code: '593', flag: '🇪🇨' },
    { name: 'México', code: '52', flag: '🇲🇽' },
    { name: 'Reino Unido', code: '44', flag: '🇬🇧' },
    { name: 'França', code: '33', flag: '🇫🇷' },
    { name: 'Itália', code: '39', flag: '🇮🇹' },
    { name: 'Alemanha', code: '49', flag: '🇩🇪' },
    { name: 'Japão', code: '81', flag: '🇯🇵' },
    { name: 'China', code: '86', flag: '🇨🇳' },
    { name: 'Canadá', code: '1', flag: '🇨🇦' },
    { name: 'Israel', code: '972', flag: '🇮🇱' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function CheckoutPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { ready, authenticated, login } = usePrivy();
    const { selectedFlight, searchParams, locationNames, resolveLocationNames } = useFlightContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [bookingId, setBookingId] = useState('');
    const [error, setError] = useState('');
    const [showTaxesPopover, setShowTaxesPopover] = useState(false);
    const [isTestMode, setIsTestMode] = useState(false);

    // PIX Privy-gated payment flow
    const [showPixScreen, setShowPixScreen] = useState(false);
    const [pixTotal, setPixTotal] = useState(0);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [copied, setCopied] = useState(false);

    // Escrow payment state machine
    type EscrowStatus = 'idle' | 'approving' | 'locking' | 'success' | 'error';
    const [escrowStatus, setEscrowStatus] = useState<EscrowStatus>('idle');
    const [txHash, setTxHash] = useState<string | null>(null);
    const [escrowError, setEscrowError] = useState<string | null>(null);
    const { lockFunds } = useEscrow();

    const showToast = (message: string) => {
        setToastMessage(message);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 5000);
    };

    const handleCopyPixCode = () => {
        navigator.clipboard.writeText('00020126580014br.gov.bcb.pix0136bittravels-pix-key-placeholder');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Passenger data
    const [adults, setAdults] = useState<PassengerData[]>([]);
    const [children, setChildren] = useState<PassengerData[]>([]);
    const [babies, setBabies] = useState<PassengerData[]>([]);

    // Simplified Contact Data
    const [contactEmail, setContactEmail] = useState('');
    const [contactWhatsapp, setContactWhatsapp] = useState('');

    // Payment Method
    const [paymentMethod, setPaymentMethod] = useState('');

    const [expandedItineraries, setExpandedItineraries] = useState<Set<number>>(new Set());
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === '55') || COUNTRIES[0]);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleItinerary = (index: number) => {
        setExpandedItineraries(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };


    // Initialize passenger arrays based on search params
    useEffect(() => {
        if (!selectedFlight || !searchParams) {
            router.push('/');
            return;
        }

        const emptyPassenger: PassengerData = {
            firstName: '',
            lastName: '',
            country: 'Brasil',
            documentType: 'CPF',
            documentNumber: '',
            birthDay: '',
            birthMonth: '',
            birthYear: '',
            gender: 'MASCULINO',
        };

        setAdults(Array(searchParams.adults || 1).fill(null).map(() => ({ ...emptyPassenger })));

        // Categorize children based on age
        const childrenCount = searchParams.children || 0;
        const childrenAges = searchParams.childrenAges || [];

        let childForms = 0;
        let babyForms = 0;

        if (childrenAges.length > 0) {
            childForms = childrenAges.filter((age: number) => age >= 2 && age < 12).length;
            babyForms = childrenAges.filter((age: number) => age < 2).length;
            // Note: Ages 12+ are considered adults by Amadeus but might be passed as children in searchParams.
            // For form purposes, we keep them as 'children' logic or move to adults?
            // Usually simpler to keep as children forms but priced as adults.
            // However, Amadeus returns 'travelerPricings' which we should use for pricing.
            // For now, let's stick to the age split for forms.
            const adultChildren = childrenAges.filter((age: number) => age >= 12).length;
            if (adultChildren > 0) {
                // You might want to append these to adults array or handle gracefully
                // For this specific request, the issue is Infants.
            }
        } else {
            // Fallback if no ages (shouldn't happen due to validation)
            childForms = childrenCount;
        }

        setChildren(Array(childForms).fill(null).map(() => ({ ...emptyPassenger })));
        setBabies(Array(babyForms).fill(null).map(() => ({ ...emptyPassenger })));
    }, [selectedFlight, searchParams, router]);

    if (!selectedFlight || !searchParams) {
        return null;
    }

    const formatDuration = (duration: string) => {
        if (!duration) return '';
        const match = duration.match(/PT(\d+H)?(\d+M)?/);
        if (!match) return duration;
        const hours = match[1] ? match[1].replace('H', 'h ') : '';
        const minutes = match[2] ? match[2].replace('M', 'm') : '';
        return (hours + minutes).trim();
    };

    const formatTime = (dateTime: string) => {
        return new Date(dateTime).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateTime: string) => {
        const date = new Date(dateTime);
        const weekdays = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
        const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

        return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const formatPrice = (price: string | number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(typeof price === 'string' ? parseFloat(price) : price);
    };

    const getTripTypeLabel = () => {
        if (!selectedFlight) return '';
        // Check if it's a round-trip by looking at the number of itineraries
        return selectedFlight.itineraries.length > 1 ? 'Ida e Volta' : 'Somente Ida';
    };

    const getStopsLabel = (segments: any[]) => {
        const stops = segments.length - 1;
        if (stops === 0) return 'Direto';
        if (stops === 1) return '1 escala';
        return `${stops} escalas`;
    };

    const calculatePricing = () => {
        let baseTotal = parseFloat(selectedFlight.price.total);
        const base = parseFloat(selectedFlight.price.base || selectedFlight.price.total);
        const taxes = baseTotal - base;

        // Use travelerPricings from Amadeus response if available
        let adultsCount = 0;
        let childrenCount = 0;
        let babiesCount = 0;
        let pricePerAdult = 0;
        let pricePerChild = 0;
        let pricePerBaby = 0;

        if (selectedFlight.travelerPricings) {
            selectedFlight.travelerPricings.forEach((tp: any) => {
                const price = parseFloat(tp.price.total);
                if (tp.travelerType === 'ADULT') {
                    adultsCount++;
                    pricePerAdult = price;
                } else if (tp.travelerType === 'CHILD') {
                    childrenCount++;
                    pricePerChild = price;
                } else if (tp.travelerType === 'HELD_INFANT') {
                    babiesCount++;
                    pricePerBaby = price;
                }
            });
        } else {
            adultsCount = searchParams.adults || 1;
            const childrenAges = searchParams.childrenAges || [];
            childrenCount = childrenAges.filter((age: number) => age >= 2).length;
            babiesCount = childrenAges.filter((age: number) => age < 2).length;

            const payingPassengers = adultsCount + childrenCount;
            const pricePerPerson = payingPassengers > 0 ? baseTotal / payingPassengers : baseTotal;
            pricePerAdult = pricePerPerson;
            pricePerChild = pricePerPerson;
            pricePerBaby = 0;
        }

        const payingCount = adultsCount + childrenCount;

        // Calculate fare breakdown from Amadeus data
        const segmentBreakdown = selectedFlight.itineraries.map((_, idx) => {
            let fareName = 'Tarifa Econômica';
            if (selectedFlight.travelerPricings?.[0]?.fareDetailsBySegment?.[idx]) {
                const details = selectedFlight.travelerPricings[0].fareDetailsBySegment[idx];
                fareName = details.brandedFareLabel || details.brandedFare || 'Tarifa Econômica';
                
                // Capitalize properly if it's all caps
                if (fareName === fareName.toUpperCase()) {
                  fareName = fareName.charAt(0) + fareName.slice(1).toLowerCase();
                }
            }

            const serviceFee = 0; // Markup fixo removido conforme solicitado
            const boardingTax = taxes / selectedFlight.itineraries.length;

            return {
                fareName,
                serviceFee,
                boardingTax
            };
        });

        const totalFareAddOn = segmentBreakdown.reduce((sum, seg) => sum + seg.serviceFee, 0);
        const totalTaxesAndFees = taxes + totalFareAddOn;
        const totalPassengers = adultsCount + childrenCount + babiesCount;

        const finalTotalBase = baseTotal + totalFareAddOn;
        const finalTotal = isTestMode ? 0.01 : finalTotalBase;

        return {
            total: finalTotal,
            isTestMode,
            baseTotal,
            base,
            taxes,
            totalFareAddOn,
            totalTaxesAndFees,
            pricePerAdult,
            pricePerChild,
            pricePerBaby,
            adultsCount,
            childrenCount,
            babiesCount,
            totalPassengers,
            segmentBreakdown,
        };
    };

    const validateForm = (): boolean => {
        const allPassengers = [...adults, ...children, ...babies];
        // Only require first name for passengers
        const passengersValid = allPassengers.every(p => p.firstName.trim() !== '');
        // Require whatsapp for contact
        const contactValid = contactWhatsapp.trim() !== '';

        // Require payment method
        const paymentValid = paymentMethod !== '';

        return passengersValid && contactValid && paymentValid;
    };

    const generatePNR = () => {
        // Standard airline PNR: 6 alphanumeric characters (excluding 0, 1, O, I for clarity)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let pnr = '';
        for (let i = 0; i < 6; i++) {
            pnr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pnr;
    };

    const buildWebhookPayload = (bookingIdStr: string) => {
        const mainPassenger = adults[0] || children[0] || babies[0];

        let routeStr = '';
        let departureDate = '';
        let returnDateStr = '';
        if (selectedFlight && selectedFlight.itineraries && selectedFlight.itineraries.length > 0) {
            const firstIti = selectedFlight.itineraries[0];
            const lastIti = selectedFlight.itineraries[selectedFlight.itineraries.length - 1];

            const origin = firstIti.segments[0].departure.iataCode;
            const destination = firstIti.segments[firstIti.segments.length - 1].arrival.iataCode;
            const isRoundTrip = selectedFlight.itineraries.length === 2 && getTripTypeLabel() === 'Ida e Volta';

            if (isRoundTrip) {
                routeStr = `${origin}-${destination} (ida e volta)`;
                returnDateStr = selectedFlight.itineraries[1].segments[0].departure.at;
            } else {
                routeStr = `${origin}-${lastIti.segments[lastIti.segments.length - 1].arrival.iataCode}`;
            }

            departureDate = firstIti.segments[0].departure.at;
        }

        return {
            internal_id: bookingIdStr,
            customer: {
                first_name: mainPassenger?.firstName || 'Unknown',
                last_name: mainPassenger?.lastName || 'Unknown',
                country: mainPassenger?.country || 'Brasil',
                passport: mainPassenger?.documentNumber || '',
                cpf: mainPassenger?.documentNumber || '',
                birth_date: mainPassenger ? `${mainPassenger.birthYear}-${mainPassenger.birthMonth}-${mainPassenger.birthDay}` : '2000-01-01',
                gender: mainPassenger?.gender === 'MASCULINO' ? 'M' : 'F',
                email: contactEmail,
                whatsapp_phone: `(+${selectedCountry.code}) ${contactWhatsapp}`
            },
            payment: {
                payment_method: paymentMethod
            },
            flight: {
                amadeus_flight_id: selectedFlight?.id || 'Unknown',
                route: routeStr || 'Unknown',
                departure_date: departureDate || new Date().toISOString(),
                return_date: returnDateStr || undefined
            }
        };
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setError(t('checkout.processing') === 'Procesando...' ? 'Por favor, complete todos los pasajeros, un WhatsApp de contacto y la forma de pago.' :
                t('checkout.processing') === 'Processing...' ? 'Please fill out all passengers, a contact WhatsApp, and the payment method.' :
                    'Por favor, preencha o nome de todos os passageiros, um WhatsApp para contato e a forma de pagamento.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // PIX flow: gate behind Privy authentication
        if (paymentMethod === 'pix') {
            if (!authenticated) {
                // Not logged in → trigger Privy login modal
                login();
                return;
            }
            // Authenticated → show PIX QR Code screen
            const pricing = calculatePricing();
            setPixTotal(pricing.total);
            setShowPixScreen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const newBookingId = generatePNR();

            const payload = buildWebhookPayload(newBookingId);
            console.log('Payload sendo enviado:', payload);

            const response = await fetch(`/api/receive-reservation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Erro HTTP: ${response.status}`);
            }

            setBookingId(newBookingId);
            setIsSuccess(true);
            
            // For Web2 payments, also redirect to ticket
            const ticketPayload = payload;
            (ticketPayload.payment as any).total_paid = calculatePricing().total;
            (ticketPayload.payment as any).currency = selectedFlight?.price?.currency || 'BRL';
            (ticketPayload.flight as any).airline = selectedFlight?.itineraries?.[0]?.segments?.[0]?.carrierCode || 'Airline';
            (ticketPayload.flight as any).flightNumber = selectedFlight?.itineraries?.[0]?.segments?.[0]?.number || 'Flight 123';
            
            sessionStorage.setItem('bittravels_ticket', JSON.stringify(ticketPayload));
            router.push('/ticket');
            
        } catch (err) {
            setError('Erro ao processar sua reserva. Por favor, tente novamente.');
            console.error('Erro na requisição:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // PIX Payment Screen
    if (showPixScreen) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />

                {/* In-App Toast */}
                {toastVisible && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-[#0C2B54] text-white px-6 py-4 rounded-2xl shadow-2xl max-w-md w-[calc(100%-2rem)] animate-in slide-in-from-top-4 duration-300">
                        <div className="p-1.5 bg-[#F5B316] rounded-full shrink-0 mt-0.5">
                            <Check size={14} className="text-[#0C2B54]" />
                        </div>
                        <p className="text-sm font-medium leading-snug flex-1">{toastMessage}</p>
                        <button onClick={() => setToastVisible(false)} className="text-white/60 hover:text-white shrink-0 mt-0.5">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <main className="flex-1 flex items-center justify-center p-4 pt-28">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">

                        {/* Header */}
                        <div className="bg-[#0C2B54] px-8 pt-8 pb-6">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2.5 bg-[#F5B316] rounded-xl">
                                    <QrCode size={20} className="text-[#0C2B54]" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Pagamento via PIX</h1>
                            </div>
                            <p className="text-white/60 text-sm pl-[52px]">Escaneie o QR Code com o app do seu banco</p>
                        </div>

                        <div className="px-8 py-6 space-y-6">

                            {/* Total destacado */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Valor total</p>
                                    <p className="text-3xl font-bold text-[#0C2B54]">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pixTotal)}
                                    </p>
                                </div>
                            </div>

                            {/* QR Code Estilizado */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-5 bg-white rounded-2xl shadow-md border border-gray-100 relative">
                                    {/* Grid pattern que simula um QR Code */}
                                    <div className="w-48 h-48 relative">
                                        <div className="absolute inset-0 grid grid-cols-7 gap-0.5 p-2 opacity-90">
                                            {Array.from({ length: 49 }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`rounded-sm ${
                                                        // Posiciona o ícone central e cria padrão
                                                        (i >= 21 && i <= 27) ? 'bg-transparent' :
                                                        [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,47,48,
                                                         8,15,11,18,32,39,36,29,23,25,30,37,16,24,3,10,17,38,45,31].includes(i)
                                                        ? 'bg-[#0C2B54]' : 'bg-gray-100'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        {/* Ícone central sobre o grid */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white p-2 rounded-xl shadow-sm">
                                                <Wallet size={24} className="text-[#0C2B54]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 text-center">QR Code válido por <span className="font-semibold text-gray-600">30 minutos</span></p>
                            </div>

                            {/* Chave Copia e Cola */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chave Pix (Copia e Cola)</p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        value="00020126580014br.gov.bcb.pix0136bittravels-pix-key-placeholder"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-[11px] font-mono pr-24 cursor-default focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyPixCode}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0C2B54] hover:bg-[#0C2B54]/90 rounded-lg text-white transition-all flex items-center gap-1.5"
                                    >
                                        {copied ? <Check size={13} /> : <Copy size={13} />}
                                        <span className="text-[10px] font-bold uppercase">{copied ? 'Copiado!' : 'Copiar'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Escrow Error Message */}
                            {escrowStatus === 'error' && escrowError && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 font-medium">{escrowError}</p>
                                </div>
                            )}

                            {/* Escrow Success Panel */}
                            {escrowStatus === 'success' && txHash && (
                                <div className="flex flex-col gap-3 p-5 bg-green-50 border border-green-200 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-green-500 rounded-full">
                                            <Check size={14} className="text-white" />
                                        </div>
                                        <p className="font-bold text-green-800 text-sm">Fundos travados com sucesso!</p>
                                    </div>
                                    <p className="text-xs text-green-700">Sua reserva está garantida na blockchain Stellar.</p>
                                    <div className="bg-white rounded-xl border border-green-200 px-3 py-2 font-mono text-[10px] text-gray-500 break-all">{txHash}</div>
                                    <a
                                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-green-700 underline underline-offset-2 hover:text-green-900 transition-colors"
                                    >
                                        Ver transação no Stellar Expert →
                                    </a>
                                </div>
                            )}

                            {/* Botão Já Paguei — state machine driven */}
                            {escrowStatus !== 'success' && (
                                <button
                                    type="button"
                                    disabled={escrowStatus === 'approving' || escrowStatus === 'locking'}
                                    onClick={async () => {
                                        setEscrowError(null);

                                        // --- PASSO 1: APROVAÇÃO ---
                                        setEscrowStatus('approving');
                                        // lockFunds internally runs approve then lock sequentially
                                        // We call it here and track status via the hook's internal steps
                                        // by using the returned result.
                                        // For per-step UI feedback we intercept status before calling.

                                        // Convert BRL/USD amount to XLM stroops (1 XLM = 10^7 stroops)
                                        const currency = selectedFlight?.price?.currency || 'BRL';
                                        let conversionRate = 1;
                                        
                                        // Cotação real e atualizada:
                                        // 1 XLM = ~R$ 0,90
                                        // 1 XLM = ~$ 0,178
                                        if (currency === 'BRL') conversionRate = 1 / 0.90; 
                                        if (currency === 'USD') conversionRate = 1 / 0.178; 
                                        if (currency === 'EUR') conversionRate = 1 / 0.165;

                                        const amountInStroops = Math.floor(pixTotal * conversionRate * 1e7);

                                        // lockFunds handles: approve → (setEscrowStatus locking) → lock_funds
                                        // We update to 'locking' state after a short delay to simulate the approve confirmation UX
                                        const lockingTimer = setTimeout(() => {
                                            setEscrowStatus('locking');
                                        }, 3500); // approximate time for approve polling

                                        const finalBookingId = bookingId || generatePNR();
                                        const result = await lockFunds(amountInStroops, finalBookingId);

                                        clearTimeout(lockingTimer);

                                        if (result?.success) {
                                            setTxHash(result.hash ?? null);
                                            try {
                                                const webhookRes = await fetch('/api/receive-reservation', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(buildWebhookPayload(finalBookingId))
                                                });
                                                if (!webhookRes.ok) {
                                                    throw new Error('Erro ao avisar o servidor');
                                                }
                                                setEscrowStatus('success');
                                                
                                                // Prepare and save ticket data
                                                const ticketPayload = buildWebhookPayload(finalBookingId);
                                                (ticketPayload.payment as any).total_paid = pixTotal;
                                                (ticketPayload.payment as any).currency = currency;
                                                (ticketPayload.flight as any).airline = selectedFlight?.itineraries?.[0]?.segments?.[0]?.carrierCode || 'Airline';
                                                (ticketPayload.flight as any).flightNumber = selectedFlight?.itineraries?.[0]?.segments?.[0]?.number || 'Flight 123';
                                                
                                                sessionStorage.setItem('bittravels_ticket', JSON.stringify(ticketPayload));
                                                
                                                // Redirect to ticket page
                                                router.push('/ticket');
                                            } catch (e) {
                                                setEscrowStatus('error');
                                                setEscrowError('Transação aprovada na rede, mas houve erro ao avisar o servidor.');
                                            }
                                        } else {
                                            setEscrowStatus('error');
                                            setEscrowError(result?.error || 'Erro desconhecido. Tente novamente.');
                                        }
                                    }}
                                    className="w-full py-4 bg-[#F5B316] hover:bg-[#F5B316]/90 disabled:opacity-60 disabled:cursor-not-allowed text-[#0C2B54] font-bold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    {escrowStatus === 'approving' && (
                                        <><Loader2 size={20} className="animate-spin" /> Iniciando aprovação de fundos...</>
                                    )}
                                    {escrowStatus === 'locking' && (
                                        <><Lock size={20} className="animate-pulse" /> Travando fundos no Escrow...</>
                                    )}
                                    {(escrowStatus === 'idle' || escrowStatus === 'error') && (
                                        <><Check size={20} /> Já paguei</>
                                    )}
                                </button>
                            )}

                            {/* Voltar */}
                            {escrowStatus !== 'approving' && escrowStatus !== 'locking' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPixScreen(false);
                                        setEscrowStatus('idle');
                                        setEscrowError(null);
                                        setTxHash(null);
                                    }}
                                    className="w-full py-3 border-2 border-gray-200 hover:border-[#0C2B54]/20 text-gray-500 hover:text-[#0C2B54] font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={16} />
                                    Voltar ao checkout
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 md:p-12 text-center border border-gray-100">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Check className="w-12 h-12" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {t('checkout.successTitle')}
                        </h1>
                        <p className="text-gray-600 mb-6 text-lg">
                            {t('checkout.successMessage')}
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                            <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide font-bold">{t('checkout.bookingId')}</p>
                            <p className="text-4xl font-mono font-bold tracking-widest text-primary">{bookingId}</p>
                        </div>

                        <a
                            href={`https://wa.me/5565999299529?text=${encodeURIComponent(`Olá, preenchi a reserva ${bookingId} no site e desejo realizar o pagamento.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex justify-center items-center gap-2 px-8 py-4 bg-accent hover:bg-accent/90 text-primary font-bold rounded-xl transition-all shadow-md text-lg"
                        >
                            <MessageCircle className="w-6 h-6" />
                            {t('checkout.talkToSpecialist')}
                        </a>
                    </div>
                </main>
            </div>
        );
    }
    const steps = [
        { number: 1, title: 'Passageiros', icon: '👤' },
        { number: 2, title: 'Contato', icon: '📧' },
        { number: 3, title: 'Pagamento', icon: '💳' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-24 pb-8 md:pt-32 md:pb-12">
                {/* Header Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => router.push('/')}
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium mb-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>{t('checkout.back')}</span>
                        </button>
                    </div>
                </div>

                {/* Grid Layout Container */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main Content (Forms) */}
                    <div className="lg:col-span-2">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-red-800 font-medium text-sm">{error}</p>
                            </div>
                        )}

                        {/* Step 1: Passengers */}
                        <div className="space-y-6 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">{t('checkout.whoTravels')}</h2>

                            {adults.map((passenger, index) => (
                                <PassengerForm
                                    key={`adult-${index}`}
                                    type="ADULTO"
                                    index={index}
                                    data={passenger}
                                    onChange={(data) => {
                                        const newAdults = [...adults];
                                        newAdults[index] = data;
                                        setAdults(newAdults);
                                    }}
                                />
                            ))}

                            {children.map((passenger, index) => (
                                <PassengerForm
                                    key={`child-${index}`}
                                    type="CRIANCA"
                                    index={index}
                                    data={passenger}
                                    onChange={(data) => {
                                        const newChildren = [...children];
                                        newChildren[index] = data;
                                        setChildren(newChildren);
                                    }}
                                />
                            ))}

                            {babies.map((passenger, index) => (
                                <PassengerForm
                                    key={`baby-${index}`}
                                    type="BEBE"
                                    index={index}
                                    data={passenger}
                                    onChange={(data) => {
                                        const newBabies = [...babies];
                                        newBabies[index] = data;
                                        setBabies(newBabies);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Simplified Contact Card */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {t('checkout.contactData')}
                                    </h3>
                                    <p className="text-gray-500 text-sm">{t('checkout.contactSub')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        {t('checkout.email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder="seu@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-2">
                                        {t('checkout.whatsapp')}
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                                className="h-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 flex items-center gap-2 hover:border-primary transition-all min-w-[100px] justify-between"
                                            >
                                                <span className="text-xl">{selectedCountry.flag}</span>
                                                <span className="font-semibold text-sm">+{selectedCountry.code}</span>
                                            </button>

                                            {isCountryDropdownOpen && (
                                                <div className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {COUNTRIES.map((ct) => (
                                                        <button
                                                            key={`${ct.code}-${ct.name}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCountry(ct);
                                                                setIsCountryDropdownOpen(false);
                                                            }}
                                                            className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${selectedCountry.code === ct.code ? 'bg-primary/5' : ''}`}
                                                        >
                                                            <span className="text-xl">{ct.flag}</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-gray-900">{ct.name}</span>
                                                                <span className="text-xs text-gray-500">+{ct.code}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            type="tel"
                                            value={contactWhatsapp}
                                            onChange={(e) => setContactWhatsapp(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <CreditCard className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                                        {t('checkout.paymentMethod')}
                                    </h3>
                                    <p className="text-gray-500 text-sm">{t('checkout.paymentMethodSub')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['pix', 'boleto', 'card', 'crypto'].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === method
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-gray-200 hover:border-primary/50 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center ${paymentMethod === method ? 'border-primary' : 'border-gray-300'}`}>
                                            {paymentMethod === method && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <span className="font-semibold text-sm">{t(`checkout.payment.${method}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full px-8 py-5 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white font-bold text-lg rounded-xl transition-all shadow-md disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? t('checkout.processing') : t('checkout.submit')}
                            </button>
                        </div>
                    </div>

                    {/* Flight Summary Sidebar */}
                    <div className="lg:col-span-1 self-start">
                        {/* Payment Details Box */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                {t('checkout.paymentDetails')}
                            </h3>

                            {(() => {
                                const pricing = calculatePricing();
                                return (
                                    <>
                                        <div className="space-y-3 mb-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">
                                                    {t('checkout.flightFor')} {pricing.totalPassengers} {pricing.totalPassengers === 1 ? t('passenger.adult').toLowerCase() : (t('checkout.flightFor') === 'Voo para' ? 'pessoas' : 'people')}
                                                </span>
                                                <span className="text-gray-900 font-semibold">
                                                    {formatPrice(pricing.base.toString())}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center relative">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-600">{t('checkout.taxes')}</span>
                                                    <div
                                                        className="relative"
                                                        onMouseEnter={() => setShowTaxesPopover(true)}
                                                        onMouseLeave={() => setShowTaxesPopover(false)}
                                                        onClick={() => setShowTaxesPopover(!showTaxesPopover)}
                                                    >
                                                        <Info size={16} className="text-primary cursor-help" />

                                                        {showTaxesPopover && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 animate-in fade-in zoom-in duration-200">
                                                                <div className="bg-white rounded-xl shadow-2xl p-4 text-gray-800 border border-gray-100">
                                                                    <div className="space-y-3">
                                                                        {pricing.segmentBreakdown.map((seg, idx) => (
                                                                            <div key={idx} className="space-y-1.5 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                                                                                <p className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                                                                                    {pricing.segmentBreakdown.length > 1 ? `Trecho ${idx + 1}` : 'Detalhes'}
                                                                                </p>
                                                                                {seg.serviceFee > 0 && (
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-sm text-gray-600">Taxa de serviço</span>
                                                                                        <span className="text-sm font-semibold">{formatPrice(seg.serviceFee)}</span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-sm text-gray-600">Taxa de embarque</span>
                                                                                    <span className="text-sm font-semibold">{formatPrice(seg.boardingTax)}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* Arrow */}
                                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100"></div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-gray-900 font-semibold">
                                                    {formatPrice(pricing.totalTaxesAndFees.toString())}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-200 mb-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-xl font-bold text-gray-900">{t('checkout.total')}</span>
                                                    {isTestMode && (
                                                        <span className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">{t('checkout.simulatedPrice')}</span>
                                                    )}
                                                </div>
                                                <span className={`text-2xl font-bold ${isTestMode ? 'text-orange-600' : 'text-gray-900'}`}>
                                                    {formatPrice(pricing.total.toString())}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
                                            {pricing.adultsCount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">
                                                    {t('checkout.pricePerAdult')} ({pricing.adultsCount})
                                                    </span>
                                                    <span className="text-gray-700">
                                                        {formatPrice(pricing.pricePerAdult.toString())}
                                                    </span>
                                                </div>
                                            )}
                                            {pricing.childrenCount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">
                                                    {t('checkout.pricePerChild')} ({pricing.childrenCount})
                                                    </span>
                                                    <span className="text-gray-700">
                                                        {formatPrice(pricing.pricePerChild.toString())}
                                                    </span>
                                                </div>
                                            )}
                                            {pricing.babiesCount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500">
                                                    {t('checkout.pricePerBaby')} ({pricing.babiesCount})
                                                    </span>
                                                    <span className="text-gray-700">
                                                        {formatPrice(pricing.pricePerBaby.toString())}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Flight Details Box */}
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {selectedFlight.itineraries[0].segments[0].departure.iataCode} - {selectedFlight.itineraries[0].segments[selectedFlight.itineraries[0].segments.length - 1].arrival.iataCode}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    {getTripTypeLabel()}, {(() => {
                                        const pricing = calculatePricing();
                                        const parts = [];
                                        if (pricing.adultsCount > 0) parts.push(`${pricing.adultsCount} ${pricing.adultsCount === 1 ? t('passenger.adult').toLowerCase() : t('passengers.adults').toLowerCase()}`);
                                        if (pricing.childrenCount > 0) parts.push(`${pricing.childrenCount} ${pricing.childrenCount === 1 ? t('passenger.child').toLowerCase() : t('passengers.children').toLowerCase()}`);
                                        if (pricing.babiesCount > 0) parts.push(`${pricing.babiesCount} ${pricing.babiesCount === 1 ? t('passenger.baby').toLowerCase() : t('passenger.babies').toLowerCase()}`);
                                        return parts.join(', ');
                                    })()}
                                </p>
                            </div>

                            {selectedFlight.itineraries.map((itinerary, itiIndex) => (
                                <div key={itiIndex} className={itiIndex > 0 ? "mt-6 pt-6 border-t border-gray-100" : ""}>
                                    <div className="flex items-center gap-2 mb-3">
                                        {selectedFlight.itineraries.length > 1 && (
                                            <div className={`px-3 py-1 rounded-lg ${itiIndex === 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-700'} `}>
                                                <span className="font-bold text-sm">
                                                    {selectedFlight.itineraries.length === 2
                                                        ? (itiIndex === 0 ? t('checkout.departure') : t('checkout.return'))
                                                        : `${t('checkout.leg')} ${itiIndex + 1}`}
                                                </span>
                                            </div>
                                        )}

                                        <span className="text-gray-600 text-sm font-medium">
                                            {formatDate(itinerary.segments[0].departure.at)}
                                        </span>
                                    </div>

                                    {/* Exibição Resumo + Expansão */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <p className="text-xl font-bold text-gray-900">{itinerary.segments[0].departure.iataCode}</p>
                                                <p className="text-gray-600 text-sm">{formatTime(itinerary.segments[0].departure.at)}</p>
                                            </div>

                                            <div className="flex-1 text-center">
                                                <p className="text-gray-500 text-xs mb-1">
                                                    {itinerary.segments.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleItinerary(itiIndex)}
                                                            className="text-primary underline hover:text-primary/80 font-medium cursor-pointer"
                                                        >
                                                            {itinerary.segments.length - 1} escala{itinerary.segments.length > 2 ? 's' : ''}
                                                        </button>
                                                    ) : (
                                                        <span className="text-green-600 font-medium">{t('search.direct')}</span>
                                                    )}
                                                </p>
                                                <div className="h-px bg-gray-200 relative">
                                                    <Plane className="w-3 h-3 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                                                </div>
                                                <p className="text-gray-500 text-xs mt-1">
                                                    {t('checkout.duration')}: {formatDuration(itinerary.duration)}
                                                </p>
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-xl font-bold text-gray-900">{itinerary.segments[itinerary.segments.length - 1].arrival.iataCode}</p>
                                                <p className="text-gray-600 text-sm">{formatTime(itinerary.segments[itinerary.segments.length - 1].arrival.at)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes dos Segmentos (Expandido) */}
                                    {expandedItineraries.has(itiIndex) && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 p-2 bg-gray-50/50 rounded-xl">
                                            {itinerary.segments.map((segment, index) => {
                                                let connectionTime = '';
                                                if (index > 0) {
                                                    const prevArr = new Date(itinerary.segments[index - 1].arrival.at).getTime();
                                                    const currDep = new Date(segment.departure.at).getTime();
                                                    const diff = currDep - prevArr;
                                                    if (diff > 0) {
                                                        const h = Math.floor(diff / (1000 * 60 * 60));
                                                        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                        connectionTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
                                                    }
                                                }

                                                return (
                                                    <div key={index} className="mb-4 last:mb-0">
                                                        {index > 0 && (
                                                            <div className="flex items-center gap-2 mb-4 ml-6 pl-4 border-l-2 border-dashed border-gray-200">
                                                                <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-md">
                                                                    {t('checkout.connectionAt')} {segment.departure.iataCode}: {connectionTime}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex gap-4">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                                                {index < itinerary.segments.length - 1 ? (
                                                                    <div className="flex-1 w-px bg-gray-200 my-1 min-h-[40px]" />
                                                                ) : (
                                                                    <div className="flex-1 w-px bg-transparent my-1 min-h-[40px]" />
                                                                )}
                                                                <div className="w-2 h-2 rounded-full border-2 border-primary bg-white" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">{segment.departure.iataCode}</p>
                                                                        {locationNames[segment.departure.iataCode] && (
                                                                            <p className="text-[10px] text-gray-500 font-medium">
                                                                                {locationNames[segment.departure.iataCode].cityName}
                                                                                {locationNames[segment.departure.iataCode].countryName ? `, ${locationNames[segment.departure.iataCode].countryName}` : ''}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-sm text-gray-600 mt-0.5">{formatTime(segment.departure.at)}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-bold text-gray-700">{segment.carrierCode} {segment.number}</p>
                                                                        <p className="text-xs text-gray-500">{t('search.operatedBy')} {segment.operating?.carrierName || segment.carrierCode}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="my-2 py-1 flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                                    {t('checkout.duration')}: {formatDuration(segment.duration)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-gray-900">{segment.arrival.iataCode}</p>
                                                                    <p className="text-sm text-gray-600">{formatTime(segment.arrival.at)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
