import type { BasemapId } from '../lib/basemaps'
import type { ThemeMode, ThemePreference } from '../hooks/useTheme'
import styles from './MapControls.module.css'

export type Projection = 'globe' | 'flat'

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onCycleBasemap: () => void
  onToggleView: () => void
  onToggleProjection: () => void
  onSetThemePreference: (next: ThemePreference) => void
  onOpenSettings: () => void
  basemap: BasemapId
  perspective: boolean
  projection: Projection
  theme: ThemeMode
  themePreference: ThemePreference
  settingsOpen: boolean
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

/** Sun — shown in dark theme, "click to switch to light". */
const SunIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path
      d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

/** Moon — shown in light theme, "click to switch to dark". */
const MoonIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

/** Globe — shown when the active projection is flat, "click to switch to globe". */
const GlobeIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <ellipse cx="8" cy="8" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

/** Flat map — shown when the active projection is globe, "click to switch to flat". */
const FlatIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <rect
      x="1.5"
      y="3"
      width="13"
      height="10"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M1.5 6h13M1.5 10h13M5 3v10M11 3v10"
      stroke="currentColor"
      strokeWidth="1"
      fill="none"
    />
  </svg>
)

const GearIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path
      d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M12.2 4.8 13.5 6l-.7 1.2M3.2 8.8 2.5 7.5l.7-1.2M12.2 11.2l1.3 1.2-.7 1.2M3.2 4.8 1.9 3.6l.7-1.2M4.8 3.2 6 1.9l1.2.7M8.8 13.5l1.2 1.3 1.2-.7M4.8 12.8l-1.2 1.3-1.2-.7M11.2 3.2l1.2-1.3 1.2.7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

const BASEMAP_NEXT_LABEL: Record<BasemapId, string> = {
  dark: 'light',
  light: 'satellite',
  satellite: 'dark',
}

const BASEMAP_NEXT_DISPLAY: Record<BasemapId, string> = {
  dark: 'Light',
  light: 'Satellite',
  satellite: 'Dark',
}

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onCycleBasemap,
  onToggleView,
  onToggleProjection,
  onSetThemePreference,
  onOpenSettings,
  basemap,
  perspective,
  projection,
  theme,
  themePreference,
  settingsOpen,
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
          onClick={onCycleBasemap}
          className={styles.button}
          aria-label={`Switch to ${BASEMAP_NEXT_DISPLAY[basemap]} basemap`}
          aria-pressed={basemap === 'satellite'}
          title={`Basemap: ${basemap} (click for ${BASEMAP_NEXT_LABEL[basemap]})`}
        >
          <LayersIcon />
        </button>
      </div>
      <div className={styles.group}>
        <button
          type="button"
          onClick={onToggleProjection}
          className={styles.button}
          aria-label={`Switch to ${projection === 'globe' ? 'flat' : 'globe'} projection`}
          aria-pressed={projection === 'globe'}
          title={`Projection: ${projection} (click to switch)`}
        >
          {projection === 'globe' ? <FlatIcon /> : <GlobeIcon />}
        </button>
      </div>
      <div className={`${styles.group} ${styles.choiceGroup}`} aria-label="Theme mode">
        <button
          type="button"
          onClick={() => onSetThemePreference('dark')}
          className={`${styles.choiceButton} ${themePreference === 'dark' ? styles.choiceButtonActive : ''}`}
          aria-pressed={themePreference === 'dark'}
          title="Dark theme"
        >
          <MoonIcon />
        </button>
        <button
          type="button"
          onClick={() => onSetThemePreference('light')}
          className={`${styles.choiceButton} ${themePreference === 'light' ? styles.choiceButtonActive : ''}`}
          aria-pressed={themePreference === 'light'}
          title="Light theme"
        >
          <SunIcon />
        </button>
        <button
          type="button"
          onClick={() => onSetThemePreference('system')}
          className={`${styles.choiceButton} ${themePreference === 'system' ? styles.choiceButtonActive : ''}`}
          aria-pressed={themePreference === 'system'}
          title={`System theme (${theme})`}
        >
          A
        </button>
      </div>
      <div className={styles.group}>
        <button
          type="button"
          onClick={onOpenSettings}
          className={`${styles.button} ${settingsOpen ? styles.buttonActive : ''}`}
          aria-label="Open settings"
          aria-pressed={settingsOpen}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>
      {projection === 'flat' && (
        <div className={styles.group}>
          <button
            type="button"
            onClick={onToggleView}
            className={styles.button}
            aria-label={perspective ? 'Switch to flat view' : 'Switch to perspective view'}
            aria-pressed={perspective}
            title="Tilt the map for a 3D look"
          >
            <PerspectiveIcon on={perspective} />
          </button>
        </div>
      )}
    </div>
  )
}
