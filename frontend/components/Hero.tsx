'use client'

import { motion } from 'framer-motion'
import FlightSearch from '@/components/FlightSearch'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Hero() {
  const { t } = useLanguage()

  const paymentBadges = [
    { label: t('hero.badge.payment').split(' • ')[0], icon: '₿' },
    { label: t('hero.badge.payment').split(' • ')[1], icon: '💳' },
    { label: t('hero.badge.payment').split(' • ')[2], icon: '⚡' },
    { label: t('hero.badge.payment').split(' • ')[3], icon: '📄' },
    { label: t('hero.badge.support'), icon: '🤝' },
    { label: t('hero.badge.worldwide'), icon: '🌍' },
  ]

  return (
    <section className="relative bg-primary z-20">
      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-6">

        {/* Headline + subtítulo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <h1 className="text-white font-bold text-xl sm:text-3xl md:text-4xl leading-tight mb-4 px-2">
            {t('hero.headline')}
          </h1>


          {/* Selos de pagamento */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {paymentBadges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                <span>{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Card de busca flutuante */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <FlightSearch />
        </motion.div>

      </div>
    </section>
  )
}
