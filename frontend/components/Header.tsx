'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Plane, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { SUPPORTED_LANGUAGES, WHATSAPP_NUMBER } from '@/config/constants'

export default function Header() {
  const { language, setLanguage } = useLanguage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <motion.a
            href="/"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 shrink-0"
          >
            <Plane className="w-7 h-7 text-accent" />
            <span className="font-bold text-xl text-accent">Bit Travels</span>
          </motion.a>

          {/* Desktop: idiomas + suporte */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center space-x-1 rounded-lg p-1 bg-white/10">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${language === lang
                      ? 'bg-white text-primary'
                      : 'text-white/70 hover:text-white'
                    }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <motion.a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-accent text-primary px-4 py-2 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Suporte
            </motion.a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden pb-4 border-t border-white/20 mt-2 pt-4"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center space-x-1 rounded-lg p-1 bg-white/10">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setIsMenuOpen(false) }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${language === lang ? 'bg-white text-primary' : 'text-white/70'
                      }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-accent text-primary px-4 py-2 rounded-lg font-semibold text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                <MessageCircle className="w-4 h-4" />
                Suporte
              </a>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  )
}
