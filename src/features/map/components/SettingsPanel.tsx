import { useMapStore } from '@/store/map'
import styles from './SettingsPanel.module.css'

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const label = useMapStore((s) => s.label)
  const setLabel = useMapStore((s) => s.setLabel)
  const grid = useMapStore((s) => s.grid)
  const setGrid = useMapStore((s) => s.setGrid)
  const mapLayers = useMapStore((s) => s.mapLayers)
  const setMapLayers = useMapStore((s) => s.setMapLayers)
  const routeDisplay = useMapStore((s) => s.routeDisplay)
  const setRouteDisplay = useMapStore((s) => s.setRouteDisplay)

  if (!open) return null

  return (
    <div className={styles.panel} role="dialog" aria-label="Settings">
      <div className={styles.header}>
        <span className={styles.title}>Settings</span>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Close settings"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>

      <div className={styles.body}>
        {/* ---- Labels ---- */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Labels</div>
          <Toggle
            label="Country labels"
            checked={label.showCountryLabels}
            onChange={(v) => setLabel({ showCountryLabels: v })}
          />
          <Toggle
            label="Water body labels"
            checked={label.showWaterLabels}
            onChange={(v) => setLabel({ showWaterLabels: v })}
          />
          <Toggle
            label="Channel / strait labels"
            checked={label.showChannelLabels}
            onChange={(v) => setLabel({ showChannelLabels: v })}
          />
          <Toggle
            label="Geographical features"
            checked={label.showFeatureLabels}
            onChange={(v) => setLabel({ showFeatureLabels: v })}
          />
          <Toggle
            label="Island groups"
            checked={label.showIslandLabels}
            onChange={(v) => setLabel({ showIslandLabels: v })}
          />
          <Toggle
            label="Port labels"
            checked={label.showPortLabels}
            onChange={(v) => setLabel({ showPortLabels: v })}
          />
          <RangeControl
            label="Label density"
            value={label.labelDensity}
            min={0.5}
            max={2.0}
            step={0.1}
            onChange={(v) => setLabel({ labelDensity: v })}
          />
          <RangeControl
            label="Label size"
            value={label.labelSize}
            min={0.7}
            max={1.5}
            step={0.1}
            onChange={(v) => setLabel({ labelSize: v })}
          />
          <Toggle
            label="Collision avoidance"
            checked={label.collisionMode === 'simple'}
            onChange={(v) => setLabel({ collisionMode: v ? 'simple' : 'off' })}
          />
        </div>

        {/* ---- Grid ---- */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Grid</div>
          <Toggle
            label="Show lat / lon grid"
            checked={grid.showGrid}
            onChange={(v) => setGrid({ showGrid: v })}
          />
          <div className={styles.radioGroup}>
            <RadioOption
              label="Major only"
              name="gridDensity"
              checked={grid.gridDensity === 'major'}
              onChange={() => setGrid({ gridDensity: 'major' })}
            />
            <RadioOption
              label="Medium"
              name="gridDensity"
              checked={grid.gridDensity === 'medium'}
              onChange={() => setGrid({ gridDensity: 'medium' })}
            />
            <RadioOption
              label="Fine"
              name="gridDensity"
              checked={grid.gridDensity === 'fine'}
              onChange={() => setGrid({ gridDensity: 'fine' })}
            />
          </div>
          <RangeControl
            label="Grid opacity"
            value={grid.gridOpacity}
            min={0.2}
            max={1.0}
            step={0.1}
            onChange={(v) => setGrid({ gridOpacity: v })}
          />
        </div>

        {/* ---- Map layers ---- */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Map layers</div>
          <Toggle
            label="Shipping lanes"
            checked={mapLayers.showShippingLanes}
            onChange={(v) => setMapLayers({ showShippingLanes: v })}
          />
          <Toggle
            label="Continent outlines"
            checked={mapLayers.showContinentOutlines}
            onChange={(v) => setMapLayers({ showContinentOutlines: v })}
          />
          <Toggle
            label="Reference lines"
            checked={mapLayers.showReferenceLines}
            onChange={(v) => setMapLayers({ showReferenceLines: v })}
          />
        </div>

        {/* ---- Route ---- */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Route display</div>
          <RangeControl
            label="Route line width"
            value={routeDisplay.routeLineWidth}
            min={1}
            max={6}
            step={1}
            onChange={(v) => setRouteDisplay({ routeLineWidth: v })}
          />
          <Toggle
            label="Trace animation"
            checked={routeDisplay.showTraceAnimation}
            onChange={(v) => setRouteDisplay({ showTraceAnimation: v })}
          />
        </div>
      </div>
    </div>
  )
}

/* ---- Reusable form controls ---- */

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={styles.toggle}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchKnob} />
      </button>
    </label>
  )
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className={styles.range}>
      <div className={styles.rangeHeader}>
        <span className={styles.rangeLabel}>{label}</span>
        <span className={styles.rangeValue}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        className={styles.rangeSlider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function RadioOption({
  label,
  name,
  checked,
  onChange,
}: {
  label: string
  name: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className={styles.radio}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className={styles.radioInput}
      />
      <span className={styles.radioLabel}>{label}</span>
    </label>
  )
}
