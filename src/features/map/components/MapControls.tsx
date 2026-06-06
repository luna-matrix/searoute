import type { BasemapId } from '../lib/basemaps'
import styles from './MapControls.module.css'

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleStyle: () => void
  onToggleView: () => void
  basemap: BasemapId
  perspective: boolean
}

const ZoomInIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const ZoomOutIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M2.5 8h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const LayersIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M8 1.5 1.5 5 8 8.5 14.5 5 8 1.5ZM1.5 8 8 11.5 14.5 8M1.5 11 8 14.5 14.5 11"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

const PerspectiveIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    {on ? (
      <path
        d="M2.5 4 8 1.5 13.5 4 8 6.5 2.5 4ZM2.5 4v3L8 9.5l5.5-2.5V4M2.5 9.5v3L8 15l5.5-2.5v-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    ) : (
      <path
        d="M2.5 4h11v8h-11z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </svg>
)

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onToggleStyle,
  onToggleView,
  basemap,
  perspective,
}: MapControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.group}>
        <button type="button" onClick={onZoomIn} className={styles.button} aria-label="Zoom in">
          <ZoomInIcon />
        </button>
        <button type="button" onClick={onZoomOut} className={styles.button} aria-label="Zoom out">
          <ZoomOutIcon />
        </button>
      </div>
      <div className={styles.group}>
        <button
          type="button"
          onClick={onToggleStyle}
          className={styles.button}
          aria-label={`Switch to ${basemap === 'dark' ? 'satellite' : 'dark'} basemap`}
          aria-pressed={basemap === 'satellite'}
        >
          <LayersIcon />
        </button>
      </div>
      <div className={styles.group}>
        <button
          type="button"
          onClick={onToggleView}
          className={styles.button}
          aria-label={perspective ? 'Switch to flat view' : 'Switch to perspective view'}
          aria-pressed={perspective}
        >
          <PerspectiveIcon on={perspective} />
        </button>
      </div>
    </div>
  )
}
