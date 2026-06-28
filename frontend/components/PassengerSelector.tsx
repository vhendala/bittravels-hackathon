'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Plus, Minus, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChildAgeSelectorProps {
    index: number;
    age: number;
    onChange: (age: number) => void;
}

function ChildAgeSelector({ index, age, onChange }: ChildAgeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const { t } = useLanguage();

    const getAgeLabel = (value: number) => {
        if (value === -1) return t('passengers.age') || 'Idade';
        if (value === 0) return t('passengers.upTo1') || 'Até 1 ano';
        return `${value} ${value === 1 ? (t('passengers.year') || 'ano') : (t('passengers.years') || 'anos')}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Idade do menor {index + 1}
            </label>
            <div className="text-xs text-gray-500 mb-2">Ao finalizar a viagem</div>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            >
                <span className={`text-gray-900 ${age === -1 ? 'text-gray-500' : ''}`}>{getAgeLabel(age)}</span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[60] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => {
                                onChange(-1);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${age === -1 ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span>Idade</span>
                            {age === -1 && <Check size={16} />}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onChange(0);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${age === 0 ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <span>Até 1 ano</span>
                            {age === 0 && <Check size={16} />}
                        </button>
                        {Array.from({ length: 17 }, (_, i) => i + 1).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    onChange(value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${age === value ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span>{value} {value === 1 ? 'ano' : 'anos'}</span>
                                {age === value && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


export interface PassengerData {
    adults: number;
    children: number;
    childrenAges: number[];
    travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
}

interface PassengerSelectorProps {
    value: PassengerData;
    onChange: (data: PassengerData) => void;
}

export default function PassengerSelector({ value, onChange }: PassengerSelectorProps) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdultsChange = (delta: number) => {
        const newAdults = Math.max(1, Math.min(9, value.adults + delta));
        onChange({ ...value, adults: newAdults });
    };

    const handleChildrenChange = (delta: number) => {
        const newChildren = Math.max(0, Math.min(8, value.children + delta));
        const newChildrenAges = [...value.childrenAges];

        if (newChildren > value.children) {
            // Adding children - default age to -1 (Idade)
            for (let i = value.children; i < newChildren; i++) {
                newChildrenAges.push(-1);
            }
        } else if (newChildren < value.children) {
            // Removing children
            newChildrenAges.splice(newChildren);
        }

        onChange({ ...value, children: newChildren, childrenAges: newChildrenAges });
    };

    const handleChildAgeChange = (index: number, age: number) => {
        const newChildrenAges = [...value.childrenAges];
        newChildrenAges[index] = age;
        onChange({ ...value, childrenAges: newChildrenAges });
    };

    const handleClassChange = (travelClass: PassengerData['travelClass']) => {
        onChange({ ...value, travelClass });
    };

    const getTravelClassName = (travelClass: PassengerData['travelClass']) => {
        const classNames = {
            ECONOMY: 'Econômica',
            PREMIUM_ECONOMY: 'Econômica Premium',
            BUSINESS: 'Executiva',
            FIRST: 'Primeira Classe',
        };
        return classNames[travelClass];
    };

    const getSummaryText = () => {
        const parts = [];
        if (value.adults > 0) {
            parts.push(`${value.adults} ${value.adults === 1 ? (t('passengers.adult') || 'Adulto') : (t('passengers.adults') || 'Adultos')}`);
        }
        if (value.children > 0) {
            parts.push(`${value.children} ${value.children === 1 ? (t('passengers.child') || 'Criança') : (t('passengers.children') || 'Crianças')}`);
        }
        return parts.join(', ');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Users size={16} />
                Passageiros
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
            >
                <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">{getSummaryText()}</span>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full md:w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 space-y-4">
                    {/* Adults Counter */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div>
                            <div className="font-semibold text-gray-900">{t('passengers.adults') || 'Maiores'}</div>
                            <div className="text-sm text-gray-500">{t('passengers.adultsDescription') || 'A partir de 18 anos'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => handleAdultsChange(-1)}
                                disabled={value.adults <= 1}
                                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-semibold text-gray-900">{value.adults}</span>
                            <button
                                type="button"
                                onClick={() => handleAdultsChange(1)}
                                disabled={value.adults >= 9}
                                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Children Counter */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div>
                            <div className="font-semibold text-gray-900">{t('passengers.childrenTitle') || 'Menores'}</div>
                            <div className="text-sm text-gray-500">{t('passengers.childrenDescription') || 'Até 17 anos'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => handleChildrenChange(-1)}
                                disabled={value.children <= 0}
                                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-semibold text-gray-900">{value.children}</span>
                            <button
                                type="button"
                                onClick={() => handleChildrenChange(1)}
                                disabled={value.children >= 8}
                                className="w-8 h-8 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Children Ages */}
                    {value.children > 0 && (
                        <div className="space-y-3 pb-3 border-b border-gray-200">
                            {Array.from({ length: value.children }).map((_, index) => (
                                <ChildAgeSelector
                                    key={index}
                                    index={index}
                                    age={value.childrenAges[index] !== undefined ? value.childrenAges[index] : -1}
                                    onChange={(age) => handleChildAgeChange(index, age)}
                                />
                            ))}
                        </div>
                    )}


                    {/* Done Button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                        {t('confirm') || 'Confirmar'}
                    </button>
                </div>
            )}
        </div>
    );
}
