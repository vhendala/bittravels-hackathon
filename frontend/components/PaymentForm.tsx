'use client';

import { useState, useEffect } from 'react';
import { CreditCard, QrCode, Bitcoin, Wallet, Copy, Check, Lock, ShieldCheck, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentData {
    method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CRYPTO' | '';
    cardDetails?: {
        number: string;
        name: string;
        expiry: string;
        cvv: string;
    };
    cryptoType?: 'BTC' | 'ETH' | 'USDT';
}

interface PaymentFormProps {
    data: PaymentData;
    onChange: (data: PaymentData) => void;
}

const paymentMethods = [
    {
        id: 'CREDIT_CARD',
        name: 'Cartão de Crédito',
        icon: CreditCard,
        description: 'Até 12x sem juros no bittravels',
        color: 'from-purple-500 to-pink-500'
    },
    {
        id: 'DEBIT_CARD',
        name: 'Cartão de Débito',
        icon: CreditCard,
        description: 'Pagamento à vista via banco',
        color: 'from-primary to-primary/70'
    },
    {
        id: 'PIX',
        name: 'PIX',
        icon: QrCode,
        description: 'Desconto de 5% e aprovação na hora',
        color: 'from-green-500 to-emerald-500'
    },
    {
        id: 'CRYPTO',
        name: 'Criptomoeda',
        icon: Bitcoin,
        description: 'BTC, ETH ou USDT via Lightning',
        color: 'from-orange-500 to-yellow-500'
    }
] as const;

export default function PaymentForm({ data, onChange }: PaymentFormProps) {
    const [copied, setCopied] = useState(false);

    // Internal state for card details to handle input formatting
    const [cardDetails, setCardDetails] = useState(data.cardDetails || {
        number: '',
        name: '',
        expiry: '',
        cvv: ''
    });

    useEffect(() => {
        if (data.method === 'CREDIT_CARD' || data.method === 'DEBIT_CARD') {
            onChange({ ...data, cardDetails });
        }
    }, [cardDetails]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length > 0) return parts.join(' ');
        return value;
    };

    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Pagamento</h3>
                        <p className="text-gray-500 text-sm">Escolha como deseja pagar sua reserva</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                    <Lock size={14} className="text-green-600" />
                    <span className="text-[10px] text-green-700 uppercase font-bold tracking-wider">Ambiente Seguro</span>
                </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = data.method === method.id;

                    return (
                        <button
                            key={method.id}
                            type="button"
                            onClick={() => onChange({ ...data, method: method.id as any })}
                            className={`
                                relative p-5 rounded-2xl border-2 transition-all duration-300 group
                                ${isSelected
                                    ? 'border-primary bg-primary/5 shadow-md'
                                    : 'border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 bg-gradient-to-br ${method.color} rounded-xl shadow-md ring-2 ring-white transition-transform group-hover:scale-110`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h4 className="text-base font-bold text-gray-900">
                                        {method.name}
                                    </h4>
                                    <p className="text-gray-500 text-[11px] leading-tight mt-0.5">
                                        {method.description}
                                    </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Dynamic Content */}
            <AnimatePresence mode="wait">
                {data.method === 'CREDIT_CARD' || data.method === 'DEBIT_CARD' ? (
                    <motion.div
                        key="card-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 border-t border-gray-100"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Número do Cartão</label>
                                <input
                                    type="text"
                                    placeholder="0000 0000 0000 0000"
                                    value={cardDetails.number}
                                    onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono"
                                    maxLength={19}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Titular</label>
                                <input
                                    type="text"
                                    placeholder="Como está no cartão"
                                    value={cardDetails.name}
                                    onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Validade</label>
                                    <input
                                        type="text"
                                        placeholder="MM/AA"
                                        value={cardDetails.expiry}
                                        onChange={(e) => {
                                            let v = e.target.value.replace(/[^0-9]/g, '');
                                            if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                            setCardDetails({ ...cardDetails, expiry: v });
                                        }}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-center"
                                        maxLength={5}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">CVV</label>
                                    <input
                                        type="text"
                                        placeholder="123"
                                        value={cardDetails.cvv}
                                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-center"
                                        maxLength={3}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                                <ShieldCheck className="text-green-600 shrink-0" size={24} />
                                <p className="text-[10px] text-green-800 leading-tight">
                                    Seus dados são criptografados de ponta a ponta. Não armazenamos o CVV do seu cartão por segurança.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : data.method === 'PIX' ? (
                    <motion.div
                        key="pix-form"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-4 shadow-inner"
                    >
                        <div className="inline-block p-4 bg-white rounded-2xl shadow-md">
                            {/* Mock QR Code */}
                            <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border-4 border-gray-50">
                                <QrCode size={120} className="text-gray-900" />
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-900 font-bold">QR Code Gerado</p>
                            <p className="text-gray-500 text-xs">Escaneie com o app do seu banco</p>
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                readOnly
                                value="00020126580014br.gov.bcb.pix0136bittravels-pix-key-random..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-600 text-[10px] font-mono pr-24 cursor-default"
                            />
                            <button
                                type="button"
                                onClick={() => handleCopy('00020126580014br.gov.bcb.pix0136bittravels-pix-key-random...')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary/90 rounded-lg text-white transition-colors flex items-center gap-2"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                <span className="text-[10px] font-bold uppercase">{copied ? 'Copiado' : 'Copiar'}</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 italic">
                            O desconto de 5% será aplicado automaticamente ao finalizar o pagamento.
                        </p>
                    </motion.div>
                ) : data.method === 'CRYPTO' ? (
                    <motion.div
                        key="crypto-form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="space-y-6 pt-4 border-t border-gray-100"
                    >
                        <div className="flex gap-2">
                            {(['BTC', 'ETH', 'USDT'] as const).map((coin) => (
                                <button
                                    key={coin}
                                    type="button"
                                    onClick={() => onChange({ ...data, cryptoType: coin })}
                                    className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold text-xs ${data.cryptoType === coin
                                        ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-500 hover:border-orange-200'
                                        }`}
                                >
                                    {coin === 'BTC' ? 'Bitcoin' : coin === 'ETH' ? 'Ethereum' : 'Tether'}
                                </button>
                            ))}
                        </div>

                        {data.cryptoType && (
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center space-y-4 animate-in fade-in duration-300">
                                <div className="flex justify-center mb-2">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                        <Bitcoin className="text-orange-500" size={28} />
                                    </div>
                                </div>
                                <p className="text-gray-900 text-sm font-medium">Envie apenas <span className="text-orange-600 font-bold">{data.cryptoType}</span> para este endereço</p>
                                <div className="p-3 bg-white border border-dashed border-gray-300 rounded-xl font-mono text-[11px] text-gray-700 break-all select-all shadow-inner">
                                    {data.cryptoType === 'BTC' ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' : '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'}
                                </div>
                                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Globe size={12} />
                                        <span>Rede: {data.cryptoType === 'BTC' ? 'Mainnet' : 'ERC-20'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Lock size={12} />
                                        <span>Confirmado em ~10 min</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

export type { PaymentData };
