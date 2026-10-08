"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { Card, Field } from "@/components/ui-bits"
import { PageHead } from "@/components/app-shell"
import cards from "@/components/cards.module.css"

// Dropdown option sets. Labels/first field names are taken verbatim from the
// Figma frame (including "Notescc") and are not paraphrased.
const TEAMS = ["Financial Crime", "Sanctions", "EDD / Enhanced Due Diligence", "Fraud Operations", "Regulatory Reporting"]
const REASONS = [
  "Suspected money laundering",
  "Sanctions match",
  "Document discrepancy",
  "PEP / adverse media",
  "Unusual transaction activity",
]
const DOCUMENT_TYPES = [
  "Certificate of Incorporation",
  "Proof of Business Address",
  "Government-issued ID",
  "Bank statement",
  "Source of funds",
]
const REQUESTED_ACTIONS = ["Review case", "Request more information", "Escalate", "Approve", "Reject"]
const OOTP_OPTIONS = ["Yes", "No"]

const NOTES_MAX = 750

const EMPTY = {
  team: "",
  reason: "",
  documentType: "",
  requestedAction: "",
  notes: "",
  ootp: "",
}

// Columns of the referral summary table, verbatim from the Figma frame.
const SUMMARY_COLUMNS = [
  "From",
  "Team",
  "UseCase",
  "Date",
  "Reason",
  "Customer Segment",
  "Document Type",
  "Requested Action/Outcome",
  "Teammate Comments",
] as const

interface ReferralRow {
  id: string
  from: string
  team: string
  useCase: string
  date: string
  reason: string
  segment: string
  documentType: string
  action: string
  comments: string
}

export function ComplianceReferrals() {
  const [form, setForm] = useState({ ...EMPTY })
  const [submitted, setSubmitted] = useState(false)
  const [rows, setRows] = useState<ReferralRow[]>([])

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function clearAll() {
    setForm({ ...EMPTY })
    setSubmitted(false)
  }

  function submit() {
    // A submitted referral is initiated by the Compliance team ("From") and
    // shows up as a row in the referral summary table below.
    const row: ReferralRow = {
      id: `ref-${Date.now().toString(36)}`,
      from: "Compliance",
      team: form.team || "—",
      useCase: form.ootp === "Yes" ? "OOTP" : "Standard",
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      reason: form.reason || "—",
      segment: "B2C",
      documentType: form.documentType || "—",
      action: form.requestedAction || "—",
      comments: form.notes || "—",
    }
    setRows((prev) => [row, ...prev])
    setSubmitted(true)
    setForm({ ...EMPTY })
  }

  return (
    <>
      <PageHead
        title="Compliance referrals"
        subtitle="Refer a case to another compliance team for review or action."
      />

      {submitted && (
        <div
          role="status"
          style={{
            marginBottom: "var(--spacing-350)",
            padding: "var(--spacing-300) var(--spacing-350)",
            borderRadius: "var(--radius-large)",
            background: "var(--color-background-positive, #edf7ed)",
            border: "1px solid var(--color-border-positive, #9ac89a)",
            color: "var(--color-foreground-primary)",
            fontSize: 14,
          }}
        >
          Referral submitted{form.team ? ` to ${form.team}` : ""}.
        </div>
      )}

      <Card>
        <div className={cards.cardPad}>
          <div className={cards.defGrid}>
            <Field label="1. Select a team to refer case to">
              <EbaySelect
                fluid
                value={form.team}
                onChange={(e) => set("team", (e.target as HTMLSelectElement).value)}
              >
                <EbaySelectOption value="">Select</EbaySelectOption>
                {TEAMS.map((t) => (
                  <EbaySelectOption key={t} value={t}>
                    {t}
                  </EbaySelectOption>
                ))}
              </EbaySelect>
            </Field>

            <Field label="2. Choose a reason">
              <EbaySelect
                fluid
                value={form.reason}
                onChange={(e) => set("reason", (e.target as HTMLSelectElement).value)}
              >
                <EbaySelectOption value="">Select</EbaySelectOption>
                {REASONS.map((r) => (
                  <EbaySelectOption key={r} value={r}>
                    {r}
                  </EbaySelectOption>
                ))}
              </EbaySelect>
            </Field>

            <Field label="3. Choose a document type">
              <EbaySelect
                fluid
                value={form.documentType}
                onChange={(e) => set("documentType", (e.target as HTMLSelectElement).value)}
              >
                <EbaySelectOption value="">Select</EbaySelectOption>
                {DOCUMENT_TYPES.map((d) => (
                  <EbaySelectOption key={d} value={d}>
                    {d}
                  </EbaySelectOption>
                ))}
              </EbaySelect>
            </Field>

            <Field label="4. Requested action">
              <EbaySelect
                fluid
                value={form.requestedAction}
                onChange={(e) => set("requestedAction", (e.target as HTMLSelectElement).value)}
              >
                <EbaySelectOption value="">Select</EbaySelectOption>
                {REQUESTED_ACTIONS.map((a) => (
                  <EbaySelectOption key={a} value={a}>
                    {a}
                  </EbaySelectOption>
                ))}
              </EbaySelect>
            </Field>

            <Field label="5. Notescc">
              <EbayTextbox
                fluid
                multiline
                value={form.notes}
                onInputChange={(_e, p) => set("notes", (p?.value ?? "").slice(0, NOTES_MAX))}
                aria-label="5. Notescc"
                style={{ minHeight: 200 }}
              />
              <div
                style={{
                  marginTop: "var(--spacing-100)",
                  textAlign: "right",
                  fontSize: 13,
                  color: "var(--color-foreground-secondary, #707070)",
                }}
              >
                {form.notes.length} /{NOTES_MAX}
              </div>
            </Field>

            <Field label="6. OOTP only">
              <EbaySelect
                fluid
                value={form.ootp}
                onChange={(e) => set("ootp", (e.target as HTMLSelectElement).value)}
              >
                <EbaySelectOption value="">Select</EbaySelectOption>
                {OOTP_OPTIONS.map((o) => (
                  <EbaySelectOption key={o} value={o}>
                    {o}
                  </EbaySelectOption>
                ))}
              </EbaySelect>
            </Field>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "var(--spacing-250)",
              marginTop: "var(--spacing-400)",
            }}
          >
            <EbayButton priority="secondary" onClick={clearAll}>
              Clear all
            </EbayButton>
            <EbayButton priority="primary" onClick={submit}>
              Submit
            </EbayButton>
          </div>
        </div>
      </Card>

      <section style={{ marginTop: "var(--spacing-500)" }}>
        <h3
          style={{
            margin: "0 0 var(--spacing-300)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-foreground-primary, #191919)",
          }}
        >
          Referral summary
        </h3>

        <Card>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                color: "var(--color-foreground-primary, #191919)",
              }}
            >
              <thead>
                <tr>
                  {SUMMARY_COLUMNS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        textAlign: "left",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        padding: "16px",
                        background: "rgba(0,0,0,0.04)",
                        borderBottom: "1px solid var(--color-border, #e5e5e5)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={SUMMARY_COLUMNS.length}
                      style={{
                        padding: "24px 16px",
                        textAlign: "center",
                        color: "var(--color-foreground-secondary, #707070)",
                      }}
                    >
                      No referrals yet. Submitted referrals will appear here.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <Cell>{r.from}</Cell>
                      <Cell>{r.team}</Cell>
                      <Cell>{r.useCase}</Cell>
                      <Cell>{r.date}</Cell>
                      <Cell>{r.reason}</Cell>
                      <Cell>{r.segment}</Cell>
                      <Cell>
                        {r.documentType}
                        <span
                          style={{
                            display: "block",
                            marginTop: 2,
                            fontSize: 13,
                            color: "#288034",
                          }}
                        >
                          Verified
                        </span>
                      </Cell>
                      <Cell>{r.action}</Cell>
                      <Cell>{r.comments}</Cell>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "16px",
        verticalAlign: "top",
        borderBottom: "1px solid var(--color-border, #e5e5e5)",
      }}
    >
      {children}
    </td>
  )
}
