"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { CLIENT } from "./data"
import type { BusinessEntity, Client, Role } from "./types"

interface StoreValue {
  client: Client
  role: Role
  setRole: (r: Role) => void
  entityId: string
  setEntityId: (id: string) => void
  currentEntity: BusinessEntity
  // entities the current role is scoped to (for the switcher)
  scopedEntities: BusinessEntity[]
  showEntitySwitcher: boolean
  can: (action: Capability) => boolean
  // Add a newly created entity (from the New Business Entity form) and focus it.
  addEntity: (e: BusinessEntity) => void
}

// Capability keys from the PRD access matrix (§2).
export type Capability =
  | "create-entity"
  | "submit-kyc"
  | "configure-channel"
  | "create-logical-account"
  | "add-bank-account"
  | "associate-bank"
  | "request-payout"
  | "configure-payout"
  | "subscribe-services"
  | "manage-users"

const MATRIX: Record<Role, Capability[]> = {
  "client-admin": ["create-entity", "manage-users"],
  "client-treasury-admin": ["add-bank-account", "request-payout", "configure-payout"],
  "be-admin": [
    "submit-kyc",
    "configure-channel",
    "create-logical-account",
    "associate-bank",
    "subscribe-services",
  ],
  "be-treasury-admin": ["add-bank-account", "request-payout", "configure-payout"],
}

const StoreContext = createContext<StoreValue | null>(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within <AppStoreProvider>")
  return ctx
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("be-admin")
  const [entityId, setEntityId] = useState<string>("tise-eu")
  // Entities created at runtime via the New Business Entity form, appended to
  // the seed set so they appear as tiles on the Business Entities page.
  const [createdEntities, setCreatedEntities] = useState<BusinessEntity[]>([])

  const addEntity = useCallback((e: BusinessEntity) => {
    setCreatedEntities((prev) => [...prev, e])
    setEntityId(e.id)
  }, [])

  const value = useMemo<StoreValue>(() => {
    const client = CLIENT
    const allEntities = [...client.entities, ...createdEntities]

    // BE roles are scoped to a single entity (here, the first entity a demo
    // BE user is assigned to). Client roles see all entities.
    const isClientRole = role === "client-admin" || role === "client-treasury-admin"
    const scopedEntities = isClientRole
      ? allEntities
      : allEntities.filter((e) => e.id === entityId || e.id === "tise-eu")

    const effectiveEntityId = scopedEntities.some((e) => e.id === entityId)
      ? entityId
      : scopedEntities[0]?.id
    const currentEntity =
      allEntities.find((e) => e.id === effectiveEntityId) ?? allEntities[0]

    return {
      client,
      role,
      setRole,
      entityId: currentEntity.id,
      setEntityId,
      currentEntity,
      scopedEntities,
      showEntitySwitcher: isClientRole,
      can: (action: Capability) => MATRIX[role].includes(action),
      addEntity,
    }
  }, [role, entityId, createdEntities, addEntity])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
