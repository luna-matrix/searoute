import { useCallback, useState } from 'react'
import { generateReport, generateQuickSummary } from '../lib/voyage-report'
import type { ReportInput } from '../lib/voyage-report'
import Toast from '@/shared/components/Toast'
import styles from './ActionBar.module.css'

interface ActionBarProps {
  reportInput: ReportInput
}

type ReportMode = 'detailed' | 'summary'

const ExportIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path
      d="M8 1.5v8M4.5 5 8 1.5 11.5 5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2.5 11.5v2h11v-2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <rect
      x="3"
      y="3"
      width="10"
      height="11"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M5 1h8a2 2 0 0 1 2 2v8"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
)

export default function ActionBar({ reportInput }: ActionBarProps) {
  const [toastVisible, setToastVisible] = useState(false)
  const [reportMode, setReportMode] = useState<ReportMode>('detailed')

  const getReport = useCallback(
    () =>
      reportMode === 'detailed' ? generateReport(reportInput) : generateQuickSummary(reportInput),
    [reportInput, reportMode],
  )

  const handleExport = useCallback(() => {
    const text = getReport()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/:/g, '-').slice(0, 19)
    a.href = url
    a.download = `searoute-voyage-${ts}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [getReport])

  const handleCopy = useCallback(async () => {
    const text = getReport()
    try {
      await navigator.clipboard.writeText(text)
      setToastVisible(true)
    } catch {
      // clipboard unavailable
    }
  }, [getReport])

  const dismissToast = useCallback(() => setToastVisible(false), [])

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.modeBar}>
          <button
            type="button"
            className={`${styles.modePill} ${reportMode === 'detailed' ? styles.modePillActive : ''}`}
            onClick={() => setReportMode('detailed')}
            aria-pressed={reportMode === 'detailed'}
          >
            Full Report
          </button>
          <button
            type="button"
            className={`${styles.modePill} ${reportMode === 'summary' ? styles.modePillActive : ''}`}
            onClick={() => setReportMode('summary')}
            aria-pressed={reportMode === 'summary'}
          >
            Summary
          </button>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={handleExport}
          title="Download as TXT"
        >
          <ExportIcon />
          <span>Export</span>
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <CopyIcon />
          <span>Copy</span>
        </button>
      </div>
      <Toast message="Copied to clipboard" visible={toastVisible} onDismiss={dismissToast} />
    </>
  )
}
