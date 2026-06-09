import { useCallback, useState } from 'react'
import { generateReport } from '../lib/voyage-report'
import type { ReportInput } from '../lib/voyage-report'
import styles from './ActionBar.module.css'

interface ActionBarProps {
  reportInput: ReportInput
}

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
  const [copied, setCopied] = useState(false)

  const handleExport = useCallback(() => {
    const text = generateReport(reportInput)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date().toISOString().replace(/:/g, '-').slice(0, 19)
    a.href = url
    a.download = `searoute-voyage-${ts}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [reportInput])

  const handleCopy = useCallback(async () => {
    const text = generateReport(reportInput)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }, [reportInput])

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.button}
        onClick={handleExport}
        title="Download as TXT"
      >
        <ExportIcon />
        <span>Export TXT</span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        <CopyIcon />
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}
