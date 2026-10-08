"use client"

import { useState, type ReactNode } from "react"
import { EbayIconEbayLogo16Colored } from "@ebay/ui-core-react/icons/ebay-icon-ebay-logo-16-colored"
import { EbayMenuButton, EbayMenuButtonItem } from "@ebay/ui-core-react/ebay-menu-button"
import { EbayIconChevronDown16 } from "@ebay/ui-core-react/icons/ebay-icon-chevron-down-16"
import { EbayIconChevronRight16 } from "@ebay/ui-core-react/icons/ebay-icon-chevron-right-16"
import { useStore } from "@/lib/store"
import { ROLE_LABELS, type Role } from "@/lib/types"
import styles from "./shell.module.css"

export type Section =
  | "home"
  | "entities"
  | "entity-new"
  | "profile"
  | "services"
  | "channels"
  | "payments-profile"
  | "logical"
  | "bank"
  | "payouts"
  | "users"

const ROLE_ORDER: Role[] = [
  "be-admin",
  "be-treasury-admin",
  "client-admin",
  "client-treasury-admin",
]

// Human labels for the back link / breadcrumb on each destination page.
const SECTION_LABELS: Record<Section, string> = {
  home: "Settings",
  entities: "Business Entities",
  "entity-new": "New Business Entity",
  profile: "Entity Settings",
  services: "Services",
  channels: "Processing Channels",
  "payments-profile": "Payments Profile",
  logical: "Logical Accounts",
  bank: "Bank Accounts",
  payouts: "Payouts & Treasury",
  users: "Users & Roles",
}

function EntitySwitcher() {
  const { scopedEntities, currentEntity, setEntityId } = useStore()
  const [open, setOpen] = useState(false)
  if (scopedEntities.length <= 1) return null

  return (
    <div className={`${styles.entitySwitcher} ${styles.entitySwitcherHeader}`}>
      <button
        className={styles.entityTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.entityMark}>{initials(currentEntity.name)}</span>
        <span className={styles.entityMeta}>
          <span className={styles.entityName}>{currentEntity.name}</span>
          <span className={styles.entityJur}>{currentEntity.jurisdiction}</span>
        </span>
        <EbayIconChevronDown16 aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.entityMenu} role="menu">
          {scopedEntities.map((e) => (
            <button
              key={e.id}
              role="menuitem"
              className={styles.entityMenuItem}
              onClick={() => {
                setEntityId(e.id)
                setOpen(false)
              }}
            >
              <span className={styles.entityMark}>{initials(e.name)}</span>
              <span className={styles.entityMeta}>
                <span className={styles.entityName}>{e.name}</span>
                <span className={styles.entityJur}>{e.jurisdiction}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export function AppShell({
  section,
  onNavigate,
  children,
}: {
  section: Section
  onNavigate: (s: Section) => void
  children: ReactNode
}) {
  const { role, setRole, showEntitySwitcher } = useStore()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => onNavigate("home")} aria-label="eBay Services Central home">
          <span className={styles.brandLogo}>
            <EbayIconEbayLogo16Colored aria-hidden="true" />
          </span>
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandName}>Services Central</span>
        </button>
        <div className={styles.headerRight}>
          {showEntitySwitcher && <EntitySwitcher />}
          <div className={styles.rolePicker}>
            <span className={styles.rolePickerLabel}>Viewing as</span>
            <EbayMenuButton
              variant="form"
              text={ROLE_LABELS[role]}
              checked={ROLE_ORDER.indexOf(role)}
              type="radio"
              collapseOnSelect
              onChange={(_e, props) => {
                if (props && typeof props.index === "number") setRole(ROLE_ORDER[props.index])
              }}
            >
              {ROLE_ORDER.map((r) => (
                <EbayMenuButtonItem key={r}>{ROLE_LABELS[r]}</EbayMenuButtonItem>
              ))}
            </EbayMenuButton>
          </div>
          <span className={styles.avatar} aria-hidden="true">
            PS
          </span>
        </div>
      </header>

      <main className={styles.content}>
        {section !== "home" && (
          <button className={styles.backLink} onClick={() => onNavigate("home")}>
            <EbayIconChevronRight16 aria-hidden="true" style={{ transform: "rotate(180deg)" }} />
            Back to {SECTION_LABELS.home}
          </button>
        )}
        {children}
      </main>
    </div>
  )
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className={styles.pageHead}>
      <div style={{ minWidth: 0 }}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSub}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.row}>{actions}</div>}
    </div>
  )
}

export { EbayIconChevronRight16 }
