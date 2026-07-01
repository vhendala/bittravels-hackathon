'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Lock, FileCheck, Undo2, Users, Plane, Wallet, ArrowRight } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'
import { useLanguage } from '@/contexts/LanguageContext'
import { WHATSAPP_URL } from '@/config/constants'

// Curva de saída exponencial — sem bounce, sem elastic.
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export default function B2BPage() {
  const { t } = useLanguage()

  const problems = [
    { icon: Users, title: t('b2b.problem.traveler.title'), desc: t('b2b.problem.traveler.desc') },
    { icon: Plane, title: t('b2b.problem.agency.title'), desc: t('b2b.problem.agency.desc') },
    { icon: Wallet, title: t('b2b.problem.consolidator.title'), desc: t('b2b.problem.consolidator.desc') },
  ]

  const steps = [
    { icon: Lock, title: t('b2b.how.step1.title'), desc: t('b2b.how.step1.desc') },
    { icon: FileCheck, title: t('b2b.how.step2.title'), desc: t('b2b.how.step2.desc') },
    { icon: ShieldCheck, title: t('b2b.how.step3.title'), desc: t('b2b.how.step3.desc') },
    { icon: Undo2, title: t('b2b.how.step4.title'), desc: t('b2b.how.step4.desc') },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero — foto de voo ao golden hour com scrim navy, identidade Bit Travels */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <Image
          src="/images/hero-flight.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[70%_50%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/40 to-transparent" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="inline-block text-accent text-xs sm:text-sm font-semibold uppercase tracking-widest mb-4"
            >
              {t('b2b.hero.eyebrow')}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: EASE_OUT_EXPO }}
              className="text-white font-extrabold leading-[1.05] tracking-tight mb-5 break-words"
              style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3.25rem)' }}
            >
              {t('b2b.hero.headline')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: EASE_OUT_EXPO }}
              className="text-white/85 text-base sm:text-lg leading-relaxed mb-8 max-w-[42ch]"
            >
              {t('b2b.hero.subheadline')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: EASE_OUT_EXPO }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Link
                href="/"
                className="group inline-flex items-center justify-center gap-2 bg-accent text-primary px-6 py-3 text-sm sm:text-base font-semibold transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('b2b.hero.ctaPrimary')}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/40 text-white px-6 py-3 text-sm sm:text-base font-semibold transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('b2b.hero.ctaSecondary')}
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problema — manchete à esquerda, lista à direita */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <motion.span
                initial={{ opacity: 0, y: -8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                className="inline-block text-accent text-xs sm:text-sm font-semibold uppercase tracking-widest mb-4"
              >
                {t('b2b.problem.eyebrow')}
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.05, ease: EASE_OUT_EXPO }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-primary"
              >
                {t('b2b.problem.title')}
              </motion.h2>
            </div>

            <div className="lg:col-span-7 divide-y divide-gray-300">
              {problems.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_OUT_EXPO }}
                  className="flex items-start gap-5 py-6 first:pt-0 last:pb-0"
                >
                  <span className="text-2xl font-extrabold text-accent leading-none shrink-0 pt-1">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <p.icon className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
                      <h3 className="text-lg font-bold text-primary">{p.title}</h3>
                    </div>
                    <p className="text-base text-gray-600 leading-relaxed max-w-[48ch]">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona — sequência conectada por uma linha */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary mb-14"
          >
            {t('b2b.how.title')}
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-16 gap-y-20">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_OUT_EXPO }}
              >
                <div className="relative flex items-center mb-6">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 left-10 -translate-y-1/2 w-[calc(100%+4rem)] h-px bg-gray-200" aria-hidden />
                  )}
                  <div className="relative z-10 w-10 h-10 rounded-full border-2 border-accent bg-white flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {i + 1}
                  </div>
                </div>
                <s.icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.75} />
                <h3 className="text-lg font-bold text-primary mb-2">{s.title}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-16 max-w-md">
            {t('b2b.how.paymentNote')}
          </p>
        </div>
      </section>

      {/* Confiança / Compliance — eyebrow + título à esquerda, corpo à direita */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <ShieldCheck className="w-8 h-8 text-accent mb-4" strokeWidth={1.5} />
              <span className="block text-accent text-xs sm:text-sm font-semibold uppercase tracking-widest mb-3">
                {t('b2b.trust.eyebrow')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-primary">
                {t('b2b.trust.title')}
              </h2>
            </div>
            <p className="lg:col-span-7 text-base sm:text-lg text-gray-600 leading-relaxed lg:pt-12">
              {t('b2b.trust.body')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA final — bookend navy com o hero, peso visual forte para fechar a página */}
      <section className="relative bg-primary overflow-hidden">
        <Plane className="absolute -right-4 -bottom-4 w-48 h-48 text-white/5 rotate-[20deg] pointer-events-none" strokeWidth={1} />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            <div className="lg:col-span-8">
              <span className="inline-block text-accent text-xs sm:text-sm font-semibold uppercase tracking-widest mb-4">
                {t('b2b.cta.eyebrow')}
              </span>
              <h2 className="text-white font-extrabold tracking-tight leading-tight mb-5 text-3xl sm:text-4xl lg:text-5xl">
                {t('b2b.cta.title')}
              </h2>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-[50ch]">
                {t('b2b.cta.body')}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col items-stretch gap-3">
              <Link
                href="/"
                className="group inline-flex items-center justify-center gap-2 bg-accent text-primary px-6 py-4 text-base font-bold transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('b2b.hero.ctaPrimary')}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-6 py-4 text-base font-bold transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {t('b2b.cta.whatsapp')}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
    </div>
  )
}
