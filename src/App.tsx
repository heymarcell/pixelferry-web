import { CookieConsent } from './components/CookieConsent'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { ProductStage } from './components/ProductStage'
import { PromiseStrip } from './components/PromiseStrip'

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:bg-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/*
        The page-wide glow. Pencil authors it as a radial fill on the root frame
        with the gradient *diameters* at 120%/80%; CSS takes radii, so those
        halve to 60%/40%.
      */}
      <div className="relative min-h-dvh bg-void bg-[image:radial-gradient(ellipse_60%_40%_at_50%_16%,#173B8F_0%,#090B12_100%)]">
        <Nav />
        <main id="main">
          <Hero />
          <ProductStage />
          <PromiseStrip />
        </main>
        <Footer />
      </div>

      {/* Renders nothing until VITE_GTM_ID / VITE_META_PIXEL_ID are configured. */}
      <CookieConsent />
    </>
  )
}
