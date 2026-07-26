import { BrandMark } from './BrandMark'

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-void-veil backdrop-blur-xl">
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-16">
        <a href="#top" className="flex items-center gap-2.5 rounded-lg" aria-label="PixelFerry — home">
          <BrandMark size={30} />
          <span className="font-display text-[21px] font-bold tracking-[-0.4px] text-white">
            PixelFerry
          </span>
        </a>
      </div>
    </header>
  )
}
