"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayRadio } from "@ebay/ui-core-react/ebay-radio"
import { EbayInlineNotice, EbayNoticeContent } from "@ebay/ui-core-react/ebay-inline-notice"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card, Def, Drawer, Field, Modal, money } from "@/components/ui-bits"
import type { LogicalAccount } from "@/lib/types"
import cards from "@/components/cards.module.css"

export function LogicalAccounts({ embedded }: { embedded?: boolean } = {}) {
  const { currentEntity, role, can } = useStore()
  const showBalances = role === "client-treasury-admin" || role === "be-treasury-admin"
  const [detail, setDetail] = useState<LogicalAccount | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      {embedded ? (
        can("create-logical-account") && (
          <div className={cards.rowBetween} style={{ marginBottom: "var(--spacing-250)" }}>
            <span />
            <EbayButton priority="primary" onClick={() => setCreating(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <EbayIconAdd16 aria-hidden="true" /> New Logical Account
              </span>
            </EbayButton>
          </div>
        )
      ) : (
        <PageHead
          title={`${currentEntity.name} — Logical Accounts`}
          subtitle="Per-currency fund ledgers. Each account holds a single currency and links to a settlement bank account with the same owner."
          actions={
            can("create-logical-account") ? (
              <EbayButton priority="primary" onClick={() => setCreating(true)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <EbayIconAdd16 aria-hidden="true" /> New Logical Account
                </span>
              </EbayButton>
            ) : undefined
          }
        />
      )}

      {!showBalances && (
        <div style={{ marginBottom: "var(--spacing-300)" }}>
          <EbayInlineNotice status="information" aria-label="Balance visibility">
            <EbayNoticeContent>Balances are visible to Treasury roles only. You can view account structure and status.</EbayNoticeContent>
          </EbayInlineNotice>
        </div>
      )}

      {currentEntity.logicalAccounts.length === 0 ? (
        <Card>
          <div className={cards.empty}>
            <strong style={{ color: "var(--color-foreground-primary)" }}>No logical accounts yet</strong>
            <p style={{ maxWidth: "42ch", margin: 0 }}>Logical accounts are auto-created when a processing channel is approved, or you can add one manually.</p>
          </div>
        </Card>
      ) : (
        <div className={cards.cardGrid2}>
          {currentEntity.logicalAccounts.map((a) => {
            const bank = a.linkedBankAccountIds
              .map((id) => currentEntity.bankAccounts.find((b) => b.id === id))
              .filter(Boolean)
            return (
              <Card key={a.id} className={cards.cardPad}>
                <div className={cards.stackSm}>
                  <div className={cards.rowBetween}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{a.name}</div>
                      <div className={cards.mono} style={{ color: "var(--color-foreground-secondary)" }}>{a.id}</div>
                    </div>
                    <span className={cards.currencyBadge} style={{ fontSize: 15, padding: "6px 12px" }}>{a.currency}</span>
                  </div>
                  <div className={cards.row} style={{ gap: 10 }}>
                    <StatusBadge status={a.status} size="small" />
                    <span style={{ fontSize: 12, color: "var(--color-foreground-secondary)" }}>{a.type} account</span>
                  </div>
                  {showBalances && (
                    <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--color-foreground-secondary)" }}>Available</div>
                        <div className={cards.money} style={{ fontSize: 18 }}>{money(a.available, a.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--color-foreground-secondary)" }}>Pending</div>
                        <div className={cards.money} style={{ fontSize: 15, color: "var(--color-foreground-secondary)" }}>{money(a.pending, a.currency)}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>
                    Linked to {bank.length ? bank.map((b) => `${b!.bankName} ${b!.accountNumberMasked}`).join(", ") : "no bank account"}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <EbayButton size="small" priority="secondary" onClick={() => setDetail(a)}>View details</EbayButton>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {detail && (
        <Drawer title={detail.name} onClose={() => setDetail(null)}>
          <div className={cards.stack}>
            <div className={cards.row} style={{ gap: 10 }}>
              <span className={cards.currencyBadge} style={{ fontSize: 15, padding: "6px 12px" }}>{detail.currency}</span>
              <StatusBadge status={detail.status} size="small" />
              <span style={{ fontSize: 13, color: "var(--color-foreground-secondary)" }}>{detail.type} · Owner: {detail.owner}</span>
            </div>

            <Card className={cards.cardPad}>
              <div className={cards.defGrid}>
                <Def label="Available">{showBalances ? money(detail.available, detail.currency) : "Hidden"}</Def>
                <Def label="Pending">{showBalances ? money(detail.pending, detail.currency) : "Hidden"}</Def>
                <Def label="Reserved">{showBalances ? money(detail.reserved, detail.currency) : "Hidden"}</Def>
                <Def label="Total">
                  {showBalances ? money(detail.available + detail.pending + detail.reserved, detail.currency) : "Hidden"}
                </Def>
              </div>
            </Card>

            <div>
              <div className={cards.fieldLabel}>Associated settlement bank accounts</div>
              {detail.linkedBankAccountIds.length ? (
                detail.linkedBankAccountIds.map((id) => {
                  const b = currentEntity.bankAccounts.find((x) => x.id === id)
                  if (!b) return null
                  return (
                    <div key={id} style={{ border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-medium)", padding: 12, marginTop: 8 }}>
                      <div className={cards.rowBetween}>
                        <strong>{b.bankName} {b.accountNumberMasked}</strong>
                        <StatusBadge status={b.status} size="small" />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-foreground-secondary)", marginTop: 4 }}>
                        Owner match: {b.holderName === currentEntity.profile.legalName ? "Verified — same owner" : "Owner mismatch"}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className={cards.hint}>No bank account associated yet.</p>
              )}
            </div>

            {detail.notes && (
              <div>
                <div className={cards.fieldLabel}>Notes</div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--color-foreground-secondary)" }}>{detail.notes}</p>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </>
  )
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("GBP")
  const [type, setType] = useState<"Default" | "Additional">("Additional")

  return (
    <Modal
      title="New logical account"
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
          <EbayButton priority="primary" disabled={!name.trim()} aria-disabled={!name.trim()} onClick={onClose}>Create account</EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <EbayInlineNotice status="attention" aria-label="Currency warning">
          <EbayNoticeContent>Currency cannot be changed after the account is created. Make sure you select the correct one.</EbayNoticeContent>
        </EbayInlineNotice>
        <Field label="Account name / label" required hint="For your own reference, e.g. “Tax Account - GBP”.">
          <EbayTextbox fluid value={name} onInputChange={(_e, p) => setName(p?.value ?? "")} placeholder="Fee Account - USD" />
        </Field>
        <Field label="Currency" required>
          <EbaySelect fluid value={currency} onChange={(e) => setCurrency((e.target as HTMLSelectElement).value)}>
            {["GBP", "EUR", "USD", "AUD", "NZD"].map((c) => (
              <EbaySelectOption key={c} value={c}>{c}</EbaySelectOption>
            ))}
          </EbaySelect>
        </Field>
        <Field label="Account type">
          <div className={cards.row} style={{ gap: 20 }}>
            <EbayRadio checked={type === "Default"} onChange={() => setType("Default")}>Default</EbayRadio>
            <EbayRadio checked={type === "Additional"} onChange={() => setType("Additional")}>Additional</EbayRadio>
          </div>
        </Field>
        <Field label="Notes">
          <EbayTextbox fluid multiline placeholder="Optional description" />
        </Field>
      </div>
    </Modal>
  )
}
