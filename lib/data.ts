import type {
  Client,
  PpeCapabilities,
  PaymentMethodDef,
  BusinessEntity,
  BusinessProfile,
  BeneficialOwner,
  Status,
} from "./types"

const ECI_UK_METHODS: PaymentMethodDef[] = [
  { id: "visa", name: "Visa", category: "cards", status: "supported" },
  { id: "mastercard", name: "Mastercard", category: "cards", status: "supported" },
  { id: "amex", name: "American Express", category: "cards", status: "supported" },
  { id: "applepay", name: "Apple Pay", category: "cards", status: "supported", coupledToCards: true },
  { id: "googlepay", name: "Google Pay", category: "cards", status: "supported", coupledToCards: true },
  { id: "diners", name: "Diners / Discover", category: "cards", status: "unsupported" },
  { id: "klarna", name: "Klarna", category: "bnpl", status: "apply" },
  { id: "clearpay", name: "Clearpay", category: "bnpl", status: "apply" },
  { id: "zilch", name: "Zilch", category: "bnpl", status: "apply" },
  { id: "affirm", name: "Affirm", category: "bnpl", status: "unsupported" },
  { id: "bacs", name: "BACS Direct Debit", category: "bank", status: "supported" },
  { id: "sepa", name: "SEPA Direct Debit", category: "bank", status: "supported" },
  { id: "ach", name: "ACH", category: "bank", status: "unsupported" },
  { id: "ideal", name: "iDEAL", category: "bank", status: "supported" },
  { id: "bancontact", name: "Bancontact", category: "regional", status: "supported" },
  { id: "p24", name: "Przelewy24", category: "regional", status: "unsupported" },
]

const ECI_UK: PpeCapabilities = {
  id: "ECI_UK",
  softDescriptorMax: 22,
  mccs: [
    { code: "5999", label: "Miscellaneous Retail" },
    { code: "5968", label: "Direct Marketing" },
    { code: "7372", label: "Computer Programming Services" },
    { code: "5691", label: "Men's & Women's Clothing Stores" },
    { code: "5732", label: "Electronics Stores" },
  ],
  l4lPairs: ["GBP → GBP", "EUR → EUR", "USD → USD"],
  fxPairs: ["USD → GBP", "EUR → GBP", "AUD → GBP", "GBP → EUR"],
  methods: ECI_UK_METHODS,
}

const ECI_AU: PpeCapabilities = {
  id: "ECI_AU",
  softDescriptorMax: 20,
  mccs: [
    { code: "5999", label: "Miscellaneous Retail" },
    { code: "5691", label: "Men's & Women's Clothing Stores" },
    { code: "5732", label: "Electronics Stores" },
  ],
  l4lPairs: ["AUD → AUD", "NZD → NZD"],
  fxPairs: ["USD → AUD", "GBP → AUD"],
  methods: ECI_UK_METHODS.map((m) =>
    m.id === "bacs" || m.id === "ideal" || m.id === "bancontact"
      ? { ...m, status: "unsupported" as const }
      : m,
  ),
}

const methodDefaults = (defs: PaymentMethodDef[], enabled: string[]) =>
  Object.fromEntries(defs.map((m) => [m.id, enabled.includes(m.id)]))

const TISE_EU: BusinessEntity = {
  id: "tise-eu",
  name: "Tise EU",
  jurisdiction: "United Kingdom",
  ppe: "ECI_UK",
  onboarding: false,
  softDescriptor: {
    mode: "dynamic",
    staticDescriptor: "TISE MARKETPLACE",
    staticApproval: "approved",
    prefix: "TISE",
    prefixApproval: "approved",
  },
  profileStatus: "verified",
  profile: {
    legalName: "Tise Technologies Ltd",
    tradingName: "Tise",
    registrationNumber: "GB-10482913",
    entityType: "Private Company",
    formationDate: "2016-03-14",
    taxId: "GB284719201",
    taxIdLabel: "VAT Number",
    jurisdiction: "United Kingdom",
    address: {
      street: "12 Shoreditch High Street",
      city: "London",
      region: "Greater London",
      postal: "E1 6PG",
      country: "United Kingdom",
    },
    website: "https://tise.com",
    activityDescription:
      "Online marketplace for buying and selling second-hand fashion, homeware, and accessories across Europe.",
  },
  owners: [
    {
      id: "ubo-1",
      name: "Anders Berg",
      email: "anders.berg@tise.com",
      dob: "1984-07-22",
      address: "48 Rivington Street, London, EC2A 3AY",
      relationship: "Owner",
      ownershipPct: 42,
      status: "verified",
      docsComplete: true,
    },
    {
      id: "ubo-2",
      name: "Marta Nilsson",
      email: "marta.nilsson@tise.com",
      dob: "1987-11-03",
      address: "9 Redchurch Street, London, E2 7DJ",
      relationship: "Director",
      ownershipPct: 31,
      status: "verified",
      docsComplete: true,
    },
  ],
  documents: [
    { id: "doc-1", name: "Certificate of Incorporation", required: "required", status: "accepted", uploadedAt: "2026-08-11" },
    { id: "doc-2", name: "Proof of Business Address", required: "required", status: "accepted", uploadedAt: "2026-08-11" },
    { id: "doc-3", name: "Memorandum of Association", required: "conditional", status: "accepted", uploadedAt: "2026-08-11" },
    { id: "doc-4", name: "VAT Registration Certificate", required: "conditional", status: "accepted", uploadedAt: "2026-08-12" },
  ],
  channels: [
    {
      id: "pc_8fa21c",
      name: "UK Card Payments",
      description: "Card and wallet acceptance for UK buyers, settling into the GBP default account.",
      ppe: "ECI_UK",
      status: "active",
      defaultCurrency: "GBP",
      createdAt: "2026-08-20",
      mccs: ["5999", "5691"],
      defaultMcc: "5999",
      softDescriptor: "Tise UK",
      softDescriptorMax: 22,
      l4lPairs: ["GBP → GBP", "EUR → EUR"],
      fxPairs: ["USD → GBP"],
      methods: methodDefaults(ECI_UK_METHODS, ["visa", "mastercard", "amex", "applepay", "googlepay", "klarna"]),
      // The three states a method needing its own agreement can be in. Zilch is
      // absent because not having applied is the absence of an application.
      methodApplications: {
        klarna: { status: "approved", submittedAt: "2026-08-22" },
        clearpay: { status: "under-review", submittedAt: "2026-09-08" },
      },
      accountMapping: [
        { currency: "GBP", logicalAccountId: "la-gbp-default" },
        { currency: "EUR", logicalAccountId: "la-eur-default" },
      ],
    },
    {
      id: "pc_3b90de",
      name: "EU Bank Transfers",
      description: "Euro bank transfer and direct debit methods for EU buyers.",
      ppe: "ECI_UK",
      status: "submitted",
      defaultCurrency: "EUR",
      createdAt: "2026-09-01",
      mccs: ["5999"],
      defaultMcc: "5999",
      softDescriptor: "Tise EU",
      softDescriptorMax: 22,
      l4lPairs: ["EUR → EUR"],
      fxPairs: [],
      methods: methodDefaults(ECI_UK_METHODS, ["sepa", "ideal", "bancontact"]),
      accountMapping: [{ currency: "EUR", logicalAccountId: "la-eur-default" }],
    },
  ],
  logicalAccounts: [
    {
      id: "la-gbp-default",
      name: "GBP_DEFAULT",
      currency: "GBP",
      type: "Default",
      available: 40250.75,
      pending: 3120.0,
      reserved: 1500.0,
      owner: "Tise EU",
      linkedBankAccountIds: ["ba-barclays"],
      status: "active",
    },
    {
      id: "la-eur-default",
      name: "EUR_DEFAULT",
      currency: "EUR",
      type: "Default",
      available: 18900.4,
      pending: 540.0,
      reserved: 0,
      owner: "Tise EU",
      linkedBankAccountIds: ["ba-deutsche"],
      status: "active",
    },
    {
      id: "la-gbp-tax",
      name: "Tax Holding - GBP",
      currency: "GBP",
      type: "Additional",
      available: 12500.0,
      pending: 0,
      reserved: 0,
      owner: "Tise EU",
      linkedBankAccountIds: ["ba-barclays"],
      status: "active",
      notes: "Ring-fenced funds held for quarterly VAT settlement.",
    },
  ],
  bankAccounts: [
    {
      id: "ba-barclays",
      bankName: "Barclays",
      holderName: "Tise Technologies Ltd",
      accountNumberMasked: "••••••1234",
      currency: "GBP",
      country: "United Kingdom",
      status: "verified",
      isDefaultForCurrency: true,
      addedBy: "Client Treasury Admin · Priya Shah",
    },
    {
      id: "ba-deutsche",
      bankName: "Deutsche Bank",
      holderName: "Tise Technologies Ltd",
      accountNumberMasked: "••••••5678",
      currency: "EUR",
      country: "Germany",
      status: "pending",
      isDefaultForCurrency: false,
      addedBy: "BE Treasury Admin · Lena Voss",
      reason: "Awaiting review of the uploaded bank statement.",
    },
  ],
  payout: {
    // One schedule per currency account, covering all three frequencies and
    // both amount modes.
    routing: [
      {
        logicalAccountId: "la-gbp-default",
        bankAccountId: "ba-barclays",
        schedule: { frequency: "daily", amountMode: "available" },
      },
      {
        logicalAccountId: "la-eur-default",
        bankAccountId: "ba-deutsche",
        schedule: { frequency: "weekly", weeklyDay: "Tuesday", amountMode: "specified", amount: 5000 },
      },
      {
        logicalAccountId: "la-gbp-tax",
        bankAccountId: "ba-barclays",
        schedule: { frequency: "monthly", monthlyDay: 15, amountMode: "available" },
      },
    ],
  },
  services: [
    { id: "payments", name: "Payments", description: "Core payment processing via Processing Channels.", status: "active", icon: "card", selfService: true },
    { id: "risk", name: "Risk & Fraud", description: "Advanced fraud detection and risk rules.", status: "active", icon: "shield", selfService: false },
    { id: "shipping", name: "Shipping", description: "Shipping label generation and tracking.", status: "inactive", icon: "store", selfService: true },
    { id: "compliance", name: "Compliance", description: "Regulatory compliance monitoring.", status: "inactive", icon: "verified", selfService: true },
    { id: "sva", name: "Seller Virtual Accounts", description: "Enable marketplace seller account functionality.", status: "pending", icon: "profile", selfService: true },
    { id: "capital", name: "Capital", description: "Access to business financing, subject to PPE eligibility.", status: "requires-contract", icon: "money", selfService: false },
  ],
}

const TISE_AU: BusinessEntity = {
  id: "tise-au",
  name: "Tise AU",
  jurisdiction: "Australia",
  ppe: "ECI_AU",
  onboarding: true,
  softDescriptor: {
    mode: "static",
    staticDescriptor: "TISE AU",
    staticApproval: "approved",
    prefix: "TISEAU",
    prefixApproval: "pending",
  },
  profileStatus: "action-required",
  profile: {
    legalName: "Tise Australia Pty Ltd",
    tradingName: "Tise",
    registrationNumber: "AU-64 123 456 789",
    entityType: "Private Company",
    formationDate: "2023-09-01",
    taxId: "64 123 456 789",
    taxIdLabel: "ABN",
    jurisdiction: "Australia",
    address: {
      street: "120 Collins Street",
      city: "Melbourne",
      region: "Victoria",
      postal: "3000",
      country: "Australia",
    },
    website: "https://tise.com/au",
    activityDescription:
      "Australian arm of the Tise second-hand fashion marketplace.",
  },
  owners: [
    {
      id: "ubo-au-1",
      name: "Anders Berg",
      email: "anders.berg@tise.com",
      dob: "1984-07-22",
      address: "48 Rivington Street, London, EC2A 3AY",
      relationship: "Owner",
      ownershipPct: 60,
      status: "pending",
      docsComplete: true,
    },
    {
      id: "ubo-au-2",
      name: "Jane Smith",
      email: "jane.smith@tise.com",
      dob: "1990-02-18",
      address: "17 Flinders Lane, Melbourne, VIC 3000",
      relationship: "Director",
      ownershipPct: 40,
      status: "action-required",
      docsComplete: false,
    },
  ],
  documents: [
    { id: "doc-au-1", name: "Certificate of Incorporation", required: "required", status: "rejected", uploadedAt: "2026-09-28", note: "Document is expired. Upload a copy dated within the last 12 months." },
    { id: "doc-au-2", name: "Proof of Business Address", required: "required", status: "under-review", uploadedAt: "2026-10-01" },
    { id: "doc-au-3", name: "Trade License", required: "conditional", status: "missing" },
  ],
  channels: [],
  logicalAccounts: [],
  bankAccounts: [],
  payout: {
    routing: [],
  },
  services: [
    { id: "payments", name: "Payments", description: "Core payment processing via Processing Channels.", status: "inactive", icon: "card", selfService: true },
    { id: "risk", name: "Risk & Fraud", description: "Advanced fraud detection and risk rules.", status: "inactive", icon: "shield", selfService: false },
    { id: "shipping", name: "Shipping", description: "Shipping label generation and tracking.", status: "inactive", icon: "store", selfService: true },
    { id: "compliance", name: "Compliance", description: "Regulatory compliance monitoring.", status: "inactive", icon: "verified", selfService: true },
    { id: "sva", name: "Seller Virtual Accounts", description: "Enable marketplace seller account functionality.", status: "inactive", icon: "profile", selfService: true },
    { id: "capital", name: "Capital", description: "Access to business financing, subject to PPE eligibility.", status: "requires-contract", icon: "money", selfService: false },
  ],
}

export function getPpe(id: string): PpeCapabilities | undefined {
  return CLIENT.ppes.find((p) => p.id === id)
}

export const CLIENT: Client = {
  id: "tise",
  name: "Tise",
  entities: [TISE_EU, TISE_AU],
  ppes: [ECI_UK, ECI_AU],
  users: [
    { id: "u-1", name: "Priya Shah", email: "priya.shah@tise.com", role: "client-admin", scope: "All entities", status: "active", lastLogin: "2026-09-05 08:42" },
    { id: "u-2", name: "Lena Voss", email: "lena.voss@tise.com", role: "be-admin", scope: "Tise EU", status: "active", lastLogin: "2026-09-04 17:10" },
    { id: "u-3", name: "Tom Fields", email: "tom.fields@tise.com", role: "client-treasury-admin", scope: "All entities", status: "active", lastLogin: "2026-09-05 09:15" },
    { id: "u-4", name: "Mia Chen", email: "mia.chen@tise.com", role: "be-treasury-admin", scope: "Tise EU", status: "active", lastLogin: "2026-09-01 11:03" },
    { id: "u-5", name: "Raf Oduya", email: "raf.oduya@tise.com", role: "be-admin", scope: "Tise AU", status: "invited" },
  ],
}

// Documents every new entity must eventually provide, seeded as "missing" so
// the KYC checklist renders the same rows an established entity has.
const NEW_ENTITY_DOCS = [
  { name: "Certificate of Incorporation", required: "required" as const },
  { name: "Proof of Business Address", required: "required" as const },
  { name: "Memorandum of Association", required: "conditional" as const },
  { name: "Government-issued ID (each contact)", required: "required" as const },
]

export interface EntityDraft {
  name: string
  profile: BusinessProfile
  contacts: Array<Pick<BeneficialOwner, "name" | "email" | "relationship">>
  uploadedDocNames: string[]
}

// Build a fresh BusinessEntity from the New Business Entity form. `submitted`
// distinguishes a saved draft from a submitted (for-review) entity. Services
// are cloned from the standard catalogue, all inactive until subscribed.
export function createBusinessEntity(draft: EntityDraft, submitted: boolean): BusinessEntity {
  const id = `entity-${Date.now().toString(36)}`
  const status: Status = submitted ? "submitted" : "draft"

  return {
    id,
    name: draft.name || draft.profile.legalName || "New entity",
    jurisdiction: draft.profile.jurisdiction || draft.profile.address.country || "—",
    ppe: "ECI_UK",
    onboarding: true,
    softDescriptor: {
      mode: "static",
      staticDescriptor: (draft.profile.tradingName || draft.profile.legalName || "").slice(0, 22),
      staticApproval: "pending",
      prefix: "",
      prefixApproval: "pending",
    },
    profileStatus: status,
    profile: draft.profile,
    owners: draft.contacts.map((c, i) => ({
      id: `${id}-ubo-${i + 1}`,
      name: c.name,
      email: c.email,
      dob: "",
      address: "",
      relationship: c.relationship,
      ownershipPct: 0,
      status: submitted ? "submitted" : "draft",
      docsComplete: false,
    })),
    documents: NEW_ENTITY_DOCS.map((d, i) => {
      const uploaded = draft.uploadedDocNames.includes(d.name)
      return {
        id: `${id}-doc-${i + 1}`,
        name: d.name,
        required: d.required,
        status: uploaded ? ("under-review" as const) : ("missing" as const),
        uploadedAt: uploaded ? new Date().toISOString().slice(0, 10) : undefined,
      }
    }),
    channels: [],
    logicalAccounts: [],
    bankAccounts: [],
    payout: { routing: [] },
    services: TISE_EU.services.map((s) => ({
      ...s,
      status: s.status === "requires-contract" ? "requires-contract" : "inactive",
    })),
  }
}

