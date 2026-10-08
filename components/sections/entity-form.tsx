"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayIconButton } from "@ebay/ui-core-react/ebay-icon-button"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { EbayIconDelete16 } from "@ebay/ui-core-react/icons/ebay-icon-delete-16"
import { useStore } from "@/lib/store"
import { PageHead, type Section } from "@/components/app-shell"
import { Card, CardHead, Field, FileDropzone } from "@/components/ui-bits"
import { createBusinessEntity, type EntityDraft } from "@/lib/data"
import type { BeneficialOwner, BusinessProfile, EntityType } from "@/lib/types"
import cards from "@/components/cards.module.css"

const ENTITY_TYPES: EntityType[] = ["Sole Proprietor", "Private Company", "Public Company", "Partnership", "Non-Profit"]
const DESIGNATIONS: BeneficialOwner["relationship"][] = ["Owner", "Director", "Executive"]

// The document checklist a new entity starts with — mirrors lib/data NEW_ENTITY_DOCS.
const REQUIRED_DOCS = [
  "Certificate of Incorporation",
  "Proof of Business Address",
  "Memorandum of Association",
  "Government-issued ID (each contact)",
]

type ContactDraft = Pick<BeneficialOwner, "name" | "email" | "relationship">

export function NewBusinessEntity({ onDone }: { onDone: (s: Section) => void }) {
  const { addEntity } = useStore()

  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [tradingName, setTradingName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [entityType, setEntityType] = useState<EntityType>("Private Company")
  const [formationDate, setFormationDate] = useState("")
  const [taxIdLabel, setTaxIdLabel] = useState("VAT Number")
  const [taxId, setTaxId] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [website, setWebsite] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [postal, setPostal] = useState("")
  const [country, setCountry] = useState("")
  const [activityDescription, setActivityDescription] = useState("")

  const [contacts, setContacts] = useState<ContactDraft[]>([{ name: "", email: "", relationship: "Owner" }])
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({})

  // A draft can be saved with almost anything; a submission needs the core
  // identity fields and at least one named contact.
  const canSubmit =
    legalName.trim().length > 0 &&
    registrationNumber.trim().length > 0 &&
    jurisdiction.trim().length > 0 &&
    contacts.some((c) => c.name.trim().length > 0)

  function updateContact(i: number, patch: Partial<ContactDraft>) {
    setContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function buildDraft(): EntityDraft {
    const profile: BusinessProfile = {
      legalName: legalName.trim(),
      tradingName: tradingName.trim() || undefined,
      registrationNumber: registrationNumber.trim(),
      entityType,
      formationDate: formationDate.trim(),
      taxId: taxId.trim(),
      taxIdLabel: taxIdLabel.trim() || "Tax ID",
      jurisdiction: jurisdiction.trim(),
      address: {
        street: street.trim(),
        city: city.trim(),
        region: region.trim(),
        postal: postal.trim(),
        country: country.trim(),
      },
      website: website.trim() || undefined,
      activityDescription: activityDescription.trim(),
    }
    return {
      name: name.trim() || tradingName.trim() || legalName.trim(),
      profile,
      contacts: contacts.filter((c) => c.name.trim().length > 0),
      uploadedDocNames: REQUIRED_DOCS.filter((d) => !!docFiles[d]),
    }
  }

  function finish(submitted: boolean) {
    const entity = createBusinessEntity(buildDraft(), submitted)
    addEntity(entity)
    onDone("entities")
  }

  return (
    <>
      <PageHead
        title="New Business Entity"
        subtitle="Provide the legal entity details, contacts, and business documents. Save as a draft to finish later, or submit for verification."
        actions={
          <span style={{ display: "inline-flex", gap: 8 }}>
            <EbayButton priority="tertiary" onClick={() => onDone("entities")}>
              Cancel
            </EbayButton>
            <EbayButton priority="secondary" onClick={() => finish(false)}>
              Save draft
            </EbayButton>
            <EbayButton priority="primary" disabled={!canSubmit} aria-disabled={!canSubmit} onClick={() => finish(true)}>
              Submit
            </EbayButton>
          </span>
        }
      />

      <div className={cards.stack}>
        {/* Business profile */}
        <Card>
          <CardHead title="Business profile" subtitle="Must match your official registration documents." />
          <div className={cards.cardPad}>
            <div className={cards.defGrid}>
              <Field label="Entity display name" hint="Shown on the Business Entities tile.">
                <EbayTextbox fluid value={name} onInputChange={(_e, p) => setName(p?.value ?? "")} placeholder="e.g. Tise DE" />
              </Field>
              <Field label="Legal business name" required>
                <EbayTextbox fluid value={legalName} onInputChange={(_e, p) => setLegalName(p?.value ?? "")} placeholder="Tise Technologies GmbH" />
              </Field>
              <Field label="Trading name / DBA">
                <EbayTextbox fluid value={tradingName} onInputChange={(_e, p) => setTradingName(p?.value ?? "")} placeholder="Tise" />
              </Field>
              <Field label="Registration number" required>
                <EbayTextbox fluid value={registrationNumber} onInputChange={(_e, p) => setRegistrationNumber(p?.value ?? "")} placeholder="DE-000000000" />
              </Field>
              <Field label="Entity type" required>
                <EbaySelect fluid value={entityType} onChange={(e) => setEntityType((e.target as HTMLSelectElement).value as EntityType)}>
                  {ENTITY_TYPES.map((t) => (
                    <EbaySelectOption key={t} value={t}>{t}</EbaySelectOption>
                  ))}
                </EbaySelect>
              </Field>
              <Field label="Date of formation">
                <EbayTextbox fluid value={formationDate} onInputChange={(_e, p) => setFormationDate(p?.value ?? "")} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="Tax ID label" hint="e.g. VAT Number, EIN, ABN.">
                <EbayTextbox fluid value={taxIdLabel} onInputChange={(_e, p) => setTaxIdLabel(p?.value ?? "")} placeholder="VAT Number" />
              </Field>
              <Field label={taxIdLabel || "Tax ID"}>
                <EbayTextbox fluid value={taxId} onInputChange={(_e, p) => setTaxId(p?.value ?? "")} placeholder="DE000000000" />
              </Field>
              <Field label="Jurisdiction / country" required>
                <EbayTextbox fluid value={jurisdiction} onInputChange={(_e, p) => setJurisdiction(p?.value ?? "")} placeholder="Germany" />
              </Field>
              <Field label="Business website">
                <EbayTextbox fluid value={website} onInputChange={(_e, p) => setWebsite(p?.value ?? "")} placeholder="https://tise.com" />
              </Field>

              <Field label="Street" full>
                <EbayTextbox fluid value={street} onInputChange={(_e, p) => setStreet(p?.value ?? "")} placeholder="12 Example Strasse" />
              </Field>
              <Field label="City">
                <EbayTextbox fluid value={city} onInputChange={(_e, p) => setCity(p?.value ?? "")} placeholder="Berlin" />
              </Field>
              <Field label="Region / state">
                <EbayTextbox fluid value={region} onInputChange={(_e, p) => setRegion(p?.value ?? "")} placeholder="Berlin" />
              </Field>
              <Field label="Postal code">
                <EbayTextbox fluid value={postal} onInputChange={(_e, p) => setPostal(p?.value ?? "")} placeholder="10115" />
              </Field>
              <Field label="Country">
                <EbayTextbox fluid value={country} onInputChange={(_e, p) => setCountry(p?.value ?? "")} placeholder="Germany" />
              </Field>

              <Field label="Business activity description" full>
                <EbayTextbox
                  fluid
                  multiline
                  value={activityDescription}
                  onInputChange={(_e, p) => setActivityDescription(p?.value ?? "")}
                  placeholder="Describe what the business does."
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHead
            title="Contacts"
            subtitle="Beneficial owners, directors, and executives."
            actions={
              <EbayButton
                priority="secondary"
                size="small"
                onClick={() => setContacts((prev) => [...prev, { name: "", email: "", relationship: "Owner" }])}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <EbayIconAdd16 aria-hidden="true" /> Add contact
                </span>
              </EbayButton>
            }
          />
          <div className={cards.cardPad}>
            <div className={cards.cardGrid}>
              {contacts.map((c, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "var(--radius-large)",
                    padding: "var(--spacing-300)",
                  }}
                >
                  <div className={cards.rowBetween} style={{ marginBottom: "var(--spacing-250)" }}>
                    <strong>Contact {i + 1}</strong>
                    {contacts.length > 1 && (
                      <EbayIconButton
                        icon={<EbayIconDelete16 />}
                        aria-label={`Remove contact ${i + 1}`}
                        onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
                      />
                    )}
                  </div>
                  <div className={cards.stackSm}>
                    <Field label="Name" required>
                      <EbayTextbox fluid value={c.name} onInputChange={(_e, p) => updateContact(i, { name: p?.value ?? "" })} />
                    </Field>
                    <Field label="Designation" required>
                      <EbaySelect
                        fluid
                        value={c.relationship}
                        onChange={(e) => updateContact(i, { relationship: (e.target as HTMLSelectElement).value as BeneficialOwner["relationship"] })}
                      >
                        {DESIGNATIONS.map((r) => (
                          <EbaySelectOption key={r} value={r}>{r}</EbaySelectOption>
                        ))}
                      </EbaySelect>
                    </Field>
                    <Field label="Email">
                      <EbayTextbox fluid value={c.email} onInputChange={(_e, p) => updateContact(i, { email: p?.value ?? "" })} placeholder="name@company.com" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Documents */}
        <Card>
          <CardHead title="Business documents" subtitle="PDF, JPG or PNG · up to 10MB each. You can upload these now or after saving." />
          <div className={cards.cardPad}>
            <div className={cards.cardGrid}>
              {REQUIRED_DOCS.map((d) => (
                <div key={d}>
                  <span className={cards.fieldLabel}>{d}</span>
                  <FileDropzone file={docFiles[d] ?? null} onFile={(f) => setDocFiles((prev) => ({ ...prev, [d]: f }))} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
