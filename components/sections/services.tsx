"use client"

import { EbayButton } from "@ebay/ui-core-react/ebay-button"
import { EbayIconCreditCard24 } from "@ebay/ui-core-react/icons/ebay-icon-credit-card-24"
import { EbayIconMoneyBackGuarantee24 } from "@ebay/ui-core-react/icons/ebay-icon-money-back-guarantee-24"
import { EbayIconStore24 } from "@ebay/ui-core-react/icons/ebay-icon-store-24"
import { EbayIconVerifiedCondition24 } from "@ebay/ui-core-react/icons/ebay-icon-verified-condition-24"
import { EbayIconProfile24 } from "@ebay/ui-core-react/icons/ebay-icon-profile-24"
import { EbayIconMoneyStack24 } from "@ebay/ui-core-react/icons/ebay-icon-money-stack-24"
import { useStore } from "@/lib/store"
import { StatusBadge } from "@/components/status-badge"
import { PageHead } from "@/components/app-shell"
import { Card } from "@/components/ui-bits"
import type { ServiceStatus, ServiceSub, Status } from "@/lib/types"
import cards from "@/components/cards.module.css"

const ICONS: Record<string, React.ReactNode> = {
  card: <EbayIconCreditCard24 aria-hidden="true" />,
  shield: <EbayIconMoneyBackGuarantee24 aria-hidden="true" />,
  store: <EbayIconStore24 aria-hidden="true" />,
  verified: <EbayIconVerifiedCondition24 aria-hidden="true" />,
  profile: <EbayIconProfile24 aria-hidden="true" />,
  money: <EbayIconMoneyStack24 aria-hidden="true" />,
}

const SVC_STATUS: Record<ServiceStatus, Status> = {
  active: "active",
  inactive: "inactive",
  pending: "pending",
  "requires-contract": "action-required",
}

const SVC_LABEL: Record<ServiceStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending Activation",
  "requires-contract": "Requires Contract",
}

export function Services({ onManagePayments, embedded }: { onManagePayments?: () => void; embedded?: boolean }) {
  const { currentEntity, can } = useStore()

  return (
    <>
      {!embedded && (
        <PageHead
          title={`${currentEntity.name} — Services`}
          subtitle="Subscribe to eBay Payment Services capabilities. Some require a separate contract or account-manager approval."
        />
      )}
      <div className={cards.cardGrid2}>
        {currentEntity.services.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            canManage={can("subscribe-services")}
            onManage={s.id === "payments" ? onManagePayments : undefined}
          />
        ))}
      </div>
    </>
  )
}

function ServiceCard({
  service: s,
  canManage,
  onManage,
}: {
  service: ServiceSub
  canManage: boolean
  onManage?: () => void
}) {
  return (
    <Card className={cards.cardPad}>
      <div className={cards.stackSm}>
        <div className={cards.rowBetween}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-medium)",
              background: "var(--color-background-education)",
              color: "var(--color-foreground-accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            {ICONS[s.icon]}
          </span>
          <StatusBadge status={SVC_STATUS[s.status]} label={SVC_LABEL[s.status]} size="small" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-foreground-secondary)" }}>{s.description}</p>
        </div>
        <div style={{ marginTop: 4 }}>
          {!s.selfService ? (
            <EbayButton size="small" priority="tertiary">Contact your account manager</EbayButton>
          ) : s.status === "active" ? (
            <EbayButton
              size="small"
              priority="secondary"
              disabled={!onManage && !canManage}
              aria-disabled={!onManage && !canManage}
              onClick={onManage}
            >
              Manage
            </EbayButton>
          ) : s.status === "pending" ? (
            <EbayButton size="small" priority="secondary" disabled aria-disabled>
              Pending activation
            </EbayButton>
          ) : (
            <EbayButton size="small" priority="primary" disabled={!canManage} aria-disabled={!canManage}>
              Subscribe
            </EbayButton>
          )}
        </div>
      </div>
    </Card>
  )
}
