import styles from './MapLegend.module.css'

interface MapLegendProps {
  open: boolean
  onToggleOpen: () => void
  showRoute: boolean
  onToggleRoute: () => void
  showWaypoints: boolean
  onToggleWaypoints: () => void
  showAlongRoutePorts: boolean
  onToggleAlongRoutePorts: () => void
}

export default function MapLegend({
  open,
  onToggleOpen,
  showRoute,
  onToggleRoute,
  showWaypoints,
  onToggleWaypoints,
  showAlongRoutePorts,
  onToggleAlongRoutePorts,
}: MapLegendProps) {
  return (
    <div className={styles.legend}>
      <button
        type="button"
        className={styles.header}
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-controls="map-legend-body"
      >
        <span className={styles.title}>Legend</span>
        <span className={styles.chevron}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div id="map-legend-body" className={styles.body}>
          <button
            type="button"
            className={`${styles.item} ${showRoute ? styles.itemActive : ''}`}
            onClick={onToggleRoute}
            aria-pressed={showRoute}
          >
            <span className={`${styles.swatch} ${styles.swatchRoute}`} />
            <span>Route</span>
          </button>
          <button
            type="button"
            className={`${styles.item} ${showWaypoints ? styles.itemActive : ''}`}
            onClick={onToggleWaypoints}
            aria-pressed={showWaypoints}
          >
            <span className={`${styles.swatch} ${styles.swatchWaypoint}`} />
            <span>Waypoints</span>
          </button>
          <button
            type="button"
            className={`${styles.item} ${showAlongRoutePorts ? styles.itemActive : ''}`}
            onClick={onToggleAlongRoutePorts}
            aria-pressed={showAlongRoutePorts}
          >
            <span className={`${styles.swatch} ${styles.swatchAlong}`} />
            <span>Along-route ports</span>
          </button>
        </div>
      )}
    </div>
  )
}
