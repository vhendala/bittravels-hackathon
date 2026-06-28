'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="border-b border-gray-200">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-4 text-left text-gray-800 font-medium hover:text-primary transition-colors group"
            >
                <span className="pr-4 text-sm sm:text-base">{q}</span>
                <ChevronDown
                    className={`w-4 h-4 shrink-0 text-gray-400 group-hover:text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FAQ() {
    const { t } = useLanguage()

    const faqs = [
        { q: t('faq.q1'), a: t('faq.a1') },
        { q: t('faq.q2'), a: t('faq.a2') },
        { q: t('faq.q3'), a: t('faq.a3') },
        { q: t('faq.q4'), a: t('faq.a4') },
        { q: t('faq.q5'), a: t('faq.a5') },
        { q: t('faq.q6'), a: t('faq.a6') },
        { q: t('faq.q7'), a: t('faq.a7') },
        { q: t('faq.q8'), a: t('faq.a8') },
        { q: t('faq.q9'), a: t('faq.a9') },
        { q: t('faq.q10'), a: t('faq.a10') },
    ]

    // Divide em duas colunas
    const half = Math.ceil(faqs.length / 2)
    const col1 = faqs.slice(0, half)
    const col2 = faqs.slice(half)

    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">
                    {t('faq.title')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16">
                    <div>{col1.map((item, idx) => <FaqItem key={idx} {...item} />)}</div>
                    <div>{col2.map((item, idx) => <FaqItem key={idx} {...item} />)}</div>
                </div>
            </div>
        </section>
    )
}
