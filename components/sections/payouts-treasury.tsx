"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayRadio } from "@ebay/ui-core-react/ebay-radio"
import { EbayInlineNotice, EbayNoticeContent } from "@ebay/ui-core-react/ebay-inline-notice"
import { EbayIconMoneyStack24 } from "@ebay/ui-core-react/icons/ebay-icon-money-stack-24"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card, CardHead, Field, Modal, money } from "@/components/ui-bits"
import type {
  BusinessEntity,
  LogicalAccount,
  PayoutAmountMode,
  PayoutFrequency,
  PayoutRoute,
  PayoutSchedule,
} from "@/lib/types"
import cards from "@/components/cards.module.css"

export function PayoutsTreasury() {
  const { scopedEntities, currentEntity, showEntitySwitcher, can } = useStore()
  const entities = showEntitySwitcher ? scopedEntities : [currentEntity]
  const [requesting, setRequesting] = useState(false)

  const withData = entities.filter((e) => e.logicalAccounts.length > 0)

  return (
    <>
      <PageHead
        title="Payouts & Treasury"
        subtitle={
          showEntitySwitcher
            ? "Configure payout schedules and routing across all entities you have treasury access to."
            : `Configure payouts for ${currentEntity.name}.`
        }
        actions={
          can("request-payout") ? (
            <EbayButton priority="primary" onClick={() => setRequesting(true)} disabled={withData.length === 0} aria-disabled={withData.length === 0}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <EbayIconMoneyStack24 aria-hidden="true" style={{ width: 18, height: 18 }} /> Request Payout
              </span>
            </EbayButton>
          ) : undefined
        }
      />

      {withData.length === 0 ? (
        <Card>
          <div className={cards.empty}>
            <strong style={{ color: "var(--color-foreground-primary)" }}>Nothing to pay out yet</strong>
            <p style={{ maxWidth: "42ch", margin: 0 }}>No entity in your scope has logical accounts with a balance.</p>
          </div>
        </Card>
      ) : (
        <div className={cards.stack}>
          {withData.map((e) => (
            <EntityPayout key={e.id} entity={e} />
          ))}
        </div>
      )}

      {requesting && <PayoutRequestModal entities={withData} onClose={() => setRequesting(false)} />}
    </>
  )
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

function ordinal(n: number) {
  const suffix = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${suffix[(v - 20) % 10] ?? suffix[v] ?? suffix[0]}`
}

/**
 * The one place a schedule is turned into words, so the table row and the
 * dialog that edits it cannot describe the same schedule differently.
 */
function frequencySummary(s?: PayoutSchedule) {
  if (!s) return "On request only"
  if (s.frequency === "daily") return "Every day"
  if (s.frequency === "weekly") return `Every week on ${s.weeklyDay ?? WEEKDAYS[0]}`
  return `Every month on the ${ordinal(s.monthlyDay ?? 1)}`
}

function amountSummary(s: PayoutSchedule, currency: string) {
  return s.amountMode === "available" ? "Available balance" : money(s.amount ?? 0, currency)
}

function EntityPayout({ entity: e }: { entity: BusinessEntity }) {
  const { can } = useStore()
  // Local overrides on top of the entity's stored routing, keyed by account.
  const [routes, setRoutes] = useState<Record<string, PayoutRoute>>(() =>
    Object.fromEntries(e.payout.routing.map((r) => [r.logicalAccountId, r])),
  )
  const [editing, setEditing] = useState<string | null>(null)

  const editingAccount = e.logicalAccounts.find((la) => la.id === editing)
  const noVerifiedBank = e.bankAccounts.every((b) => b.status !== "verified")

  return (
    <Card>
      <CardHead title={e.name} subtitle={`${e.jurisdiction} · ${e.ppe}`} />
      <div className={cards.cardPad}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Payout schedule</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-foreground-secondary)" }}>
          Each currency account is paid out on its own schedule.
        </p>

        <div className={cards.tableScroll}>
          <table className={cards.table}>
            <thead>
              <tr>
                <th>Currency account</th>
                <th>Default bank account</th>
                <th>Payout schedule</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {e.logicalAccounts.map((la) => {
                const route = routes[la.id]
                const bank = route?.bankAccountId ? e.bankAccounts.find((b) => b.id === route.bankAccountId) : undefined
                return (
                  <tr key={la.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className={cards.currencyBadge}>{la.currency}</span>
                        <span style={{ color: "var(--color-foreground-secondary)" }}>({la.name})</span>
                      </span>
                    </td>
                    <td>
                      {bank ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          {bank.bankName} {bank.accountNumberMasked}
                          <StatusBadge status={bank.status} size="small" />
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-foreground-attention)", fontSize: 13 }}>No account set</span>
                      )}
                    </td>
                    <td>
                      <strong>{frequencySummary(route?.schedule)}</strong>
                      {route?.schedule && (
                        <span style={{ display: "block", fontSize: 12, color: "var(--color-foreground-secondary)" }}>
                          {amountSummary(route.schedule, la.currency)}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {can("configure-payout") && (
                        <EbayButton size="small" priority="tertiary" onClick={() => setEditing(la.id)}>
                          Change
                        </EbayButton>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {noVerifiedBank && (
          <div style={{ marginTop: 12 }}>
            <EbayInlineNotice status="attention" aria-label="No verified bank">
              <EbayNoticeContent>No verified bank account. Add and verify one to enable scheduled payouts.</EbayNoticeContent>
            </EbayInlineNotice>
          </div>
        )}
      </div>

      {editingAccount && (
        <ScheduleModal
          account={editingAccount}
          schedule={routes[editingAccount.id]?.schedule}
          onClose={() => setEditing(null)}
          onSave={(schedule) => {
            setRoutes((prev) => ({
              ...prev,
              [editingAccount.id]: { ...prev[editingAccount.id], logicalAccountId: editingAccount.id, schedule },
            }))
            setEditing(null)
          }}
        />
      )}
    </Card>
  )
}

/**
 * EbayRadio emits the control and its label as siblings, so stacking bare
 * radios in a column flex puts each label under its own circle. Each option
 * gets its own row wrapper, and the label element makes the text clickable.
 */
function RadioRow({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <EbayRadio checked={checked} onChange={onSelect}>{children}</EbayRadio>
    </label>
  )
}

function ScheduleModal({
  account,
  schedule,
  onClose,
  onSave,
}: {
  account: LogicalAccount
  schedule?: PayoutSchedule
  onClose: () => void
  onSave: (s: PayoutSchedule) => void
}) {
  const [frequency, setFrequency] = useState<PayoutFrequency>(schedule?.frequency ?? "daily")
  const [weeklyDay, setWeeklyDay] = useState(schedule?.weeklyDay ?? WEEKDAYS[0])
  const [monthlyDay, setMonthlyDay] = useState(schedule?.monthlyDay ?? 1)
  const [amountMode, setAmountMode] = useState<PayoutAmountMode>(schedule?.amountMode ?? "available")
  const [amount, setAmount] = useState(schedule?.amount ? String(schedule.amount) : "")

  const amt = parseFloat(amount || "0")
  const amountValid = amountMode === "available" || amt > 0

  const next: PayoutSchedule = {
    frequency,
    // Only carry the qualifier the chosen frequency actually uses, so a stored
    // schedule can't hold a weekday it never applies.
    weeklyDay: frequency === "weekly" ? weeklyDay : undefined,
    monthlyDay: frequency === "monthly" ? monthlyDay : undefined,
    amountMode,
    amount: amountMode === "specified" ? amt : undefined,
  }

  return (
    <Modal
      title={`Payout schedule — ${account.currency} (${account.name})`}
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
          <EbayButton priority="primary" disabled={!amountValid} aria-disabled={!amountValid} onClick={() => onSave(next)}>
            Save schedule
          </EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <Field label="How often">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioRow checked={frequency === "daily"} onSelect={() => setFrequency("daily")}>Every day</RadioRow>
            <RadioRow checked={frequency === "weekly"} onSelect={() => setFrequency("weekly")}>Every week</RadioRow>
            <RadioRow checked={frequency === "monthly"} onSelect={() => setFrequency("monthly")}>Every month</RadioRow>
          </div>
        </Field>

        {/* A weekly or monthly cycle needs a day, or the schedule is incomplete. */}
        {frequency === "weekly" && (
          <Field label="Day of the week">
            <EbaySelect fluid value={weeklyDay} onChange={(ev) => setWeeklyDay((ev.target as HTMLSelectElement).value)}>
              {WEEKDAYS.map((d) => (
                <EbaySelectOption key={d} value={d}>{d}</EbaySelectOption>
              ))}
            </EbaySelect>
          </Field>
        )}
        {frequency === "monthly" && (
          <Field label="Day of the month" hint="Months without this day pay out on the last day.">
            <EbaySelect fluid value={String(monthlyDay)} onChange={(ev) => setMonthlyDay(Number((ev.target as HTMLSelectElement).value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <EbaySelectOption key={d} value={String(d)}>{ordinal(d)}</EbaySelectOption>
              ))}
            </EbaySelect>
          </Field>
        )}

        <Field label="How much to pay out">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <RadioRow checked={amountMode === "available"} onSelect={() => setAmountMode("available")}>
              Available balance
            </RadioRow>
            <RadioRow checked={amountMode === "specified"} onSelect={() => setAmountMode("specified")}>
              Specify the amount
            </RadioRow>
          </div>
        </Field>

        {amountMode === "specified" && (
          <Field
            label={`Amount (${account.currency})`}
            required
            hint="Paid only when the balance covers this amount, otherwise the payout is skipped."
          >
            <EbayTextbox
              fluid
              value={amount}
              onInputChange={(_e, p) => setAmount((p?.value ?? "").replace(/[^\d.]/g, ""))}
              placeholder="0.00"
            />
          </Field>
        )}

        <div style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: 12, fontSize: 13 }}>
          <span style={{ color: "var(--color-foreground-secondary)" }}>This account will pay out </span>
          <strong>{frequencySummary(next).replace(/^Every/, "every")}</strong>
          <span style={{ color: "var(--color-foreground-secondary)" }}>, sending </span>
          <strong>
            {amountMode === "available"
              ? "the available balance"
              : money(amt, account.currency)}
          </strong>
          <span style={{ color: "var(--color-foreground-secondary)" }}>
            {" "}to {account.name}&apos;s default bank account.
          </span>
          <span style={{ display: "block", marginTop: 6, color: "var(--color-foreground-secondary)" }}>
            Currently available: {money(account.available, account.currency)}
          </span>
        </div>
      </div>
    </Modal>
  )
}

function PayoutRequestModal({ entities, onClose }: { entities: BusinessEntity[]; onClose: () => void }) {
  const allAccounts = entities.flatMap((e) => e.logicalAccounts.map((la) => ({ la, entity: e })))
  const [accId, setAccId] = useState(allAccounts[0]?.la.id ?? "")
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<"form" | "confirm">("form")

  const sel = allAccounts.find((a) => a.la.id === accId)
  const verifiedBanks = sel
    ? sel.entity.bankAccounts.filter((b) => b.status === "verified" && b.currency === sel.la.currency)
    : []
  const [bankId, setBankId] = useState(verifiedBanks[0]?.id ?? "")
  const bank = sel?.entity.bankAccounts.find((b) => b.id === bankId)

  const amt = parseFloat(amount || "0")
  const overBalance = sel ? amt > sel.la.available : false
  const valid = sel && amt > 0 && !overBalance && bank

  return (
    <Modal
      title="Request payout"
      onClose={onClose}
      footer={
        step === "form" ? (
          <>
            <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
            <EbayButton priority="primary" disabled={!valid} aria-disabled={!valid} onClick={() => setStep("confirm")}>Review</EbayButton>
          </>
        ) : (
          <>
            <EbayButton priority="tertiary" onClick={() => setStep("form")}>Back</EbayButton>
            <EbayButton priority="primary" onClick={onClose}>Confirm Payout</EbayButton>
          </>
        )
      }
    >
      {step === "form" ? (
        <div className={cards.stack}>
          <Field label="Source logical account" required>
            <EbaySelect
              fluid
              value={accId}
              onChange={(e) => {
                const id = (e.target as HTMLSelectElement).value
                setAccId(id)
                const s = allAccounts.find((a) => a.la.id === id)
                const vb = s ? s.entity.bankAccounts.filter((b) => b.status === "verified" && b.currency === s.la.currency) : []
                setBankId(vb[0]?.id ?? "")
              }}
            >
              {allAccounts.map(({ la, entity }) => (
                <EbaySelectOption key={la.id} value={la.id}>
                  {entity.name} · {la.name} — {money(la.available, la.currency)} available
                </EbaySelectOption>
              ))}
            </EbaySelect>
          </Field>
          <Field
            label="Amount"
            required
            hint={sel ? `Available: ${money(sel.la.available, sel.la.currency)}` : undefined}
          >
            <EbayTextbox fluid value={amount} onInputChange={(_e, p) => setAmount((p?.value ?? "").replace(/[^\d.]/g, ""))} placeholder="0.00" />
            {overBalance && (
              <div style={{ marginTop: 6 }}>
                <EbayInlineNotice status="attention" aria-label="Over balance">
                  <EbayNoticeContent>Amount exceeds available balance of {money(sel!.la.available, sel!.la.currency)}.</EbayNoticeContent>
                </EbayInlineNotice>
              </div>
            )}
          </Field>
          <Field
            label="Destination bank account"
            required
            hint="Only verified accounts with the same owner and currency are shown."
          >
            {verifiedBanks.length ? (
              <EbaySelect fluid value={bankId} onChange={(e) => setBankId((e.target as HTMLSelectElement).value)}>
                {verifiedBanks.map((b) => (
                  <EbaySelectOption key={b.id} value={b.id}>{b.bankName} {b.accountNumberMasked}</EbaySelectOption>
                ))}
              </EbaySelect>
            ) : (
              <EbayInlineNotice status="attention" aria-label="No destination">
                <EbayNoticeContent>No verified {sel?.la.currency} bank account available for this entity.</EbayNoticeContent>
              </EbayInlineNotice>
            )}
          </Field>
          <Field label="Reference / notes">
            <EbayTextbox fluid multiline placeholder="Optional" />
          </Field>
        </div>
      ) : (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Payout summary</h3>
          <div style={{ border: "1px solid var(--color-border-subtle)", borderRadius: "var(--radius-large)", padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <Row label="From" value={`${sel!.la.name} (Available: ${money(sel!.la.available, sel!.la.currency)})`} />
            <Row label="Amount" value={money(amt, sel!.la.currency)} />
            <Row label="To" value={`${bank!.bankName} ${bank!.accountNumberMasked}`} />
            <Row label="Estimated arrival" value="1–3 business days" />
          </div>
        </div>
      )}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: "var(--color-foreground-secondary)" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  )
}
