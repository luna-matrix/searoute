import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  searchPorts,
  suggestCommonDestinations,
  suggestOrigins,
  writeRecentOrigin,
} from '../lib/port-search'
import type { PortSearchResult } from '../lib/port-search'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
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

const PencilIcon = () => (
  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
    <path
      d="M2.5 8.5L1 11l2.5-.5 6.5-6.5-2-2-6.5 6.5z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

type Field = 'origin' | 'destination' | 'waypoint'

export default function SearchBar() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [waypointInput, setWaypointInput] = useState('')
  const [activeField, setActiveField] = useState<Field | null>(null)
  const [results, setResults] = useState<PortSearchResult[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [originEditing, setOriginEditing] = useState(false)
  const [destinationEditing, setDestinationEditing] = useState(false)

  const originRef = useRef<HTMLInputElement>(null)
  const destinationRef = useRef<HTMLInputElement>(null)
  const waypointRef = useRef<HTMLInputElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)
  const setOriginId = useMapStore((s) => s.setOrigin)
  const setDestinationId = useMapStore((s) => s.setDestination)
  const swapOriginDestination = useMapStore((s) => s.swapOriginDestination)
  const setViewingPort = useMapStore((s) => s.setViewingPort)
  const waypointIds = useMapStore((s) => s.waypoints)
  const addWaypoint = useMapStore((s) => s.addWaypoint)
  const removeWaypoint = useMapStore((s) => s.removeWaypoint)
  const setWaypoints = useMapStore((s) => s.setWaypoints)

  const originPort: Port | undefined = originId ? PORTS.find((p) => p.id === originId) : undefined
  const destinationPort: Port | undefined = destinationId
    ? PORTS.find((p) => p.id === destinationId)
    : undefined

  const runSearch = useCallback((q: string) => {
    setResults(searchPorts(q))
  }, [])

  const commonDestinations = useMemo<Port[]>(() => {
    if (activeField !== 'destination') return []
    if (destination.trim().length > 0) return []
    return suggestCommonDestinations(originId)
  }, [activeField, destination, originId])

  const suggestedOrigins = useMemo<Port[]>(() => {
    if (activeField !== 'origin') return []
    if (origin.trim().length > 0) return []
    return suggestOrigins()
  }, [activeField, origin])

  useEffect(() => {
    setHighlightIndex(0)
  }, [results])

  useEffect(() => {
    if (!originId) {
      setOrigin('')
      setOriginEditing(false)
      return
    }
    const p = PORTS.find((x) => x.id === originId)
    setOrigin(p?.name ?? '')
    setOriginEditing(false)
  }, [originId])

  useEffect(() => {
    if (!destinationId) {
      setDestination('')
      setDestinationEditing(false)
      return
    }
    const p = PORTS.find((x) => x.id === destinationId)
    setDestination(p?.name ?? '')
    setDestinationEditing(false)
  }, [destinationId])

  const waypointPorts: Port[] = waypointIds
    .map((id) => PORTS.find((p) => p.id === id))
    .filter((p): p is Port => p !== undefined)

  const commitSelection = useCallback(
    (port: Port) => {
      if (activeField === 'origin') {
        writeRecentOrigin(port.id)
        setOriginId(port.id)
        setOrigin(port.name)
        setOriginEditing(false)
        setActiveField(null)
        setResults([])
        setHighlightIndex(0)
        destinationRef.current?.focus()
      } else if (activeField === 'destination') {
        setDestinationId(port.id)
        setDestination(port.name)
        setDestinationEditing(false)
        setActiveField(null)
        setResults([])
        setHighlightIndex(0)
      } else if (activeField === 'waypoint') {
        if (port.id === originId || port.id === destinationId || waypointIds.includes(port.id)) {
          return
        }
        addWaypoint(port.id)
        setWaypointInput('')
        setResults([])
        setHighlightIndex(0)
        queueMicrotask(() => waypointRef.current?.focus())
      }
    },
    [activeField, setOriginId, setDestinationId, addWaypoint, originId, destinationId, waypointIds],
  )

  const enterEditMode = useCallback((field: 'origin' | 'destination') => {
    if (field === 'origin') {
      setOriginEditing(true)
      setActiveField('origin')
      setResults([])
      setHighlightIndex(0)
      queueMicrotask(() => {
        originRef.current?.focus()
        originRef.current?.select()
      })
    } else {
      setDestinationEditing(true)
      setActiveField('destination')
      setResults([])
      setHighlightIndex(0)
      queueMicrotask(() => {
        destinationRef.current?.focus()
        destinationRef.current?.select()
      })
    }
  }, [])

  const dismissEdit = useCallback(
    (field: 'origin' | 'destination') => {
      const port = field === 'origin' ? originPort : destinationPort
      if (port) {
        if (field === 'origin') setOriginEditing(false)
        else setDestinationEditing(false)
      }
      setActiveField(null)
      setResults([])
      setHighlightIndex(0)
    },
    [originPort, destinationPort],
  )

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

  const onWaypointChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setWaypointInput(v)
      setActiveField('waypoint')
      runSearch(v)
    },
    [runSearch],
  )

  const onKeyDown = useCallback(
    (field: Field) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (results.length === 0) return
        setHighlightIndex((i) => {
          let next = i
          for (let attempt = 0; attempt < results.length; attempt++) {
            next = next + 1 >= results.length ? 0 : next + 1
            const r = results[next]
            if (
              r &&
              r.port.id !== originId &&
              r.port.id !== destinationId &&
              !waypointIds.includes(r.port.id)
            )
              return next
          }
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (results.length === 0) return
        setHighlightIndex((i) => {
          let next = i
          for (let attempt = 0; attempt < results.length; attempt++) {
            next = next - 1 < 0 ? results.length - 1 : next - 1
            const r = results[next]
            if (
              r &&
              r.port.id !== originId &&
              r.port.id !== destinationId &&
              !waypointIds.includes(r.port.id)
            )
              return next
          }
          return next
        })
      } else if (e.key === 'Enter') {
        if (activeField !== field) return
        const r = results[highlightIndex]
        if (r) {
          e.preventDefault()
          commitSelection(r.port)
        }
      } else if (e.key === 'Escape') {
        if (results.length > 0 || activeField === field) {
          e.preventDefault()
          setResults([])
          if (field === 'waypoint') {
            setActiveField(null)
            setWaypointInput('')
            waypointRef.current?.blur()
          } else if (field === 'origin') {
            if (originPort) {
              setOrigin(originPort.name)
              setOriginEditing(false)
            }
            setActiveField(null)
            setHighlightIndex(0)
            originRef.current?.blur()
          } else {
            if (destinationPort) {
              setDestination(destinationPort.name)
              setDestinationEditing(false)
            }
            setActiveField(null)
            setHighlightIndex(0)
            destinationRef.current?.blur()
          }
        }
      } else if (e.key === 'Tab') {
        if (results.length > 0) {
          setResults([])
          setActiveField(null)
          setHighlightIndex(0)
        }
      }
    },
    [
      activeField,
      highlightIndex,
      commitSelection,
      results,
      originPort,
      destinationPort,
      originId,
      destinationId,
      waypointIds,
    ],
  )

  const onFocus = useCallback(
    (field: Field) => () => {
      setActiveField(field)
      const q = field === 'origin' ? origin : field === 'destination' ? destination : waypointInput
      if (q) runSearch(q)
    },
    [origin, destination, waypointInput, runSearch],
  )

  const onClearOrigin = useCallback(() => {
    setOrigin('')
    setOriginId(null)
    setOriginEditing(false)
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [setOriginId])

  const onClearDestination = useCallback(() => {
    setDestination('')
    setDestinationId(null)
    setDestinationEditing(false)
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [setDestinationId])

  const onRemoveWaypoint = useCallback(
    (index: number) => {
      removeWaypoint(index)
    },
    [removeWaypoint],
  )

  const canSwap = Boolean(originId && destinationId)
  const onSwap = useCallback(() => {
    if (!canSwap) return
    swapOriginDestination()
    setOrigin(destination)
    setDestination(origin)
    setOriginEditing(false)
    setDestinationEditing(false)
    const current = useMapStore.getState().waypoints
    setWaypoints([...current].reverse())
    setResults([])
    setActiveField(null)
    setHighlightIndex(0)
  }, [canSwap, destination, origin, swapOriginDestination, setWaypoints])

  const onAddStopClick = useCallback(() => {
    setActiveField('waypoint')
    setWaypointInput('')
    setResults([])
    setHighlightIndex(0)
    queueMicrotask(() => waypointRef.current?.focus())
  }, [])

  return (
    <div ref={barRef} className={styles.bar} role="search">
      {/* ---- Origin ---- */}
      {originPort && !originEditing ? (
        <div
          className={styles.confirmRow}
          role="button"
          tabIndex={0}
          aria-label={`Origin: ${originPort.name}. Click to change.`}
          onClick={() => enterEditMode('origin')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              enterEditMode('origin')
            }
          }}
        >
          <span className={`${styles.dot} ${styles.dotOrigin}`} aria-hidden="true" />
          <div className={styles.confirmContent}>
            <span className={styles.confirmName}>{originPort.name}</span>
            <span className={styles.confirmMeta}>
              {originPort.subdivision ? `${originPort.subdivision} · ` : ''}
              {originPort.country}
              {originPort.region ? ` · ${originPort.region}` : ''}
            </span>
          </div>
          <div className={styles.confirmBadges}>
            {originPort.unlocode && <span className={styles.unlocode}>{originPort.unlocode}</span>}
            <span className={styles.sizeBadge} data-size={originPort.size}>
              {originPort.size}
            </span>
          </div>
          <button
            type="button"
            className={styles.confirmEditIcon}
            aria-label={`Change origin port`}
            onClick={(e) => {
              e.stopPropagation()
              enterEditMode('origin')
            }}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear origin"
            onClick={(e) => {
              e.stopPropagation()
              onClearOrigin()
            }}
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
        </div>
      ) : (
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
            onBlur={() => {
              queueMicrotask(() => dismissEdit('origin'))
            }}
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
      )}

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

      {waypointPorts.map((wp, i) => (
        <div className={styles.waypointRow} key={wp.id}>
          <span className={`${styles.dot} ${styles.dotWaypoint}`} aria-hidden="true" />
          <div className={styles.confirmContent}>
            <span className={styles.waypointName} title={wp.name}>
              {wp.name}
            </span>
            <span className={styles.confirmMeta}>
              {wp.country}
              {wp.region ? ` · ${wp.region}` : ''}
              {wp.unlocode ? ` · ${wp.unlocode}` : ''} · {wp.size}
            </span>
          </div>
          <button
            type="button"
            className={styles.clearButton}
            aria-label={`Remove waypoint ${wp.name}`}
            onClick={() => onRemoveWaypoint(i)}
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
        </div>
      ))}

      {activeField === 'waypoint' && (
        <div className={styles.row}>
          <span className={`${styles.dot} ${styles.dotWaypoint}`} aria-hidden="true" />
          <input
            ref={waypointRef}
            type="text"
            className={styles.input}
            placeholder="Add a stop (port)"
            aria-label="Add a stop"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            value={waypointInput}
            onChange={onWaypointChange}
            onKeyDown={onKeyDown('waypoint')}
            onFocus={onFocus('waypoint')}
          />
        </div>
      )}

      {originId && destinationId && (
        <div className={styles.addStopArea}>
          <button
            type="button"
            className={styles.addStopButton}
            onClick={onAddStopClick}
            aria-label="Add a stop"
          >
            + Add stop
          </button>
        </div>
      )}

      {/* ---- Destination ---- */}
      {destinationPort && !destinationEditing ? (
        <div
          className={styles.confirmRow}
          role="button"
          tabIndex={0}
          aria-label={`Destination: ${destinationPort.name}. Click to change.`}
          onClick={() => enterEditMode('destination')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              enterEditMode('destination')
            }
          }}
        >
          <span className={`${styles.dot} ${styles.dotDestination}`} aria-hidden="true" />
          <div className={styles.confirmContent}>
            <span className={styles.confirmName}>{destinationPort.name}</span>
            <span className={styles.confirmMeta}>
              {destinationPort.subdivision ? `${destinationPort.subdivision} · ` : ''}
              {destinationPort.country}
              {destinationPort.region ? ` · ${destinationPort.region}` : ''}
            </span>
          </div>
          <div className={styles.confirmBadges}>
            {destinationPort.unlocode && (
              <span className={styles.unlocode}>{destinationPort.unlocode}</span>
            )}
            <span className={styles.sizeBadge} data-size={destinationPort.size}>
              {destinationPort.size}
            </span>
          </div>
          <button
            type="button"
            className={styles.confirmEditIcon}
            aria-label={`Change destination port`}
            onClick={(e) => {
              e.stopPropagation()
              enterEditMode('destination')
            }}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear destination"
            onClick={(e) => {
              e.stopPropagation()
              onClearDestination()
            }}
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
        </div>
      ) : (
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
            onBlur={() => {
              queueMicrotask(() => dismissEdit('destination'))
            }}
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
      )}

      {activeField &&
        (results.length > 0 || commonDestinations.length > 0 || suggestedOrigins.length > 0) && (
          <div className={styles.dropdown} role="listbox">
            {suggestedOrigins.length > 0 && (
              <>
                <div className={styles.dropdownSectionLabel}>Suggested origins</div>
                {suggestedOrigins.map((p, i) => {
                  const isDisabled =
                    p.id === originId || p.id === destinationId || waypointIds.includes(p.id)
                  return (
                    <div
                      key={`origin-${p.id}`}
                      role="option"
                      aria-selected={false}
                      aria-disabled={isDisabled}
                      className={`${styles.result} ${isDisabled ? styles.resultDisabled : ''}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                      onMouseDown={(e) => {
                        if (isDisabled) return
                        e.preventDefault()
                        commitSelection(p)
                      }}
                    >
                      <div className={styles.resultMain}>
                        <span className={styles.resultName}>{p.name}</span>
                        <span className={styles.resultCountry}>
                          {p.country} · {p.region}
                        </span>
                      </div>
                      <div className={styles.resultMeta}>
                        <span className={styles.sizeBadge} data-size={p.size}>
                          {p.size}
                        </span>
                        {p.unlocode && <span className={styles.unlocode}>{p.unlocode}</span>}
                      </div>
                    </div>
                  )
                })}
                {commonDestinations.length > 0 && <div className={styles.dropdownDivider} />}
              </>
            )}
            {commonDestinations.length > 0 && (
              <>
                <div className={styles.dropdownSectionLabel}>
                  Common from {originPort?.name ?? 'your origin'}
                </div>
                {commonDestinations.map((p, i) => {
                  const isDisabled =
                    p.id === originId || p.id === destinationId || waypointIds.includes(p.id)
                  return (
                    <div
                      key={`common-${p.id}`}
                      role="option"
                      aria-selected={false}
                      aria-disabled={isDisabled}
                      className={`${styles.result} ${isDisabled ? styles.resultDisabled : ''}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                      onMouseDown={(e) => {
                        if (isDisabled) return
                        e.preventDefault()
                        commitSelection(p)
                      }}
                    >
                      <div className={styles.resultMain}>
                        <span className={styles.resultName}>{p.name}</span>
                        <span className={styles.resultCountry}>
                          {p.country} · {p.region}
                        </span>
                      </div>
                      <div className={styles.resultMeta}>
                        <span className={styles.sizeBadge} data-size={p.size}>
                          {p.size}
                        </span>
                        {p.unlocode && <span className={styles.unlocode}>{p.unlocode}</span>}
                      </div>
                    </div>
                  )
                })}
                {results.length > 0 && <div className={styles.dropdownDivider} />}
              </>
            )}
            {results.map((r, i) => {
              const isDisabled =
                r.port.id === originId ||
                r.port.id === destinationId ||
                waypointIds.includes(r.port.id)
              return (
                <div
                  key={r.port.id}
                  role="option"
                  aria-selected={i === highlightIndex}
                  aria-disabled={isDisabled}
                  className={`${styles.result} ${i === highlightIndex ? styles.resultHighlighted : ''} ${
                    isDisabled ? styles.resultDisabled : ''
                  }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onMouseDown={(e) => {
                    if (isDisabled) return
                    e.preventDefault()
                    commitSelection(r.port)
                  }}
                  onMouseEnter={() => !isDisabled && setHighlightIndex(i)}
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
              )
            })}
          </div>
        )}

      {activeField &&
        (() => {
          const q =
            activeField === 'origin'
              ? origin
              : activeField === 'destination'
                ? destination
                : waypointInput
          if (q.trim().length === 0) return null
          if (results.length > 0 || commonDestinations.length > 0) return null
          return (
            <div className={styles.dropdown}>
              <div className={styles.result}>
                <div className={styles.resultMain}>
                  <span className={styles.resultName}>No ports found</span>
                  <span className={styles.resultCountry}>Try a different search term</span>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}
