"use client"

import { useState } from "react"
import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayTextbox } from "@ebay/ui-core-react/ebay-textbox"
import { EbaySelect, EbaySelectOption } from "@ebay/ui-core-react/ebay-select"
import { EbayCheckbox } from "@ebay/ui-core-react/ebay-checkbox"
import { EbayMenuButton, EbayMenuButtonItem } from "@ebay/ui-core-react/ebay-menu-button"
import { EbayIconAdd16 } from "@ebay/ui-core-react/icons/ebay-icon-add-16"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card, Drawer, Field } from "@/components/ui-bits"
import { ROLE_LABELS, type Role, type SCUser } from "@/lib/types"
import cards from "@/components/cards.module.css"

export function UsersRoles() {
  const { client } = useStore()
  const [drawer, setDrawer] = useState<{ mode: "invite" | "edit"; user?: SCUser } | null>(null)

  return (
    <>
      <PageHead
        title="Users & Roles"
        subtitle="Manage who has access to Services Central for the client, and what each person can do."
        actions={
          <EbayButton priority="primary" onClick={() => setDrawer({ mode: "invite" })}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <EbayIconAdd16 aria-hidden="true" /> Invite User
            </span>
          </EbayButton>
        }
      />

      <Card>
        <div className={cards.tableScroll}>
          <table className={cards.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Entity scope</th>
                <th>Status</th>
                <th>Last login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {client.users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ color: "var(--color-foreground-secondary)" }}>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>{u.scope}</td>
                  <td><StatusBadge status={u.status} size="small" /></td>
                  <td style={{ color: "var(--color-foreground-secondary)" }}>{u.lastLogin ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <EbayMenuButton variant="overflow" a11yText={`Actions for ${u.name}`}>
                      <EbayMenuButtonItem onClick={() => setDrawer({ mode: "edit", user: u })}>
                        Edit role
                      </EbayMenuButtonItem>
                      <EbayMenuButtonItem>Revoke access</EbayMenuButtonItem>
                    </EbayMenuButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {drawer && (
        <UserDrawer
          mode={drawer.mode}
          user={drawer.user}
          entities={client.entities.map((e) => ({ id: e.id, name: e.name }))}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  )
}

function UserDrawer({
  mode,
  user,
  entities,
  onClose,
}: {
  mode: "invite" | "edit"
  user?: SCUser
  entities: { id: string; name: string }[]
  onClose: () => void
}) {
  const [email, setEmail] = useState(user?.email ?? "")
  const [role, setRole] = useState<Role>(user?.role ?? "be-admin")
  const isEntityRole = role === "be-admin" || role === "be-treasury-admin"

  return (
    <Drawer
      title={mode === "invite" ? "Invite user" : `Edit ${user?.name}`}
      onClose={onClose}
      footer={
        <>
          <EbayButton priority="tertiary" onClick={onClose}>Cancel</EbayButton>
          <EbayButton priority="primary" disabled={!email.trim()} aria-disabled={!email.trim()} onClick={onClose}>
            {mode === "invite" ? "Send invite" : "Save changes"}
          </EbayButton>
        </>
      }
    >
      <div className={cards.stack}>
        <Field label="Email address" required>
          <EbayTextbox
            fluid
            type="email"
            value={email}
            disabled={mode === "edit"}
            onInputChange={(_e, p) => setEmail(p?.value ?? "")}
            placeholder="name@company.com"
          />
        </Field>
        <Field label="Role" required>
          <EbaySelect fluid value={role} onChange={(e) => setRole((e.target as HTMLSelectElement).value as Role)}>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <EbaySelectOption key={r} value={r}>{ROLE_LABELS[r]}</EbaySelectOption>
            ))}
          </EbaySelect>
        </Field>
        {isEntityRole && (
          <Field label="Business Entity scope" required hint="Which entities this person can access.">
            <div className={cards.stackSm}>
              {entities.map((e) => (
                <EbayCheckbox key={e.id} defaultChecked={user?.scope === e.name}>{e.name}</EbayCheckbox>
              ))}
            </div>
          </Field>
        )}
        {mode === "invite" && (
          <Field label="Access message" hint="Optional note included in the invite email.">
            <EbayTextbox fluid multiline placeholder="Welcome to the team…" />
          </Field>
        )}
        {mode === "edit" && (
          <p className={cards.hint}>Role changes take effect immediately and notify the affected user.</p>
        )}
      </div>
    </Drawer>
  )
}
