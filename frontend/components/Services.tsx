'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Plane, Hotel, Shield, MapPin, Car, Ship } from 'lucide-react'
import { motion } from 'framer-motion'

const services = [
  { icon: Plane, key: 'flights' },
  { icon: Hotel, key: 'hotels' },
  { icon: Shield, key: 'insurance' },
  { icon: MapPin, key: 'tours' },
  { icon: Car, key: 'car' },
  { icon: Ship, key: 'cruises' },
]

export default function Services() {
  const { t } = useLanguage()

  return (
    <section className="relative py-12 bg-white z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-primary border border-primary/10 shadow-md rounded-xl p-5 transition-all"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center transition-colors">
                    <Icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-semibold text-white text-sm sm:text-base">
                    {t(`services.${service.key}`)}
                  </h3>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Botão WhatsApp */}
        <div className="flex justify-center mt-10">
          <motion.a
            href="https://wa.me/5565999299529"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-primary font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all text-base"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.031-.967-.273-.099-.472-.148-.67.15-.197.297-.768.967-.94 1.165-.173.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.612-.916-2.209-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.118 1.529 5.845L.057 23.486a.5.5 0 00.611.61l5.757-1.505A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.873 9.873 0 01-5.034-1.378l-.36-.214-3.733.977.998-3.645-.235-.374A9.863 9.863 0 012.118 12C2.118 6.534 6.534 2.118 12 2.118S21.882 6.534 21.882 12 17.466 21.882 12 21.882z" />
            </svg>
            {t('hero.cta')}
          </motion.a>
        </div>
      </div>
    </section>
  )
}
