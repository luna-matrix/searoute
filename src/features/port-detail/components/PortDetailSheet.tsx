import { useCallback, useEffect, useRef } from 'react'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import styles from './PortDetailSheet.module.css'

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/**
 * Bottom-anchored detail panel. Hidden by default (translateY(100%));
 * slides up when viewingPortId is set in the store. The slide
 * transition uses the duration-slow token, which is zeroed
 * under prefers-reduced-motion, so reduced-motion users see an
 * instant appear/disappear.
 *
 * Two actions: Set as Origin (green) and Set as Destination
 * (red). Both close the sheet and commit to the store.
 */
export default function PortDetailSheet() {
  const viewingPortId = useMapStore((s) => s.viewingPortId)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)
  const setViewingPort = useMapStore((s) => s.setViewingPort)
  const setOrigin = useMapStore((s) => s.setOrigin)
  const setDestination = useMapStore((s) => s.setDestination)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const port: Port | undefined = viewingPortId
    ? PORTS.find((p) => p.id === viewingPortId)
    : undefined

  const isOpen = Boolean(port)
  const isOrigin = port?.id === originId
  const isDestination = port?.id === destinationId

  const onClose = useCallback(() => setViewingPort(null), [setViewingPort])

  const onSetOrigin = useCallback(() => {
    if (!port) return
    setOrigin(port.id)
    setViewingPort(null)
  }, [port, setOrigin, setViewingPort])

  const onSetDestination = useCallback(() => {
    if (!port) return
    setDestination(port.id)
    setViewingPort(null)
  }, [port, setDestination, setViewingPort])

  // Move focus to the close button when the sheet opens so the
  // panel is keyboard-navigable without trapping focus.
  useEffect(() => {
    if (isOpen) {
      // Wait a frame for the slide-in transition to start.
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    }
  }, [isOpen])

  // Escape closes the sheet.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  return (
    <div
      className={`${styles.sheet} ${isOpen ? '' : styles.sheetHidden}`}
      role="dialog"
      aria-label="Port details"
      aria-hidden={!isOpen}
    >
      {port && (
        <>
          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <div className={styles.name}>{port.name}</div>
              <div className={styles.subtitle}>
                {port.country} · {port.region}
              </div>
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.sizeBadge} data-size={port.size}>
                {port.size}
              </span>
              {port.unlocode && <span className={styles.unlocode}>{port.unlocode}</span>}
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.closeButton}
                aria-label="Close port details"
                onClick={onClose}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className={styles.body}>
            <DepthsSection port={port} />
            <VesselSection port={port} />
            <RestrictionsSection port={port} />
            {port.type && <TypeSection type={port.type} />}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionOrigin}`}
              onClick={onSetOrigin}
              disabled={isOrigin}
            >
              {isOrigin ? '✓ Origin' : 'Set as Origin'}
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionDestination}`}
              onClick={onSetDestination}
              disabled={isDestination}
            >
              {isDestination ? '✓ Destination' : 'Set as Destination'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DataItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className={styles.dataItem}>
      <div className={styles.dataLabel}>{label}</div>
      {value !== undefined ? (
        <div className={styles.dataValue}>{value}</div>
      ) : (
        <div className={`${styles.dataValue} ${styles.dataValuePlaceholder}`}>—</div>
      )}
    </div>
  )
}

function DepthsSection({ port }: { port: Port }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Depths</div>
      <div className={styles.dataGrid}>
        <DataItem
          label="Channel"
          value={port.depths.channel !== undefined ? `${port.depths.channel} m` : undefined}
        />
        <DataItem
          label="Anchorage"
          value={port.depths.anchorage !== undefined ? `${port.depths.anchorage} m` : undefined}
        />
        <DataItem
          label="Cargo pier"
          value={port.depths.cargoPier !== undefined ? `${port.depths.cargoPier} m` : undefined}
        />
      </div>
    </div>
  )
}

function VesselSection({ port }: { port: Port }) {
  if (!port.maxVessel) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Max vessel</div>
        <div className={styles.empty}>No published vessel limits.</div>
      </div>
    )
  }
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Max vessel</div>
      <div className={styles.dataGrid}>
        <DataItem
          label="Length"
          value={port.maxVessel.length !== undefined ? `${port.maxVessel.length} m` : undefined}
        />
        <DataItem
          label="Beam"
          value={port.maxVessel.beam !== undefined ? `${port.maxVessel.beam} m` : undefined}
        />
        <DataItem
          label="Draft"
          value={port.maxVessel.draft !== undefined ? `${port.maxVessel.draft} m` : undefined}
        />
        <DataItem
          label="DWT"
          value={
            port.maxVessel.dwt !== undefined
              ? `${port.maxVessel.dwt.toLocaleString()} t`
              : undefined
          }
        />
      </div>
    </div>
  )
}

function RestrictionsSection({ port }: { port: Port }) {
  if (!port.restrictions || port.restrictions.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Restrictions</div>
        <div className={styles.empty}>No published restrictions.</div>
      </div>
    )
  }
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Restrictions</div>
      <div className={styles.restrictionsList}>
        {port.restrictions.map((r) => (
          <span key={r} className={styles.restriction}>
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

function TypeSection({ type }: { type: string }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Primary use</div>
      <div className={styles.dataGrid}>
        <DataItem label="Type" value={type} />
      </div>
    </div>
  )
}
