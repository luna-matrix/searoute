import { useCallback, useState } from 'react'
import styles from './SearchBar.module.css'

/**
 * Floating search bar — top-center, max-width 600px, glass panel.
 *
 * Chunk 3.1: scaffold. Two inputs (Origin, Destination), colored
 * dots showing role, clear button when filled. State is local for
 * now; chunk 3.3 wires it to the MapStore + keyboard navigation,
 * chunk 3.4 adds selection.
 */
export default function SearchBar() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')

  const onClearOrigin = useCallback(() => setOrigin(''), [])
  const onClearDestination = useCallback(() => setDestination(''), [])

  return (
    <div className={styles.bar} role="search">
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
        <input
          type="text"
          className={styles.input}
          placeholder="Origin port"
          aria-label="Origin port"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        {origin && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear origin"
            onClick={onClearOrigin}
          >
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false">
              <path
                d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.divider} />
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.dotDestination}`} aria-hidden="true" />
        <input
          type="text"
          className={styles.input}
          placeholder="Destination port"
          aria-label="Destination port"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        {destination && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear destination"
            onClick={onClearDestination}
          >
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" focusable="false">
              <path
                d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
