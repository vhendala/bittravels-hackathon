'use client';

import { useState } from 'react';
import { User, FileText, Calendar, Users as UsersIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PassengerData {
    firstName: string;
    lastName: string;
    country: string;
    documentType: 'CPF' | 'PASSAPORTE';
    documentNumber: string;
    birthDay: string;
    birthMonth: string;
    birthYear: string;
    gender: 'FEMININO' | 'MASCULINO';
}

interface PassengerFormProps {
    type: 'ADULTO' | 'CRIANCA' | 'BEBE';
    index: number;
    data: PassengerData;
    onChange: (data: PassengerData) => void;
}

const countries = [
    'Brasil', 'Argentina', 'Chile', 'Colômbia', 'Estados Unidos',
    'Portugal', 'Espanha', 'França', 'Itália', 'Alemanha', 'Outro'
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const months = [
    { value: '01', key: 'passenger.month.jan' },
    { value: '02', key: 'passenger.month.feb' },
    { value: '03', key: 'passenger.month.mar' },
    { value: '04', key: 'passenger.month.apr' },
    { value: '05', key: 'passenger.month.may' },
    { value: '06', key: 'passenger.month.jun' },
    { value: '07', key: 'passenger.month.jul' },
    { value: '08', key: 'passenger.month.aug' },
    { value: '09', key: 'passenger.month.sep' },
    { value: '10', key: 'passenger.month.oct' },
    { value: '11', key: 'passenger.month.nov' },
    { value: '12', key: 'passenger.month.dec' },
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

export default function PassengerForm({ type, index, data, onChange }: PassengerFormProps) {
    const { t } = useLanguage();

    const typeLabels = {
        ADULTO: t('passenger.adult'),
        CRIANCA: t('passenger.child'),
        BEBE: t('passenger.baby')
    };

    const documentOptions = ['CPF', 'PASSAPORTE'];

    const isBrazil = data.country === 'Brasil';

    const handleChange = (field: keyof PassengerData, value: string) => {
        // Auto-select passport for non-Brazil countries
        if (field === 'country' && value !== 'Brasil') {
            onChange({
                ...data,
                [field]: value,
                documentType: 'PASSAPORTE'
            });
        } else {
            onChange({ ...data, [field]: value });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {data.firstName ? `${data.firstName} ${data.lastName}`.trim() : `${typeLabels[type]} ${index + 1}`}
                    </h3>
                    <p className="text-gray-500 text-sm">{t('passenger.fillData')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                        {t('passenger.nameLabel')}
                    </label>
                    <input
                        type="text"
                        value={data.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                    />
                </div>

                {/* Sobrenome */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                        {t('passenger.lastNameLabel')}
                    </label>
                    <input
                        type="text"
                        value={data.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>

                {/* País de residência */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                        {t('passenger.country')}
                    </label>
                    <select
                        value={data.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                        <option value="">{t('passenger.selectCountry')}</option>
                        {countries.map((country) => (
                            <option key={country} value={country}>
                                {t(`country.${country.toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tipo de documento */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                        {t('passenger.documentType')}
                    </label>
                    {isBrazil ? (
                        <select
                            value={data.documentType}
                            onChange={(e) => handleChange('documentType', e.target.value as any)}
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        >
                            <option value="">{t('passenger.selectDocument')}</option>
                            {documentOptions.map((doc) => (
                                <option key={doc} value={doc}>
                                    {doc}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="w-full px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                            <p className="text-primary font-bold text-sm">PASSAPORTE</p>
                            <p className="text-gray-500 text-xs mt-1">
                                {t('passenger.passportRequired')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Número do documento */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-semibold mb-2">
                        {data.documentType || t('passenger.document')}
                    </label>
                    <input
                        type="text"
                        value={data.documentNumber}
                        onChange={(e) => handleChange('documentNumber', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>

                {/* Data de nascimento */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-semibold mb-2">
                        {t('passenger.birthDate')}
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">{t('passenger.day')}</label>
                            <select
                                value={data.birthDay}
                                onChange={(e) => handleChange('birthDay', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">{t('passenger.day')}</option>
                                {days.map((day) => (
                                    <option key={day} value={day}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">{t('passenger.month')}</label>
                            <select
                                value={data.birthMonth}
                                onChange={(e) => handleChange('birthMonth', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">{t('passenger.month')}</option>
                                {months.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {t(month.key)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">{t('passenger.year')}</label>
                            <select
                                value={data.birthYear}
                                onChange={(e) => handleChange('birthYear', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            >
                                <option value="">{t('passenger.year')}</option>
                                {years.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sexo */}
                <div className="md:col-span-2">
                    <label className="block text-gray-700 font-semibold mb-2">
                        {t('passenger.gender')}
                    </label>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={`gender-${type}-${index}`}
                                value="FEMININO"
                                checked={data.gender === 'FEMININO'}
                                onChange={(e) => handleChange('gender', e.target.value as any)}
                                className="w-5 h-5 text-primary focus:ring-primary focus:ring-2 border-gray-300"
                            />
                            <span className="text-gray-700">{t('passenger.female')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name={`gender-${type}-${index}`}
                                value="MASCULINO"
                                checked={data.gender === 'MASCULINO'}
                                onChange={(e) => handleChange('gender', e.target.value as any)}
                                className="w-5 h-5 text-primary focus:ring-primary focus:ring-2 border-gray-300"
                            />
                            <span className="text-gray-700">{t('passenger.male')}</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

export type { PassengerData };
