"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayIconButton } from "@ebay/ui-core-react/ebay-icon-button"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { EbayIconPencil16 } from "@ebay/ui-core-react/icons/ebay-icon-pencil-16"
import { EbayIconDelete16 } from "@ebay/ui-core-react/icons/ebay-icon-delete-16"
import { EbayIconFile16 } from "@ebay/ui-core-react/icons/ebay-icon-file-16"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead, type Section } from "@/components/app-shell"
import { Card, CardHead, Def, Drawer, Field, FileDropzone } from "@/components/ui-bits"
import { OnboardingStepper } from "./onboarding-stepper"
import { Services } from "./services"
import type { BeneficialOwner, DocStatus } from "@/lib/types"
import cards from "@/components/cards.module.css"
import shell from "@/components/shell.module.css"

const DOC_STATUS: Record<DocStatus, { label: string; tone: "success" | "info" | "attention" | "neutral" }> = {
  accepted: { label: "Accepted", tone: "success" },
  "under-review": { label: "Under Review", tone: "info" },
  rejected: { label: "Rejected", tone: "attention" },
  expired: { label: "Expired", tone: "attention" },
  missing: { label: "Not uploaded", tone: "neutral" },
}

export function ProfileKyc({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { currentEntity, can } = useStore()
  const e = currentEntity
  const p = e.profile
  const editable = can("submit-kyc")

  const [tab, setTab] = useState<"profile" | "services">("profile")

  // Upload-documents drawer state.
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docType, setDocType] = useState("")
  const [otherName, setOtherName] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Contact drawer state: an existing contact (edit) or "new" (add). Null = closed.
  const [contactDrawer, setContactDrawer] = useState<BeneficialOwner | "new" | null>(null)
  const [removedIds, setRemovedIds] = useState<string[]>([])

  function closeUpload() {
    setUploadOpen(false)
    setDocType("")
    setOtherName("")
    setUploadFile(null)
  }

  const uploadValid = (docType === "Other" ? otherName.trim().length > 0 : docType.length > 0) && !!uploadFile

  return (
    <>
      <PageHead
        title="Entity settings"
        subtitle="Legal entity details, contacts, business documents, and subscribed services."
        actions={<StatusBadge status={e.profileStatus} />}
      />

      <div className={shell.tabbar} role="tablist" aria-label="Entity settings">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className={`${shell.tab} ${tab === "profile" ? shell.tabActive : ""}`}
          onClick={() => setTab("profile")}
        >
          Business profile
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "services"}
          className={`${shell.tab} ${tab === "services" ? shell.tabActive : ""}`}
          onClick={() => setTab("services")}
        >
          Services
        </button>
      </div>

      {tab === "services" ? (
        <Services embedded />
      ) : (
        <>
      {e.onboarding && (
        <div style={{ marginBottom: "var(--spacing-400)" }}>
          <OnboardingStepper entity={e} onNavigate={onNavigate} />
        </div>
      )}

      <div className={cards.stack}>
        {/* Business Profile */}
        <Card>
          <CardHead
            title="Business profile"
            subtitle="Must match your official registration documents."
            actions={
              editable && e.profileStatus !== "verified" ? (
                <EbayButton priority="secondary" size="small">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <EbayIconPencil16 aria-hidden="true" /> Edit
                  </span>
                </EbayButton>
              ) : undefined
            }
          />
          <div className={cards.cardPad}>
            <div className={cards.defGrid}>
              <Def label="Legal business name">{p.legalName}</Def>
              <Def label="Trading name / DBA">{p.tradingName ?? "—"}</Def>
              <Def label="Registration number">{p.registrationNumber}</Def>
              <Def label="Entity type">{p.entityType}</Def>
              <Def label="Date of formation">{p.formationDate}</Def>
              <Def label={p.taxIdLabel}>{p.taxId}</Def>
              <Def label="Jurisdiction / country">
                {p.jurisdiction}
                {e.profileStatus === "verified" && (
                  <span style={{ color: "var(--color-foreground-secondary)", fontSize: 12 }}> (locked after approval)</span>
                )}
              </Def>
              <Def label="Business website">{p.website ?? "—"}</Def>
              <div className={cards.defFull}>
                <Def label="Registered business address">
                  {p.address.street}, {p.address.city}, {p.address.region} {p.address.postal}, {p.address.country}
                </Def>
              </div>
              <div className={cards.defFull}>
                <Def label="Business activity description">{p.activityDescription}</Def>
              </div>
            </div>
          </div>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHead
            title="Contacts"
            actions={
              editable ? (
                <EbayButton priority="secondary" size="small" onClick={() => setContactDrawer("new")}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <EbayIconAdd16 aria-hidden="true" /> Add contact
                  </span>
                </EbayButton>
              ) : undefined
            }
          />
          <div className={cards.cardPad}>
            <div className={cards.cardGrid}>
              {e.owners
                .filter((o) => !removedIds.includes(o.id))
                .map((o) => {
                  const verified = o.status === "verified"
                  return (
                    <div
                      key={o.id}
                      style={{
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: "var(--radius-large)",
                        padding: "var(--spacing-300)",
                      }}
                    >
                      <div className={cards.rowBetween}>
                        <strong>{o.name}</strong>
                        {editable && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                            <EbayIconButton
                              icon={<EbayIconPencil16 />}
                              aria-label={`Edit ${o.name}`}
                              onClick={() => setContactDrawer(o)}
                            />
                            <EbayIconButton
                              icon={<EbayIconDelete16 />}
                              aria-label={`Delete ${o.name}`}
                              onClick={() => setRemovedIds((ids) => [...ids, o.id])}
                            />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--color-foreground-secondary)", marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>{o.relationship}</span>
                        <span>{o.email}</span>
                      </div>
                      <div style={{ marginTop: "var(--spacing-250)" }}>
                        <StatusBadge
                          status={verified ? "verified" : "submitted"}
                          label={verified ? "Verified" : "Verification pending"}
                          size="small"
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </Card>

        {/* Documents */}
        <Card>
          <CardHead
            title="Business documents"
            subtitle="PDF, JPG or PNG · up to 10MB each."
            actions={
              editable ? (
                <EbayButton priority="secondary" size="small" onClick={() => setUploadOpen(true)}>
                  Upload Documents
                </EbayButton>
              ) : undefined
            }
          />
          <div className={cards.cardPad}>
            <div className={cards.tableScroll}>
              <table className={cards.table}>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Requirement</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {e.documents.map((d) => {
                    const s = DOC_STATUS[d.status]
                    return (
                      <tr key={d.id}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <EbayIconFile16 aria-hidden="true" /> {d.name}
                          </span>
                          {d.note && (
                            <div style={{ fontSize: 12, color: "var(--color-foreground-attention)", marginTop: 4 }}>{d.note}</div>
                          )}
                        </td>
                        <td style={{ textTransform: "capitalize", color: "var(--color-foreground-secondary)" }}>{d.required}</td>
                        <td style={{ color: "var(--color-foreground-secondary)" }}>{d.uploadedAt ?? "—"}</td>
                        <td>
                          <StatusBadge
                            status={
                              d.status === "accepted"
                                ? "verified"
                                : d.status === "under-review"
                                  ? "submitted"
                                  : d.status === "missing"
                                    ? "inactive"
                                    : "action-required"
                            }
                            label={s.label}
                            size="small"
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {(d.status === "rejected" || d.status === "expired" || d.status === "missing") && editable && (
                            <EbayButton size="small" priority="secondary">
                              {d.status === "missing" ? "Upload" : "Re-upload"}
                            </EbayButton>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
        </>
      )}

      {/* Upload documents drawer */}
      {uploadOpen && (
        <Drawer
          title="Upload documents"
          onClose={closeUpload}
          footer={
            <>
              <EbayButton priority="tertiary" onClick={closeUpload}>
                Cancel
              </EbayButton>
              <EbayButton priority="primary" disabled={!uploadValid} aria-disabled={!uploadValid} onClick={closeUpload}>
                Submit
              </EbayButton>
            </>
          }
        >
          <div className={cards.stack}>
            <Field label="Document type" required>
              <EbaySelect fluid value={docType} onChange={(ev) => setDocType((ev.target as HTMLSelectElement).value)}>
                <EbaySelectOption value="">Select a document type</EbaySelectOption>
                {e.documents.map((d) => (
                  <EbaySelectOption key={d.id} value={d.name}>
                    {d.name}
                  </EbaySelectOption>
                ))}
                <EbaySelectOption value="Other">Other</EbaySelectOption>
              </EbaySelect>
            </Field>

            {docType === "Other" && (
              <Field label="Document name" required hint="Give this document a clear, descriptive name.">
                <EbayTextbox
                  fluid
                  value={otherName}
                  onInputChange={(_ev, pl) => setOtherName(pl?.value ?? "")}
                  placeholder="e.g. Board Resolution"
                />
              </Field>
            )}

            <Field label="File" required>
              <FileDropzone file={uploadFile} onFile={setUploadFile} />
            </Field>
          </div>
        </Drawer>
      )}

      {/* Add / edit contact drawer */}
      {contactDrawer && (
        <ContactDrawer
          contact={contactDrawer === "new" ? null : contactDrawer}
          onClose={() => setContactDrawer(null)}
        />
      )}
    </>
  )
}

function ContactDrawer({ contact, onClose }: { contact: BeneficialOwner | null; onClose: () => void }) {
  const [name, setName] = useState(contact?.name ?? "")
  const [email, setEmail] = useState(contact?.email ?? "")
  const [designation, setDesignation] = useState<BeneficialOwner["relationship"]>(contact?.relationship ?? "Owner")
  const [file, setFile] = useState<File | null>(null)

  // Previously uploaded identity documents for an existing contact.
  const priorDocs: { name: string; status: DocStatus }[] = contact
    ? [
        { name: "Government-issued ID", status: contact.docsComplete ? "accepted" : "missing" },
        { name: "Proof of address", status: contact.docsComplete ? "accepted" : "under-review" },
      ]
    : []

  return (
    <Drawer
      title={contact ? "Edit contact" : "Add contact"}
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>
            Cancel
          </EbayButton>
          <EbayButton priority="primary" onClick={onClose}>
            Submit
          </EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <Field label="Name" required>
          <EbayTextbox fluid value={name} onInputChange={(_ev, pl) => setName(pl?.value ?? "")} />
        </Field>
        <Field label="Designation" required>
          <EbaySelect fluid value={designation} onChange={(ev) => setDesignation((ev.target as HTMLSelectElement).value as BeneficialOwner["relationship"])}>
            {["Owner", "Director", "Executive"].map((r) => (
              <EbaySelectOption key={r} value={r}>
                {r}
              </EbaySelectOption>
            ))}
          </EbaySelect>
        </Field>
        <Field label="Email" required>
          <EbayTextbox fluid value={email} onInputChange={(_ev, pl) => setEmail(pl?.value ?? "")} placeholder="name@company.com" />
        </Field>

        <div>
          <span className={cards.fieldLabel}>Documents</span>
          {priorDocs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "var(--spacing-250)" }}>
            {priorDocs.map((d) => (
              <div
                key={d.name}
                className={cards.rowBetween}
                style={{
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-large)",
                  padding: "var(--spacing-200) var(--spacing-300)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <EbayIconFile16 aria-hidden="true" /> {d.name}
                </span>
                <StatusBadge
                  status={d.status === "accepted" ? "verified" : d.status === "under-review" ? "submitted" : "inactive"}
                  label={DOC_STATUS[d.status].label}
                  size="small"
                />
              </div>
            ))}
          </div>
          )}
          <FileDropzone file={file} onFile={setFile} hint="Upload a new document · PDF, JPG or PNG" />
        </div>
      </div>
    </Drawer>
  )
}
