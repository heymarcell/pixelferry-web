/**
 * The three blurred colour streaks behind the hero (Pencil: `Atmospheric Light
 * Streak`). Authored on a 1440×660 canvas, so every offset is expressed as a
 * percentage of that frame and scales with the viewport.
 *
 * Pencil rotates counter-clockwise around the top-left corner; CSS rotates
 * clockwise, hence the negated angles and `transform-origin: top left`.
 */
const streaks = [
  { color: '#0062FF', x: 80, y: 120, w: 820, rotate: -7, sway: 1.5, shift: '26px', duration: 21 },
  { color: '#4F46E5', x: 690, y: 245, w: 620, rotate: 6, sway: -1.5, shift: '-22px', duration: 26 },
  { color: '#10B981', x: 100, y: 420, w: 580, rotate: -5, sway: 1.2, shift: '18px', duration: 24 },
]

export function LightStreaks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {streaks.map(({ color, x, y, w, rotate, sway, shift, duration }, i) => (
        <span
          key={i}
          className="absolute h-[5px] rounded-full opacity-35 blur-[42px] will-change-transform motion-safe:animate-[drift_var(--streak-duration)_ease-in-out_infinite]"
          style={
            {
              backgroundColor: color,
              left: `${(x / 1440) * 100}%`,
              top: `${(y / 660) * 100}%`,
              width: `${(w / 1440) * 100}%`,
              transformOrigin: 'top left',
              transform: `rotate(${rotate}deg)`,
              '--streak-rotate': `${rotate}deg`,
              '--streak-sway': `${sway}deg`,
              '--streak-shift': shift,
              '--streak-duration': `${duration}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
