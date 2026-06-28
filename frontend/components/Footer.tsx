'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Instagram, Linkedin, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { WHATSAPP_URL } from '@/config/constants'

// YouTube Icon Component
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

// X (Twitter) Icon Component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Telegram Icon Component
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.193l-1.87 8.803c-.14.625-.52.78-1.05.485l-2.9-2.14-1.4 1.345c-.13.13-.24.24-.49.24l.21-2.98 5.36-4.84c.234-.21-.05-.326-.36-.115l-6.62 4.17-2.85-.89c-.62-.194-.64-.62.13-.93l11.26-4.34c.51-.19.96.12.79.68z" />
  </svg>
)

const socialLinks = [
  { icon: TelegramIcon, href: 'https://t.me/bittravels', label: 'Telegram' },
  { icon: Instagram, href: 'https://www.instagram.com/bittravels', label: 'Instagram' },
  { icon: XIcon, href: 'https://x.com/bittravels', label: 'X' },
  { icon: Linkedin, href: 'https://www.linkedin.com/company/bittravels', label: 'LinkedIn' },
  { icon: YouTubeIcon, href: 'https://www.youtube.com/@bittravels', label: 'YouTube' },
  { icon: MessageCircle, href: WHATSAPP_URL, label: 'WhatsApp' },
]

export default function Footer() {
  const { t, language } = useLanguage()

  return (
    <footer className="bg-primary text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Bit Travels</h3>
            <p className="text-gray-300 text-sm mb-4">
              {t('footer.description')}
            </p>
            <p className="text-gray-300 text-sm">CNPJ 64.440.655/0001-63</p>
          </div>


          {/* Social Media */}
          <div>
            <h4 className="font-semibold mb-4">
              {language === 'en' ? 'Follow Us' : language === 'pt' ? 'Siga-nos' : 'Síguenos'}
            </h4>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-sm text-gray-300">
          <p>
            © 2026 {t('footer.copyright')}. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

