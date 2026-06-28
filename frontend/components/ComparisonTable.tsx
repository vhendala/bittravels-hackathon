'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

const comparisonData = [
  {
    feature: 'payment',
    airline: 'card',
    ota: 'cardPix',
    bitmiles: 'all',
    bitmilesHighlight: true,
  },
  {
    feature: 'support',
    airline: 'call',
    ota: 'bots',
    bitmiles: 'concierge',
    bitmilesHighlight: true,
  },
  {
    feature: 'price',
    airline: 'high',
    ota: 'average',
    bitmiles: 'lowest',
    bitmilesHighlight: true,
  },
  {
    feature: 'extras',
    airline: 'none',
    ota: 'none',
    bitmiles: 'included',
    bitmilesHighlight: true,
  },
]

export default function ComparisonTable() {
  const { t, language } = useLanguage()

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-white to-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-primary mb-12"
        >
          {t('comparison.title')}
        </motion.h2>

        <div className="max-w-5xl mx-auto overflow-x-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-6 py-4 text-left font-semibold">{t('comparison.feature')}</th>
                    <th className="px-6 py-4 text-center font-semibold">{t('comparison.airline')}</th>
                    <th className="px-6 py-4 text-center font-semibold">{t('comparison.ota')}</th>
                    <th className="px-6 py-4 text-center font-semibold bg-accent text-primary">
                      {t('comparison.bitmiles')} ⭐
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, index) => (
                    <motion.tr
                      key={row.feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4 font-semibold text-primary">
                        {t(`comparison.${row.feature}`)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {t(`comparison.${row.feature}.${row.airline}`)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {t(`comparison.${row.feature}.${row.ota}`)}
                      </td>
                      <td className={`px-6 py-4 text-center font-bold ${
                        row.bitmilesHighlight
                          ? 'bg-accent/20 text-primary'
                          : 'text-gray-600'
                      }`}>
                        <div className="flex items-center justify-center space-x-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span>{t(`comparison.${row.feature}.${row.bitmiles}`)}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Call to action below table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-xl text-gray-700 mb-6">
            {language === 'en' 
              ? 'Ready to experience the difference?'
              : language === 'pt'
              ? 'Pronto para experimentar a diferença?'
              : '¿Listo para experimentar la diferencia?'}
          </p>
          <motion.a
            href="https://wa.me/+5565999689529"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block bg-accent text-primary px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {t('hero.cta')}
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}

