'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Plane, Printer, MapPin, Calendar, Clock, CreditCard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TicketData {
    customer: {
        first_name: string;
        last_name: string;
        passport?: string;
        cpf?: string;
    };
    flight: {
        amadeus_flight_id: string;
        route: string;
        departure_date: string;
        return_date?: string;
        airline?: string;
        flightNumber?: string;
        duration?: string;
        originIata?: string;
        destIata?: string;
    };
    payment: {
        total_paid: number;
        currency: string;
    };
    internal_id: string;
}

export default function TicketPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [ticketData, setTicketData] = useState<TicketData | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('bittravels_ticket');
        if (stored) {
            try {
                setTicketData(JSON.parse(stored));
            } catch (e) {
                console.error('Invalid ticket data');
            }
        } else {
            // Redirect to home if no ticket data
            router.push('/');
        }
    }, [router]);

    if (!ticketData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <Plane className="w-12 h-12 text-[#0C2B54] mb-4 animate-bounce" />
                    <p className="text-[#0C2B54] font-medium">{t('ticket.generating')}</p>
                </div>
            </div>
        );
    }

    const { customer, flight, payment, internal_id } = ticketData;
    
    // Parse Date
    const depDate = new Date(flight.departure_date);
    const dateStr = depDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = depDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Mock Airline info if not fully available
    const airlineName = flight.airline || 'Stellar Airways';
    const flightNumber = flight.flightNumber || 'SA-2049';
    const origin = flight.originIata || flight.route.split('-')[0] || 'GRU';
    const dest = flight.destIata || flight.route.split('-')[1]?.split(' ')[0] || 'JFK';

    const documentNumber = customer.cpf || customer.passport || 'N/A';
    const fullName = `${customer.first_name} ${customer.last_name}`.toUpperCase();

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <div className="print:hidden">
                <Header />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-4 pt-28 pb-12">
                
                {/* Print Button */}
                <div className="w-full max-w-4xl flex justify-end mb-4 print:hidden">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-[#0C2B54] text-white px-5 py-2.5 rounded-lg hover:bg-[#0C2B54]/90 transition-colors font-medium shadow-sm"
                    >
                        <Printer size={18} />
                        {t('ticket.print')}
                    </button>
                </div>

                {/* Ticket Container */}
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
                    
                    {/* Left/Top Section: Main Info */}
                    <div className="flex-1 p-8 md:p-10 bg-white relative">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-10 border-b border-gray-100 pb-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Plane className="w-8 h-8 text-[#F5B316]" />
                                    <h1 className="text-3xl font-black text-[#0C2B54] tracking-tighter">Bit Travels</h1>
                                </div>
                                <p className="text-sm text-gray-500 font-medium tracking-widest uppercase mt-1">Boarding Pass</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400 uppercase font-semibold">PNR / Localizador</p>
                                <p className="text-xl font-bold text-gray-800">{internal_id}</p>
                            </div>
                        </div>

                        {/* Passenger */}
                        <div className="mb-8">
                            <p className="text-sm text-gray-400 uppercase font-semibold">Passenger / Passageiro</p>
                            <p className="text-2xl font-bold text-gray-800 tracking-wide">{fullName}</p>
                            <p className="text-sm text-gray-500 mt-1">Doc: {documentNumber}</p>
                        </div>

                        {/* Flight Route */}
                        <div className="flex items-center justify-between mb-8 relative">
                            <div className="flex-1">
                                <p className="text-4xl font-black text-[#0C2B54]">{origin}</p>
                                <p className="text-sm text-gray-500 font-medium mt-1">Departure</p>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center px-4">
                                <Plane className="w-8 h-8 text-[#F5B316]" />
                                <div className="w-full h-[2px] bg-gray-200 mt-2 relative">
                                    <div className="absolute inset-0 bg-[#0C2B54] opacity-20 border-t-2 border-dashed border-[#0C2B54]"></div>
                                </div>
                            </div>

                            <div className="flex-1 text-right">
                                <p className="text-4xl font-black text-[#0C2B54]">{dest}</p>
                                <p className="text-sm text-gray-500 font-medium mt-1">Arrival</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1"><Calendar size={12}/> Date</p>
                                <p className="font-bold text-gray-800 mt-1">{dateStr}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1"><Clock size={12}/> Time</p>
                                <p className="font-bold text-gray-800 mt-1">{timeStr}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1"><Plane size={12}/> Flight</p>
                                <p className="font-bold text-gray-800 mt-1">{flightNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-semibold flex items-center gap-1"><CreditCard size={12}/> Paid</p>
                                <p className="font-bold text-green-600 mt-1">{payment.currency} {payment.total_paid.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:flex flex-col items-center justify-between relative bg-white border-l-2 border-dashed border-gray-200 w-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full absolute -top-4 -left-4"></div>
                        <div className="w-8 h-8 bg-gray-100 rounded-full absolute -bottom-4 -left-4"></div>
                    </div>
                    <div className="md:hidden flex items-center justify-between relative bg-white border-t-2 border-dashed border-gray-200 h-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full absolute -left-4 -top-4"></div>
                        <div className="w-8 h-8 bg-gray-100 rounded-full absolute -right-4 -top-4"></div>
                    </div>

                    {/* Right/Bottom Section: Stub */}
                    <div className="w-full md:w-72 bg-[#0C2B54] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
                        
                        {/* Decorative background logo */}
                        <Plane className="absolute -right-10 -bottom-10 w-48 h-48 text-white opacity-5 rotate-45 pointer-events-none" />

                        <div>
                            <div className="mb-8">
                                <p className="text-xs text-blue-200 uppercase font-semibold tracking-widest">Boarding Pass</p>
                                <p className="text-xl font-bold mt-1 tracking-wider">{airlineName}</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <p className="text-xs text-blue-200 uppercase">Passenger</p>
                                    <p className="font-medium truncate">{fullName}</p>
                                </div>
                                <div className="flex justify-between">
                                    <div>
                                        <p className="text-xs text-blue-200 uppercase">Flight</p>
                                        <p className="font-medium">{flightNumber}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-blue-200 uppercase">Status</p>
                                        <p className="font-bold text-green-400">{t('ticket.status')}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-200 uppercase">Route</p>
                                    <p className="font-medium">{origin} ✈ {dest}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
}
