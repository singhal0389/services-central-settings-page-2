"use client"

import { useStore } from "@/lib/store"
import { getPpe } from "@/lib/data"
import { PageHead } from "@/components/app-shell"
import { Card } from "@/components/ui-bits"
import { SoftDescriptorSummary } from "./soft-descriptors"
import { LogicalAccounts } from "./logical-accounts"
import type { PaymentMethodDef } from "@/lib/types"
import cards from "@/components/cards.module.css"
import styles from "./channels.module.css"

const METHOD_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#2e77bc",
  applepay: "#111",
  googlepay: "#4285f4",
  diners: "#0079be",
  klarna: "#ffb3c7",
  clearpay: "#b2fce4",
  affirm: "#4a4af4",
  bacs: "#333",
  sepa: "#0a3d91",
  ach: "#2a7",
  ideal: "#cc0066",
  bancontact: "#005498",
  p24: "#d1122a",
}

const GROUPS: { id: PaymentMethodDef["category"]; label: string }[] = [
  { id: "cards", label: "Cards & Wallets" },
  { id: "bnpl", label: "Buy Now Pay Later" },
  { id: "bank", label: "Bank Transfers & Direct Debit" },
  { id: "regional", label: "Regional Methods" },
]

const METHOD_STATE: Record<string, string> = {
  supported: "Available",
  apply: "Requires a separate agreement",
  unsupported: "Not available",
}

// The entity-level Payments Profile: the settings shared by every processing
// channel — MCCs, statement descriptor, available payment methods, and the
// logical accounts that hold settlement. It reuses the same section styling as
// the Processing Channel phase.
export function PaymentsProfile() {
  const { currentEntity } = useStore()
  const ppe = getPpe(currentEntity.ppe)

  return (
    <>
      <PageHead
        title="Payments Profile"
        subtitle="Payment settings shared across this entity's processing channels: MCCs, statement descriptor, available methods, and logical accounts."
      />

      <div className={cards.stack}>
        <Card>
          {/* MCC */}
          <div className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>MCC configuration</h2>
            <p className={styles.formSectionSub}>
              Merchant Category Codes identify your business for card-network routing. {currentEntity.ppe} defines which
              codes are available.
            </p>
            <div className={styles.chipRow}>
              {(ppe?.mccs ?? []).length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>No MCCs available.</span>
              ) : (
                (ppe?.mccs ?? []).map((m) => (
                  <span key={m.code} className={styles.pairOption} data-on style={{ cursor: "default" }}>
                    <strong>{m.code}</strong>
                    <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>{m.label}</span>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Statement descriptor — the same entity-level summary + edit drawer
              used inside a processing channel. */}
          <SoftDescriptorSummary embedded />

          {/* Available payment methods */}
          <div className={styles.formSection}>
            <h2 className={styles.formSectionTitle}>Available payment methods</h2>
            <p className={`${styles.formSectionSub} ${styles.subOneLine}`}>
              Methods supported by {currentEntity.ppe}. Enable them per channel in Processing Channels.
            </p>
            {GROUPS.map((g) => {
              const items = (ppe?.methods ?? []).filter((m) => m.category === g.id)
              if (items.length === 0) return null
              return (
                <div key={g.id}>
                  <div className={styles.methodGroup}>{g.label}</div>
                  <div className={styles.methodGrid}>
                    {items.map((m) => (
                      <div key={m.id} className={styles.methodCard} data-disabled={m.status === "unsupported"}>
                        <span className={styles.methodLogo} style={{ background: METHOD_COLORS[m.id] ?? "#555" }}>
                          {m.id.slice(0, 4).toUpperCase()}
                        </span>
                        <span className={styles.methodName}>
                          {m.name}
                          <span className={styles.methodMeta}>{METHOD_STATE[m.status] ?? m.status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Managing logical accounts */}
        <div className={styles.formSection} style={{ paddingTop: 0 }}>
          <h2 className={styles.formSectionTitle}>Managing logical accounts</h2>
          <p className={styles.formSectionSub}>
            The accounts that hold settled funds for this entity. Each is tied to one currency.
          </p>
          <LogicalAccounts embedded />
        </div>
      </div>
    </>
  )
}
