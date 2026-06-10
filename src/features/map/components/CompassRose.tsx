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
 *
 * Design: fleur-de-lis N marker (traditional nautical convention),
 * tick marks at 15° intervals, cardinal letters for N/E/S/W.
 */
export default function CompassRose({ bearing }: CompassRoseProps) {
  return (
    <div className={styles.container} aria-label="Compass rose" role="img">
      <svg
        viewBox="0 0 60 60"
        className={styles.compass}
        style={{ transform: `rotate(${-bearing}deg)` }}
      >
        {/* Outer ring */}
        <circle
          cx="30"
          cy="30"
          r="28"
          fill="none"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.5"
          opacity="0.7"
        />
        {/* Inner ring */}
        <circle
          cx="30"
          cy="30"
          r="22"
          fill="none"
          stroke="var(--color-fog-grey)"
          strokeWidth="0.3"
          opacity="0.4"
        />

        {/* Tick marks at 15° intervals */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = i * 15
          const isCardinal = angle % 90 === 0
          const isOrdinal = angle % 45 === 0 && !isCardinal
          const r1 = isCardinal ? 24 : isOrdinal ? 25 : 26
          const r2 = 28
          const rad = (angle * Math.PI) / 180
          const x1 = 30 + r1 * Math.sin(rad)
          const y1 = 30 - r1 * Math.cos(rad)
          const x2 = 30 + r2 * Math.sin(rad)
          const y2 = 30 - r2 * Math.cos(rad)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-fog-grey)"
              strokeWidth={isCardinal ? 0.8 : isOrdinal ? 0.5 : 0.3}
              opacity={isCardinal ? 0.8 : isOrdinal ? 0.5 : 0.3}
            />
          )
        })}

        {/* N — fleur-de-lis (traditional nautical north marker) */}
        <path
          d="M30 4 L28 14 L26 10 L25 14 L23.5 8 L24 15 L22 12 L24.5 17 L30 6 L35.5 17 L38 12 L36 15 L36.5 8 L35 14 L33.5 10 L32 14 Z"
          fill="var(--color-starboard-green)"
          stroke="none"
        />
        {/* N arrow body */}
        <polygon points="30,6 27,30 33,30" fill="var(--color-starboard-green)" opacity="0.9" />

        {/* E, S, W — outlined arrows */}
        <polygon points="54,30 30,27 30,33" fill="var(--color-fog-grey)" opacity="0.5" />
        <polygon points="30,54 27,30 33,30" fill="var(--color-fog-grey)" opacity="0.5" />
        <polygon points="6,30 30,27 30,33" fill="var(--color-fog-grey)" opacity="0.5" />

        {/* NE, SE, SW, NW — smaller, subtler */}
        <polygon points="47,13 30,28 31,27" fill="var(--color-fog-grey)" opacity="0.2" />
        <polygon points="47,47 31,32 30,33" fill="var(--color-fog-grey)" opacity="0.2" />
        <polygon points="13,47 30,32 29,33" fill="var(--color-fog-grey)" opacity="0.2" />
        <polygon points="13,13 29,28 30,27" fill="var(--color-fog-grey)" opacity="0.2" />

        {/* Cardinal letters */}
        <text
          x="30"
          y="20"
          textAnchor="middle"
          fontSize="6"
          fill="var(--color-sea-spray)"
          fontWeight="600"
          fontFamily="var(--font-family-ui)"
        >
          N
        </text>
        <text
          x="44"
          y="32"
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-fog-grey)"
          fontWeight="500"
          fontFamily="var(--font-family-ui)"
          opacity="0.7"
        >
          E
        </text>
        <text
          x="30"
          y="46"
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-fog-grey)"
          fontWeight="500"
          fontFamily="var(--font-family-ui)"
          opacity="0.7"
        >
          S
        </text>
        <text
          x="16"
          y="32"
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-fog-grey)"
          fontWeight="500"
          fontFamily="var(--font-family-ui)"
          opacity="0.7"
        >
          W
        </text>

        {/* Center dot */}
        <circle cx="30" cy="30" r="1.6" fill="var(--color-admiralty-signal)" />
      </svg>
    </div>
  )
}
