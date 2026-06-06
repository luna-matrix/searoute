import { useCallback, useState } from 'react'
import { searchPorts } from '../lib/port-search'
import type { PortSearchResult } from '../lib/port-search'
import type { Port } from '@/types/port'
import styles from './SearchBar.module.css'

/**
 * Floating search bar — top-center, max-width 600px, glass panel.
 *
 * Chunk 3.2: live fuzzy search with a results dropdown below the
 * active input. fuzzysort powers the ranking; matched characters
 * are highlighted in the result rows. Selection (Enter / click)
 * just logs the port for now — chunk 3.3 wires keyboard nav and
 * the store; chunk 3.4 wires origin/destination.
 */
export default function SearchBar() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null)
  const [results, setResults] = useState<PortSearchResult[]>([])

  const runSearch = useCallback((q: string) => {
    setResults(searchPorts(q))
  }, [])

  const onOriginChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setOrigin(v)
      setActiveField('origin')
      runSearch(v)
    },
    [runSearch],
  )

  const onDestinationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setDestination(v)
      setActiveField('destination')
      runSearch(v)
    },
    [runSearch],
  )

  const onSelect = useCallback(
    (port: Port) => {
      // Chunk 3.3 will commit to the store + fly to the port.
      // For 3.2 we just fill the input and close the dropdown.
      if (activeField === 'origin') {
        setOrigin(port.name)
      } else if (activeField === 'destination') {
        setDestination(port.name)
      }
      setResults([])
      setActiveField(null)
    },
    [activeField],
  )

  const onFocus = useCallback(
    (field: 'origin' | 'destination') => () => {
      setActiveField(field)
      runSearch(field === 'origin' ? origin : destination)
    },
    [origin, destination, runSearch],
  )

  const onClearOrigin = useCallback(() => {
    setOrigin('')
    setResults([])
    setActiveField(null)
  }, [])
  const onClearDestination = useCallback(() => {
    setDestination('')
    setResults([])
    setActiveField(null)
  }, [])

  return (
    <div className={styles.bar} role="search">
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
        <input
          type="text"
          className={styles.input}
          placeholder="Origin port"
          aria-label="Origin port"
          aria-autocomplete="list"
          aria-expanded={activeField === 'origin' && results.length > 0}
          value={origin}
          onChange={onOriginChange}
          onFocus={onFocus('origin')}
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
          aria-autocomplete="list"
          aria-expanded={activeField === 'destination' && results.length > 0}
          value={destination}
          onChange={onDestinationChange}
          onFocus={onFocus('destination')}
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

      {activeField && results.length > 0 && (
        <div className={styles.dropdown} role="listbox">
          {results.map((r) => (
            <div
              key={r.port.id}
              role="option"
              aria-selected="false"
              className={styles.result}
              // mousedown (not click) so the input doesn't lose focus
              // before the selection commits.
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(r.port)
              }}
            >
              <div className={styles.resultMain}>
                <span
                  className={styles.resultName}
                  dangerouslySetInnerHTML={{ __html: r.nameHtml }}
                />
                <span
                  className={styles.resultCountry}
                  dangerouslySetInnerHTML={{ __html: r.countryHtml }}
                />
              </div>
              <div className={styles.resultMeta}>
                <span className={styles.sizeBadge} data-size={r.port.size}>
                  {r.port.size}
                </span>
                {r.port.unlocode && <span className={styles.unlocode}>{r.port.unlocode}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
