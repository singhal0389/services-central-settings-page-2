"use client"

import { useRef, useState, type ReactNode } from "react"
import { EbayIconClose16 } from "@ebay/ui-core-react/icons/ebay-icon-close-16"
import { EbayIconButton } from "@ebay/ui-core-react/ebay-icon-button"
import { EbayIconUpload24 } from "@ebay/ui-core-react/icons/ebay-icon-upload-24"
import { EbayIconFile16 } from "@ebay/ui-core-react/icons/ebay-icon-file-16"
import cards from "./cards.module.css"

export function FileDropzone({
  file,
  onFile,
  accept = ".pdf,.jpg,.jpeg,.png",
  hint = "PDF, JPG or PNG · up to 10MB",
}: {
  file: File | null
  onFile: (f: File | null) => void
  accept?: string
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  if (file) {
    return (
      <div
        className={cards.rowBetween}
        style={{
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-large)",
          padding: "var(--spacing-250) var(--spacing-300)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <EbayIconFile16 aria-hidden="true" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
        </span>
        <EbayIconButton icon={<EbayIconClose16 />} aria-label="Remove file" onClick={() => onFile(null)} />
      </div>
    )
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cards.uploadZone}
        style={dragging ? { borderColor: "var(--color-border-accent)", background: "var(--color-background-education)" } : undefined}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
      >
        <EbayIconUpload24 aria-hidden="true" />
        <span style={{ fontSize: 14 }}>
          <strong style={{ color: "var(--color-foreground-accent)" }}>Browse</strong> or drag and drop a file here
        </span>
        <span style={{ fontSize: 12 }}>{hint}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </>
  )
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`${cards.card} ${className}`}>{children}</section>
}

export function CardHead({
  title,
  subtitle,
  actions,
  plain,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  plain?: boolean
}) {
  return (
    <div className={`${cards.cardHead} ${plain ? cards.cardHeadPlain : ""}`}>
      <div style={{ minWidth: 0 }}>
        <h2 className={cards.cardTitle}>{title}</h2>
        {subtitle && <p className={cards.cardSub}>{subtitle}</p>}
      </div>
      {actions && <div className={cards.row}>{actions}</div>}
    </div>
  )
}

export function Def({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cards.defItem}>
      <span className={cards.defLabel}>{label}</span>
      <span className={cards.defValue}>{children}</span>
    </div>
  )
}

export function Field({
  label,
  required,
  hint,
  children,
  full,
}: {
  label: string
  required?: boolean
  hint?: ReactNode
  children: ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? cards.formFull : undefined}>
      <label className={cards.fieldLabel}>
        {label}
        {required && <span className={cards.req}> *</span>}
      </label>
      {children}
      {hint && <p className={cards.hint}>{hint}</p>}
    </div>
  )
}

export function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className={cards.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={cards.drawer} role="dialog" aria-modal="true" aria-label={title}>
        <div className={cards.drawerHead}>
          <h2 className={cards.drawerTitle}>{title}</h2>
          <EbayIconButton
            icon={<EbayIconClose16 />}
            aria-label="Close"
            onClick={onClose}
          />
        </div>
        <div className={cards.drawerBody}>{children}</div>
        {footer && <div className={cards.drawerFoot}>{footer}</div>}
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className={cards.modalScrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={cards.modal} role="dialog" aria-modal="true" aria-label={title}>
        <div className={cards.drawerHead}>
          <h2 className={cards.drawerTitle}>{title}</h2>
          <EbayIconButton
            icon={<EbayIconClose16 />}
            aria-label="Close"
            onClick={onClose}
          />
        </div>
        <div className={cards.drawerBody}>{children}</div>
        {footer && <div className={cards.drawerFoot}>{footer}</div>}
      </div>
    </div>
  )
}

export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
