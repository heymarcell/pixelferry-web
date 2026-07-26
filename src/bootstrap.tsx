import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'

import './styles/index.css'

/**
 * Shared entry for every page in the multi-page build.
 *
 * `domAnimation` is the small feature bundle (animations + gestures, no
 * drag/layout projection). `strict` fails loudly if a `motion.*` component
 * sneaks in and silently pulls the full bundle back in.
 */
export function mount(children: ReactNode) {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root')

  createRoot(root).render(
    <StrictMode>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </StrictMode>,
  )
}
