import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Services from '@/components/Services'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'
import FloatingWhatsApp from '@/components/FloatingWhatsApp'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Services />
      <FAQ />
      <Footer />
      <FloatingWhatsApp />
    </main>
  )
}
