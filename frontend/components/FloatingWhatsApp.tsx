'use client'

import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { WHATSAPP_URL } from '@/config/constants'

export default function FloatingWhatsApp() {
  return (
    <motion.a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 bg-accent text-primary w-16 h-16 rounded-full shadow-2xl flex items-center justify-center hover:bg-accent/90 transition-colors group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-8 h-8" />
      <motion.span
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-accent opacity-30"
      />
    </motion.a>
  )
}

