'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Star, Quote } from 'lucide-react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'Gustavo Tsutsui',
    location: 'Rio de Janeiro, Brasil',
    rating: 5,
    text: {
      en: 'Bit Travels saved me over R$ 800 on my trip to Rio de Janeiro! The personalized support was incredible - they handled everything from check-in to flight monitoring. Best travel experience ever!',
      pt: 'Bit Travels me economizou mais de R$ 800 na minha viagem para Rio de Janeiro! O suporte personalizado foi incrível - eles cuidaram de tudo, desde o check-in até o monitoramento do voo. Melhor experiência de viagem!',
      es: '¡Bit Travels me ahorró más de R$ 800 en mi viaje a Río de Janeiro! El soporte personalizado fue increíble: se encargaron de todo, desde el check-in hasta el monitoreo del vuelo. ¡La mejor experiencia de viaje!',
    },
  },
  {
    name: 'Patricia da Silva',
    location: 'Maceió, Brasil',
    rating: 5,
    text: {
      en: 'I was skeptical about paying with crypto, but Bit Travels made it simple. The prices were unbeatable, and having a real person help me throughout the journey gave me complete peace of mind.',
      pt: 'Eu estava cética sobre pagar com cripto, mas Bit Travels tornou tudo simples. Os preços eram imbatíveis, e ter uma pessoa real me ajudando durante toda a viagem me deu total tranquilidade.',
      es: 'Era escéptica sobre pagar con cripto, pero Bit Travels lo hizo simple. Los precios eran imbatibles, y tener una persona real ayudándome durante todo el viaje me dio total tranquilidad.',
    },
  },
  {
    name: 'Karina de Moura',
    location: 'Portugal',
    rating: 5,
    text: {
      en: 'The multilingual support is amazing! They speak Spanish, English, and Portuguese fluently. Plus, the miles-based pricing means I can travel more often. Highly recommended!',
      pt: 'O suporte multilíngue é incrível! Eles falam espanhol, inglês e português fluentemente. Além disso, os preços baseados em milhas significam que posso viajar com mais frequência. Altamente recomendado!',
      es: '¡El soporte multilingüe es increíble! Hablan español, inglés y portugués con fluidez. Además, los precios basados en millas significan que puedo viajar con más frecuencia. ¡Altamente recomendado!',
    },
  },
]

export default function Testimonials() {
  const { t, language } = useLanguage()

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-primary mb-12"
        >
          {t('testimonials.title')}
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -5 }}
              className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100"
            >
              <Quote className="w-10 h-10 text-accent mb-4 opacity-50" />
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text[language]}"
              </p>
              <div>
                <p className="font-semibold text-primary">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.location}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

