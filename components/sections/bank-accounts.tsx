"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayRadio } from "@ebay/ui-core-react/ebay-radio"
import { EbayCheckbox } from "@ebay/ui-core-react/ebay-checkbox"
import { EbayInlineNotice, EbayNoticeContent } from "@ebay/ui-core-react/ebay-inline-notice"
import { EbayMenuButton, EbayMenuButtonItem } from "@ebay/ui-core-react/ebay-menu-button"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { EbayIconUpload24 } from "@ebay/ui-core-react/icons/ebay-icon-upload-24"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card, Drawer, Field } from "@/components/ui-bits"
import cards from "@/components/cards.module.css"
import formCards from "@/components/cards.module.css"

export function BankAccounts() {
  const { currentEntity, can } = useStore()
  const [adding, setAdding] = useState(false)
  const banks = currentEntity.bankAccounts

  return (
    <>
      <PageHead
        title={`${currentEntity.name} — Bank Accounts`}
        subtitle="Settlement bank accounts registered to this entity. A verified account is required before it can receive payouts."
        actions={
          can("add-bank-account") ? (
            <EbayButton priority="primary" onClick={() => setAdding(true)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <EbayIconAdd16 aria-hidden="true" /> Add Bank Account
              </span>
            </EbayButton>
          ) : undefined
        }
      />

      {banks.length === 0 ? (
        <Card>
          <div className={cards.empty}>
            <strong style={{ color: "var(--color-foreground-primary)" }}>No bank accounts registered</strong>
            <p style={{ maxWidth: "44ch", margin: 0 }}>
              {can("add-bank-account")
                ? "Add a settlement bank account owned by this entity, then submit a bank statement for verification."
                : "Only Treasury roles can add bank accounts."}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className={cards.tableScroll}>
            <table className={cards.table}>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account holder</th>
                  <th>Account no.</th>
                  <th>Currency</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Added by</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {banks.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>{b.bankName}</strong>
                      {b.isDefaultForCurrency && (
                        <div>
                          <span style={{ fontSize: 11, color: "var(--color-foreground-accent)", fontWeight: 700 }}>
                            Default for {b.currency}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {b.holderName}
                      {b.holderName !== currentEntity.profile.legalName && (
                        <div style={{ fontSize: 11, color: "var(--color-foreground-warning)" }}>Name doesn&apos;t match entity</div>
                      )}
                    </td>
                    <td className={cards.mono}>{b.accountNumberMasked}</td>
                    <td>{b.currency}</td>
                    <td>{b.country}</td>
                    <td>
                      <StatusBadge status={b.status} size="small" />
                      {b.reason && (
                        <div style={{ fontSize: 11, color: "var(--color-foreground-secondary)", marginTop: 4, maxWidth: 200 }}>{b.reason}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--color-foreground-secondary)" }}>{b.addedBy}</td>
                    <td style={{ textAlign: "right" }}>
                      <EbayMenuButton variant="overflow" a11yText={`Actions for ${b.bankName}`}>
                        <EbayMenuButtonItem>Edit</EbayMenuButtonItem>
                        <EbayMenuButtonItem aria-disabled={b.status !== "verified"}>Set as default</EbayMenuButtonItem>
                        <EbayMenuButtonItem>Remove</EbayMenuButtonItem>
                      </EbayMenuButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {banks.some((b) => b.status !== "verified") && (
        <div style={{ marginTop: "var(--spacing-300)" }}>
          <EbayInlineNotice status="information" aria-label="Verification">
            <EbayNoticeContent>
              Accounts in <strong>Pending Verification</strong> cannot be set as default or associated to logical accounts until verified.
            </EbayNoticeContent>
          </EbayInlineNotice>
        </div>
      )}

      {adding && <AddBankDrawer entityName={currentEntity.profile.legalName} onClose={() => setAdding(false)} />}
    </>
  )
}

function AddBankDrawer({ entityName, onClose }: { entityName: string; onClose: () => void }) {
  const [holder, setHolder] = useState(entityName)
  const [currency, setCurrency] = useState("GBP")
  const [country, setCountry] = useState("United Kingdom")
  const [type, setType] = useState<"domestic" | "swift">("domestic")
  const [ack, setAck] = useState(false)
  const nameMismatch = holder.trim() !== "" && holder.trim() !== entityName

  return (
    <Drawer
      title="Add bank account"
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
          <EbayButton priority="primary" disabled={!ack || !holder.trim()} aria-disabled={!ack || !holder.trim()} onClick={onClose}>
            Add & Request Verification
          </EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <Field label="Account holder name" required hint="Must match the entity's registered legal name.">
          <EbayTextbox fluid value={holder} onInputChange={(_e, p) => setHolder(p?.value ?? "")} />
          {nameMismatch && (
            <div style={{ marginTop: 8 }}>
              <EbayInlineNotice status="attention" aria-label="Name mismatch">
                <EbayNoticeContent>
                  Account holder name doesn&apos;t match your registered entity name. Verify this is correct before submitting.
                </EbayNoticeContent>
              </EbayInlineNotice>
            </div>
          )}
        </Field>

        <div className={formCards.formGrid}>
          <Field label="Currency" required>
            <EbaySelect fluid value={currency} onChange={(e) => setCurrency((e.target as HTMLSelectElement).value)}>
              {["GBP", "EUR", "USD", "AUD"].map((c) => <EbaySelectOption key={c} value={c}>{c}</EbaySelectOption>)}
            </EbaySelect>
          </Field>
          <Field label="Country" required>
            <EbaySelect fluid value={country} onChange={(e) => setCountry((e.target as HTMLSelectElement).value)}>
              {["United Kingdom", "Germany", "United States", "Australia"].map((c) => <EbaySelectOption key={c} value={c}>{c}</EbaySelectOption>)}
            </EbaySelect>
          </Field>
        </div>

        <Field label="Account type">
          <div className={cards.row} style={{ gap: 20 }}>
            <EbayRadio checked={type === "domestic"} onChange={() => setType("domestic")}>Domestic</EbayRadio>
            <EbayRadio checked={type === "swift"} onChange={() => setType("swift")}>SWIFT / International</EbayRadio>
          </div>
        </Field>

        <div className={formCards.formGrid}>
          <Field label={country === "Germany" ? "IBAN" : "Sort code"} required>
            <EbayTextbox fluid placeholder={country === "Germany" ? "DE00 0000 0000 0000 0000 00" : "00-00-00"} />
          </Field>
          <Field label="Account number" required>
            <EbayTextbox fluid placeholder="12345678" />
          </Field>
          {type === "swift" && (
            <Field label="BIC / SWIFT code" required>
              <EbayTextbox fluid placeholder="BARCGB22" />
            </Field>
          )}
          <Field label="Bank name" required>
            <EbayTextbox fluid placeholder="Barclays" />
          </Field>
        </div>

        <Field label="Bank statement" required hint="Issued within the last 3 months. PDF, JPG or PNG, up to 10MB.">
          <div className={cards.uploadZone}>
            <EbayIconUpload24 aria-hidden="true" />
            <div style={{ fontWeight: 600, color: "var(--color-foreground-primary)" }}>Drag & drop or click to upload</div>
            <div style={{ fontSize: 12 }}>Required for verification</div>
          </div>
        </Field>

        <EbayCheckbox checked={ack} onChange={(_e, p) => setAck(Boolean(p?.checked))}>
          I confirm this bank account is owned by <strong>{entityName}</strong> and matches the entity on record.
        </EbayCheckbox>
      </div>
    </Drawer>
  )
}
