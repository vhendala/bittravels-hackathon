'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Shield, Wallet, User } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: Shield,
    key: 'security',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Wallet,
    key: 'crypto',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    icon: User,
    key: 'support',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
]

export default function ValueProposition() {
  const { t } = useLanguage()

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-primary mb-16"
        >
          {t('why.title')}
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-accent/30"
              >
                <div className={`w-16 h-16 rounded-xl ${feature.bgColor} flex items-center justify-center mb-6`}>
                  <Icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-4">
                  {t(`why.${feature.key}.title`)}
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {t(`why.${feature.key}.desc`)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}



