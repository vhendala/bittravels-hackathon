'use client';

import { useState } from 'react';
import { Mail, Phone, MessageSquare, Plus } from 'lucide-react';

interface ContactData {
    email: string;
    emailConfirm: string;
    countryCode: string;
    areaCode: string;
    phoneNumber: string;
    additionalPhones: Array<{
        countryCode: string;
        areaCode: string;
        phoneNumber: string;
    }>;
    whatsappNotifications: boolean;
}

interface ContactFormProps {
    data: ContactData;
    onChange: (data: ContactData) => void;
}

const countryCodes = [
    { code: '+55', country: 'Brasil', hasAreaCode: true },
    { code: '+1', country: 'Estados Unidos/Canadá', hasAreaCode: false },
    { code: '+54', country: 'Argentina', hasAreaCode: false },
    { code: '+56', country: 'Chile', hasAreaCode: false },
    { code: '+57', country: 'Colômbia', hasAreaCode: false },
    { code: '+351', country: 'Portugal', hasAreaCode: false },
    { code: '+34', country: 'Espanha', hasAreaCode: false },
    { code: '+33', country: 'França', hasAreaCode: false },
    { code: '+39', country: 'Itália', hasAreaCode: false },
    { code: '+49', country: 'Alemanha', hasAreaCode: false },
    { code: '+44', country: 'Reino Unido', hasAreaCode: false },
    { code: '+52', country: 'México', hasAreaCode: false },
    { code: '+81', country: 'Japão', hasAreaCode: false },
    { code: '+86', country: 'China', hasAreaCode: false },
];

export default function ContactForm({ data, onChange }: ContactFormProps) {
    const [showAdditionalPhone, setShowAdditionalPhone] = useState(false);

    // Check if current country code requires area code (only Brazil)
    const selectedCountry = countryCodes.find(c => c.code === data.countryCode);
    const showAreaCode = selectedCountry?.hasAreaCode ?? false;

    const handleChange = (field: keyof ContactData, value: any) => {
        // If changing country code and new country doesn't use area code, clear it
        if (field === 'countryCode') {
            const newCountry = countryCodes.find(c => c.code === value);
            if (!newCountry?.hasAreaCode) {
                onChange({ ...data, [field]: value, areaCode: '' });
                return;
            }
        }
        onChange({ ...data, [field]: value });
    };

    const addAdditionalPhone = () => {
        const newPhones = [...data.additionalPhones, { countryCode: '+55', areaCode: '', phoneNumber: '' }];
        handleChange('additionalPhones', newPhones);
        setShowAdditionalPhone(true);
    };

    const updateAdditionalPhone = (index: number, field: string, value: string) => {
        const newPhones = [...data.additionalPhones];
        newPhones[index] = { ...newPhones[index], [field]: value };
        handleChange('additionalPhones', newPhones);
    };

    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Dados de contato</h3>
                    <p className="text-gray-500 text-sm">
                        Essenciais para que você receba os vouchers e informações importantes da viagem
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Email */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-1">
                        Para qual e-mail enviamos os vouchers?
                    </label>
                    <p className="text-gray-500 text-sm mb-4">
                        Esse dado é essencial para que possamos enviar seus vouchers e informações importantes sobre sua viagem.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-500 text-xs mb-1 font-semibold tracking-wide">E-MAIL</label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="Insira seu e-mail"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 text-xs mb-1 font-semibold tracking-wide">CONFIRME O SEU E-MAIL</label>
                            <input
                                type="email"
                                value={data.emailConfirm}
                                onChange={(e) => handleChange('emailConfirm', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder="Confirme seu e-mail"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Telefone */}
                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-gray-700 font-semibold mb-3">
                        Em que número de celular podemos falar com você?
                    </label>
                    <div className={`grid grid-cols-1 gap-4 ${showAreaCode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">Código do país</label>
                            <select
                                value={data.countryCode}
                                onChange={(e) => handleChange('countryCode', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                required
                            >
                                {countryCodes.map((item) => (
                                    <option key={item.code} value={item.code}>
                                        {item.country} ({item.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {showAreaCode && (
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">DDD</label>
                                <input
                                    type="text"
                                    value={data.areaCode}
                                    onChange={(e) => handleChange('areaCode', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="11"
                                    maxLength={2}
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">
                                {showAreaCode ? 'Número de celular' : 'Telefone'}
                            </label>
                            <input
                                type="text"
                                value={data.phoneNumber}
                                onChange={(e) => handleChange('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, showAreaCode ? 9 : 15))}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                placeholder={showAreaCode ? '999999999' : 'Número do telefone'}
                                maxLength={showAreaCode ? 9 : 15}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Telefone adicional */}
                {!showAdditionalPhone && data.additionalPhones.length === 0 && (
                    <button
                        type="button"
                        onClick={addAdditionalPhone}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-sm mt-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Incluir outro celular</span>
                    </button>
                )}

                {data.additionalPhones.map((phone, index) => {
                    const additionalCountry = countryCodes.find(c => c.code === phone.countryCode);
                    const showAdditionalAreaCode = additionalCountry?.hasAreaCode ?? false;

                    return (
                        <div key={index} className={`grid grid-cols-1 gap-4 pt-4 border-t border-gray-100 ${showAdditionalAreaCode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">Código do país</label>
                                <select
                                    value={phone.countryCode}
                                    onChange={(e) => {
                                        const newCountry = countryCodes.find(c => c.code === e.target.value);
                                        if (!newCountry?.hasAreaCode) {
                                            const newPhones = [...data.additionalPhones];
                                            newPhones[index] = { ...phone, countryCode: e.target.value, areaCode: '' };
                                            handleChange('additionalPhones', newPhones);
                                        } else {
                                            updateAdditionalPhone(index, 'countryCode', e.target.value);
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                >
                                    {countryCodes.map((item) => (
                                        <option key={item.code} value={item.code}>
                                            {item.country} ({item.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {showAdditionalAreaCode && (
                                <div>
                                    <label className="block text-gray-500 text-xs mb-1">DDD</label>
                                    <input
                                        type="text"
                                        value={phone.areaCode}
                                        onChange={(e) => updateAdditionalPhone(index, 'areaCode', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder="11"
                                        maxLength={2}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">
                                    {showAdditionalAreaCode ? 'Número de celular' : 'Telefone'}
                                </label>
                                <input
                                    type="text"
                                    value={phone.phoneNumber}
                                    onChange={(e) => updateAdditionalPhone(index, 'phoneNumber', e.target.value.replace(/\D/g, '').slice(0, showAdditionalAreaCode ? 9 : 15))}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder={showAdditionalAreaCode ? '999999999' : 'Número do telefone'}
                                    maxLength={showAdditionalAreaCode ? 9 : 15}
                                />
                            </div>
                        </div>
                    );
                })}

                {/* WhatsApp/SMS */}
                <div className="flex items-start gap-4 p-5 bg-green-50/50 border border-green-100 rounded-xl mt-4">
                    <input
                        type="checkbox"
                        id="whatsapp-notifications"
                        checked={data.whatsappNotifications}
                        onChange={(e) => handleChange('whatsappNotifications', e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="whatsapp-notifications" className="text-gray-700 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-900">Notificações por WhatsApp/SMS</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Quero receber detalhes da minha compra, estado do voo e possíveis alterações da minha reserva por WhatsApp ou SMS.
                        </p>
                    </label>
                </div>
            </div>
        </div>
    );
}

export type { ContactData };
