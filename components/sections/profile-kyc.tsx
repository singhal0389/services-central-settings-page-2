"use client"

import { useState, type ReactNode } from "react"
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
import { Card, CardHead, Def, Drawer, Field, FileDropzone, Modal } from "@/components/ui-bits"
import { OnboardingStepper } from "./onboarding-stepper"
import { Services } from "./services"
import type { BeneficialOwner, BusinessDocument, DocStatus } from "@/lib/types"
import cards from "@/components/cards.module.css"
import shell from "@/components/shell.module.css"

const DOC_STATUS: Record<DocStatus, { label: string }> = {
  accepted: { label: "Accepted" },
  "under-review": { label: "Under Review" },
  rejected: { label: "Rejected" },
  expired: { label: "Expired" },
  missing: { label: "Not uploaded" },
}

const PAGE_SIZES = [10, 25, 50]
const LEGAL_REP_RULE = "One legal representative is required on this account."

// Owners administer the account; directors and executives act as the legal
// representative. The design shows these as tags on each contact tile.
function classificationOf(o: BeneficialOwner): string[] {
  return o.relationship === "Owner" ? ["Business Account"] : ["Legal"]
}

function isLegal(o: BeneficialOwner) {
  return classificationOf(o).includes("Legal")
}

export function ProfileKyc({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { currentEntity } = useStore()
  // Keyed by entity so local edits never leak between entities.
  return <ProfileKycInner key={currentEntity.id} onNavigate={onNavigate} />
}

function ProfileKycInner({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { currentEntity, can } = useStore()
  const e = currentEntity
  const p = e.profile
  const editable = can("submit-kyc")

  const [tab, setTab] = useState<"profile" | "services">("profile")

  // Approval: once Company Information is submitted it is not changeable.
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [submitted, setSubmitted] = useState(e.profileStatus === "submitted")
  const verified = e.profileStatus === "verified"
  const locked = verified || submitted

  // Documents
  const [docs, setDocs] = useState<BusinessDocument[]>(e.documents)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docType, setDocType] = useState("")
  const [otherName, setOtherName] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Contacts
  const [contactDrawer, setContactDrawer] = useState<BeneficialOwner | "new" | null>(null)
  const [added, setAdded] = useState<BeneficialOwner[]>([])
  const [edits, setEdits] = useState<Record<string, Partial<BeneficialOwner>>>({})
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState<BeneficialOwner | null>(null)

  const contacts = [...e.owners, ...added]
    .filter((o) => !removedIds.includes(o.id))
    .map((o) => ({ ...o, ...edits[o.id] }))
  const legalCount = contacts.filter(isLegal).length
  const legalMissing = legalCount === 0

  const expiredDocs = docs.filter((d) => d.status === "expired" || (d.status === "rejected" && /expired/i.test(d.note ?? "")))
  const missingDocs = docs.filter((d) => d.status === "missing")

  const totalPages = Math.max(1, Math.ceil(docs.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleDocs = docs.slice(pageStart, pageStart + pageSize)

  function openUpload(preselect = "") {
    setDocType(preselect)
    setUploadOpen(true)
  }

  function closeUpload() {
    setUploadOpen(false)
    setDocType("")
    setOtherName("")
    setUploadFile(null)
  }

  const uploadValid = (docType === "Other" ? otherName.trim().length > 0 : docType.length > 0) && !!uploadFile

  function submitUpload() {
    const name = docType === "Other" ? otherName.trim() : docType
    const today = new Date().toISOString().slice(0, 10)
    setDocs((list) =>
      list.some((d) => d.name === name)
        ? list.map((d) =>
            d.name === name ? { ...d, status: "under-review" as DocStatus, uploadedAt: today, note: undefined } : d,
          )
        : [
            ...list,
            {
              id: `${e.id}-doc-${Date.now()}`,
              name,
              required: "conditional" as const,
              status: "under-review" as DocStatus,
              uploadedAt: today,
            },
          ],
    )
    closeUpload()
  }

  function saveContact(existing: BeneficialOwner | null, v: { name: string; email: string; relationship: BeneficialOwner["relationship"]; hasFile: boolean }) {
    if (existing) {
      setEdits((m) => ({ ...m, [existing.id]: { name: v.name, email: v.email, relationship: v.relationship } }))
    } else {
      setAdded((list) => [
        ...list,
        {
          id: `${e.id}-contact-${Date.now()}`,
          name: v.name,
          email: v.email,
          relationship: v.relationship,
          dob: "",
          address: "",
          ownershipPct: 0,
          status: "submitted",
          docsComplete: v.hasFile,
        },
      ])
    }
    setContactDrawer(null)
  }

  const deletingIsLastLegal = !!deleting && isLegal(deleting) && legalCount <= 1

  return (
    <>
      <PageHead
        title="Entity Settings"
        subtitle="Legal entity details, contacts, business documents, and subscribed services."
        actions={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--spacing-200)" }}>
            <StatusBadge
              status={submitted && !verified ? "submitted" : e.profileStatus}
              label={submitted && !verified ? "Submitted for approval" : undefined}
            />
            {editable && !locked && (
              <EbayButton
                priority="primary"
                disabled={legalMissing}
                aria-disabled={legalMissing}
                onClick={() => setConfirmSubmit(true)}
              >
                Submit for approval
              </EbayButton>
            )}
          </span>
        }
      />

      <div className={shell.tabbar} role="tablist" aria-label="Entity Settings">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          className={`${shell.tab} ${tab === "profile" ? shell.tabActive : ""}`}
          onClick={() => setTab("profile")}
        >
          Business Profile
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

          {editable && (legalMissing || expiredDocs.length > 0 || missingDocs.length > 0) && (
            <div className={cards.stackSm} style={{ marginBottom: "var(--spacing-400)" }}>
              {legalMissing && (
                <ActionNotice
                  title="Legal contact missing"
                  body={LEGAL_REP_RULE}
                  onAction={() => setContactDrawer("new")}
                />
              )}
              {expiredDocs.length > 0 && (
                <ActionNotice
                  title="Business document expired"
                  body={expiredDocs.map((d) => d.name).join(", ")}
                  onAction={() => openUpload(expiredDocs[0].name)}
                />
              )}
              {missingDocs.length > 0 && (
                <ActionNotice
                  title="Business document missing"
                  body={missingDocs.map((d) => d.name).join(", ")}
                  onAction={() => openUpload(missingDocs[0].name)}
                />
              )}
            </div>
          )}

          <div className={cards.stack}>
            {/* Company Information */}
            <Card>
              <CardHead
                title="Company Information"
                subtitle={
                  verified
                    ? "Approved. Company Information can no longer be changed."
                    : submitted
                      ? "Submitted for approval. Company Information can no longer be changed."
                      : "Must match your official registration documents."
                }
                actions={
                  editable && !locked ? (
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
                  <Def label="Jurisdiction / country">{p.jurisdiction}</Def>
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
                {contacts.length === 0 && (
                  <p style={{ margin: 0, color: "var(--color-foreground-secondary)" }}>Nothing here yet.</p>
                )}
                <div className={cards.cardGrid}>
                  {contacts.map((o) => {
                    const isVerified = o.status === "verified"
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
                                onClick={() => setDeleting(o)}
                              />
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--color-foreground-secondary)",
                            marginTop: 6,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span>{o.relationship}</span>
                          <span>Title: {o.relationship === "Owner" ? "—" : o.relationship}</span>
                          <span>{o.email}</span>
                        </div>
                        <div
                          style={{
                            marginTop: "var(--spacing-250)",
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {classificationOf(o).map((c) => (
                            <span
                              key={c}
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "1px 8px",
                                borderRadius: "var(--radius-medium)",
                                border: "1px solid var(--color-border-medium)",
                                color: "var(--color-foreground-primary)",
                              }}
                            >
                              {c}
                            </span>
                          ))}
                          <StatusBadge
                            status={isVerified ? "verified" : "submitted"}
                            label={isVerified ? "Verified" : "Pending verification"}
                            size="small"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* Business Documents */}
            <Card>
              <CardHead
                title="Business Documents"
                subtitle="PDF, JPG or PNG · up to 10MB each."
                actions={
                  editable ? (
                    <EbayButton priority="secondary" size="small" onClick={() => openUpload()}>
                      Upload documents
                    </EbayButton>
                  ) : undefined
                }
              />
              <div className={cards.cardPad}>
                {docs.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--color-foreground-secondary)" }}>Nothing here yet.</p>
                ) : (
                  <div className={cards.tableScroll}>
                    <table className={cards.table}>
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Requirement</th>
                          <th>Uploaded</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDocs.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <EbayIconFile16 aria-hidden="true" /> {d.name}
                              </span>
                              {d.note && (
                                <div style={{ fontSize: 12, color: "var(--color-foreground-attention)", marginTop: 4 }}>
                                  {d.note}
                                </div>
                              )}
                            </td>
                            <td style={{ textTransform: "capitalize", color: "var(--color-foreground-secondary)" }}>
                              {d.required}
                            </td>
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
                                label={DOC_STATUS[d.status].label}
                                size="small"
                              />
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {(d.status === "rejected" || d.status === "expired" || d.status === "missing") &&
                                editable && (
                                  <EbayButton size="small" priority="secondary" onClick={() => openUpload(d.name)}>
                                    {d.status === "missing" ? "Upload" : "Re-upload"}
                                  </EbayButton>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {docs.length > 0 && (
                  <div
                    className={cards.rowBetween}
                    style={{ marginTop: "var(--spacing-300)", flexWrap: "wrap", gap: "var(--spacing-200)" }}
                  >
                    <nav aria-label="Document pages" style={{ display: "inline-flex", gap: 4 }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-current={n === currentPage ? "page" : undefined}
                          onClick={() => setPage(n)}
                          style={{
                            minWidth: 32,
                            height: 32,
                            padding: "0 8px",
                            borderRadius: "var(--radius-medium)",
                            border: "1px solid",
                            borderColor: n === currentPage ? "var(--color-border-accent)" : "transparent",
                            background: "transparent",
                            fontWeight: n === currentPage ? 700 : 400,
                            color: "var(--color-foreground-primary)",
                            cursor: "pointer",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </nav>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--color-foreground-secondary)",
                      }}
                    >
                      Items per page:
                      <EbaySelect
                        value={String(pageSize)}
                        onChange={(ev) => {
                          setPageSize(Number((ev.target as HTMLSelectElement).value))
                          setPage(1)
                        }}
                      >
                        {PAGE_SIZES.map((n) => (
                          <EbaySelectOption key={n} value={String(n)}>
                            {n}
                          </EbaySelectOption>
                        ))}
                      </EbaySelect>
                    </label>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Submit for approval confirmation */}
      {confirmSubmit && (
        <Modal
          title="Submit for approval"
          onClose={() => setConfirmSubmit(false)}
          footer={
            <>
              <EbayButton priority="tertiary" onClick={() => setConfirmSubmit(false)}>
                Cancel
              </EbayButton>
              <EbayButton
                priority="primary"
                onClick={() => {
                  setSubmitted(true)
                  setConfirmSubmit(false)
                }}
              >
                Submit for approval
              </EbayButton>
            </>
          }
        >
          <p style={{ margin: 0 }}>Once you submit this it cannot be undone.</p>
        </Modal>
      )}

      {/* Confirm contact deletion */}
      {deleting && (
        <Modal
          title="Confirm deletion"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <EbayButton priority="tertiary" onClick={() => setDeleting(null)}>
                Cancel
              </EbayButton>
              <EbayButton
                priority="primary"
                disabled={deletingIsLastLegal}
                aria-disabled={deletingIsLastLegal}
                onClick={() => {
                  setRemovedIds((ids) => [...ids, deleting.id])
                  setDeleting(null)
                }}
              >
                Confirm
              </EbayButton>
            </>
          }
        >
          <div className={cards.stackSm}>
            <p style={{ margin: 0 }}>Are you sure you want to delete this contact?</p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: deletingIsLastLegal ? "var(--color-foreground-attention)" : "var(--color-foreground-secondary)",
              }}
            >
              {LEGAL_REP_RULE}
            </p>
          </div>
        </Modal>
      )}

      {/* Upload documents */}
      {uploadOpen && (
        <Drawer
          title="Upload documents"
          onClose={closeUpload}
          footer={
            <>
              <EbayButton priority="tertiary" onClick={closeUpload}>
                Cancel
              </EbayButton>
              <EbayButton priority="primary" disabled={!uploadValid} aria-disabled={!uploadValid} onClick={submitUpload}>
                Submit for approval
              </EbayButton>
            </>
          }
        >
          <div className={cards.stack}>
            <Field label="Document type" required>
              <EbaySelect fluid value={docType} onChange={(ev) => setDocType((ev.target as HTMLSelectElement).value)}>
                <EbaySelectOption value="">Select a document type</EbaySelectOption>
                {docs.map((d) => (
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
              <FileDropzone
                file={uploadFile}
                onFile={setUploadFile}
                title="Drag and drop file"
                hint="Up to 10MB per file in JPG, JPEG, PNG, PDF."
                actionLabel="Upload file"
              />
            </Field>
          </div>
        </Drawer>
      )}

      {/* Add / edit contact */}
      {contactDrawer && (
        <ContactDrawer
          contact={contactDrawer === "new" ? null : contactDrawer}
          onClose={() => setContactDrawer(null)}
          onSave={saveContact}
        />
      )}
    </>
  )
}

function ActionNotice({ title, body, onAction }: { title: string; body: ReactNode; onAction: () => void }) {
  return (
    <div
      role="alert"
      className={cards.rowBetween}
      style={{
        border: "1px solid var(--color-border-subtle)",
        borderLeft: "4px solid var(--color-foreground-attention)",
        borderRadius: "var(--radius-large)",
        background: "var(--color-background-secondary)",
        padding: "var(--spacing-250) var(--spacing-300)",
        gap: "var(--spacing-300)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--color-foreground-secondary)", marginTop: 2 }}>{body}</div>
      </div>
      <EbayButton priority="secondary" size="small" onClick={onAction}>
        Add now
      </EbayButton>
    </div>
  )
}

function ContactDrawer({
  contact,
  onClose,
  onSave,
}: {
  contact: BeneficialOwner | null
  onClose: () => void
  onSave: (
    existing: BeneficialOwner | null,
    v: { name: string; email: string; relationship: BeneficialOwner["relationship"]; hasFile: boolean },
  ) => void
}) {
  const [name, setName] = useState(contact?.name ?? "")
  const [email, setEmail] = useState(contact?.email ?? "")
  const [designation, setDesignation] = useState<BeneficialOwner["relationship"]>(contact?.relationship ?? "Owner")
  const [file, setFile] = useState<File | null>(null)

  const valid = name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim())

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
          <EbayButton
            priority="primary"
            disabled={!valid}
            aria-disabled={!valid}
            onClick={() =>
              onSave(contact, { name: name.trim(), email: email.trim(), relationship: designation, hasFile: !!file })
            }
          >
            Submit for approval
          </EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <Field label="Name" required>
          <EbayTextbox fluid value={name} onInputChange={(_ev, pl) => setName(pl?.value ?? "")} />
        </Field>
        <Field label="Designation" required>
          <EbaySelect
            fluid
            value={designation}
            onChange={(ev) =>
              setDesignation((ev.target as HTMLSelectElement).value as BeneficialOwner["relationship"])
            }
          >
            {["Owner", "Director", "Executive"].map((r) => (
              <EbaySelectOption key={r} value={r}>
                {r}
              </EbaySelectOption>
            ))}
          </EbaySelect>
        </Field>
        <Field label="Email" required>
          <EbayTextbox
            fluid
            value={email}
            onInputChange={(_ev, pl) => setEmail(pl?.value ?? "")}
            placeholder="name@company.com"
          />
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
          <FileDropzone
            file={file}
            onFile={setFile}
            title="Drag and drop file"
            hint="Up to 10MB per file in JPG, JPEG, PNG, PDF."
            actionLabel="Upload file"
          />
        </div>
      </div>
    </Drawer>
  )
}
