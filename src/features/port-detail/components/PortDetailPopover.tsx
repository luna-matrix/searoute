import { useEffect, useRef } from 'react'
import type { Port } from '@/types/port'
import styles from './PortDetailPopover.module.css'

interface PortDetailPopoverProps {
  port: Port
  /** Picked screen x in CSS pixels (deck.gl info.x). */
  screenX: number
  /** Picked screen y in CSS pixels (deck.gl info.y). */
  screenY: number
  /** Canvas dimensions in CSS pixels, used for edge-flip. */
  canvasWidth: number
  canvasHeight: number
  isOrigin: boolean
  isDestination: boolean
  isWaypoint: boolean
  /** True when an origin and destination are already committed
   *  (so the "Add as waypoint" action makes sense). */
  canAddWaypoint: boolean
  onSetOrigin: (port: Port) => void
  onSetDestination: (port: Port) => void
  onAddWaypoint: (port: Port) => void
  onViewDetails: (port: Port) => void
  /** Cancels the hover-dismiss timer. The popover stays open
   *  while the mouse is over it. */
  onMouseEnter?: () => void
  /** Re-starts the hover-dismiss timer. The popover hides
   *  shortly after the mouse leaves (so brief exit-re-entry
   *  still keeps it visible). */
  onMouseLeave?: () => void
}

const POPOVER_WIDTH = 280
const POPOVER_HEIGHT_ESTIMATE = 240
const CURSOR_OFFSET = 14

/**
 * Richer hover popover for port markers — supersedes the simple
 * name+country tooltip from chunk 2.2. Shows size, region, UN/LOCODE,
 * and the Set-as-* actions plus a "View full details" link that
 * opens the PortDetailSheet.
 *
 * Phase 5: gains an "Add as waypoint" action when origin +
 * destination are both set (otherwise the waypoint is meaningless).
 *
 * Positioned at the deck.gl pick point (info.x / info.y), with edge
 * flip so it stays inside the canvas.
 */
export default function PortDetailPopover({
  port,
  screenX,
  screenY,
  canvasWidth,
  canvasHeight,
  isOrigin,
  isDestination,
  isWaypoint,
  canAddWaypoint,
  onSetOrigin,
  onSetDestination,
  onAddWaypoint,
  onViewDetails,
  onMouseEnter,
  onMouseLeave,
}: PortDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // After mount, if the popover clipped, nudge.
    if (rect.right > window.innerWidth) {
      el.style.maxWidth = `${window.innerWidth - 16}px`
    }
  }, [port.id])

  // Flip horizontally if the popover would overflow the right edge.
  const left =
    screenX + CURSOR_OFFSET + POPOVER_WIDTH > canvasWidth
      ? Math.max(8, screenX - CURSOR_OFFSET - POPOVER_WIDTH)
      : screenX + CURSOR_OFFSET
  // Flip vertically if it would overflow the bottom edge.
  const top =
    screenY + CURSOR_OFFSET + POPOVER_HEIGHT_ESTIMATE > canvasHeight
      ? Math.max(8, screenY - CURSOR_OFFSET - POPOVER_HEIGHT_ESTIMATE)
      : screenY + CURSOR_OFFSET

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={{ left, top }}
      role="tooltip"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.name}>{port.name}</div>
      <div className={styles.subtitle}>
        {port.country} · {port.region}
      </div>
      <div className={styles.metaRow}>
        <span className={styles.sizeBadge} data-size={port.size}>
          {port.size}
        </span>
        {port.unlocode && <span className={styles.unlocode}>{port.unlocode}</span>}
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionOrigin}`}
          onClick={() => onSetOrigin(port)}
          disabled={isOrigin}
        >
          {isOrigin ? '✓ Origin' : 'Set as Origin'}
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionDestination}`}
          onClick={() => onSetDestination(port)}
          disabled={isDestination}
        >
          {isDestination ? '✓ Destination' : 'Set as Destination'}
        </button>
      </div>
      {canAddWaypoint && (
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionWaypoint}`}
          onClick={() => onAddWaypoint(port)}
          disabled={isWaypoint}
        >
          {isWaypoint ? '✓ Waypoint' : '+ Add as waypoint'}
        </button>
      )}
      <button type="button" className={styles.viewDetails} onClick={() => onViewDetails(port)}>
        View full details →
      </button>
    </div>
  )
}
