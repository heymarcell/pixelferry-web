/**
 * The PixelFerry compact mark (Pencil component `Brand/CompactMark`).
 * The glyph is authored on a 68×73 grid and stretched into a slightly
 * narrower box by the design, so `preserveAspectRatio` stays off.
 */
export function BrandMark({ size = 30, radius = 8 }: { size?: number; radius?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center bg-brand"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow:
          'inset 0 0 0 1px #FFFFFF24, 0 2px 4px #0000000D, 0 6px 14px #00000012',
      }}
    >
      {/* The 30-unit viewBox keeps the glyph's inset proportional at any size. */}
      <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
        <svg x={8} y={7} width={14} height={15.8} viewBox="0 0 68 73" preserveAspectRatio="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 0h34c4 0 7 2 10 5l19 17c3 2 3 6 0 9l-19 17c-3 3-6 5-10 5h-16v20h-18z m18 18h19.5c4 0 7 3 7 7v3c0 4-3 7-7 7h-19.5z"
            fill="#fff"
          />
        </svg>
      </svg>
    </span>
  )
}

/** The flat monochrome "P" used inside the app-window chrome. */
export function HeaderMark({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={20}
      height={23}
      viewBox="0 0 68 73"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0h34c4 0 7 2 10 5l19 17c3 2 3 6 0 9l-19 17c-3 3-6 5-10 5h-16v20h-18z m18 18h19.5c4 0 7 3 7 7v3c0 4-3 7-7 7h-19.5z"
        fill="currentColor"
      />
    </svg>
  )
}
