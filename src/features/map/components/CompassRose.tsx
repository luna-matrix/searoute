import styles from './CompassRose.module.css'

interface CompassRoseProps {
  /** Map bearing in degrees (0 = north up). The compass counter-rotates
   *  so the N pointer always points to true north. */
  bearing: number
}

/**
 * A nautical compass rose anchored to the top-right of the map.
 * Renders as inline SVG inside a glass-panel disc. The whole
 * disc counter-rotates by `bearing` so true north always sits
 * at 12 o'clock from the user's perspective.
 */
export default function CompassRose({ bearing }: CompassRoseProps) {
  return (
    <div className={styles.container} aria-label="Compass rose" role="img">
      <svg
        viewBox="0 0 60 60"
        className={styles.compass}
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        <circle
          cx="30"
          cy="30"
          r="28"
          fill="none"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.6"
        />
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="none"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.3"
          opacity="0.6"
        />

        {/* N — primary, starboard green */}
        <polygon points="30,5 26,30 34,30" fill="var(--color-starboard-green)" />
        {/* E, S, W — outlined, fog grey */}
        <polygon points="55,30 30,26 30,34" fill="var(--color-fog-grey)" opacity="0.7" />
        <polygon points="30,55 26,30 34,30" fill="var(--color-fog-grey)" opacity="0.7" />
        <polygon points="5,30 30,26 30,34" fill="var(--color-fog-grey)" opacity="0.7" />

        {/* Diagonal hash marks */}
        <line
          x1="46"
          y1="14"
          x2="50"
          y2="10"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.4"
          opacity="0.5"
        />
        <line
          x1="46"
          y1="46"
          x2="50"
          y2="50"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.4"
          opacity="0.5"
        />
        <line
          x1="14"
          y1="46"
          x2="10"
          y2="50"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.4"
          opacity="0.5"
        />
        <line
          x1="14"
          y1="14"
          x2="10"
          y2="10"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.4"
          opacity="0.5"
        />

        <text
          x="30"
          y="17"
          textAnchor="middle"
          fontSize="7"
          fill="var(--color-sea-spray)"
          fontWeight="600"
          fontFamily="var(--font-family-ui)"
        >
          N
        </text>

        <circle cx="30" cy="30" r="1.6" fill="var(--color-admiralty-signal)" />
      </svg>
    </div>
  )
}
