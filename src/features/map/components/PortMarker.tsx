import { useEffect, useState } from 'react'
import { WebMercatorViewport } from '@deck.gl/core'
import type { MapViewState } from '@deck.gl/core'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'
import styles from './PortMarker.module.css'

interface PortMarkerProps {
  viewState: MapViewState
  width: number
  height: number
}

/**
 * HTML overlay that renders the pulse / ripple effect on the
 * currently-selected port. Position is computed by projecting the
 * port's lat/lng into screen pixels via WebMercatorViewport.
 *
 * Two concentric rings pulse outward with a 0.75s phase offset so
 * the ripple feels continuous. Animations are CSS keyframes that
 * honour prefers-reduced-motion (the duration tokens are zeroed
 * in tokens.css under that media query).
 */
export default function PortMarker({ viewState, width, height }: PortMarkerProps) {
  const selectedPortId = useMapStore((s) => s.selectedPortId)
  const port: Port | undefined = selectedPortId
    ? PORTS.find((p) => p.id === selectedPortId)
    : undefined

  const [screen, setScreen] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!port || width === 0 || height === 0) {
      setScreen(null)
      return
    }
    const viewport = new WebMercatorViewport({
      ...viewState,
      width,
      height,
    })
    const xy = viewport.project([port.lng, port.lat])
    if (xy.every(Number.isFinite)) {
      setScreen({ x: xy[0], y: xy[1] })
    } else {
      setScreen(null)
    }
  }, [port, viewState, width, height])

  if (!port || !screen) return null

  return (
    <div className={styles.marker} style={{ left: screen.x, top: screen.y }}>
      <div className={styles.ring} />
      <div className={styles.ring} />
      <div className={styles.dot} />
    </div>
  )
}
