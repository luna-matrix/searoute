import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

interface ToastProps {
  message: string
  visible: boolean
  onDismiss: () => void
  durationMs?: number
}

/**
 * Minimal toast notification. Slides in from the top-center of
 * the viewport, auto-dismisses after `durationMs` (default 2000).
 * Uses the --z-toast token for z-index.
 */
export default function Toast({ message, visible, onDismiss, durationMs = 2000 }: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) {
      setShow(false)
      return
    }
    setShow(true)
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onDismiss, 200) // wait for exit animation
    }, durationMs)
    return () => clearTimeout(timer)
  }, [visible, durationMs, onDismiss])

  if (!visible && !show) return null

  return (
    <div
      className={`${styles.toast} ${show ? styles.toastVisible : styles.toastExiting}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
