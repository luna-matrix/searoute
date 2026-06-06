import { useCallback, useEffect, useRef, useState } from 'react'
import { searchPorts } from '../lib/port-search'
import type { PortSearchResult } from '../lib/port-search'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import styles from './SearchBar.module.css'

const SwapIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path
      d="M5.5 4.5L8 2l2.5 2.5M8 2v6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M10.5 11.5L8 14l-2.5-2.5M8 14V8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

/**
 * Floating search bar — top-center, max-width 600px, glass panel.
 *
 * Audit additions (post-Phase 3):
 * - Swap button in the divider area: reverses origin ↔ destination
 *   (atomic store swap + local input swap). Disabled until both are
 *   committed (i.e., the user has actually selected ports, not just
 *   typed queries).
 * - Tab closes the current dropdown before the browser moves focus
 *   to the next field. Without this, the Origin dropdown stayed
 *   open while the user Tabbed to Destination and started typing.
 */
export default function SearchBar() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null)
  const [results, setResults] = useState<PortSearchResult[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)

  const originRef = useRef<HTMLInputElement>(null)
  const destinationRef = useRef<HTMLInputElement>(null)

  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)
  const setOriginId = useMapStore((s) => s.setOrigin)
  const setDestinationId = useMapStore((s) => s.setDestination)
  const swapOriginDestination = useMapStore((s) => s.swapOriginDestination)
  const setViewingPort = useMapStore((s) => s.setViewingPort)

  const runSearch = useCallback((q: string) => {
    setResults(searchPorts(q))
  }, [])

  useEffect(() => {
    setHighlightIndex(0)
  }, [results])

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
      if (activeField === 'origin') {
        setOrigin(port.name)
        setOriginId(port.id)
        setActiveField(null)
        setResults([])
        setHighlightIndex(0)
        // Apple Maps pattern: focus moves to the next field.
        destinationRef.current?.focus()
      } else if (activeField === 'destination') {
        setDestination(port.name)
        setDestinationId(port.id)
        setActiveField(null)
        setResults([])
        setHighlightIndex(0)
        // Closing the dropdown after destination select keeps focus
        // on the destination field for refinement.
      }
    },
    [activeField, setOriginId, setDestinationId],
  )

  const onKeyDown = useCallback(
    (field: 'origin' | 'destination') => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (results.length === 0) return
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (results.length === 0) return
        setHighlightIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        if (activeField !== field) return
        const r = results[highlightIndex]
        if (r) {
          e.preventDefault()
          onSelect(r.port)
        }
      } else if (e.key === 'Escape') {
        if (results.length > 0 || activeField === field) {
          e.preventDefault()
          setResults([])
          setActiveField(null)
          setHighlightIndex(0)
        }
      } else if (e.key === 'Tab') {
        // Close the current dropdown before the browser moves focus
        // to the next field. Without this, the Origin dropdown
        // stayed open while the user Tabbed to Destination.
        if (results.length > 0) {
          setResults([])
          setActiveField(null)
          setHighlightIndex(0)
        }
      }
    },
    [activeField, highlightIndex, onSelect, results],
  )

  const onFocus = useCallback(
    (field: 'origin' | 'destination') => () => {
      setActiveField(field)
      const q = field === 'origin' ? origin : destination
      if (q) runSearch(q)
    },
    [origin, destination, runSearch],
  )

  const onClearOrigin = useCallback(() => {
    setOrigin('')
    setOriginId(null)
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [setOriginId])

  const onClearDestination = useCallback(() => {
    setDestination('')
    setDestinationId(null)
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [setDestinationId])

  const canSwap = Boolean(originId && destinationId)
  const onSwap = useCallback(() => {
    if (!canSwap) return
    // Atomic store swap (single set call) keeps origin and
    // destination in lockstep. The local input values mirror
    // the same swap.
    swapOriginDestination()
    setOrigin(destination)
    setDestination(origin)
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [canSwap, destination, origin, swapOriginDestination])

  return (
    <div className={styles.bar} role="search">
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
        <input
          ref={originRef}
          type="text"
          className={styles.input}
          placeholder="Origin port"
          aria-label="Origin port"
          aria-autocomplete="list"
          aria-expanded={activeField === 'origin' && results.length > 0}
          value={origin}
          onChange={onOriginChange}
          onKeyDown={onKeyDown('origin')}
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
      <div className={styles.swapArea}>
        <button
          type="button"
          className={styles.swapButton}
          onClick={onSwap}
          disabled={!canSwap}
          aria-label="Swap origin and destination"
          title="Swap origin and destination"
        >
          <SwapIcon />
        </button>
      </div>
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.dotDestination}`} aria-hidden="true" />
        <input
          ref={destinationRef}
          type="text"
          className={styles.input}
          placeholder="Destination port"
          aria-label="Destination port"
          aria-autocomplete="list"
          aria-expanded={activeField === 'destination' && results.length > 0}
          value={destination}
          onChange={onDestinationChange}
          onKeyDown={onKeyDown('destination')}
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
          {results.map((r, i) => (
            <div
              key={r.port.id}
              role="option"
              aria-selected={i === highlightIndex}
              className={`${styles.result} ${i === highlightIndex ? styles.resultHighlighted : ''}`}
              // mousedown (not click) so the input doesn't lose focus
              // before the selection commits.
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(r.port)
              }}
              onMouseEnter={() => setHighlightIndex(i)}
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
                <button
                  type="button"
                  className={styles.detailsButton}
                  aria-label={`View details for ${r.port.name}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setViewingPort(r.port.id)
                    setResults([])
                    setActiveField(null)
                    setHighlightIndex(0)
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <circle cx="8" cy="5.5" r="0.9" fill="currentColor" />
                    <path
                      d="M8 8.5v4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
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
