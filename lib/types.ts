// Domain model for Services Central — Merchant Account Settings.

export type Role =
  | "client-admin"
  | "client-treasury-admin"
  | "be-admin"
  | "be-treasury-admin"

export const ROLE_LABELS: Record<Role, string> = {
  "client-admin": "Client Administrator",
  "client-treasury-admin": "Client Treasury Administrator",
  "be-admin": "Business Entity Administrator",
  "be-treasury-admin": "Business Entity Treasury Administrator",
}

export const ROLE_SCOPE: Record<Role, string> = {
  "client-admin": "All Business Entities under the client",
  "client-treasury-admin": "Bank accounts & payouts across all entities",
  "be-admin": "Single Business Entity",
  "be-treasury-admin": "Bank accounts & payouts for one entity",
}

// A single status vocabulary shared across every section (PRD §14).
export type Status =
  | "draft"
  | "submitted"
  | "pending"
  | "action-required"
  | "verified"
  | "active"
  | "rejected"
  | "failed"
  | "archived"
  | "suspended"
  | "inactive"
  | "invited"

export type StatusTone = "neutral" | "info" | "warning" | "attention" | "success"

export type EntityType =
  | "Sole Proprietor"
  | "Private Company"
  | "Public Company"
  | "Partnership"
  | "Non-Profit"

export type DocStatus = "accepted" | "under-review" | "rejected" | "expired" | "missing"

export interface BusinessDocument {
  id: string
  name: string
  required: "required" | "conditional"
  status: DocStatus
  uploadedAt?: string
  note?: string
}

export interface BeneficialOwner {
  id: string
  name: string
  email: string
  dob: string
  address: string
  relationship: "Owner" | "Director" | "Executive"
  ownershipPct: number
  status: Status
  docsComplete: boolean
}

export interface BusinessProfile {
  legalName: string
  tradingName?: string
  registrationNumber: string
  entityType: EntityType
  formationDate: string
  taxId: string
  taxIdLabel: string
  jurisdiction: string
  address: {
    street: string
    city: string
    region: string
    postal: string
    country: string
  }
  website?: string
  activityDescription: string
}

// Soft descriptors (statement descriptors) — configured during onboarding and
// applied to every Auth, Capture and Refund operation for the entity.
export type SoftDescriptorMode = "static" | "dynamic"

// Both the static descriptor and the dynamic prefix require ePS approval.
export type DescriptorApproval = "approved" | "pending" | "rejected"

export interface SoftDescriptorConfig {
  mode: SoftDescriptorMode
  // Static descriptor: legal / DBA name, max 22 chars. Also used as the
  // fallback whenever a dynamic statement descriptor is not sent.
  staticDescriptor: string
  staticApproval: DescriptorApproval
  // Dynamic prefix: shortened legal / DBA name, max 10 chars. Prepended to the
  // API statement descriptor as {Prefix}*{Statement Descriptor}.
  prefix: string
  prefixApproval: DescriptorApproval
}

export type PaymentMethodStatus = "supported" | "unsupported" | "apply"

/** Where a client has got to with a method that needs a separate agreement. */
export type MethodApplicationStatus = "not-applied" | "under-review" | "approved"

export interface MethodApplication {
  status: MethodApplicationStatus
  /** Absent when the application was submitted in this session. */
  submittedAt?: string
}

export interface PaymentMethodDef {
  id: string
  name: string
  category: "cards" | "bnpl" | "bank" | "regional"
  status: PaymentMethodStatus
  coupledToCards?: boolean
}

export interface ProcessingChannel {
  id: string
  name: string
  description?: string
  ppe: string
  status: Status
  defaultCurrency: string
  createdAt: string
  mccs: string[]
  defaultMcc?: string
  softDescriptor: string
  softDescriptorMax: number
  l4lPairs: string[]
  fxPairs: string[]
  methods: Record<string, boolean>
  /** Only methods whose PPE status is "apply" appear here. */
  methodApplications?: Record<string, MethodApplication>
  accountMapping: { currency: string; logicalAccountId: string }[]
  reviewerNotes?: string[]
}

export type LogicalAccountType = "Default" | "Additional" | "SVA"

export interface LogicalAccount {
  id: string
  name: string
  currency: string
  type: LogicalAccountType
  available: number
  pending: number
  reserved: number
  owner: string
  linkedBankAccountIds: string[]
  status: Status
  notes?: string
}

export interface BankAccount {
  id: string
  bankName: string
  holderName: string
  accountNumberMasked: string
  currency: string
  country: string
  status: Status
  isDefaultForCurrency: boolean
  addedBy: string
  reason?: string
}

export type PayoutFrequency = "daily" | "weekly" | "monthly"

/** Whether a scheduled payout sweeps the balance or a fixed sum. */
export type PayoutAmountMode = "available" | "specified"

export interface PayoutSchedule {
  frequency: PayoutFrequency
  /** Weekly only. */
  weeklyDay?: string
  /** Monthly only. */
  monthlyDay?: number
  amountMode: PayoutAmountMode
  /** Only set when amountMode is "specified". */
  amount?: number
}

/**
 * Payout settings for one logical account. The schedule lives here rather than
 * on the entity because each currency account is paid out on its own cycle.
 * An absent schedule means on-request payouts only.
 */
export interface PayoutRoute {
  logicalAccountId: string
  bankAccountId?: string
  schedule?: PayoutSchedule
}

export interface PayoutPreferences {
  routing: PayoutRoute[]
}

export type ServiceStatus = "active" | "inactive" | "pending" | "requires-contract"

export interface ServiceSub {
  id: string
  name: string
  description: string
  status: ServiceStatus
  icon: string
  selfService: boolean
}

export interface PpeCapabilities {
  id: string
  mccs: { code: string; label: string }[]
  softDescriptorMax: number
  l4lPairs: string[]
  fxPairs: string[]
  methods: PaymentMethodDef[]
}

export type OnboardingStepId =
  | "profile"
  | "kyc"
  | "channel"
  | "bank"
  | "golive"

export interface BusinessEntity {
  id: string
  name: string
  jurisdiction: string
  profile: BusinessProfile
  profileStatus: Status
  owners: BeneficialOwner[]
  documents: BusinessDocument[]
  channels: ProcessingChannel[]
  logicalAccounts: LogicalAccount[]
  bankAccounts: BankAccount[]
  payout: PayoutPreferences
  services: ServiceSub[]
  softDescriptor: SoftDescriptorConfig
  ppe: string
  onboarding: boolean // true = still in first-time setup
}

export interface SCUser {
  id: string
  name: string
  email: string
  role: Role
  scope: string
  status: Status
  lastLogin?: string
}

export interface Client {
  id: string
  name: string
  entities: BusinessEntity[]
  users: SCUser[]
  ppes: PpeCapabilities[]
}
