"use client"

import { useCallback, useState } from "react"
import { EbayIconEbayLogo16Colored } from "@ebay/ui-core-react/icons/ebay-icon-ebay-logo-16-colored"
import { EbayIconSettings24 } from "@ebay/ui-core-react/icons/ebay-icon-settings-24"
import { EbayIconHelp24 } from "@ebay/ui-core-react/icons/ebay-icon-help-24"
import { EbayIconChevronDown16 } from "@ebay/ui-core-react/icons/ebay-icon-chevron-down-16"
import { EbayIconChevronRight16 } from "@ebay/ui-core-react/icons/ebay-icon-chevron-right-16"
import { EbayMenuButton, EbayMenuButtonItem } from "@ebay/ui-core-react/ebay-menu-button"
import { useStore } from "@/lib/store"
import { ROLE_LABELS, type Role } from "@/lib/types"
import type { Section } from "@/components/app-shell"
import { SettingsHome } from "@/components/sections/settings-home"
import { EntitiesOverview } from "@/components/sections/entities-overview"
import { ProfileKyc } from "@/components/sections/profile-kyc"
import { Services } from "@/components/sections/services"
import { ProcessingChannels } from "@/components/sections/processing-channels"
import { PaymentsProfile } from "@/components/sections/payments-profile"
import { NewBusinessEntity } from "@/components/sections/entity-form"
import { ComplianceReferrals } from "@/components/sections/compliance-referrals"
import { LogicalAccounts } from "@/components/sections/logical-accounts"
import { BankAccounts } from "@/components/sections/bank-accounts"
import { PayoutsTreasury } from "@/components/sections/payouts-treasury"
import { UsersRoles } from "@/components/sections/users-roles"
import { Analytics } from "@/components/sections/analytics"
import type { TabId as AnalyticsTabId } from "@/lib/analytics-data"
import { CommentsProvider } from "@/components/comments/comments-provider"
import { ReviewBar } from "@/components/comments/review-bar"
import { CommentLayer } from "@/components/comments/comment-layer"
import { buildViewKey, type ViewTarget } from "@/lib/comments"
import styles from "./services-central.module.css"

const SETTINGS_LABELS: Record<Section, string> = {
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

const ROLE_ORDER: Role[] = ["be-admin", "be-treasury-admin", "client-admin", "client-treasury-admin"]

const MERCHANT_ACCOUNT = "TCGP_US_MARKETPLACE"

// A left-nav item carries its own id because labels repeat across groups —
// "Disputes" is both a transaction list and an analytics view.
type NavItem = { id: string; label: string }
// A left-nav group: an optional uppercase heading over a set of items.
// `dividerAbove` renders the hairline that separates the trailing, unlabelled group.
type NavGroup = { heading?: string; items: NavItem[]; dividerAbove?: boolean }

const plain = (...labels: string[]): NavItem[] => labels.map((label) => ({ id: label, label }))

// The Analytics views open one page on their matching tab.
const ANALYTICS_ITEMS: Record<string, AnalyticsTabId> = {
  "analytics:payments": "payments",
  "analytics:disputes": "disputes",
}
const ANALYTICS_ITEM_FOR: Record<AnalyticsTabId, string> = {
  payments: "analytics:payments",
  disputes: "analytics:disputes",
}

// Top-level category -> its grouped left-nav items.
const CATEGORIES: { id: string; label: string; groups: NavGroup[] }[] = [
  {
    id: "payment",
    label: "Payment Service",
    groups: [
      { heading: "Transactions", items: plain("Authorizations", "Payment Sessions", "Disputes") },
      { heading: "Marketplace", items: plain("Customers", "Payouts") },
      {
        heading: "Analytics",
        items: [
          { id: "analytics:payments", label: "Payments" },
          { id: "analytics:disputes", label: "Disputes" },
        ],
      },
      { items: plain("Client Balance", "Reports", "Settings"), dividerAbove: true },
    ],
  },
  { id: "developers", label: "Developers", groups: [{ items: plain("API Keys", "Webhooks", "Event Logs") }] },
  {
    id: "compliance",
    label: "Compliance",
    groups: [
      {
        items: plain(
          "Customer details",
          "Customer verification info",
          "Compliance document info",
          "Remedy info",
          "Compliance referrals",
        ),
      },
    ],
  },
]

const itemsOf = (c: (typeof CATEGORIES)[number]) => c.groups.flatMap((g) => g.items.map((i) => i.id))

const labelOf = (itemId: string) => {
  for (const c of CATEGORIES) {
    for (const g of c.groups) {
      const hit = g.items.find((i) => i.id === itemId)
      if (hit) return hit.label
    }
  }
  return itemId
}

export function ServicesCentralShell({ initialItem = "Payouts" }: { initialItem?: string }) {
  const { role, setRole, setEntityId } = useStore()
  const [categoryId, setCategoryId] = useState("payment")
  const [item, setItem] = useState(initialItem)
  const [settingsView, setSettingsView] = useState<Section>("home")

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]
  const analyticsTab = ANALYTICS_ITEMS[item]

  const selectCategory = (id: string) => {
    const cat = CATEGORIES.find((c) => c.id === id)
    if (!cat) return
    setCategoryId(id)
    setItem(itemsOf(cat)[0])
  }

  const openSettings = () => {
    setCategoryId("payment")
    setItem("Settings")
    setSettingsView("home")
  }

  const goSettings = (s: Section, entityId?: string) => {
    if (entityId) setEntityId(entityId)
    // The Business Entities list is a client-admin surface. A Business Entity
    // admin is scoped to one entity, so open its Entity Settings directly.
    const isClientRole = role === "client-admin" || role === "client-treasury-admin"
    setSettingsView(s === "entities" && !isClientRole ? "profile" : s)
  }

  // Review comments are anchored to a screen, so they need a stable id for the
  // view currently on show plus a label for the comment list.
  const viewKey = buildViewKey({ categoryId, item, settingsView })
  const viewLabel =
    item === "Settings"
      ? settingsView === "home"
        ? `${category.label} › Settings`
        : `${category.label} › Settings › ${SETTINGS_LABELS[settingsView]}`
      : analyticsTab
        ? `${category.label} › Analytics › ${labelOf(item)}`
        : `${category.label} › ${labelOf(item)}`

  const jumpToView = useCallback((target: ViewTarget) => {
    if (!CATEGORIES.some((c) => c.id === target.categoryId)) return
    setCategoryId(target.categoryId)
    setItem(target.item)
    if (target.item === "Settings") {
      const section = target.settingsView
      setSettingsView(section && section in SETTINGS_LABELS ? (section as Section) : "home")
    }
  }, [])

  return (
    <CommentsProvider viewKey={viewKey} viewLabel={viewLabel} jumpTo={jumpToView}>
    <div className={styles.app} style={{ position: "relative" }}>
      <ReviewBar />

      {/* Top navigation. Tagged so a page can measure where this sticky bar
          ends and park its own sticky header directly beneath it. */}
      <div className={styles.top} data-sc-top>
        <div className={styles.topBar}>
          <button className={styles.brandLogo} aria-label="eBay home">
            <EbayIconEbayLogo16Colored aria-hidden="true" />
          </button>
          <div className={styles.topActions}>
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
            <button className={styles.userPill} type="button">anssinghal</button>
            <button className={styles.iconBtn} type="button" aria-label="Settings" onClick={openSettings}>
              <EbayIconSettings24 aria-hidden="true" />
            </button>
            <button className={styles.iconBtn} type="button" aria-label="Help">
              <EbayIconHelp24 aria-hidden="true" />
            </button>
          </div>
        </div>

        <h1 className={styles.title}>Services Central</h1>

        <div className={styles.catRow}>
          <nav className={styles.cats} aria-label="Service categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`${styles.cat} ${c.id === categoryId ? styles.catActive : ""}`}
                aria-current={c.id === categoryId ? "page" : undefined}
                onClick={() => selectCategory(c.id)}
              >
                {c.label}
                <EbayIconChevronDown16 aria-hidden="true" />
              </button>
            ))}
          </nav>
          <div className={styles.merchant}>
            <span className={styles.merchantLabel}>Merchant Account: </span>
            <span className={styles.merchantValue}>{MERCHANT_ACCOUNT}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        <nav className={styles.nav} aria-label={`${category.label} navigation`}>
          {category.groups.map((group, i) => (
            <div key={group.heading ?? `group-${i}`} className={styles.navGroup}>
              {group.dividerAbove && <div className={styles.navDivider} />}
              {group.heading && <h2 className={styles.navHeading}>{group.heading}</h2>}
              {group.items.map((it) => (
                <button
                  key={it.id}
                  className={`${styles.navItem} ${it.id === item ? styles.navItemActive : ""}`}
                  aria-current={it.id === item ? "page" : undefined}
                  onClick={() => {
                    setItem(it.id)
                    if (it.id === "Settings") setSettingsView("home")
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className={styles.main}>
          {item === "Settings" ? (
            <SettingsView view={settingsView} onNavigate={goSettings} />
          ) : item === "Compliance referrals" ? (
            <ComplianceReferrals />
          ) : analyticsTab ? (
            <Analytics tab={analyticsTab} onTabChange={(t) => setItem(ANALYTICS_ITEM_FOR[t])} />
          ) : (
            <>
              <h2 className={styles.contentTitle}>{labelOf(item)}</h2>
              <p className={styles.placeholder}>{labelOf(item)} content coming soon.</p>
            </>
          )}
        </main>
      </div>

      <CommentLayer />
    </div>
    </CommentsProvider>
  )
}

function SettingsView({ view, onNavigate }: { view: Section; onNavigate: (s: Section, entityId?: string) => void }) {
  return (
    <>
      {view !== "home" && (
        <button className={styles.settingsBack} type="button" onClick={() => onNavigate("home")}>
          <EbayIconChevronRight16 aria-hidden="true" style={{ transform: "rotate(180deg)" }} />
          Back to {SETTINGS_LABELS.home}
        </button>
      )}
      {view === "home" && <SettingsHome onNavigate={(s) => onNavigate(s)} />}
      {view === "entities" && <EntitiesOverview onOpen={(s, id) => onNavigate(s, id)} />}
      {view === "entity-new" && <NewBusinessEntity onDone={(s) => onNavigate(s)} />}
      {view === "profile" && <ProfileKyc onNavigate={(s) => onNavigate(s)} />}
      {view === "services" && <Services onManagePayments={() => onNavigate("channels")} />}
      {view === "channels" && <ProcessingChannels />}
      {view === "payments-profile" && <PaymentsProfile />}
      {view === "logical" && <LogicalAccounts />}
      {view === "bank" && <BankAccounts />}
      {view === "payouts" && <PayoutsTreasury />}
      {view === "users" && <UsersRoles />}
    </>
  )
}


